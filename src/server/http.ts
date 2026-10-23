/** Shared helpers for API routes: JSON responses, errors, cookies, client IP, rate limits. */
import { ClaimError, rateLimit } from './claims';
import { redact } from './env';
import { ipHash } from './crypto';
import { QlooError } from './qloo/client';

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(init.headers ?? {}) },
  });
}

export function error(status: number, message: string, extra: Record<string, unknown> = {}) {
  return json({ error: message, ...extra }, { status });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '127.0.0.1').trim();
}

export function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function setCookie(name: string, value: string, maxAgeDays = 365) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeDays * 86400}; HttpOnly; SameSite=Lax${secure}`;
}

/** Wraps a handler: known errors become clean JSON; nothing leaks keys or stack traces. */
export function handler<A extends unknown[]>(fn: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A): Promise<Response> => {
    try {
      return await fn(req, ...args);
    } catch (err) {
      if (err instanceof ClaimError) return error(err.status, err.message, { code: err.code });
      if (err instanceof QlooError)
        return error(502, "Qloo didn't answer and nothing is cached for this yet.", { detail: redact(err.message), receipt: err.receipt });
      if (err instanceof HttpError) return error(err.status, err.message);
      console.error('[api]', redact(String(err instanceof Error ? err.stack ?? err.message : err)));
      return error(500, 'Something broke on our side. Gus is on it.');
    }
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Per-IP rate limit for our own API (FR-33). */
export async function limit(req: Request, bucket: string, perMinute: number) {
  const ok = await rateLimit(`${bucket}:${ipHash(clientIp(req))}`, perMinute, 60_000);
  if (!ok) throw new HttpError(429, 'Too many requests. Give it a minute.');
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Expected a JSON body.');
  }
}

/** Newline-delimited JSON stream for long agent runs (Scout progress, then the result). */
export function ndjson(run: (send: (event: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await run(send);
      } catch (err) {
        const msg =
          err instanceof QlooError
            ? "Qloo didn't answer and nothing is cached for this yet."
            : err instanceof HttpError
              ? err.message
              : 'Something broke on our side. Gus is on it.';
        if (!(err instanceof QlooError) && !(err instanceof HttpError)) console.error('[stream]', redact(String(err instanceof Error ? err.stack : err)));
        send({ type: 'error', error: msg });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
