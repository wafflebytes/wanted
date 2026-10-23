/**
 * Client for Wanted's own API routes. No keys ever live here: every Qloo, OpenRouter and
 * Fish Audio call happens on the server (PRD 10.5).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Web uses same-origin requests. Native talks to the dev server (or the deployed origin). */
export function apiOrigin(): string {
  if (Platform.OS === 'web') return '';
  const host = Constants.expoConfig?.hostUri?.split('/')[0];
  if (host) return `http://${host}`;
  const origin = (Constants.expoConfig?.extra?.router as { origin?: string } | undefined)?.origin;
  return origin ?? 'http://localhost:8081';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${apiOrigin()}/api${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, res.ok ? 'The server sent something odd.' : `Server error (${res.status}).`);
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Server error (${res.status}).`);
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>('POST', path, body, signal),
};

/**
 * Reads an NDJSON stream (Scout's progress theater). Falls back to reading the whole body
 * when the platform's fetch has no streaming reader (older React Native).
 */
export async function streamNdjson<E>(path: string, body: unknown, onEvent: (e: E) => void, signal?: AbortSignal) {
  const res = await fetch(`${apiOrigin()}/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = `Server error (${res.status}).`;
    try {
      msg = JSON.parse(t).error ?? msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  const emitLines = (chunk: string) => {
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as E);
      } catch {}
    }
  };
  const reader = res.body?.getReader?.();
  if (!reader) {
    emitLines(await res.text());
    return;
  }
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const cut = buf.lastIndexOf('\n');
    if (cut >= 0) {
      emitLines(buf.slice(0, cut));
      buf = buf.slice(cut + 1);
    }
  }
  emitLines(buf);
}

export function absoluteUrl(path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return `${apiOrigin()}${path}`;
}
