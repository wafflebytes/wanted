/**
 * What Gus remembers about an act between conversations: lasting things the artist told him
 * ("I don't play Mondays", "we tour in a Sprinter", "skip Boston"). He writes them down with
 * his `remember` tool, reads them before every answer, and the artist can see and strike any
 * of them in Settings. They're the artist's own words, so they go to the model as untrusted text.
 */
import { kvGet, kvSet } from '../db';

export type Memory = { id: string; fact: string; at: number };

const MAX = 12;
const key = (artistId: string) => `gus-memory:${artistId}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

export async function recall(artistId: string): Promise<Memory[]> {
  return (await kvGet<Memory[]>(key(artistId))) ?? [];
}

/** Write one fact down. The same fact twice is one fact; past twelve, the oldest goes. */
export async function note(artistId: string, fact: string): Promise<Memory | null> {
  const clean = fact.replace(/<\/?untrusted>/g, '').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase()).slice(0, 140);
  // Models sometimes call the tool with nothing to say; "None" is not a fact.
  if (clean.length < 4 || /^(none|null|undefined|n\/a|nothing|no fact)\.?$/i.test(clean)) return null;
  const all = await recall(artistId);
  const kept = all.filter((m) => norm(m.fact) !== norm(clean));
  const m: Memory = { id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, fact: clean, at: Date.now() };
  await kvSet(key(artistId), [...kept, m].slice(-MAX));
  return m;
}

export async function forget(artistId: string, id: string): Promise<Memory[]> {
  const left = (await recall(artistId)).filter((m) => m.id !== id);
  await kvSet(key(artistId), left);
  return left;
}
