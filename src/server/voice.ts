/**
 * Gus's voice: Fish Audio TTS with the "Verity" voice. Drama 3 takes plain-language
 * directions in square brackets; if it's unavailable (e.g. no API credit), S2.1 Pro reads
 * the same bracket cues. Audio is cached by text + direction + voice, so a line is
 * synthesized once. Only Gus's own lines are ever sent, never fan data.
 */
import { readAudioBounded } from './audio-transport';
import { config } from './config';
import { stableHash } from './crypto';
import { one, run } from './db';
import { env, redact } from './env';
import { recordOutbound } from './outbound';
import { openrouterSpeech, SpeechUnavailable, SPEECH_MODEL } from './openrouter-speech';

export type GusMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it';

export const DIRECTIONS: Record<GusMood, string> = {
  idle: 'gravelly veteran tour manager, dry and amused, unhurried',
  thinking: 'gravelly veteran tour manager, thinking out loud, low and focused',
  proud: 'gravelly veteran tour manager, quietly proud, warm grin in the voice',
  unimpressed: 'gravelly veteran tour manager, deadpan and unimpressed, slow',
  'losing-it': 'gravelly veteran tour manager, exasperated, half laughing, exploding a little',
};

export class VoiceError extends Error {
  constructor(
    message: string,
    public attempts: { model: string; status: number | null; error: string }[],
  ) {
    super(message);
  }
}

/** Strips anything that could act as a speaker or control tag from user-influenced text. */
export function sanitizeLine(text: string): string {
  return text
    .replace(/<\|[^|]*\|>/g, '')
    .replace(/<\/?[a-z]+>/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type VoiceOptions = { rail?: 'auto' | 'fish-direct' | 'openrouter'; noCache?: boolean; signal?: AbortSignal; budgetMs?: number; maxChars?: number; requireExactText?: boolean };
export async function speak(line: string, mood: GusMood = 'idle', options: VoiceOptions = {}): Promise<{ audio: Buffer; mime: string; model: string; cached: boolean }> {
  const text = sanitizeLine(line);
  if (options.requireExactText && text !== line) throw new VoiceError('Canonical speech contains control markup or unapproved normalization. Use the written review; no decision facts are silently dropped.', []);
  if (!text) throw new VoiceError('Nothing to say.', []);
  if (text.length > (options.maxChars ?? 300)) throw new VoiceError('The line exceeds its approved voice envelope. No decision text is silently truncated.', []);
  if (options.signal?.aborted) throw new VoiceError('Voice request canceled.', []);
  const deadline = Date.now() + Math.max(1000, Math.min(60_000, options.budgetMs ?? 45_000));
  const direction = DIRECTIONS[mood] ?? DIRECTIONS.idle;
  const key = stableHash({ text, direction, voice: config.voice.referenceId, rail: options.rail ?? 'auto', speechModel: SPEECH_MODEL, v: 2 });
  const hit = await one<{ audio: string; mime: string; model: string }>('select audio, mime, model from voice_cache where key = ?', [key]);
  if (hit && !options.noCache) return { audio: Buffer.from(hit.audio, 'base64'), mime: hit.mime, model: hit.model, cached: true };

  const attempts: { model: string; status: number | null; error: string }[] = [];
  if (options.rail !== 'fish-direct' && env.openrouterKeys.length) {
    try {
      const out = await openrouterSpeech(text, direction, { signal: options.signal, budgetMs: Math.min(25_000, deadline - Date.now()) });
      if (!options.noCache) await run('insert into voice_cache(key,model,mime,audio,created_at) values(?,?,?,?,?) on conflict(key) do update set model=excluded.model,mime=excluded.mime,audio=excluded.audio,created_at=excluded.created_at', [key,out.model,out.mime,out.audio.toString('base64'),Date.now()]);
      return { audio: out.audio, mime: out.mime, model: out.model, cached: false };
    } catch(e) { attempts.push(...(e instanceof SpeechUnavailable ? e.attempts : [{ model: SPEECH_MODEL, status: null, error: redact(String(e)) }])); }
  }
  if (options.rail === 'openrouter') throw new VoiceError('OpenRouter free speech did not complete.', attempts);
  const apiKey = env.fishKey;
  if (!apiKey) throw new VoiceError('No available speech rail; FISH_AUDIO_API_KEY is not set.', attempts);
  for (const model of config.voice.models) {
    const remaining = deadline - Date.now();
    if (remaining <= 0 || options.signal?.aborted) break;
    const body = JSON.stringify({
      text: `[${direction}] ${text}`,
      reference_id: config.voice.referenceId,
      format: 'mp3',
      mp3_bitrate: 128,
      latency: 'balanced',
      normalize: true,
    });
    recordOutbound({ kind: 'tts', url: 'https://api.fish.audio/v1/tts', body });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(15_000, remaining));
    try {
      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', model },
        body,
        signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
      });
      const ctype = res.headers.get('content-type') ?? '';
      if (!res.ok || ctype.includes('json')) {
        const err = await res.text();
        attempts.push({ model, status: res.status, error: redact(err).slice(0, 160) });
        if ([401, 402, 429].includes(res.status)) break;
        continue;
      }
      if (!ctype.startsWith('audio/')) { attempts.push({ model, status: res.status, error: 'Provider returned a non-audio payload.' }); continue; }
      const audio = await readAudioBounded(res);
      if (audio.length < 1000) {
        attempts.push({ model, status: res.status, error: 'audio too short' });
        continue;
      }
      if (!options.noCache) await run(
        `insert into voice_cache(key, model, mime, audio, created_at) values(?, ?, ?, ?, ?)
         on conflict(key) do update set audio = excluded.audio, model = excluded.model`,
        [key, model, 'audio/mpeg', audio.toString('base64'), Date.now()],
      );
      return { audio, mime: 'audio/mpeg', model, cached: false };
    } catch (err) {
      attempts.push({ model, status: null, error: controller.signal.aborted ? 'timeout' : redact(String(err)).slice(0, 160) });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new VoiceError('Gus lost his voice (every TTS model failed).', attempts);
}
