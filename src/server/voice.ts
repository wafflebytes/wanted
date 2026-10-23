/**
 * Gus's voice: Fish Audio TTS with the "Verity" voice. Drama 3 takes plain-language
 * directions in square brackets; if it's unavailable (e.g. no API credit), S2.1 Pro reads
 * the same bracket cues. Audio is cached by text + direction + voice, so a line is
 * synthesized once. Only Gus's own lines are ever sent, never fan data.
 */
import { config } from './config';
import { stableHash } from './crypto';
import { one, run } from './db';
import { env, redact } from './env';
import { recordOutbound } from './outbound';

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
    .trim()
    .slice(0, 300);
}

export async function speak(line: string, mood: GusMood = 'idle'): Promise<{ audio: Buffer; mime: string; model: string; cached: boolean }> {
  const text = sanitizeLine(line);
  if (!text) throw new VoiceError('Nothing to say.', []);
  const direction = DIRECTIONS[mood] ?? DIRECTIONS.idle;
  const key = stableHash({ text, direction, voice: config.voice.referenceId, v: 1 });
  const hit = await one<{ audio: string; mime: string; model: string }>('select audio, mime, model from voice_cache where key = ?', [key]);
  if (hit) return { audio: Buffer.from(hit.audio, 'base64'), mime: hit.mime, model: hit.model, cached: true };

  const apiKey = env.fishKey;
  if (!apiKey) throw new VoiceError('FISH_AUDIO_API_KEY is not set.', []);
  const attempts: { model: string; status: number | null; error: string }[] = [];
  for (const model of config.voice.models) {
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
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', model },
        body,
        signal: controller.signal,
      });
      const ctype = res.headers.get('content-type') ?? '';
      if (!res.ok || ctype.includes('json')) {
        const err = await res.text();
        attempts.push({ model, status: res.status, error: redact(err).slice(0, 160) });
        continue;
      }
      const audio = Buffer.from(await res.arrayBuffer());
      if (audio.length < 1000) {
        attempts.push({ model, status: res.status, error: 'audio too short' });
        continue;
      }
      await run(
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
