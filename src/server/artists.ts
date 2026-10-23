/** Artists and the cities they open for signatures (FR-18, FR-21). */
import type { ActKind, RoomBand, Sound } from '../lib/types';
import { id } from './crypto';
import { all, batch, one, run } from './db';
import { metroById } from './score';

export type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  kind: ActKind;
  sound: Sound;
  imageUrl: string | null;
  portrait: string | null;
  homeBase: string | null;
  roomBand: RoomBand | null;
  contactEmail: string | null;
  isDemo: boolean;
  createdAt: number;
};

type Raw = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  sound: string;
  image_url: string | null;
  portrait: string | null;
  home_base: string | null;
  room_band: string | null;
  contact_email: string | null;
  is_demo: number;
  created_at: number;
};

function fromRaw(r: Raw): ArtistRow {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind as ActKind,
    sound: JSON.parse(r.sound),
    imageUrl: r.image_url,
    portrait: r.portrait,
    homeBase: r.home_base,
    roomBand: (r.room_band as RoomBand) ?? null,
    contactEmail: r.contact_email,
    isDemo: !!r.is_demo,
    createdAt: r.created_at,
  };
}

export function slugify(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'artist'
  );
}

export async function getArtist(idOrSlug: string): Promise<ArtistRow | null> {
  const r = await one<Raw>('select * from artists where id = ? or slug = ?', [idOrSlug, idOrSlug]);
  return r ? fromRaw(r) : null;
}

export async function upsertArtist(input: {
  id?: string;
  name: string;
  slug?: string;
  kind: ActKind;
  sound: Sound;
  imageUrl?: string | null;
  portrait?: string | null;
  homeBase?: string | null;
  roomBand?: RoomBand | null;
  isDemo?: boolean;
}): Promise<ArtistRow> {
  const existing = input.id ? await getArtist(input.id) : null;
  const artistId = existing?.id ?? input.id ?? id('a_');
  let slug = existing?.slug ?? input.slug ?? slugify(input.name);
  if (!existing) {
    // Keep slugs unique without exposing ids in fan links.
    let n = 1;
    const base = slug;
    while (await one('select 1 from artists where slug = ?', [slug])) slug = `${base}-${++n}`;
  }
  await run(
    `insert into artists(id, slug, name, kind, sound, image_url, portrait, home_base, room_band, is_demo, created_at)
     values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(id) do update set name = excluded.name, kind = excluded.kind, sound = excluded.sound,
       image_url = excluded.image_url, portrait = excluded.portrait, home_base = excluded.home_base, room_band = excluded.room_band`,
    [
      artistId,
      slug,
      input.name,
      input.kind,
      JSON.stringify(input.sound),
      input.imageUrl ?? null,
      input.portrait ?? null,
      input.homeBase ?? null,
      input.roomBand ?? null,
      input.isDemo ? 1 : 0,
      existing?.createdAt ?? Date.now(),
    ],
  );
  return (await getArtist(artistId))!;
}

export type OpenedCity = {
  city: string;
  name: string;
  state: string;
  heat: number | null;
  heatShare: number | null;
  topNeighborhoods: string[];
  openedAt: number;
  playedAt: number | null;
  playedVenue: string | null;
};

export async function openedCities(artistId: string): Promise<OpenedCity[]> {
  const rows = await all<{
    city: string;
    heat: number | null;
    heat_share: number | null;
    top_neighborhoods: string | null;
    opened_at: number;
    played_at: number | null;
    played_venue: string | null;
  }>('select * from opened_cities where artist_id = ? order by opened_at', [artistId]);
  return rows.map((r) => {
    const m = metroById(r.city);
    return {
      city: r.city,
      name: m?.name ?? r.city,
      state: m?.state ?? '',
      heat: r.heat,
      heatShare: r.heat_share,
      topNeighborhoods: r.top_neighborhoods ? JSON.parse(r.top_neighborhoods) : [],
      openedAt: r.opened_at,
      playedAt: r.played_at,
      playedVenue: r.played_venue,
    };
  });
}

/**
 * Opens a city for signatures and recomputes every opened city's heat share: its share of
 * Qloo heat across the artist's opened cities (the denominator of the proof ratio).
 */
export async function openCity(artist: ArtistRow, metroId: string, heat: number | null, topNeighborhoods: string[]) {
  if (!metroById(metroId)) throw new Error(`Unknown city ${metroId}`);
  await run(
    `insert into opened_cities(artist_id, city, heat, top_neighborhoods, opened_at) values(?, ?, ?, ?, ?)
     on conflict(artist_id, city) do update set heat = coalesce(excluded.heat, opened_cities.heat),
       top_neighborhoods = case when excluded.top_neighborhoods = '[]' then opened_cities.top_neighborhoods else excluded.top_neighborhoods end`,
    [artist.id, metroId, heat, JSON.stringify(topNeighborhoods), Date.now()],
  );
  await recomputeHeatShares(artist.id);
}

export async function recomputeHeatShares(artistId: string) {
  const rows = await all<{ city: string; heat: number | null }>('select city, heat from opened_cities where artist_id = ?', [artistId]);
  const total = rows.reduce((s, r) => s + (r.heat ?? 0), 0);
  await batch(
    rows.map((r) => ({
      sql: 'update opened_cities set heat_share = ? where artist_id = ? and city = ?',
      args: [rows.length >= 2 && total > 0 && r.heat !== null ? r.heat / total : null, artistId, r.city],
    })),
  );
}

export async function markPlayed(artistId: string, metroId: string, venue: string | null) {
  await run('update opened_cities set played_at = ?, played_venue = ? where artist_id = ? and city = ?', [
    Date.now(),
    venue,
    artistId,
    metroId,
  ]);
}

export async function listArtists() {
  const rows = await all<Raw>('select * from artists order by is_demo desc, created_at desc limit 50');
  return rows.map(fromRaw);
}
