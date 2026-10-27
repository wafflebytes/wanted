/**
 * OpenRouter chat client with a fallback chain (FR-32): Nemotron 3.5 Super VL, then the
 * other free Nemotron models, then the caller's deterministic "Gus (lite)". Responses are
 * cached by prompt hash so the demo prompts are pre-generated and free LLM quotas during
 * judging don't matter.
 */
import { config } from '../config';
import { stableHash } from '../crypto';
import { one, run, kvGet, kvSet } from '../db';
import { env, redact } from '../env';
import { recordOutbound } from '../outbound';

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

export type ToolDef = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ChatOptions = {
  messages: ChatMessage[];
  tools?: ToolDef[];
  /** Ask the provider for sequential tool use; server guards remain authoritative. */
  parallelToolCalls?: boolean;
  /** "none" makes the model answer from what it already has instead of looking more up. */
  toolChoice?: 'auto' | 'none';
  /** JSON schema for structured output. */
  schema?: { name: string; schema: Record<string, unknown> };
  temperature?: number;
  maxTokens?: number;
  models?: readonly string[];
  /** Skip the cache (evals that sample several times). */
  noCache?: boolean;
  /** Extra cache key salt (e.g. sample index). */
  salt?: string;
  /** Parent task budget. Never part of a cached prompt or sent to the provider. */
  signal?: AbortSignal;
};

export type ChatResult = {
  content: string | null;
  toolCalls: ToolCall[];
  model: string; // requested routing ID, retained for cache/backward compatibility
  providerModel?: string; // responding ID returned by the provider, if supplied
  cached: boolean;
  latencyMs: number;
  fallbackAttempts?: { model: string; error: string }[];
};

export class LlmUnavailable extends Error {
  constructor(public attempts: { model: string; error: string }[]) {
    super(`All models failed: ${attempts.map((a) => `${a.model}: ${a.error}`).join('; ')}`);
  }
}

/** Server-private fingerprint per credential, never the raw key. */
const quotaKey = (key: string) => stableHash({ provider: 'openrouter-quota', credential: key });
type QuotaBlock = { until: number; reason: 'minute' | 'daily' | 'credits' | 'invalid' };
/** Blocks one credential (default: every configured one). Other pool slots stay usable. */
export async function blockLlmQuota(block: QuotaBlock, key?: string) {
  for (const k of key ? [key] : env.openrouterKeys) await kvSet(`llm-quota:${quotaKey(k)}`, block);
}
/** Per-process pool telemetry. Slot numbers are positions in the pool, never key material. */
export const llmPoolStats = { requests: {} as Record<number, number>, blocked: {} as Record<number, string>, usedSlots: new Set<number>() };
async function callModel(model: string, opts: ChatOptions, key: string): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 900,
    // Gus writes short lines; reasoning tokens only add latency on the free tier.
    reasoning: { enabled: false },
  };
  if (opts.tools?.length) { body.tools = opts.tools; if (opts.parallelToolCalls !== undefined) body.parallel_tool_calls = opts.parallelToolCalls; if (opts.toolChoice) body.tool_choice = opts.toolChoice; }
  if (opts.schema) {
    body.response_format = { type: 'json_schema', json_schema: { name: opts.schema.name, strict: true, schema: opts.schema.schema } };
  }
  const payload = JSON.stringify(body);
  recordOutbound({ kind: 'llm', url: 'https://openrouter.ai/api/v1/chat/completions', body: payload });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.publicOrigin,
        'X-Title': 'Wanted',
      },
      body: payload,
      signal: opts.signal ? AbortSignal.any([controller.signal, opts.signal]) : controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        await blockLlmQuota({ until: Date.now() + 7 * 86_400_000, reason: 'invalid' }, key);
      }
      if (res.status === 429 || res.status === 402) {
        let metadata: Record<string, string> = {};
        try { metadata = JSON.parse(text).error?.metadata?.headers ?? {}; } catch { /* no trusted JSON */ }
        const reason = res.status === 402 ? 'credits' : /free-models-per-day/.test(text) ? 'daily' : 'minute';
        const reset = Number(metadata['X-RateLimit-Reset']);
        const parsedReset = reset > 0 && reset < 10_000_000_000 ? reset * 1000 : reset;
        const until = Number.isFinite(parsedReset) && parsedReset > Date.now() ? Math.min(parsedReset, Date.now() + 7 * 86_400_000) : Date.now() + (reason === 'minute' ? 60_000 : 86_400_000);
        await blockLlmQuota({ until, reason }, key);
      }
      throw new Error(`HTTP ${res.status}: ${redact(text).slice(0, 200)}`);
    }
    const data = JSON.parse(text);
    if (data.error) throw new Error(redact(JSON.stringify(data.error)).slice(0, 200));
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('no message');
    const content: string | null = typeof msg.content === 'string' ? msg.content : null;
    const toolCalls: ToolCall[] = msg.tool_calls ?? [];
    if (!content && !toolCalls.length) throw new Error('empty response');
    return { content, toolCalls, model, providerModel: typeof data.model === 'string' ? data.model : undefined, cached: false, latencyMs: Date.now() - started };
  } catch (err) {
    if (opts.signal?.aborted) throw new Error('Parent task planning deadline reached');
    if (controller.signal.aborted) throw new Error(`timed out after ${config.llm.timeoutMs} ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  if (opts.signal?.aborted) throw new LlmUnavailable([{ model: 'none', error: 'Parent task planning deadline reached' }]);
  const models = opts.models ?? config.llm.models;
  const cacheKey = stableHash({
    v: config.llm.promptVersion,
    m: opts.messages,
    t: opts.tools ?? null,
    parallel: opts.parallelToolCalls ?? null,
    choice: opts.toolChoice ?? null,
    s: opts.schema ?? null,
    temp: opts.temperature ?? 0.7,
    salt: opts.salt ?? null,
    models,
  });
  if (!opts.noCache) {
    const hit = await one<{ body: string; model: string }>('select body, model from llm_cache where key = ?', [cacheKey]);
    if (hit) return { ...(JSON.parse(hit.body) as ChatResult), cached: true, latencyMs: 0 };
  }
  // Credential pool: skip slots with a live private block; a 429/402/401 on one slot moves on to the next.
  const keys = env.openrouterKeys;
  if (!keys.length) throw new LlmUnavailable([{ model: 'none', error: 'OPENROUTER_API_KEY not set' }]);
  const usable: { key: string; slot: number }[] = [];
  let earliest = Infinity, lastReason = 'minute';
  for (const [i, key] of keys.entries()) {
    const block = await kvGet<QuotaBlock>(`llm-quota:${quotaKey(key)}`);
    if (block && block.until > Date.now()) { earliest = Math.min(earliest, block.until); lastReason = block.reason; llmPoolStats.blocked[i + 1] = block.reason; continue; }
    usable.push({ key, slot: i + 1 });
  }
  if (!usable.length) throw new LlmUnavailable([{ model: 'provider-backoff', error: `Provider ${lastReason} quota backoff on all ${keys.length} credential slot(s) until ${new Date(earliest).toISOString()}. No new network request.` }]);
  const attempts: { model: string; error: string }[] = [];
  const chainStarted = Date.now();
  const dead = new Set<number>();
  for (const model of models) {
    if (opts.signal?.aborted) break;
    for (const { key, slot } of usable) {
      if (dead.has(slot)) continue;
      if (opts.signal?.aborted) break;
      try {
        llmPoolStats.requests[slot] = (llmPoolStats.requests[slot] ?? 0) + 1; llmPoolStats.usedSlots.add(slot);
        const response = await callModel(model, opts, key);
        const result = { ...response, latencyMs: Date.now() - chainStarted, fallbackAttempts: [...attempts] };
        if (!opts.noCache) {
          await run(
            `insert into llm_cache(key, model, body, created_at) values(?, ?, ?, ?)
             on conflict(key) do update set body = excluded.body, model = excluded.model, created_at = excluded.created_at`,
            [cacheKey, model, JSON.stringify(result), Date.now()],
          );
        }
        return result;
      } catch (err) {
        const error = redact(String(err instanceof Error ? err.message : err));
        attempts.push({ model, error: usable.length > 1 ? `slot ${slot}: ${error}` : error });
        // A limit is per credential: retire that slot for this call and try the next one with the same model.
        if (/HTTP (429|402|401|403)/.test(error)) { dead.add(slot); continue; }
        break; // other errors: next model, same credential order
      }
    }
    if (usable.every((u) => dead.has(u.slot))) break;
  }
  throw new LlmUnavailable(attempts);
}

/** Parses a JSON object from model output (tolerates code fences and leading prose). */
export function parseJson<T>(text: string | null): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
