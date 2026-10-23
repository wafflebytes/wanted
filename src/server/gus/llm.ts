/**
 * OpenRouter chat client with a fallback chain (FR-32): Nemotron 3.5 Super VL, then the
 * other free Nemotron models, then the caller's deterministic "Gus (lite)". Responses are
 * cached by prompt hash so the demo prompts are pre-generated and free LLM quotas during
 * judging don't matter.
 */
import { config } from '../config';
import { stableHash } from '../crypto';
import { one, run } from '../db';
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
  /** JSON schema for structured output. */
  schema?: { name: string; schema: Record<string, unknown> };
  temperature?: number;
  maxTokens?: number;
  models?: readonly string[];
  /** Skip the cache (evals that sample several times). */
  noCache?: boolean;
  /** Extra cache key salt (e.g. sample index). */
  salt?: string;
};

export type ChatResult = {
  content: string | null;
  toolCalls: ToolCall[];
  model: string;
  cached: boolean;
  latencyMs: number;
};

export class LlmUnavailable extends Error {
  constructor(public attempts: { model: string; error: string }[]) {
    super(`All models failed: ${attempts.map((a) => `${a.model}: ${a.error}`).join('; ')}`);
  }
}

async function callModel(model: string, opts: ChatOptions): Promise<ChatResult> {
  const key = env.openrouterKey;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 900,
    // Gus writes short lines; reasoning tokens only add latency on the free tier.
    reasoning: { enabled: false },
  };
  if (opts.tools?.length) body.tools = opts.tools;
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
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${redact(text).slice(0, 200)}`);
    const data = JSON.parse(text);
    if (data.error) throw new Error(redact(JSON.stringify(data.error)).slice(0, 200));
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('no message');
    const content: string | null = typeof msg.content === 'string' ? msg.content : null;
    const toolCalls: ToolCall[] = msg.tool_calls ?? [];
    if (!content && !toolCalls.length) throw new Error('empty response');
    return { content, toolCalls, model, cached: false, latencyMs: Date.now() - started };
  } catch (err) {
    if (controller.signal.aborted) throw new Error(`timed out after ${config.llm.timeoutMs} ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const models = opts.models ?? config.llm.models;
  const cacheKey = stableHash({
    v: config.llm.promptVersion,
    m: opts.messages,
    t: opts.tools ?? null,
    s: opts.schema ?? null,
    temp: opts.temperature ?? 0.7,
    salt: opts.salt ?? null,
    models,
  });
  if (!opts.noCache) {
    const hit = await one<{ body: string; model: string }>('select body, model from llm_cache where key = ?', [cacheKey]);
    if (hit) return { ...(JSON.parse(hit.body) as ChatResult), cached: true, latencyMs: 0 };
  }
  const attempts: { model: string; error: string }[] = [];
  for (const model of models) {
    try {
      const result = await callModel(model, opts);
      if (!opts.noCache) {
        await run(
          `insert into llm_cache(key, model, body, created_at) values(?, ?, ?, ?)
           on conflict(key) do update set body = excluded.body, model = excluded.model, created_at = excluded.created_at`,
          [cacheKey, model, JSON.stringify(result), Date.now()],
        );
      }
      return result;
    } catch (err) {
      attempts.push({ model, error: redact(String(err instanceof Error ? err.message : err)) });
    }
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
