/** Gus's voice on iOS and Android: download the MP3 from our server, then play it with expo-audio. */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { apiOrigin } from './api';
import * as Crypto from 'expo-crypto';
import { VoiceSessionGate, VoiceCanceled } from '../lib/voice-session';

export type VoiceMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it';

let current: AudioPlayer | null = null;
const gate = new VoiceSessionGate();

export async function sayLine(text: string, mood: VoiceMood = 'idle', onEnd?: () => void, source?: { artist: string; call: string }): Promise<{ model: string | null }> {
  stopVoice();
  const request = gate.begin();
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${mood}|${source ? `${source.artist}:${source.call}` : text}`);
  if (!request.active()) throw new VoiceCanceled();
  const file = new File(Paths.cache, `gus-${digest}.mp3`);
  let model: string | null = null;
  if (source || !file.exists) { // canonical calls always revalidate server scope
    const res = await fetch(`${apiOrigin()}/api/voice`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(source ? { ...source, mood } : { text, mood }), signal: request.signal });
    if (!res.ok) throw new Error('Gus lost his voice.');
    model = res.headers.get('X-Voice-Model');
    const audio = new Uint8Array(await res.arrayBuffer());
    if (!request.active()) throw new VoiceCanceled();
    file.write(audio);
  }
  if (!request.active()) throw new VoiceCanceled();
  const player = createAudioPlayer({ uri: file.uri });
  current = player;
  const sub = player.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) {
      sub.remove();
      player.remove();
      if (current === player) current = null;
      if (request.active()) onEnd?.();
    }
  });
  player.play();
  return { model };
}

export function stopVoice() {
  gate.cancel();
  if (current) {
    current.pause();
    current.remove();
    current = null;
  }
}
