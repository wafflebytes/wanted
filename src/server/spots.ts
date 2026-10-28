/**
 * Where a city's posters go up. Gus picks spots from Qloo (bars, coffee shops and cafes in the
 * neighborhoods where the act's crowd is thickest); the artist pins the ones they like.
 * Pinned spots live per act and city, and nothing leaves the app: pinning is a note to self.
 */
import { kvGet, kvSet } from './db';
import type { ArtistRow } from './artists';
import { hangSpots } from './qloo/api';
import { METROS } from './score';
import { cityData } from './service';

export type Spot = { id: string; name: string; neighborhood: string | null; address: string | null; lat: number | null; lon: number | null };

const key = (artistId: string) => `spots:${artistId}`;

/** Up to four spots across the city's two strongest neighborhoods, two from each. */
export async function pickSpots(artist: ArtistRow, cityId: string): Promise<{ spots: Spot[]; neighborhoods: string[] }> {
  const metro = METROS.find((m) => m.id === cityId);
  if (!metro) return { spots: [], neighborhoods: [] };
  const d = await cityData(artist, cityId, false);
  const hoods = (d.neighborhoods ?? []).slice(0, 2).map((n) => n.name);
  if (!hoods.length) return { spots: [], neighborhoods: [] };
  const lists = await Promise.all(hoods.map((h) => hangSpots(artist.sound.entities, h, metro.query, `artist:${artist.id}`).then((r) => r.data).catch(() => [])));
  const roomNames = new Set(d.rooms.map((r) => r.name.toLowerCase()));
  const seen = new Set<string>();
  const spots: Spot[] = [];
  lists.forEach((list, i) => {
    let took = 0;
    for (const s of list) {
      if (took >= 2 || s.isClosed || seen.has(s.id) || roomNames.has(s.name.toLowerCase())) continue;
      seen.add(s.id);
      took++;
      spots.push({ id: s.id, name: s.name, neighborhood: s.neighborhood ?? hoods[i], address: s.address, lat: s.lat, lon: s.lon });
    }
  });
  return { spots: spots.slice(0, 4), neighborhoods: hoods };
}

export async function pinnedSpots(artistId: string): Promise<Record<string, Spot[]>> {
  return (await kvGet<Record<string, Spot[]>>(key(artistId))) ?? {};
}

/** Replace a city's pinned spots (an empty list clears them). Returns what was there, for Undo. */
export async function pinSpots(artistId: string, cityId: string, spots: Spot[]): Promise<Spot[]> {
  const all = await pinnedSpots(artistId);
  const was = all[cityId] ?? [];
  const clean = spots.slice(0, 8).map((s) => ({
    id: String(s.id).slice(0, 80),
    name: String(s.name).slice(0, 120),
    neighborhood: s.neighborhood ? String(s.neighborhood).slice(0, 80) : null,
    address: s.address ? String(s.address).slice(0, 160) : null,
    lat: typeof s.lat === 'number' ? s.lat : null,
    lon: typeof s.lon === 'number' ? s.lon : null,
  }));
  if (clean.length) all[cityId] = clean;
  else delete all[cityId];
  await kvSet(key(artistId), all);
  return was;
}
