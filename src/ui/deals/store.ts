/**
 * The deal Gus is working on, shared by the whole artist app. The conversation runs here, not
 * in the sheet: closing the sheet backgrounds it, the agents keep taking turns, and the live
 * capsule above the tab bar brings it back from any screen. One deal at a time.
 */
import { useSyncExternalStore } from 'react';
import type { Deal } from '@/lib/types';
import { api } from '../api';
import { haptic } from '../haptics';
import { invalidate } from '../hooks';

type State = {
  slug: string | null;
  deal: Deal | null;
  /** The sheet is up. When false and the deal is live, the capsule shows instead. */
  open: boolean;
  /** Steps that arrived since the sheet last saw them, so a reopened sheet can play them in. */
  seen: number;
  asking: string | null;
  deciding: boolean;
  error: string | null;
};

let state: State = { slug: null, deal: null, open: false, seen: 0, asking: null, deciding: false, error: null };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};

/** About the time it takes to read a letter. Tool steps go quicker. */
const PACE = { letter: 1500, tool: 650 };
let loop: ReturnType<typeof setTimeout> | null = null;

function refresh(slug: string) {
  invalidate(`/artist/${slug}/deals`);
  invalidate(`/artist/${slug}/inbox`);
}

/** Take turns until the agents land somewhere. Survives the sheet closing; stops on a new act. */
function talk() {
  if (loop) clearTimeout(loop);
  const d = state.deal;
  if (!d || d.status !== 'talking' || !state.slug) return;
  const last = d.thread[d.thread.length - 1];
  loop = setTimeout(async () => {
    const slug = state.slug;
    const cur = state.deal;
    if (!slug || !cur || cur.id !== d.id) return;
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { deal: cur.id, next: cur.thread.length });
      if (state.deal?.id !== cur.id) return;
      set({ deal: r.deal, seen: state.open ? r.deal.thread.length : state.seen });
      if (r.deal.status !== 'talking') {
        haptic.success();
        refresh(slug);
      } else if (state.open) haptic.tick();
      talk();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Gus lost the line.' });
      // Try again shortly: a dropped request shouldn't end the conversation.
      loop = setTimeout(talk, 4000);
    }
  }, last?.kind === 'tool' ? PACE.tool : PACE.letter);
}

export const deals = {
  get: () => state,
  /** The artist layout calls this on mount: pick up a conversation that was mid-way. */
  async resume(slug: string) {
    if (state.slug !== slug) set({ slug, deal: null, open: false, seen: 0, error: null });
    try {
      const r = await api.get<{ deals: Deal[] }>(`/artist/${slug}/deals`);
      const live = r.deals.find((d) => d.status === 'talking');
      if (live && state.slug === slug && !state.deal) {
        set({ deal: live, seen: live.thread.length });
        talk();
      }
    } catch {}
  },
  /** Send Gus to ask a city's room for a date. Opens the sheet on the conversation. */
  async ask(slug: string, city: string, roomId: string | null = null) {
    set({ slug, asking: city, error: null });
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { city, roomId });
      set({ deal: r.deal, open: true, seen: r.deal.status === 'talking' ? 0 : r.deal.thread.length, asking: null });
      refresh(slug);
      talk();
    } catch (e) {
      set({ asking: null, error: e instanceof Error ? e.message : "Gus couldn't reach the room." });
      throw e;
    }
  },
  show(deal: Deal) {
    set({ deal, open: true });
    talk();
  },
  open: () => set({ open: true }),
  /** Close the sheet; a live conversation keeps going in the background. */
  hide: () => set({ open: false, seen: state.deal?.thread.length ?? 0 }),
  markSeen: (n: number) => n > state.seen && set({ seen: n }),
  async decide(yes: boolean) {
    const { slug, deal } = state;
    if (!slug || !deal) return;
    set({ deciding: true, error: null });
    try {
      const r = await api.post<{ deal: Deal }>(`/artist/${slug}/deals`, { deal: deal.id, yes });
      if (yes) haptic.success();
      set({ deal: r.deal, deciding: false });
      refresh(slug);
    } catch (e) {
      set({ deciding: false, error: e instanceof Error ? e.message : "The deposit didn't go through." });
    }
  },
  /** Done with it: the capsule goes away. */
  dismiss: () => set({ deal: null, open: false }),
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

export function useDeals() {
  return useSyncExternalStore(deals.subscribe, deals.get, deals.get);
}
