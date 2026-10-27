'use client';
/**
 * The map behind the tabs. It lives in the shell so moving between Map and Tour never reloads
 * it: pages say what it should show (a city, a route) and how much of it the sheet covers.
 */
import { useSyncExternalStore } from 'react';
import type { MapRoute } from '@/ui/map/types';

type State = { show: boolean; city: string | null; route: MapRoute | null; bottom: number; top: number; pulse: number };
let state: State = { show: false, city: null, route: null, bottom: 260, top: 64, pulse: 0 };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  const next = { ...state, ...p };
  if ((Object.keys(p) as (keyof State)[]).every((k) => next[k] === state[k])) return;
  state = next;
  subs.forEach((f) => f());
};

let pick: (p: { kind: 'metro' | 'room' | 'neighborhood'; id: string }) => void = () => {};

export const stage = {
  get: () => state,
  set,
  onPick: (fn: typeof pick) => {
    pick = fn;
  },
  pick: (p: { kind: 'metro' | 'room' | 'neighborhood'; id: string }) => pick(p),
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useStage() {
  return useSyncExternalStore(stage.subscribe, stage.get, stage.get);
}
