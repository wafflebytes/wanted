/**
 * High-level Qloo calls (PRD 4.1 table). Each one trims Qloo's response to the fields
 * Wanted uses before caching, so phones never download a 3-6 MB Qloo payload.
 */
import { config } from '../config';
import { simplify, wktSummary } from '../../lib/geo';
import type {
  ActEntity,
  CrowdDemographics,
  HeatCell,
  Locality,
  Room,
  RoomHours,
  SoundEntity,
  TasteItem,
  VibeTag,
} from '../../lib/types';
import { qloo, type QlooResult } from './client';

type Json = any; // Qloo responses are untyped JSON; trims below are the typed boundary.

const ALLOWED_VIBE_TYPES = ['urn:tag:style:qloo', 'urn:tag:theme:qloo', 'urn:tag:artist:qloo'];

/** Identity tags are never shown (FR-15), even if a type slips through the allowlist. */
const IDENTITY_PATTERN =
  /(lgbt|queer|gay|lesbian|trans|bisexual|sexual|ethnic|latin[ao]|latinx|black[- ]owned|women[- ]owned|female[- ]owned|asian|hispanic|african|indigenous|jewish|muslim|christian|religio|gender|feminis|race|racial|immigra|disab)/i;

// ---------- entities ----------

function trimEntity(e: Json): ActEntity {
  const types: string[] = e.types ?? (e.subtype ? [e.subtype] : []);
  return {
    id: e.entity_id,
    name: e.name,
    type: types.includes('urn:entity:person') && !types.includes('urn:entity:artist') ? 'person' : 'artist',
    popularity: typeof e.popularity === 'number' ? e.popularity : 0,
    image: e.properties?.image?.url ?? null,
    description: e.properties?.short_description ?? null,
    disambiguation: e.disambiguation ?? null,
    spotifyId: e.properties?.external?.spotify?.id ?? null,
    genres: (e.tags ?? [])
      .filter((t: Json) => t.type === 'urn:tag:genre:qloo' || t.type === 'urn:tag:genre')
      .map((t: Json) => t.name)
      .filter((n: string, i: number, a: string[]) => a.indexOf(n) === i)
      .slice(0, 5),
  };
}

export function searchActs(query: string, kind: 'artist' | 'person' | 'any', scope?: string, take = 6) {
  const types =
    kind === 'artist' ? 'urn:entity:artist' : kind === 'person' ? 'urn:entity:person' : 'urn:entity:artist,urn:entity:person';
  return qloo({
    path: '/search',
    params: { query, types, take },
    purpose: `Resolve "${query}" to a Qloo entity`,
    trimId: 'entity.v1',
    trim: (raw: Json) => (raw.results ?? []).map(trimEntity) as ActEntity[],
    count: (d) => d.length,
    scope,
  });
}

export async function entitiesBySpotify(spotifyId: string, scope?: string) {
  const r = await qloo({
    path: '/entities',
    params: { 'external.spotify.ids': spotifyId },
    purpose: 'Resolve a Spotify artist link',
    trimId: 'entity.v1',
    trim: (raw: Json) => (raw.results ?? []).map(trimEntity) as ActEntity[],
    count: (d) => d.length,
    scope,
  });
  // Qloo may return duplicate entities for one Spotify id; keep the higher popularity.
  r.data = [...r.data].sort((a, b) => b.popularity - a.popularity).slice(0, 1);
  return r;
}

export function entitiesByIds(ids: string[], scope?: string) {
  return qloo({
    path: '/entities',
    params: { entity_ids: ids.join(',') },
    purpose: 'Look up entities by id',
    trimId: 'entity.v1',
    trim: (raw: Json) => (raw.results ?? []).map(trimEntity) as ActEntity[],
    count: (d) => d.length,
    scope,
  });
}

// ---------- signals ----------

/**
 * Equal weights go as a GET with comma ids. Unequal weights (the thin-data blend) go as a
 * POST body with [{id, weight}] (PRD 4.1: the key is `id`; `entity` returns 400).
 */
function signal(sound: SoundEntity[], extra: Record<string, string | number | boolean>) {
  const weighted = new Set(sound.map((s) => s.weight ?? 1)).size > 1;
  if (!weighted) {
    return { params: { ...extra, 'signal.interests.entities': sound.map((s) => s.id).join(',') }, body: undefined };
  }
  return {
    params: {},
    body: { ...extra, 'signal.interests.entities': sound.map((s) => ({ id: s.id, weight: s.weight ?? 1 })) },
  };
}

// ---------- heat ----------

function trimHeat(raw: Json): HeatCell[] {
  return (raw.results?.heatmap ?? []).map((c: Json) => ({
    gh: c.location.geohash,
    lat: c.location.latitude,
    lon: c.location.longitude,
    a: c.query.affinity,
    r: c.query.affinity_rank,
    p: c.query.popularity,
  }));
}

export function countryHeat(sound: SoundEntity[], scope?: string) {
  const { params, body } = signal(sound, { 'filter.type': 'urn:heatmap', 'filter.location.query': 'United States' });
  return qloo({
    path: '/v2/insights',
    params,
    body,
    purpose: 'Where this taste lives across the US (geohash-4 heat)',
    trimId: 'heat.v1',
    trim: trimHeat,
    count: (d) => d.length,
    timeoutMs: 30_000,
    scope,
  });
}

export function cityHeat(sound: SoundEntity[], cityQuery: string, scope?: string) {
  const { params, body } = signal(sound, { 'filter.type': 'urn:heatmap', 'filter.location.query': cityQuery });
  return qloo({
    path: '/v2/insights',
    params,
    body,
    purpose: `Street-level heat in ${cityQuery} (geohash-7)`,
    trimId: 'heat.v1',
    trim: trimHeat,
    count: (d) => d.length,
    scope,
  });
}

/** Tag-signal heat for an act Qloo doesn't know (PRD 4.1 fallback). */
export function genreHeat(tagIds: string[], scope?: string) {
  return qloo({
    path: '/v2/insights',
    params: {
      'filter.type': 'urn:heatmap',
      'filter.location.query': 'United States',
      'signal.interests.tags': tagIds.join(','),
    },
    purpose: 'Genre-tag heat for an act Qloo has no entity for',
    trimId: 'heat.v1',
    trim: trimHeat,
    count: (d) => d.length,
    timeoutMs: 30_000,
    scope,
  });
}

// ---------- neighborhoods ----------

export type CityLocalities = { neighborhoods: Locality[]; outline: [number, number][] | null; raw: number };

const STATE_NAMES = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'Puerto Rico',
]);

/**
 * List hygiene (PRD 4.1c): drop the country, state, county, the city itself and
 * "Contiguous United States"; keep neighborhoods and nearby towns in rank order.
 * Polygons are dropped (POINT centers kept) except one simplified city outline.
 */
function trimLocalities(cityName: string) {
  return (raw: Json): CityLocalities => {
    const ents: Json[] = raw.results?.entities ?? raw.results?.heatmap ?? [];
    let outline: [number, number][] | null = null;
    const neighborhoods: Locality[] = [];
    const city = cityName.toLowerCase();
    for (const e of ents) {
      const name: string = (e.name ?? '').trim();
      const lower = name.toLowerCase();
      const summary = typeof e.boundary === 'string' ? wktSummary(e.boundary) : null;
      if (lower === city) {
        if (summary && summary.ring.length && !outline) outline = simplify(summary.ring, 0.002).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
        continue;
      }
      if (
        !name ||
        name === 'Contiguous United States' ||
        name === 'United States of America' ||
        /\bcounty\b|\bparish\b|\bborough of\b/i.test(name) ||
        STATE_NAMES.has(name)
      )
        continue;
      if (typeof e.query?.affinity !== 'number') continue;
      const areaKm2 = summary && summary.areaDeg2 > 0 ? Math.round(summary.areaDeg2 * 111 * 111 * Math.cos((summary.lat * Math.PI) / 180)) : null;
      // Anything over ~1,200 km^2 is county-scale. Upstate New York counties come back without
      // the word "County" (Ulster, Dutchess, Orange at 2,100-3,000 km^2), so the name check
      // alone misses them. The biggest real neighborhoods or nearby towns are a few hundred km^2.
      if (areaKm2 !== null && areaKm2 > config.score.maxLocalityKm2) continue;
      neighborhoods.push({
        id: e.entity_id,
        name,
        rank: neighborhoods.length + 1,
        score: e.query.affinity,
        lat: summary ? +summary.lat.toFixed(5) : null,
        lon: summary ? +summary.lon.toFixed(5) : null,
        areaKm2,
      });
    }
    return { neighborhoods, outline, raw: ents.length };
  };
}

export function cityNeighborhoods(sound: SoundEntity[], cityQuery: string, cityName: string, scope?: string) {
  const { params, body } = signal(sound, {
    'filter.type': 'urn:heatmap',
    'filter.location.query': cityQuery,
    'filter.location.radius': 0,
    'output.heatmap.boundary': 'urn:entity:locality',
  });
  return qloo({
    path: '/v2/insights',
    params,
    body,
    purpose: `Qloo's ranked neighborhoods in ${cityQuery}`,
    trimId: `localities.v3:${cityName.toLowerCase()}`,
    trim: trimLocalities(cityName),
    count: (d) => d.neighborhoods.length,
    timeoutMs: config.qloo.localityTimeoutMs,
    scope,
  });
}

// ---------- rooms ----------

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function trimHours(h: Json): RoomHours | null {
  if (!h || typeof h !== 'object') return null;
  const out: RoomHours = {};
  for (const d of DAYS) {
    const slots: Json[] | undefined = h[d];
    if (!slots || !slots.length) continue;
    const open = slots.filter((s) => !s.closed);
    out[d] = open.length
      ? { closed: false, opens: open[0].opens?.replace(/^T/, '').slice(0, 5) ?? null, closes: open[open.length - 1].closes?.replace(/^T/, '').slice(0, 5) ?? null }
      : { closed: true, opens: null, closes: null };
  }
  return Object.keys(out).length ? out : null;
}

function nullIfNone(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return !s || s === 'None' || s === 'null' ? null : s;
}

export function trimPlace(e: Json): Room {
  const p = e.properties ?? {};
  return {
    id: e.entity_id,
    name: e.name,
    address: nullIfNone(p.address) ?? nullIfNone(e.disambiguation),
    lat: e.location?.lat ?? null,
    lon: e.location?.lon ?? null,
    neighborhood: nullIfNone(p.neighborhood),
    website: nullIfNone(p.website),
    phone: nullIfNone(p.phone),
    hours: trimHours(p.hours),
    isClosed: p.is_closed === true,
    description: nullIfNone(p.description) ?? nullIfNone(p.short_description),
    ambience: nullIfNone(p.ambience_description),
    crowd: nullIfNone(p.customer_demographics_description),
    rating: typeof p.business_rating === 'number' ? Math.round(p.business_rating * 10) / 10 : null,
    affinity: e.query?.affinity ?? null,
    popularity: e.popularity ?? null,
    explain: (e.query?.explainability?.['signal.interests.entities'] ?? []).map((x: Json) => ({
      entityId: x.entity_id,
      score: x.score,
    })),
    tags: (e.tags ?? []).map((t: Json) => t.name).filter(Boolean).slice(0, 10),
    image: p.images?.[0]?.url ?? p.image?.url ?? null,
  };
}

export function rooms(sound: SoundEntity[], cityQuery: string, comedy: boolean, scope?: string, take: number = config.rooms.fetch) {
  const tags = comedy ? config.rooms.comedyTags : config.rooms.musicTags;
  const { params, body } = signal(sound, {
    'filter.type': 'urn:entity:place',
    'filter.location.query': cityQuery,
    'filter.tags': tags.join(','),
    'operator.filter.tags': 'union',
    'feature.explainability': sound.length >= 2,
    take,
  });
  return qloo({
    path: '/v2/insights',
    params,
    body,
    purpose: `${comedy ? 'Comedy rooms' : 'Music rooms'} in ${cityQuery} ranked for this taste`,
    trimId: 'place.v1',
    trim: (raw: Json) => (raw.results?.entities ?? []).map(trimPlace) as Room[],
    count: (d) => d.length,
    scope,
  });
}

export function hangSpots(sound: SoundEntity[], neighborhood: string, cityQuery: string, scope?: string) {
  const { params, body } = signal(sound, {
    'filter.type': 'urn:entity:place',
    'filter.location.query': `${neighborhood}, ${cityQuery}`,
    'filter.tags': config.rooms.hangTags.join(','),
    'operator.filter.tags': 'union',
    take: 6,
  });
  return qloo({
    path: '/v2/insights',
    params,
    body,
    purpose: `Pre-show hang spots in ${neighborhood}`,
    trimId: 'place.v1',
    trim: (raw: Json) => (raw.results?.entities ?? []).map(trimPlace) as Room[],
    count: (d) => d.length,
    scope,
  });
}

// ---------- crowd ----------

export function demographics(sound: SoundEntity[], scope?: string) {
  return qloo({
    path: '/v2/insights',
    params: { 'filter.type': 'urn:demographics', 'signal.interests.entities': sound.map((s) => s.id).join(',') },
    purpose: 'Age and gender skew of this crowd (skews, not shares)',
    trimId: 'demo.v1',
    trim: (raw: Json): CrowdDemographics[] =>
      (raw.results?.demographics ?? []).map((d: Json) => ({
        entityId: d.entity_id,
        age: d.query?.age ?? {},
        gender: d.query?.gender ?? {},
      })),
    count: (d) => d.length,
    scope,
  });
}

export type CrossDomain = 'movie' | 'tv_show' | 'brand' | 'podcast' | 'book';

export function crossDomain(sound: SoundEntity[], domain: CrossDomain, scope?: string, take = 5) {
  return qloo({
    path: '/v2/insights',
    params: {
      'filter.type': `urn:entity:${domain}`,
      'signal.interests.entities': sound.map((s) => s.id).join(','),
      take,
    },
    purpose: `What else this crowd loves: ${domain.replace('_', ' ')}s`,
    trimId: 'taste.v1',
    trim: (raw: Json): TasteItem[] =>
      (raw.results?.entities ?? []).map((e: Json) => ({
        id: e.entity_id,
        name: e.name,
        image: e.properties?.image?.url ?? null,
        affinity: e.query?.affinity ?? null,
      })),
    count: (d) => d.length,
    scope,
  });
}

export function vibeTags(sound: SoundEntity[], scope?: string) {
  return qloo({
    path: '/v2/insights',
    params: {
      'filter.type': 'urn:tag',
      'signal.interests.entities': sound.map((s) => s.id).join(','),
      'filter.tag.types': ALLOWED_VIBE_TYPES.join(','),
      take: 20,
    },
    purpose: 'Vibe words for this crowd (style, theme and artist tags only)',
    trimId: 'vibe.v1',
    trim: (raw: Json): VibeTag[] =>
      (raw.results?.tags ?? [])
        .filter((t: Json) => ALLOWED_VIBE_TYPES.includes(t.subtype) && !IDENTITY_PATTERN.test(t.name ?? ''))
        .map((t: Json) => ({ id: t.tag_id, name: String(t.name).trim().replace(/^\w/, (c: string) => c.toUpperCase()), type: t.subtype, affinity: t.query?.affinity ?? null })),
    count: (d) => d.length,
    scope,
  });
}

export function openers(sound: SoundEntity[], kind: 'artist' | 'person', scope?: string) {
  return qloo({
    path: '/v2/insights',
    params: {
      'filter.type': kind === 'person' ? 'urn:entity:person' : 'urn:entity:artist',
      'signal.interests.entities': sound.map((s) => s.id).join(','),
      'filter.popularity.max': 0.6,
      'filter.exclude.entities': sound.map((s) => s.id).join(','),
      take: 8,
    },
    purpose: 'Smaller acts who share this crowd (opener candidates)',
    trimId: 'entity.v1',
    trim: (raw: Json) => (raw.results?.entities ?? []).map(trimEntity) as ActEntity[],
    count: (d) => d.length,
    scope,
  });
}

export function compare(a: string[], b: string[], scope?: string) {
  return qloo({
    path: '/v2/analysis/compare',
    params: { 'a.signal.interests.entities': a.join(','), 'b.signal.interests.entities': b.join(','), take: 20 },
    purpose: 'Why two acts share a crowd (shared taste tags)',
    trimId: 'compare.v1',
    trim: (raw: Json) =>
      ((raw.results?.tags ?? []) as Json[])
        .filter((t) => ALLOWED_VIBE_TYPES.includes(t.subtype) || String(t.subtype).startsWith('urn:tag:genre'))
        .filter((t) => !IDENTITY_PATTERN.test(t.name ?? ''))
        .map((t) => ({ id: t.tag_id as string, name: t.name as string, score: t.query?.score as number }))
        .slice(0, 6),
    count: (d) => d.length,
    scope,
  });
}

export function genreTags(query: string, scope?: string) {
  return qloo({
    path: '/v2/tags',
    params: { 'filter.query': query, take: 8 },
    purpose: `Find genre tags for "${query}"`,
    trimId: 'tags.v1',
    trim: (raw: Json) =>
      ((raw.results?.tags ?? []) as Json[]).map((t) => ({ id: t.id ?? t.tag_id, name: t.name, type: t.type ?? t.subtype })),
    count: (d) => d.length,
    scope,
  });
}

export type { QlooResult };

// ---------- place lookup (for checking a generic LLM's venue claims) ----------

const VENUE_TAG = /live_music|concert_hall|comedy_club|music_venue|nightclub|night_club|performing_arts|theat/;

export type PlaceLookup = Room & { hostsShows: boolean };

export function searchPlace(name: string, cityQuery: string, scope?: string) {
  return qloo({
    path: '/search',
    params: { query: `${name}, ${cityQuery}`, types: 'urn:entity:place', take: 3 },
    purpose: `Check "${name}" in ${cityQuery}`,
    trimId: 'placesearch.v1',
    trim: (raw: Json): PlaceLookup[] =>
      (raw.results ?? []).map((e: Json) => ({
        ...trimPlace({ ...e, location: e.location ?? { lat: e.properties?.geocode?.latitude, lon: e.properties?.geocode?.longitude } }),
        hostsShows:
          (e.tags ?? []).some((t: Json) => VENUE_TAG.test(String(t.tag_id ?? t.id ?? ''))) ||
          /live music|concert|venue|comedy|stage|theat/i.test(`${e.properties?.description ?? ''} ${(e.tags ?? []).map((t: Json) => t.name).join(' ')}`),
      })),
    count: (d) => d.length,
    scope,
  });
}
