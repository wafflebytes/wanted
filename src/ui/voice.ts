/** Gus's voice on iOS and Android: download the MP3 from our server, then play it with expo-audio. */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { apiOrigin } from './api';

export type VoiceMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it';

let current: AudioPlayer | null = null;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export async function sayLine(text: string, mood: VoiceMood = 'idle', onEnd?: () => void): Promise<{ model: string | null }> {
  stopVoice();
  const file = new File(Paths.cache, `gus-${hash(`${mood}|${text}`)}.mp3`);
  let model: string | null = null;
  if (!file.exists) {
    const res = await fetch(`${apiOrigin()}/api/voice`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, mood }) });
    if (!res.ok) throw new Error('Gus lost his voice.');
    model = res.headers.get('X-Voice-Model');
    file.write(new Uint8Array(await res.arrayBuffer()));
  }
  const player = createAudioPlayer({ uri: file.uri });
  current = player;
  const sub = player.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) {
      sub.remove();
      player.remove();
      if (current === player) current = null;
      onEnd?.();
    }
  });
  player.play();
  return { model };
}

export function stopVoice() {
  if (current) {
    current.pause();
    current.remove();
    current = null;
  }
}
