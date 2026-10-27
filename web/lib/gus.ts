'use client';
/**
 * Gus on the web: one store for the island, the tiles, the voice card and the tray.
 * Hold the Gus button to talk (MediaRecorder + a level meter); tap it for the action tiles.
 * Every ask streams from /artist/:slug/gus: what he heard, each lookup, then an answer that
 * carries one action (a city, a tab, a room to ask).
 */
import { useSyncExternalStore } from 'react';
import { streamNdjson } from './api';
import type { GusMood } from '@web/components/Gus';

export type GusAction =
  | { type: 'tab'; tab: 'map' | 'tour' | 'pulse' | 'posters'; label: string }
  | { type: 'city'; id: string; name: string; label: string }
  | { type: 'pitch'; id: string; name: string; label: string }
  | { type: 'deal'; id: string; name: string; roomId: string; label: string }
  | { type: 'link'; url: string; label: string };
export type GusStep = { id: string; tool: string; label: string; source: 'qloo' | 'fans' | 'wanted'; status: 'running' | 'done' | 'failed'; found: string | null; ms: number };
export type GusAnswer = { heard: string; reply: string; mood: 'idle' | 'proud' | 'unimpressed' | 'thinking'; action: GusAction | null; model: string; steps?: GusStep[] };

export type Panel = 'none' | 'tiles' | 'voice' | 'tray';
export type Phase = 'idle' | 'listening' | 'thinking' | 'answer';

type State = {
  slug: string | null;
  panel: Panel;
  phase: Phase;
  level: number;
  holding: boolean;
  heard: string | null;
  steps: GusStep[];
  answer: GusAnswer | null;
  error: string | null;
  speaking: boolean;
  /** What the island says when Gus isn't mid-ask: set by the shell from deals and the logbook. */
  ambient: { words: string; mood: GusMood; tone: 'idle' | 'live' | 'ask' | 'ok' };
  /** Instant acknowledgement: a short-lived island override ("On it"). */
  flash: string | null;
  screen: string;
};

let state: State = {
  slug: null,
  panel: 'none',
  phase: 'idle',
  level: 0,
  holding: false,
  heard: null,
  steps: [],
  answer: null,
  error: null,
  speaking: false,
  ambient: { words: 'Watching your cities', mood: 'idle', tone: 'idle' },
  flash: null,
  screen: 'map',
};
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};

type Nav = (a: GusAction) => void;
let navigate: Nav = () => {};
let run = 0;
let flashTimer: ReturnType<typeof setTimeout> | null = null;

// ---------- mic
let rec: MediaRecorder | null = null;
let chunks: Blob[] = [];
let meter: { ctx: AudioContext; raf: number; stream: MediaStream } | null = null;
let spoke = false;
let quietSince: number | null = null;
let startedAt = 0;

async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (!state.holding) {
      stream.getTracks().forEach((t) => t.stop());
      return set({ panel: 'tiles' });
    }
    chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(100);
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    spoke = false;
    quietSince = null;
    startedAt = Date.now();
    const tick = () => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / buf.length);
      const level = Math.min(1, rms * 5.5);
      set({ level });
      if (level > 0.16) {
        spoke = true;
        quietSince = null;
      } else if (spoke && level < 0.07) {
        quietSince ??= Date.now();
        if (Date.now() - quietSince > 1100) return finish(false);
      }
      if (Date.now() - startedAt > 20_000) return finish(false);
      if (meter) meter.raf = requestAnimationFrame(tick);
    };
    meter = { ctx, raf: requestAnimationFrame(tick), stream };
    set({ phase: 'listening', panel: 'voice', error: null, answer: null, heard: null, steps: [] });
  } catch {
    set({ panel: 'voice', phase: 'answer', error: 'Gus needs the mic to hear you. Allow it in the browser, or type instead.' });
  }
}

function stopMic(): Promise<Blob | null> {
  if (meter) {
    cancelAnimationFrame(meter.raf);
    meter.stream.getTracks().forEach((t) => t.stop());
    meter.ctx.close().catch(() => {});
    meter = null;
  }
  const r = rec;
  rec = null;
  if (!r || r.state === 'inactive') return Promise.resolve(null);
  return new Promise((res) => {
    r.onstop = () => res(chunks.length ? new Blob(chunks, { type: r.mimeType || 'audio/webm' }) : null);
    r.stop();
  });
}

let finishing = false;
async function finish(released: boolean) {
  if (finishing || state.phase !== 'listening') return;
  finishing = true;
  const short = Date.now() - startedAt < 500 || !spoke;
  const blob = await stopMic();
  finishing = false;
  set({ level: 0 });
  if (short || !blob) {
    if (released) return set({ phase: 'idle', panel: 'tiles' });
    return set({ phase: 'answer', error: 'I didn’t catch that. Hold me and talk, or type.' });
  }
  const form = new FormData();
  form.append('audio', blob, blob.type.includes('mp4') ? 'ask.m4a' : 'ask.webm');
  form.append('screen', state.screen);
  send(form);
}

// ---------- voice out
let audio: HTMLAudioElement | null = null;
async function speak(text: string, mood: string) {
  try {
    audio?.pause();
    const res = await fetch('/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, mood: mood === 'unimpressed' ? 'unimpressed' : mood === 'proud' ? 'proud' : 'idle' }) });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    audio = new Audio(url);
    set({ speaking: true });
    audio.onended = () => set({ speaking: false });
    await audio.play();
  } catch {
    set({ speaking: false });
  }
}

// ---------- asks
async function send(body: FormData | { text: string; screen: string }) {
  const id = ++run;
  set({ phase: 'thinking', panel: state.panel === 'none' ? 'voice' : state.panel, error: null, answer: null, steps: [], heard: body instanceof FormData ? null : body.text });
  let answer: GusAnswer | null = null;
  let failed: string | null = null;
  try {
    await streamNdjson<{ type: string; text?: string; step?: GusStep; answer?: GusAnswer; error?: string }>(`/artist/${state.slug}/gus?stream=1`, body, (e) => {
      if (id !== run) return;
      if (e.type === 'heard') set({ heard: e.text ?? '' });
      else if (e.type === 'step' && e.step) {
        const s = e.step;
        const i = state.steps.findIndex((x) => x.id === s.id);
        set({ steps: i < 0 ? [...state.steps, s] : state.steps.map((x, j) => (j === i ? s : x)) });
      } else if (e.type === 'answer' && e.answer) answer = e.answer;
      else if (e.type === 'error') failed = e.error ?? 'Gus lost the thread.';
    });
  } catch (e) {
    failed = e instanceof Error ? e.message : 'Gus lost the thread.';
  }
  if (id !== run) return;
  if (failed || !answer) return set({ phase: 'answer', error: failed ?? 'Gus lost the thread.' });
  const a = answer as GusAnswer;
  set({ phase: 'answer', answer: a });
  speak(a.reply, a.mood);
  // Still holding when the answer lands: he just takes you there (links always ask first).
  if (state.holding && a.action && a.action.type !== 'link') act(a.action);
}

function act(a: GusAction) {
  set({ panel: 'none', phase: 'idle', answer: null });
  navigate(a);
}

export const gus = {
  get: () => state,
  set,
  wire(slug: string, nav: Nav) {
    if (state.slug !== slug) set({ slug });
    navigate = nav;
  },
  /** Island acknowledgement inside 100 ms, before the server answers. */
  flash(words: string, ms = 1600) {
    if (flashTimer) clearTimeout(flashTimer);
    set({ flash: words });
    flashTimer = setTimeout(() => set({ flash: null }), ms);
  },
  press() {
    set({ holding: true });
  },
  /** Held long enough: open the mic. */
  hold() {
    audio?.pause();
    set({ speaking: false });
    startMic();
  },
  release(wasHold: boolean) {
    set({ holding: false });
    if (!wasHold) return set({ panel: state.panel === 'tiles' ? 'none' : 'tiles' });
    if (state.phase === 'listening') finish(true);
  },
  ask(text: string) {
    if (!text.trim()) return;
    gus.flash('On it');
    send({ text: text.trim(), screen: state.screen });
  },
  act,
  open: (p: Panel) => set({ panel: p, ...(p === 'voice' ? {} : { error: null }) }),
  close() {
    if (state.phase === 'listening') stopMic();
    audio?.pause();
    set({ panel: 'none', speaking: false, ...(state.phase === 'thinking' ? {} : { phase: 'idle', answer: null, error: null }) });
  },
  screen: (s: string) => state.screen !== s && set({ screen: s }),
  ambient: (a: State['ambient']) => {
    const c = state.ambient;
    if (c.words !== a.words || c.mood !== a.mood || c.tone !== a.tone) set({ ambient: a });
  },
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useGus() {
  return useSyncExternalStore(gus.subscribe, gus.get, gus.get);
}
