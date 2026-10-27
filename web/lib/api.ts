/** Same-origin client for Wanted's API (served by app/api/[...path]). No keys ever live here. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, {
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

/** Reads an NDJSON stream (onboarding's run, Gus's steps) one event at a time. */
export async function streamNdjson<E>(path: string, body: unknown, onEvent: (e: E) => void, signal?: AbortSignal) {
  const form = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: form ? undefined : { 'content-type': 'application/json' },
    body: form ? (body as FormData) : JSON.stringify(body),
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
  const emit = (chunk: string) => {
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as E);
      } catch {}
    }
  };
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const cut = buf.lastIndexOf('\n');
    if (cut >= 0) {
      emit(buf.slice(0, cut));
      buf = buf.slice(cut + 1);
    }
  }
  emit(buf);
}
