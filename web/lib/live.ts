'use client';
/**
 * Live activities: what the island carries while Gus works. Each one is a job in progress
 * (Gus on a call, a deal waiting on you, a settle-up, a show day) with a short compact form for
 * the pill, an expanded form with its numbers and one or two keys, and a "bump" that swells the
 * island for a moment when something lands (Bump's place counter, Pocket Casts' mini player).
 *
 * The shell puts the deal ones; a page puts its own while it's open and drops it when it ends.
 */
import { useSyncExternalStore } from 'react';
import type { IconName } from '@web/components/Icon';

export type LiveKey = { label: string; run: () => void; primary?: boolean };
export type Activity = {
  id: string;
  /** Higher shows first; a deal waiting on you outranks a call in progress. */
  rank: number;
  tone: 'live' | 'ask' | 'ok' | 'idle';
  /** Gus's face, or an object icon for jobs that aren't a conversation. */
  lead: 'gus' | IconName;
  /** Compact: four words at most. */
  title: string;
  /** Compact, right side: a number or a time. */
  trail?: string;
  /** 0 to 1: a ring around the trailing end. */
  progress?: number;
  /** Expanded */
  kicker: string;
  head: string;
  line: string;
  nums?: { k: string; v: string; tone?: 'ok' | 'ask' | 'hot' }[];
  keys?: LiveKey[];
};
export type Bump = { big: string; small: string; tone: Activity['tone'] };

type State = { list: Activity[]; bump: Bump | null; open: string | null };
let state: State = { list: [], bump: null, open: null };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
let bumpTimer: ReturnType<typeof setTimeout> | null = null;

const same = (a: Activity, b: Activity) => JSON.stringify({ ...a, keys: a.keys?.map((k) => k.label) }) === JSON.stringify({ ...b, keys: b.keys?.map((k) => k.label) });

export const live = {
  get: () => state,
  put(a: Activity) {
    const i = state.list.findIndex((x) => x.id === a.id);
    if (i >= 0 && same(state.list[i], a)) {
      state.list[i] = a; // keep the freshest key handlers without a re-render
      return;
    }
    const list = i >= 0 ? state.list.map((x) => (x.id === a.id ? a : x)) : [...state.list, a];
    set({ list: list.sort((x, y) => y.rank - x.rank) });
  },
  drop(id: string) {
    if (!state.list.some((x) => x.id === id)) return;
    set({ list: state.list.filter((x) => x.id !== id), open: state.open === id ? null : state.open });
  },
  /** The island swells for a moment with one number. */
  bump(b: Bump, ms = 2400) {
    if (bumpTimer) clearTimeout(bumpTimer);
    set({ bump: b });
    bumpTimer = setTimeout(() => set({ bump: null }), ms);
  },
  expand: (id: string | null) => set({ open: id, bump: null }),
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useLive() {
  return useSyncExternalStore(live.subscribe, live.get, live.get);
}
