/**
 * The one way Wanted talks to Qloo (PRD 4.1c, FR-33).
 *
 * - The key stays server-side; it never appears in params, receipts, traces or logs.
 * - Concurrency limiter: at most 6 calls in flight, token bucket at 8 per second.
 * - Retries: 2, exponential backoff on 429, 5xx, timeouts and network errors.
 * - Timeouts: 20 s, or 60 s for locality heatmaps.
 * - Cache: trimmed JSON in the private DB, keyed by a hash of the normalized request,
 *   7-day TTL. If Qloo fails, a stale entry is served and labeled "cached on {date}".
 * - Every call writes a receipt (endpoint, params minus key, status, latency, purpose).
 */
import { config } from '../config';
import { id, stableHash } from '../crypto';
import { all, kvSet, one, run } from '../db';
import { env, redact } from '../env';
import { recordOutbound } from '../outbound';
import { toSearchParams, validateParams, type QlooParams } from './params';

export type Receipt = {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST';
  params: Record<string, unknown>;
  status: number | null;
  latencyMs: number;
  cached: boolean;
  cachedAt: number | null;
  stale: boolean;
  purpose: string;
  resultCount: number | null;
};

export type QlooResult<T> = { data: T; receipt: Receipt };

export class QlooError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public receipt: Receipt,
  ) {
    super(message);
  }
}

type Request<T> = {
  path: string;
  params?: QlooParams;
  /** POST body for weighted signals (key is `id`, not `entity`). */
  body?: Record<string, unknown>;
  purpose: string;
  /** Names the trim so two different trims of one call don't share a cache entry. */
  trimId: string;
  trim: (raw: unknown) => T;
  count?: (data: T) => number;
  timeoutMs?: number;
  /** Groups receipts for the trace page (a Sound hash, an artist id, or "eval"). */
  scope?: string;
  noCache?: boolean;
};

// ---------- limiter ----------

let inFlight = 0;
const waiters: (() => void)[] = [];
let tokens: number = config.qloo.perSecond;
let lastRefill = Date.now();

function refill() {
  const now = Date.now();
  const add = ((now - lastRefill) / 1000) * config.qloo.perSecond;
  if (add > 0) {
    tokens = Math.min(config.qloo.perSecond, tokens + add);
    lastRefill = now;
  }
}

async function acquire() {
  while (true) {
    refill();
    if (inFlight < config.qloo.maxInFlight && tokens >= 1) {
      inFlight++;
      tokens -= 1;
      return;
    }
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
      setTimeout(resolve, 60);
    });
  }
}

function release() {
  inFlight--;
  const next = waiters.shift();
  next?.();
}

// ---------- cache ----------

const pending = new Map<string, Promise<QlooResult<unknown>>>();

async function readCache(key: string) {
  return one<{ body: string; created_at: number }>('select body, created_at from qloo_cache where key = ?', [key]);
}

async function writeCache(key: string, path: string, body: unknown) {
  await run(
    `insert into qloo_cache(key, path, body, created_at) values(?, ?, ?, ?)
     on conflict(key) do update set body = excluded.body, created_at = excluded.created_at`,
    [key, path, JSON.stringify(body), Date.now()],
  );
}

async function recordReceipt(r: Receipt, scope?: string) {
  try {
    await run(
      `insert into qloo_trace(id, scope, endpoint, method, params, status, latency_ms, cached, cache_date, purpose, result_count, created_at)
       values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        scope ?? null,
        r.endpoint,
        r.method,
        JSON.stringify(r.params),
        r.status,
        r.latencyMs,
        r.cached ? 1 : 0,
        r.cachedAt,
        r.purpose,
        r.resultCount,
        Date.now(),
      ],
    );
  } catch {
    // The trace is best-effort; never fail a user request because of it.
  }
}

// ---------- request ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function publicParams(params: QlooParams, body?: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({ ...params, ...body })) if (v !== undefined) out[k] = v;
  return JSON.parse(redact(JSON.stringify(out)));
}

export async function qloo<T>(req: Request<T>): Promise<QlooResult<T>> {
  const params = req.params ?? {};
  validateParams(req.path, params, req.body);
  const method: 'GET' | 'POST' = req.body ? 'POST' : 'GET';
  const key = stableHash({ path: req.path, params, body: req.body ?? null, trim: req.trimId });

  const shared = pending.get(key);
  if (shared) return shared as Promise<QlooResult<T>>;
  const p = execute(req, key, method, params).finally(() => pending.delete(key));
  pending.set(key, p as Promise<QlooResult<unknown>>);
  return p;
}

async function execute<T>(req: Request<T>, key: string, method: 'GET' | 'POST', params: QlooParams): Promise<QlooResult<T>> {
  const started = Date.now();
  const receipt: Receipt = {
    id: id('q_'),
    endpoint: req.path,
    method,
    params: publicParams(params, req.body),
    status: null,
    latencyMs: 0,
    cached: false,
    cachedAt: null,
    stale: false,
    purpose: req.purpose,
    resultCount: null,
  };

  const cached = req.noCache ? null : await readCache(key);
  if (cached && Date.now() - cached.created_at < config.qloo.cacheTtlMs) {
    const data = JSON.parse(cached.body) as T;
    Object.assign(receipt, {
      cached: true,
      cachedAt: cached.created_at,
      status: 200,
      latencyMs: Date.now() - started,
      resultCount: req.count ? req.count(data) : null,
    });
    await recordReceipt(receipt, req.scope);
    return { data, receipt };
  }

  const serveStale = async (status: number | null, why: string): Promise<QlooResult<T>> => {
    if (cached) {
      const data = JSON.parse(cached.body) as T;
      Object.assign(receipt, {
        cached: true,
        stale: true,
        cachedAt: cached.created_at,
        status,
        latencyMs: Date.now() - started,
        resultCount: req.count ? req.count(data) : null,
      });
      await recordReceipt(receipt, req.scope);
      return { data, receipt };
    }
    receipt.status = status;
    receipt.latencyMs = Date.now() - started;
    await recordReceipt(receipt, req.scope);
    throw new QlooError(why, status, receipt);
  };

  if (env.offline) return serveStale(null, 'Offline demo mode and nothing cached for this call.');
  const apiKey = env.qlooKey;
  if (!apiKey) return serveStale(null, 'QLOO_API_KEY is not set on the server.');

  const qs = toSearchParams(params).toString();
  const url = `${config.qloo.baseUrl}${req.path}${qs ? `?${qs}` : ''}`;
  const timeout = req.timeoutMs ?? config.qloo.timeoutMs;
  let lastStatus: number | null = null;
  let lastError = 'unknown error';

  for (let attempt = 0; attempt <= config.qloo.retries; attempt++) {
    if (attempt > 0) await sleep(400 * 2 ** (attempt - 1) + Math.random() * 250);
    await acquire();
    recordOutbound({ kind: 'qloo', url, body: req.body ? JSON.stringify(req.body) : '' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'X-Api-Key': apiKey,
          Accept: 'application/json',
          ...(req.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });
      lastStatus = res.status;
      const monthRemaining = res.headers.get('x-month-ratelimit-remaining');
      if (monthRemaining) {
        void kvSet('qloo.month', {
          remaining: Number(monthRemaining),
          limit: Number(res.headers.get('x-month-ratelimit-limit') ?? 50000),
          at: Date.now(),
        }).catch(() => {});
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = `Qloo ${res.status}`;
        if (res.status === 429) {
          const reset = Number(res.headers.get('x-second-ratelimit-reset') ?? 1);
          await sleep(Math.min(3000, Math.max(250, reset * 1000)));
        }
        continue;
      }
      const text = await res.text();
      if (!res.ok) {
        // 4xx other than 429 won't improve on retry.
        lastError = `Qloo ${res.status}: ${redact(text).slice(0, 300)}`;
        break;
      }
      const raw = JSON.parse(text);
      const data = req.trim(raw);
      if (!req.noCache) await writeCache(key, req.path, data);
      Object.assign(receipt, {
        status: res.status,
        latencyMs: Date.now() - started,
        resultCount: req.count ? req.count(data) : null,
      });
      await recordReceipt(receipt, req.scope);
      return { data, receipt };
    } catch (err) {
      lastError = controller.signal.aborted ? `Qloo timed out after ${timeout} ms` : redact(String(err));
    } finally {
      clearTimeout(timer);
      release();
    }
  }
  return serveStale(lastStatus, lastError);
}

export async function qlooMonth(): Promise<{ remaining: number; limit: number; at: number } | null> {
  const row = await one<{ value: string }>("select value from kv where key = 'qloo.month'");
  return row ? JSON.parse(row.value) : null;
}

export async function traceFor(scope: string, limit = 200) {
  const rows = await all<{
    id: string;
    endpoint: string;
    method: string;
    params: string;
    status: number | null;
    latency_ms: number;
    cached: number;
    cache_date: number | null;
    purpose: string;
    result_count: number | null;
    created_at: number;
  }>('select * from qloo_trace where scope = ? order by created_at desc limit ?', [scope, limit]);
  return rows.map((r) => ({
    id: r.id,
    endpoint: r.endpoint,
    method: r.method,
    params: JSON.parse(r.params),
    status: r.status,
    latencyMs: r.latency_ms,
    cached: !!r.cached,
    cachedAt: r.cache_date,
    purpose: r.purpose,
    resultCount: r.result_count,
    at: r.created_at,
  }));
}

export async function receiptById(receiptId: string) {
  return one('select * from qloo_trace where id = ?', [receiptId]);
}
