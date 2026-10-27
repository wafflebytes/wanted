/** Fake HTTP responses verify transport behavior, not model intelligence. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-llm-client-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
process.env.OPENROUTER_API_KEY = 'sk-or-v1-synthetic-contract-key';
import { blockLlmQuota, chat, LlmUnavailable } from '../src/server/gus/llm';
import { setOutboundRecorder } from '../src/server/outbound';
const options = { messages: [{ role: 'user' as const, content: 'Transport contract, not a model benchmark.' }], models: ['synthetic-a', 'synthetic-b'], noCache: true };
const ok = () => new Response(JSON.stringify({ choices: [{ message: { content: 'synthetic completion' } }] }), { status: 200 });
async function withFetch(fn: typeof fetch, work: () => Promise<void>) { const original = globalThis.fetch; globalThis.fetch = fn; try { await work(); } finally { globalThis.fetch = original; setOutboundRecorder(undefined); await blockLlmQuota({ until: 0, reason: 'minute' }); } }
test('429 records the provider reset and stops model/key fallback and repeat requests', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return new Response(JSON.stringify({ error: { message: 'free-models-per-day', metadata: { headers: { 'X-RateLimit-Reset': String(Date.now() + 60_000) } } } }), { status: 429 }); }, async () => {
    await assert.rejects(chat(options), e => e instanceof LlmUnavailable && e.attempts.length === 1);
    await assert.rejects(chat(options), /quota backoff/); assert.equal(calls, 1);
  });
});
test('402 credit block does not try another model or another credential', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return new Response(JSON.stringify({ error: { message: 'Insufficient credits' } }), { status: 402 }); }, async () => {
    await assert.rejects(chat(options), /HTTP 402/); await assert.rejects(chat(options), /credits quota backoff/); assert.equal(calls, 1);
  });
});
test('an expired backoff permits a real transport attempt again', async () => {
  await blockLlmQuota({ until: Date.now() - 1, reason: 'minute' }); let calls = 0;
  await withFetch(async () => { calls++; return ok(); }, async () => { const r = await chat(options); assert.equal(r.cached, false); assert.equal(calls, 1); });
});
test('cached completion stays labeled cached during backoff; uncached eval still fails', async () => {
  let calls = 0; const cachedOptions = { ...options, noCache: false, salt: 'cached-during-block' };
  await withFetch(async () => { calls++; return ok(); }, async () => {
    assert.equal((await chat(cachedOptions)).cached, false); await blockLlmQuota({ until: Date.now() + 60_000, reason: 'daily' });
    assert.equal((await chat(cachedOptions)).cached, true); await assert.rejects(chat({ ...cachedOptions, noCache: true }), /quota backoff/); assert.equal(calls, 1);
  });
});
test('provider errors redact credentials, and recorded prompt bodies contain no key', async () => {
  const records: string[] = []; let calls = 0; setOutboundRecorder(r => records.push(r.body));
  await withFetch(async () => { calls++; return calls === 1 ? new Response(`Provider accidentally echoed ${process.env.OPENROUTER_API_KEY}`, { status: 502 }) : ok(); }, async () => {
    const r = await chat(options); assert.equal(r.model, 'synthetic-b'); assert.equal(r.fallbackAttempts!.length, 1); assert.ok(!r.fallbackAttempts![0].error.includes(process.env.OPENROUTER_API_KEY!)); assert.match(r.fallbackAttempts![0].error, /redacted/); assert.ok(records.every(body => !body.includes(process.env.OPENROUTER_API_KEY!)));
  });
});
test('an already-aborted parent deadline makes zero transport requests', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await withFetch(async () => { calls++; return ok(); }, async () => { await assert.rejects(chat({ ...options, signal: controller.signal }), /deadline/); assert.equal(calls, 0); });
});
test('credential pool: a limited slot is retired and the next slot serves the same model; only that slot is blocked', async () => {
  const saved = process.env.OPENROUTER_API_KEYS; process.env.OPENROUTER_API_KEYS = 'sk-or-v1-synthetic-pool-b,sk-or-v1-synthetic-pool-c';
  const seen: string[] = [];
  try {
    await withFetch(async (_u, init) => { const auth = String((init!.headers as Record<string, string>).Authorization); seen.push(auth); return auth.includes('contract-key') ? new Response(JSON.stringify({ error: { message: 'free-models-per-day' } }), { status: 429 }) : ok(); }, async () => {
      const r = await chat(options);
      assert.equal(r.cached, false); assert.equal(r.model, 'synthetic-a'); assert.equal(seen.length, 2); assert.match(r.fallbackAttempts![0].error, /slot 1: HTTP 429/);
      assert.ok(!JSON.stringify(r).includes('synthetic-pool'));
      await chat(options); assert.equal(seen.length, 3, 'slot 1 stays blocked; the next call goes straight to slot 2');
    });
  } finally { if (saved === undefined) delete process.env.OPENROUTER_API_KEYS; else process.env.OPENROUTER_API_KEYS = saved; }
});
test('credential pool: every slot limited means zero new requests and a backoff naming the slot count', async () => {
  const saved = process.env.OPENROUTER_API_KEYS; process.env.OPENROUTER_API_KEYS = 'sk-or-v1-synthetic-pool-b';
  let calls = 0;
  try {
    await withFetch(async () => { calls++; return new Response(JSON.stringify({ error: { message: 'Insufficient credits' } }), { status: 402 }); }, async () => {
      await assert.rejects(chat(options), LlmUnavailable); assert.equal(calls, 2);
      await assert.rejects(chat(options), /all 2 credential slot/); assert.equal(calls, 2);
    });
  } finally { if (saved === undefined) delete process.env.OPENROUTER_API_KEYS; else process.env.OPENROUTER_API_KEYS = saved; }
});
test('provider-reported model identity is not silently replaced by the requested route', async () => {
  await withFetch(async () => new Response(JSON.stringify({ model: 'actual-provider-model', choices: [{ message: { content: 'synthetic completion' } }] }), { status: 200 }), async () => {
    const r = await chat(options); assert.equal(r.model, 'synthetic-a'); assert.equal(r.providerModel, 'actual-provider-model');
  });
});
