/** One uncached Fish Audio transport probe. Not a human voice/personality benchmark. */
import '../scripts/lib/env';
import { mkdirSync, writeFileSync } from 'node:fs';
import { speak, VoiceError } from '../src/server/voice';
import { setOutboundRecorder } from '../src/server/outbound';
import { redact } from '../src/server/env';
let requests = 0;
setOutboundRecorder(r => { if (r.kind === 'tts') requests++; });
const at = new Date().toISOString(), started = Date.now();
const text = "Maya, it's Gus. This is a simulated hold, not a venue agreement. Review the exact room, date and US dollar amount. Test mode only. Nothing moves without your OK.";
async function main() {
  mkdirSync('.data', { recursive: true });
  try {
    const r = await speak(text, 'idle', { noCache: true, budgetMs: 30_000, rail: process.argv.includes('--fish-direct') ? 'fish-direct' : 'auto' });
    writeFileSync('.data/voice-eval-latest.mp3', r.audio);
    const report = { at, passed: !r.cached && r.audio.length >= 1000 && requests > 0, scope: 'Uncached actual TTS transport (OpenRouter free Fish first, direct Fish fallback); no human prosody/intelligibility/native playback rating.', model: r.model, cached: r.cached, mime: r.mime, bytes: r.audio.length, requests, elapsedMs: Date.now() - started };
    writeFileSync('.data/voice-eval-latest.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } catch(e) {
    const report = { at, passed: false, scope: 'Voice provider availability only. No fallback counted as synthesized speech.', requests, elapsedMs: Date.now() - started, failure: redact(String(e)), attempts: e instanceof VoiceError ? e.attempts : [] };
    writeFileSync('.data/voice-eval-latest.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); process.exitCode = 1;
  } finally { setOutboundRecorder(undefined); }
}
main();
