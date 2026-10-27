'use client';
/**
 * The room Gus is talking to. The agents take turns here, not on a screen, so closing the
 * tray never ends a conversation; Pause stops the turns and keeps every letter so far.
 */
import { useSyncExternalStore } from 'react';
import type { Deal } from '@/lib/types';
import { api } from './api';
import { mutate } from './hooks';

type State = { slug: string | null; deal: Deal | null; paused: boolean; asking: string | null; deciding: boolean; error: string | null };
let state: State = { slug: null, deal: null, paused: false, asking: null, deciding: false, error: null };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

const PACE = { letter: 1500, tool: 650 };
let loop: ReturnType<typeof setTimeout> | null = null;

function refresh(slug: string) {
  mutate(`/artist/${slug}/deals`).catch(() => {});
  mutate(`/artist/${slug}/logbook`).catch(() => {});
}

function talk() {
  if (loop) clearTimeout(loop);
  const d = state.deal;
  if (!d || d.status !== 'talking' || !state.slug || state.paused) return;
  const last = d.thread[d.thread.length - 1];
  loop = setTimeout(async () => {
    const slug = state.slug;
    const cur = state.deal;
    if (!slug || !cur || cur.id !== d.id || state.paused) return;
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { deal: cur.id, next: cur.thread.length });
      if (state.deal?.id !== cur.id) return;
      set({ deal: r.deal, error: null });
      if (r.deal.status !== 'talking') refresh(slug);
      talk();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Gus lost the line.' });
      loop = setTimeout(talk, 4000);
    }
  }, last?.kind === 'tool' ? PACE.tool : PACE.letter);
}

export const deals = {
  get: () => state,
  async resume(slug: string) {
    if (state.slug !== slug) set({ slug, deal: null, paused: false, error: null });
    try {
      const r = await api.get<{ deals: Deal[] }>(`/artist/${slug}/deals`);
      const live = r.deals.find((d) => d.status === 'talking') ?? r.deals.find((d) => d.status === 'waiting');
      if (live && state.slug === slug && !state.deal) {
        set({ deal: live });
        talk();
      }
    } catch {}
  },
  async ask(slug: string, city: string, roomId: string | null = null) {
    set({ slug, asking: city, error: null, paused: false });
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { city, roomId });
      set({ deal: r.deal, asking: null });
      refresh(slug);
      talk();
      return r.deal;
    } catch (e) {
      set({ asking: null, error: e instanceof Error ? e.message : "Gus couldn't reach the room." });
      throw e;
    }
  },
  show(deal: Deal) {
    set({ deal, paused: false });
    talk();
  },
  /** Tell Gus a new line for this deal mid-talk; it shows in the thread as your note. */
  async steer(patch: { minSplit?: number; maxDeposit?: number }) {
    const { slug, deal } = state;
    if (!slug || !deal || deal.status !== 'talking') return;
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { deal: deal.id, steer: patch });
      if (state.deal?.id !== deal.id) return;
      set({ deal: r.deal, error: null, paused: false });
      talk();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Gus didn’t catch that.' });
    }
  },
  pause() {
    if (loop) clearTimeout(loop);
    set({ paused: true });
  },
  play() {
    set({ paused: false });
    talk();
  },
  async decide(yes: boolean) {
    const { slug, deal } = state;
    if (!slug || !deal) return;
    set({ deciding: true, error: null });
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { deal: deal.id, yes, review: deal.review });
      set({ deal: r.deal, deciding: false });
      refresh(slug);
    } catch (e) {
      set({ deciding: false, error: e instanceof Error ? e.message : "The deposit didn't go through." });
    }
  },
  dismiss: () => set({ deal: null }),
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useDeal() {
  return useSyncExternalStore(deals.subscribe, deals.get, deals.get);
}
