/**
 * Gus's shared state. He shows up in more than one place at once (every screen header, the
 * listening overlay, the dialog), so nothing lives in component state: one store, read with useGus().
 */
import { useSyncExternalStore } from 'react';
import type { GusMood } from '../components/Gus';

export type GusAction =
  | { type: 'tab'; tab: 'map' | 'tour' | 'pulse' | 'posters'; label: string }
  | { type: 'city'; id: string; name: string; label: string }
  | { type: 'pitch'; id: string; name: string; label: string }
  | { type: 'link'; url: string; label: string };

export type GusAnswer = { heard: string; reply: string; mood: 'idle' | 'proud' | 'unimpressed' | 'thinking'; action: GusAction | null; model: string };

export type GusPhase = 'idle' | 'listening' | 'thinking' | 'answer' | 'card';

type State = {
  phase: GusPhase;
  /** Mic level 0..1 while listening. */
  level: number;
  /** True while a finger is on Gus. */
  holding: boolean;
  answer: GusAnswer | null;
  error: string | null;
  /** What Gus says about the current screen when nobody's asking. */
  line: string | null;
  mood: GusMood;
  screen: string;
  speaking: boolean;
  /** You closed the dialog while he was still working: he keeps going from the header. */
  minimized: boolean;
};

let state: State = { phase: 'idle', level: 0, holding: false, answer: null, error: null, line: null, mood: 'idle', screen: 'map', speaking: false, minimized: false };
const subs = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  // A finished answer always comes back up for review.
  if (patch.phase === 'answer') state.minimized = false;
  subs.forEach((f) => f());
}

/** Wired by the controller (one per artist layout): starts and stops the mic. */
type Handlers = { start: () => void; stop: (released: boolean) => void; ask: (text: string) => void; act: (a: GusAction) => void; speak: (line: string, mood: GusMood) => void };
let handlers: Handlers | null = null;

/** City requests from Gus to the Map screen. */
type CityListener = (id: string, then?: 'pitch') => void;
const cityListeners = new Set<CityListener>();

export const gus = {
  get: () => state,
  set,
  wire(h: Handlers | null) {
    handlers = h;
  },
  /** A screen sets Gus's standing line (replaces inline Gus lines on every screen). */
  say(line: string | null, mood: GusMood = 'idle', screen?: string) {
    if (state.line === line && state.mood === mood) return;
    set({ line, mood, ...(screen ? { screen } : null) });
  },
  start: () => handlers?.start(),
  stop: (released: boolean) => handlers?.stop(released),
  ask: (text: string) => handlers?.ask(text),
  act: (a: GusAction) => handlers?.act(a),
  speak: (line: string, mood: GusMood = 'idle') => handlers?.speak(line, mood),
  openCard: () => set({ phase: 'card', error: null, minimized: false }),
  /** Closing mid-work tucks him into the header; otherwise it ends the conversation. */
  dismiss: () => (state.phase === 'thinking' ? set({ minimized: true }) : set({ phase: 'idle', answer: null, error: null, level: 0, minimized: false })),
  onCity(fn: CityListener) {
    cityListeners.add(fn);
    return () => void cityListeners.delete(fn);
  },
  emitCity(id: string, then?: 'pitch') {
    cityListeners.forEach((f) => f(id, then));
  },
};

export function useGus<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => pick(state),
    () => pick(state),
  );
}

