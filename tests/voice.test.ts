import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-voice-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
process.env.OPENROUTER_API_KEY = '';
process.env.OPENROUTER_API_KEYS = '';
process.env.FISH_AUDIO_API_KEY = 'sk-fish-synthetic-test';
import { sanitizeLine, speak, VoiceError } from '../src/server/voice';
const audio = () => new Response(new Uint8Array(1800), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
async function withFetch(fn: typeof fetch, work: () => Promise<void>) { const original = globalThis.fetch; globalThis.fetch = fn; try { await work(); } finally { globalThis.fetch = original; } }
test('unapproved long lines fail instead of silently dropping decision text; control tags are stripped', async () => {
  assert.equal(sanitizeLine('[whisper] <speak>Gus<|speaker_id_7|> says hi</speak>'), 'Gus says hi');
  let calls = 0;
  await withFetch(async () => { calls++; return audio(); }, async () => { await assert.rejects(speak('x'.repeat(301), 'idle', { noCache: true }), VoiceError); assert.equal(calls, 0); });
});
test('canonical call envelope keeps the entire exact decision, with no fake cache proof', async () => {
  const line = 'This is a simulated hold. '.repeat(16) + 'The exact deposit is 140 US dollars. Review before approving.';
  let posted = '';
  await withFetch(async (_u, init) => { posted = String(init!.body); return audio(); }, async () => {
    const r = await speak(line, 'idle', { noCache: true, maxChars: 1500 }); assert.equal(r.cached, false); assert.ok(posted.includes('140 US dollars')); assert.ok(posted.includes('Review before approving.')); assert.equal(r.audio.length, 1800);
  });
});
test('quota/credit failure stops the voice chain and redacts credentials', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return new Response(process.env.FISH_AUDIO_API_KEY!, { status: 402 }); }, async () => {
    await assert.rejects(speak('Credit guard probe.', 'idle', { noCache: true }), e => e instanceof VoiceError && e.attempts.length === 1 && !JSON.stringify(e.attempts).includes(process.env.FISH_AUDIO_API_KEY!)); assert.equal(calls, 1);
  });
});
test('non-audio payloads cannot be cached or presented as synthesized speech', async () => {
  await withFetch(async () => new Response('x'.repeat(1800), { status: 200, headers: { 'content-type': 'text/html' } }), async () => { await assert.rejects(speak('Wrong MIME test.', 'idle', { noCache: true }), VoiceError); });
});
test('bounded voice deadline aborts a hung provider and an already-aborted parent makes no request', async () => {
  const started = Date.now(); let calls = 0;
  await withFetch(async (_u, init) => { calls++; return new Promise((_, reject) => { init!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); }); }, async () => {
    await assert.rejects(speak('Deadline test.', 'idle', { noCache: true, budgetMs: 1000 }), VoiceError); assert.ok(Date.now() - started < 3000);
    const c = new AbortController(); c.abort(); await assert.rejects(speak('Canceled test.', 'idle', { noCache: true, signal: c.signal }), VoiceError); assert.equal(calls, 1);
  });
});
test('canonical markup cannot silently drop a room-name or decision fact',async()=>{
 await assert.rejects(speak('Review Room [Stage Two], 140 US dollars.','idle',{requireExactText:true}),/silently dropped/);
});
