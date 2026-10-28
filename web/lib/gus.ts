'use client';
/**
 * Gus on the web: one store for the island, the tiles, the voice card and the tray.
 * Tap the Gus button and talk (he listens until you pause), or hold it and let go when done.
 * The jobs he can do sit in the voice sheet as suggestions, with the full grid one tap away.
 * Every ask streams from /artist/:slug/gus: what he heard, each lookup, then an answer that
 * carries one action (a city, a tab, a room to ask).
 */
import { useSyncExternalStore } from 'react';
import { streamNdjson } from './api';
import type { GusMood } from '@web/components/Gus';
import { haptic } from './haptics';

export type GusAction =
  | { type: 'tab'; tab: 'map' | 'tour' | 'pulse' | 'posters'; label: string }
  | { type: 'city'; id: string; name: string; label: string }
  | { type: 'pitch'; id: string; name: string; label: string }
  | { type: 'deal'; id: string; name: string; roomId: string; label: string }
  | { type: 'link'; url: string; label: string }
  | { type: 'limit'; key: 'maxDeposit' | 'minSplit'; value: number; label: string }
  | { type: 'quiet'; start: number; end: number; label: string }
  | { type: 'spots'; id: string; name: string; spots: Spot[]; label: string }
  | { type: 'night'; id: string; name: string; current: string; nights: Night[]; label: string }
  | { type: 'draw'; id: string; name: string; prize: string; signers: number; chances: number; seal: string; label: string }
  | {
      type: 'swap';
      id: string;
      name: string;
      label: string;
      stopIndex: number;
      stop: { id: string; name: string; state: string; date: string; rank: number | null };
      route: { id: string; name: string; lat: number; lon: number }[];
      options: SwapCity[];
    };
export type SwapCity = { id: string; name: string; state: string; lat: number; lon: number; sleeper: boolean; rank: number | null; signatures: number; driveDelta: number };
export type Night = { date: string; day: string; open: number; venues: number };
export type Spot = { id: string; name: string; neighborhood: string | null; address: string | null; lat: number | null; lon: number | null };
export type GusStep = { id: string; tool: string; label: string; source: 'qloo' | 'fans' | 'wanted'; status: 'running' | 'done' | 'failed'; found: string | null; ms: number };
export type GusAnswer = { heard: string; reply: string; mood: 'idle' | 'proud' | 'unimpressed' | 'thinking'; action: GusAction | null; model: string; steps?: GusStep[] };

export type Panel = 'none' | 'tiles' | 'voice' | 'tray' | 'room';
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
  /** The browser said no to the mic (or has none): the sheet types instead, quietly. */
  noMic: boolean;
  /** How far through his spoken reply Gus is, 0 to 1: captions light up word by word with it. */
  spoken: number;
  /** A line Gus says while he works ("Let me look at Burlington and Ithaca"). */
  aside: string | null;
  /** What the island says when Gus isn't mid-ask: set by the shell from deals and the logbook. */
  ambient: { words: string; mood: GusMood; tone: 'idle' | 'live' | 'ask' | 'ok' };
  /** Instant acknowledgement: a short-lived island override ("On it"). */
  flash: string | null;
  /** What you just opened, said in the island for a moment as it swells and settles back. */
  glance: string | null;
  /** What Gus just changed, with a way back, shown beside the island for a few seconds. */
  undo: { words: string; run: () => void } | null;
  screen: string;
  /** First time the Gus button is tapped: show what he does and how to talk, mic still off. */
  intro: boolean;
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
  noMic: false,
  spoken: 0,
  aside: null,
  ambient: { words: 'Watching your cities', mood: 'idle', tone: 'idle' },
  flash: null,
  glance: null,
  undo: null,
  screen: 'map',
  intro: false,
};
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};

type Nav = (a: GusAction) => void;
let navigate: Nav = () => {};
let run = 0;
let undoTimer: ReturnType<typeof setTimeout> | null = null;
let flashTimer: ReturnType<typeof setTimeout> | null = null;
let glanceTimer: ReturnType<typeof setTimeout> | null = null;

/** Has this browser been shown what Gus does? Until then a tap introduces him instead of opening the mic. */
const INTRO = 'wanted-gus-met';
const met = () => {
  try {
    return localStorage.getItem(INTRO) === '1';
  } catch {
    return true;
  }
};
const meet = () => {
  try {
    localStorage.setItem(INTRO, '1');
  } catch {}
};

// ---------- mic
let rec: MediaRecorder | null = null;
let chunks: Blob[] = [];
let meter: { ctx: AudioContext; raf: number; stream: MediaStream } | null = null;
let spoke = false;
let quietSince: number | null = null;
let startedAt = 0;
/** Tapped rather than held: listen until a pause, no finger on the glass. */
let handsfree = false;

async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (!state.holding && !handsfree) {
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
    set({ phase: 'listening', panel: 'voice', error: null, answer: null, heard: null, steps: [], aside: null, spoken: 0, intro: false });
    meet();
    haptic('hold');
  } catch {
    handsfree = false;
    set({ panel: 'voice', phase: 'idle', noMic: true, error: null });
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
  handsfree = false;
  const short = Date.now() - startedAt < 500 || !spoke;
  const blob = await stopMic();
  finishing = false;
  set({ level: 0 });
  if (short || !blob) {
    if (released) return set({ phase: 'idle', panel: 'tiles' });
    return set({ phase: 'answer', error: 'I didn’t catch that. Hold me and talk, or type.' });
  }
  haptic('heard');
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
    const a = new Audio(url);
    audio = a;
    set({ speaking: true, spoken: 0 });
    const follow = () => {
      if (audio !== a) return;
      if (a.duration) set({ spoken: Math.min(1, a.currentTime / a.duration) });
      if (!a.paused && !a.ended) requestAnimationFrame(follow);
    };
    a.onplay = () => requestAnimationFrame(follow);
    a.onended = () => set({ speaking: false, spoken: 1 });
    await a.play();
  } catch {
    set({ speaking: false, spoken: 1 });
  }
}

// ---------- asks
/** The last few exchanges, so "book me a room there" follows on. Forgotten after five quiet minutes. */
let turns: { heard: string; reply: string; at: number }[] = [];
const recent = () => turns.filter((t) => Date.now() - t.at < 300_000).slice(-3).map(({ heard, reply }) => ({ heard, reply }));

async function send(body: FormData | { text: string; screen: string; history?: { heard: string; reply: string }[] }) {
  if (body instanceof FormData) body.append('history', JSON.stringify(recent()));
  else body.history = recent();
  const id = ++run;
  set({ phase: 'thinking', panel: state.panel === 'none' || state.panel === 'tiles' ? 'voice' : state.panel, error: null, answer: null, steps: [], aside: null, spoken: 0, heard: body instanceof FormData ? null : body.text });
  let answer: GusAnswer | null = null;
  let failed: string | null = null;
  try {
    await streamNdjson<{ type: string; text?: string; step?: GusStep; answer?: GusAnswer; error?: string }>(`/artist/${state.slug}/gus?stream=1`, body, (e) => {
      if (id !== run) return;
      if (e.type === 'heard') set({ heard: e.text ?? '' });
      else if (e.type === 'say' && e.text) set({ aside: e.text });
      else if (e.type === 'step' && e.step) {
        const s = e.step;
        if (s.status === 'done') haptic('step');
        const i = state.steps.findIndex((x) => x.id === s.id);
        set({ steps: i < 0 ? [...state.steps, s] : state.steps.map((x, j) => (j === i ? s : x)) });
      } else if (e.type === 'answer' && e.answer) answer = e.answer;
      else if (e.type === 'error') failed = e.error ?? 'Gus lost the thread.';
    });
  } catch (e) {
    failed = e instanceof Error ? e.message : 'Gus lost the thread.';
  }
  if (id !== run) return;
  if (failed || !answer) {
    haptic('error');
    return set({ phase: 'answer', error: failed ?? 'Gus lost the thread.' });
  }
  const a = answer as GusAnswer;
  haptic('answer');
  set({ phase: 'answer', answer: a, spoken: 0 });
  if (a.heard && a.reply) turns = [...turns.slice(-4), { heard: a.heard, reply: a.reply, at: Date.now() }];
  speak(a.reply, a.mood);
  // Still holding when the answer lands: he just takes you there (links always ask first).
  if (state.holding && a.action && (a.action.type === 'city' || a.action.type === 'tab' || a.action.type === 'pitch' || a.action.type === 'deal')) act(a.action);
}

function act(a: GusAction) {
  set({ panel: 'none', phase: 'idle', answer: null });
  navigate(a);
  // Say what he just did, where you'll look: the island.
  const did = a.type === 'city' ? `Opened ${a.name}` : a.type === 'pitch' ? `Writing ${a.name}’s pitch` : a.type === 'deal' ? `Asking ${a.label.replace(/^Ask /, '').replace(/ for a date$/, '')}` : a.type === 'tab' ? `Here’s ${a.label.replace(/^(Go to|Open) /, '')}` : null;
  if (did) gus.flash(did, 2400);
}

export const gus = {
  get: () => state,
  set,
  wire(slug: string, nav: Nav) {
    if (state.slug !== slug) set({ slug });
    navigate = nav;
  },
  /** Island acknowledgement inside 100 ms, before the server answers. */
  /** Gus changed something reversible: say it by the island with Undo, then let it settle. */
  did(words: string, run: () => void, ms = 6000) {
    if (undoTimer) clearTimeout(undoTimer);
    // What it was busy saying ("Swapping…") is done: the Undo line replaces it.
    if (flashTimer) clearTimeout(flashTimer);
    set({ undo: { words, run }, flash: null });
    undoTimer = setTimeout(() => set({ undo: null }), ms);
  },
  undo() {
    const u = state.undo;
    if (!u) return;
    if (undoTimer) clearTimeout(undoTimer);
    set({ undo: null });
    u.run();
  },
  flash(words: string, ms = 1600) {
    if (flashTimer) clearTimeout(flashTimer);
    set({ flash: words });
    flashTimer = setTimeout(() => set({ flash: null }), ms);
  },
  glance(words: string, ms = 1800) {
    if (glanceTimer) clearTimeout(glanceTimer);
    set({ glance: words });
    glanceTimer = setTimeout(() => set({ glance: null }), ms);
  },
  press() {
    set({ holding: true });
  },
  /** Tap to talk: open the sheet and listen until a pause. Tapping again sends it now. */
  talk() {
    if (state.phase === 'listening') return void finish(false);
    audio?.pause();
    set({ speaking: false, panel: 'voice' });
    handsfree = true;
    startMic();
  },
  /** Stop his voice mid-sentence (the captions finish at once). */
  hush() {
    audio?.pause();
    set({ speaking: false, spoken: 1 });
  },
  /** Held long enough: open the mic. */
  hold() {
    audio?.pause();
    set({ speaking: false });
    startMic();
  },
  release(wasHold: boolean) {
    set({ holding: false });
    if (!wasHold) {
      // Voice first: a tap talks. Tapping again sends what he heard; on an open sheet it closes.
      if (state.phase === 'listening') return void finish(false);
      if (state.panel === 'voice' || state.panel === 'tiles' || state.panel === 'room') return gus.close();
      // The very first tap: meet Gus (what he does, how to talk) before any mic prompt.
      if (!met()) return set({ panel: 'voice', phase: 'idle', intro: true, answer: null, error: null, heard: null, steps: [] });
      return gus.talk();
    }
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
    if (state.intro) meet();
    if (state.phase === 'listening') stopMic();
    audio?.pause();
    set({ panel: 'none', speaking: false, intro: false, ...(state.phase === 'thinking' ? {} : { phase: 'idle', answer: null, error: null }) });
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
