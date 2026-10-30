'use client';
/**
 * The tour with Gus: he lifts off the dock and walks you through the real app, one surface at
 * a time. Nothing is a slide. Each step points at a live element (`data-tour="<key>"`), says
 * one line, and either waits for you to press the real thing, waits for you to ask Gus one of a
 * few questions, or offers Next. The rest of the app is blurred and takes no presses until the
 * tour ends, so there is one way forward. It can't be skipped: it is short, and it counts down.
 *
 * Borrowed: okvideo's speech bubbles over the live camera, avec's "try it, touch this" where
 * the gesture is the real action.
 */
import { useSyncExternalStore } from 'react';

export type GuideStep = {
  id: string;
  /** Path under /a/<act>, '' for the map. */
  at: string;
  /** `data-tour` key of the element Gus points at; none means he speaks from the middle. */
  target?: string;
  say: string;
  /** The one thing to press inside the target (a selector); the target itself if unset. */
  cta?: string;
  /** 'tap': wait for a press on the target. 'next': a Next key. 'ask': question chips; the step
   * is done when Gus has answered one. 'end': the closing card. */
  wait: 'tap' | 'next' | 'ask' | 'end';
  /** For 'ask': the questions offered, each known to come back with something to act on. */
  asks?: string[];
  /** What the line says while Gus works on the question. */
  working?: string;
  /** 'dock': the line sits just above the dock, whatever the target (it fills the middle). */
  side?: 'dock';
  /** Runs before the step shows (open a panel, close one). */
  enter?: () => void;
  /** After a tap lands, how long to let the app respond before the next step. */
  settle?: number;
};

type State = { on: boolean; parked: boolean; i: number; done: boolean };
const KEY = 'wanted-guide';
let state: State = { on: false, parked: false, i: 0, done: false };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  subs.forEach((f) => f());
};

export const guide = {
  get: () => state,
  /** Picks a tour that was running before a reload back up at the same step. */
  restore() {
    if (state.on) return;
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as State | null;
      if (s?.on) state = { ...s, parked: false };
    } catch {}
  },
  start: () => set({ on: true, parked: false, i: 0, done: false }),
  next: () => set({ i: state.i + 1, parked: false }),
  go: (i: number) => set({ i, parked: false }),
  back: () => set({ i: Math.max(0, state.i - 1), parked: false }),
  park: () => state.on && !state.parked && set({ parked: true }),
  resume: () => set({ parked: false }),
  end: (done = false) => set({ on: false, parked: false, done }),
  /** Has this browser finished or skipped the tour before? */
  seen() {
    try {
      return !!localStorage.getItem(`${KEY}-seen`);
    } catch {
      return true;
    }
  },
  markSeen() {
    try {
      localStorage.setItem(`${KEY}-seen`, '1');
    } catch {}
  },
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useGuide() {
  return useSyncExternalStore(guide.subscribe, guide.get, guide.get);
}
