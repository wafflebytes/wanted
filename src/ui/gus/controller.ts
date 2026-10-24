/**
 * The one place that drives Gus: the mic, the ask, his voice, and what an answer does.
 *
 * Hold Gus and talk. A short silence after you've spoken sends it while you're still
 * holding; if the answer lands before you let go, Gus just takes you there. Let go early
 * and he keeps working in the background, then asks before going anywhere.
 */
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { api, apiOrigin } from '../api';
import { haptic } from '../haptics';
import { sayLine, stopVoice, type VoiceMood } from '../voice';
import { gus, type GusAction, type GusAnswer } from './store';

const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const SPEECH_DB = -38;
const SILENCE_DB = -46;
const SILENCE_MS = 1100;
const MAX_MS = 20_000;

const TAB_PATH: Record<Extract<GusAction, { type: 'tab' }>['tab'], string> = { map: '', tour: '/tour', pulse: '/pulse', posters: '/posters' };

/** dBFS (about -60..0) to a 0..1 level with a little headroom. */
const level = (db: number | undefined) => (db === undefined ? 0 : Math.max(0, Math.min(1, (db + 55) / 45)));

export function useGusController(slug: string) {
  const recorder = useAudioRecorder(OPTIONS);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const spoke = useRef(false);
  const quietSince = useRef<number | null>(null);
  const startedAt = useRef(0);
  const sending = useRef(false);
  const run = useRef(0);

  useEffect(() => {
    const go = (a: GusAction) => {
      haptic.tap();
      if (a.type === 'link') {
        WebBrowser.openBrowserAsync(a.url).catch(() => {});
        return;
      }
      if (a.type === 'tab') {
        router.navigate(`/a/${slug}${TAB_PATH[a.tab]}` as never);
        return;
      }
      router.navigate(`/a/${slug}` as never);
      // Give the Map tab a beat to mount before it dives.
      setTimeout(() => gus.emitCity(a.id, a.type === 'pitch' ? 'pitch' : undefined), 250);
    };

    const speak = async (line: string, mood: VoiceMood | 'reading' | 'wave' = 'idle') => {
      const m: VoiceMood = mood === 'reading' ? 'thinking' : mood === 'wave' ? 'proud' : mood;
      gus.set({ speaking: true });
      try {
        await sayLine(line, m, () => gus.set({ speaking: false }));
      } catch {
        gus.set({ speaking: false });
      }
    };

    const land = (a: GusAnswer, id: number) => {
      if (id !== run.current) return;
      const holding = gus.get().holding;
      gus.set({ phase: 'answer', answer: a, level: 0, error: null, mood: a.mood === 'thinking' ? 'thinking' : a.mood });
      haptic.success();
      speak(a.reply, a.mood === 'thinking' ? 'thinking' : a.mood);
      // Still holding: Gus doesn't ask, he drives. Links always ask (they leave the app).
      if (holding && a.action && a.action.type !== 'link') {
        go(a.action);
        gus.set({ answer: { ...a, action: null } });
      }
    };

    const fail = (msg: string) => {
      gus.set({ phase: 'answer', answer: null, error: msg, level: 0 });
      haptic.warn();
    };

    const send = async (uri: string | null) => {
      const id = ++run.current;
      gus.set({ phase: 'thinking', level: 0 });
      try {
        if (!uri) throw new Error('Gus didn’t hear anything.');
        const form = new FormData();
        if (Platform.OS === 'web') form.append('audio', await (await fetch(uri)).blob(), 'ask.webm');
        else form.append('audio', { uri, name: 'ask.m4a', type: 'audio/m4a' } as unknown as Blob);
        form.append('screen', gus.get().screen);
        const res = await fetch(`${apiOrigin()}/api/artist/${slug}/gus`, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Gus lost the thread.');
        land(data as GusAnswer, id);
      } catch (e) {
        if (id === run.current) fail(e instanceof Error ? e.message : 'Gus lost the thread.');
      } finally {
        sending.current = false;
      }
    };

    const stopPoll = () => {
      if (poll.current) clearInterval(poll.current);
      poll.current = null;
    };

    const finish = async (released: boolean) => {
      if (sending.current) return;
      if (gus.get().phase !== 'listening') return;
      sending.current = true;
      stopPoll();
      try {
        await recorder.stop();
      } catch {}
      const tooShort = Date.now() - startedAt.current < 500 || !spoke.current;
      if (tooShort) {
        sending.current = false;
        if (released) gus.set({ phase: 'card', level: 0 });
        else fail('I didn’t catch anything. Hold me and talk.');
        return;
      }
      haptic.tap();
      send(recorder.uri);
    };

    const start = async () => {
      stopVoice();
      gus.set({ speaking: false, error: null, answer: null });
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) return fail('Gus needs the mic to hear you. You can turn it on in Settings, or type instead.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'The mic is busy.');
      }
      if (!gus.get().holding) {
        // Let go while the mic was spinning up: treat it as a tap.
        try {
          await recorder.stop();
        } catch {}
        gus.set({ phase: 'card' });
        return;
      }
      spoke.current = false;
      quietSince.current = null;
      startedAt.current = Date.now();
      gus.set({ phase: 'listening', level: 0 });
      haptic.thump();
      poll.current = setInterval(() => {
        const st = recorder.getStatus();
        const db = st.metering;
        gus.set({ level: level(db) });
        if (db !== undefined && db > SPEECH_DB) {
          spoke.current = true;
          quietSince.current = null;
        } else if (spoke.current && db !== undefined && db < SILENCE_DB) {
          quietSince.current ??= Date.now();
          if (Date.now() - quietSince.current > SILENCE_MS) finish(false);
        }
        if (Date.now() - startedAt.current > MAX_MS) finish(false);
      }, 90);
    };

    const ask = async (text: string) => {
      const id = ++run.current;
      gus.set({ phase: 'thinking', error: null, answer: null });
      try {
        const a = await api.post<GusAnswer>(`/artist/${slug}/gus`, { text, screen: gus.get().screen });
        land(a, id);
      } catch (e) {
        if (id === run.current) fail(e instanceof Error ? e.message : 'Gus lost the thread.');
      }
    };

    gus.wire({
      start,
      stop: (released) => {
        if (gus.get().phase === 'listening') finish(released);
      },
      ask,
      act: (a) => {
        gus.dismiss();
        go(a);
      },
      speak: (line, mood) => speak(line, mood as VoiceMood),
    });
    return () => {
      stopPoll();
      gus.wire(null);
      stopVoice();
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, [recorder, slug]);

}
