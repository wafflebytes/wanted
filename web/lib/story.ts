'use client';
/**
 * The story: Wanted shown to someone who has never seen it. It runs on the real app, on the
 * demo act. Gus's questions are typed into the voice card as if spoken, the answer cards
 * draw themselves, and the tabs change under a small caption. Nothing is blurred and nothing
 * is a slide: you can pause and touch the app at any time.
 *
 * Each beat says one thing, in the order a judge needs it: the problem, where the crowd is
 * (Qloo), what Gus works out, how fans prove demand, who decides the money, and that he keeps
 * working while you're away.
 */
import { useSyncExternalStore } from 'react';
import { gus } from './gus';
import { live } from './live';

export type Ctx = {
  /** Go to a page under /a/<act> ('' is the map, '?city=ithaca-ny' a city). */
  go: (path: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  /** Ask Gus out loud (typed into the card) and wait until he has answered and said it. */
  ask: (text: string, dwell?: number) => Promise<void>;
  /** Press a real control, with a ripple where the finger would land. False if it isn't there. */
  tap: (selector: string) => Promise<boolean>;
};

export type Beat = {
  id: string;
  chapter: string;
  title: string;
  body: string;
  /** Where the caption sits so it never covers the thing it points at. */
  pos?: 'top' | 'bottom';
  run: (c: Ctx) => Promise<void>;
};

export const BEATS: Beat[] = [
  {
    id: 'problem',
    chapter: 'The problem',
    title: 'Most bands guess where to tour.',
    body: '82% of independent artists say they can’t afford to. Wanted gives them Gus, a tour manager who runs on Qloo’s taste graph.',
    run: async (c) => {
      await c.go('');
      await c.sleep(6200);
    },
  },
  {
    id: 'map',
    chapter: 'The crowd',
    title: 'Every bright patch is Maya’s fans.',
    body: 'Qloo scores each neighborhood for her sound against 20 other acts, so a city doesn’t win just by being big.',
    run: async (c) => {
      await c.go('');
      await c.sleep(6500);
    },
  },
  {
    id: 'where',
    chapter: 'Ask Gus',
    title: 'Ask him like you’d ask a person.',
    body: 'He shows every lookup as it runs, and can’t name a place Qloo didn’t return.',
    run: async (c) => {
      await c.ask('Where am I most wanted and why?', 3200);
      await c.tap('.vc-work-row');
      await c.sleep(3600);
    },
  },
  {
    id: 'sleeper',
    chapter: 'Ask Gus',
    title: 'Ithaca: lots of fans, nobody’s playing it.',
    body: 'He flags “sleepers”, cities with far more fans than their size suggests. Those are where a first show sells out.',
    run: async (c) => {
      gus.close();
      await c.go('?city=ithaca-ny');
      await c.sleep(6800);
    },
  },
  {
    id: 'night',
    chapter: 'Ask Gus',
    title: 'He picks the night, too.',
    body: 'Weekends draw. He checks which of the venues that fit you are open that night, and never a night you said you won’t play.',
    run: async (c) => {
      await c.ask('Which night should I play Ithaca?', 4200);
      gus.close();
    },
  },
  {
    id: 'spots',
    chapter: 'Ask Gus',
    title: 'Then, where the posters go.',
    body: 'Bars and cafes in the two neighborhoods where her fans hang out, straight from Qloo’s place data. One tap pins them.',
    run: async (c) => {
      await c.go('');
      await c.ask('Where should I put posters in Burlington?', 4600);
      gus.close();
    },
  },
  {
    id: 'posters',
    chapter: 'The fans',
    title: 'Fans sign. At fifty names, venues hear from Gus.',
    body: 'The poster is the proof. A venue sees real people from its own neighborhoods, not a streaming dashboard.',
    run: async (c) => {
      await c.go('/posters');
      await c.sleep(7200);
    },
  },
  {
    id: 'draw',
    chapter: 'The fans',
    title: 'Every signer is in a prize draw.',
    body: 'It’s a promise to a fan, so there is no Undo, and he asks before he draws.',
    run: async (c) => {
      await c.ask('Who wins the draw in Ithaca?', 4400);
      gus.close();
    },
  },
  {
    id: 'tour',
    chapter: 'The tour',
    title: 'The run plans itself.',
    body: 'Drives, nights and venues on one route. Long drives are flagged, and dates you lock stay put.',
    run: async (c) => {
      await c.go('/tour');
      await c.sleep(6500);
    },
  },
  {
    id: 'swap',
    chapter: 'The tour',
    title: 'Don’t like a stop? Swap it.',
    body: 'He draws the two best replacements and the extra driving. One tap, with Undo.',
    run: async (c) => {
      await c.ask('Swap Albany', 5200);
      gus.close();
    },
  },
  {
    id: 'money',
    chapter: 'Your yes',
    title: 'When a venue says yes, you decide.',
    body: 'The offer sits next to the limits you set. Your slide approves that exact amount. The model can’t pay anything.',
    run: async (c) => {
      await c.go('');
      await c.sleep(900);
      if (await c.tap('[data-tour="island"]')) {
        await c.sleep(1400);
        await c.tap('[data-tour="isl-card"] .isl-keys .p');
        await c.sleep(6200);
      } else await c.sleep(3000);
      gus.close();
      live.expand(null);
    },
  },
  {
    id: 'away',
    chapter: 'While you’re gone',
    title: 'Fans write in. Gus keeps working.',
    body: 'Fan Mail and the Logbook are the record: what he did, who he talked to, what needed you.',
    run: async (c) => {
      await c.go('/pulse');
      await c.sleep(4800);
      await c.go('/logbook');
      await c.sleep(4800);
    },
  },
];

type State = { on: boolean; i: number; paused: boolean; done: boolean };
let state: State = { on: false, i: 0, paused: false, done: false };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

export const story = {
  get: () => state,
  start: () => set({ on: true, i: 0, paused: false, done: false }),
  go: (i: number) => set({ on: true, i: Math.max(0, Math.min(BEATS.length, i)), paused: false, done: i >= BEATS.length }),
  next: () => story.go(state.i + 1),
  back: () => story.go(state.i - 1),
  pause: (paused = !state.paused) => set({ paused }),
  finish: () => set({ i: BEATS.length, done: true, paused: false }),
  end: () => set({ on: false, done: false, paused: false }),
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useStory() {
  return useSyncExternalStore(story.subscribe, story.get, story.get);
}
