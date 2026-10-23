/** Gus's voice on the web: fetch the MP3 from our server (Fish Audio, Verity) and play it. */
import { apiOrigin } from './api';

let current: HTMLAudioElement | null = null;
const urls = new Map<string, string>();

export type VoiceMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it';

export async function sayLine(text: string, mood: VoiceMood = 'idle', onEnd?: () => void): Promise<{ model: string | null }> {
  stopVoice();
  const key = `${mood}|${text}`;
  let url = urls.get(key);
  let model: string | null = null;
  if (!url) {
    const res = await fetch(`${apiOrigin()}/api/voice`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, mood }) });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Gus lost his voice.');
    model = res.headers.get('X-Voice-Model');
    url = URL.createObjectURL(await res.blob());
    urls.set(key, url);
  }
  const audio = new Audio(url);
  current = audio;
  audio.onended = () => {
    if (current === audio) current = null;
    onEnd?.();
  };
  await audio.play();
  return { model };
}

export function stopVoice() {
  if (current) {
    current.pause();
    current = null;
  }
}
