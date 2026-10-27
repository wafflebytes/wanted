/** OpenRouter's speech API is a distinct transport, never a chat-completion imitation.
 * Catalog verified with output_modalities=speech. Free model only, raw MP3 response.
 * Namespace speech backoff separately: chat's free daily quota is not assumed to be TTS quota. */
import { readAudioBounded } from './audio-transport';
import { config } from './config';
import { env, redact } from './env';
import { stableHash } from './crypto';
import { kvGet, kvSet } from './db';
import { recordOutbound } from './outbound';
export const SPEECH_MODEL = 'fish-audio/s2.1-pro-free:free';
export type SpeechOptions = { signal?: AbortSignal; budgetMs?: number };
export class SpeechUnavailable extends Error { constructor(public attempts: { model: string; status: number | null; error: string }[]) { super('OpenRouter speech unavailable.'); } }
const blockKey = (key: string) => `speech-quota:${stableHash({ provider: 'openrouter-speech', credential: key })}`;
export async function resetSpeechBackoffForTests() { for (const key of env.openrouterKeys) await kvSet(blockKey(key), { until: 0 }); }
export async function openrouterSpeech(text: string, instructions: string, options: SpeechOptions = {}) {
  const attempts: SpeechUnavailable['attempts'] = [];
  const deadline = Date.now() + Math.max(1000, Math.min(45_000, options.budgetMs ?? 25_000));
  for (const [slot, key] of env.openrouterKeys.entries()) {
    if (options.signal?.aborted || Date.now() >= deadline) break;
    const block = await kvGet<{ until: number }>(blockKey(key));
    if (block && block.until > Date.now()) { attempts.push({ model: SPEECH_MODEL, status: null, error: `Speech credential slot ${slot + 1} in private backoff.` }); continue; }
    const body = JSON.stringify({ model: SPEECH_MODEL, input: text, voice: config.voice.referenceId, instructions, response_format: 'mp3' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(20_000, Math.max(1, deadline - Date.now())));
    try {
      recordOutbound({ kind: 'tts', url: 'https://openrouter.ai/api/v1/audio/speech', body });
      const response = await fetch('https://openrouter.ai/api/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': env.publicOrigin, 'X-Title': 'Wanted Gus voice' }, body, signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal });
      if (!response.ok) {
        const error = redact(await response.text()).slice(0, 200);
        attempts.push({ model: SPEECH_MODEL, status: response.status, error: `slot ${slot + 1}: ${error}` });
        if ([401, 402, 403, 429].includes(response.status)) {
          const retry = Number(response.headers.get('retry-after'));
          const daily = /per.day|daily/i.test(error);
          const ms = Number.isFinite(retry) && retry > 0 ? Math.min(86_400_000, retry * 1000) : [401,403].includes(response.status) || response.status === 402 || daily ? 86_400_000 : 60_000;
          await kvSet(blockKey(key), { until: Date.now() + ms }); continue;
        }
        break; // bad voice/options or upstream issue is not fixed by another credential
      }
      const mime = response.headers.get('content-type') ?? '';
      if (!/^audio\/(mpeg|mp3)/i.test(mime)) throw new Error('Speech endpoint did not return MP3 audio. No JSON/prose counted as speech.');
      const audio = await readAudioBounded(response);
      if (audio.length < 1000) throw new Error('Speech audio is too short to establish a usable clip.');
      return { audio, mime: 'audio/mpeg', model: SPEECH_MODEL, generationId: response.headers.get('x-generation-id'), attempts };
    } catch(e) {
      attempts.push({ model: SPEECH_MODEL, status: null, error: controller.signal.aborted ? 'Speech transport timed out.' : redact(String(e)).slice(0, 180) });
      break; // don't multiply a hung request across the credential pool
    } finally { clearTimeout(timer); }
  }
  throw new SpeechUnavailable(attempts);
}
