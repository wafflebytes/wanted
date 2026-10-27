/** Gus's voice on the web: fetch the MP3 from our server (Fish Audio, Verity) and play it. */
import { apiOrigin } from './api';
import { VoiceSessionGate, VoiceCanceled } from '../lib/voice-session';

let current: HTMLAudioElement | null = null;
const gate = new VoiceSessionGate();
const urls = new Map<string, string>();

export type VoiceMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it';

export async function sayLine(text: string, mood: VoiceMood = 'idle', onEnd?: () => void, source?: { artist: string; call: string }): Promise<{ model: string | null }> {
  stopVoice();
  const request = gate.begin();
  const key = `${mood}|${source ? `${source.artist}:${source.call}` : text}`;
  let url = urls.get(key);
  let model: string | null = null;
  if (source || !url) { // canonical calls always revalidate server scope, even with cached audio
    const res = await fetch(`${apiOrigin()}/api/voice`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(source ? { ...source, mood } : { text, mood }), signal: request.signal });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Gus lost his voice.');
    model = res.headers.get('X-Voice-Model');
    const blob = await res.blob();
    if (!request.active()) throw new VoiceCanceled();
    url = URL.createObjectURL(blob);
    const previous = urls.get(key); if (previous) URL.revokeObjectURL(previous);
    urls.set(key, url);
    if (urls.size > 32) { const oldest = urls.keys().next().value!; const stale = urls.get(oldest)!; urls.delete(oldest); URL.revokeObjectURL(stale); }
  }
  if (!request.active()) throw new VoiceCanceled();
  const audio = new Audio(url);
  current = audio;
  audio.onended = () => {
    if (current === audio) current = null;
    if (request.active()) onEnd?.();
  };
  await audio.play();
  return { model };
}

export function stopVoice() {
  gate.cancel();
  if (current) {
    current.pause();
    current = null;
  }
}
