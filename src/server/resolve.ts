/**
 * Non-interactive act resolution for scripts and evals (seed, Gauntlet). The app itself
 * always shows a confirm sheet instead (FR-1); this picks the exact-name match with the
 * highest popularity and reports what it picked so the choice is auditable.
 */
import type { ActEntity } from '../lib/types';
import { searchActs } from './qloo/api';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function pickBest(name: string, candidates: ActEntity[]): ActEntity | null {
  const exact = candidates.filter((c) => norm(c.name) === norm(name)).sort((a, b) => b.popularity - a.popularity);
  return exact[0] ?? candidates[0] ?? null;
}

export async function resolveByName(name: string, kind: 'artist' | 'person' | 'any' = 'artist', scope = 'script') {
  const r = await searchActs(name, kind, scope, 6);
  let best = pickBest(name, r.data);
  if ((!best || norm(best.name) !== norm(name)) && kind !== 'any') {
    const r2 = await searchActs(name, 'any', scope, 6);
    const alt = pickBest(name, r2.data);
    if (alt && norm(alt.name) === norm(name)) best = alt;
  }
  return best;
}
