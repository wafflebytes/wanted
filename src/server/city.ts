/**
 * City drill-down (FR-5, FR-6, FR-7): street-level grid heat first, Qloo's ranked
 * neighborhoods (slow locality call, run in the background and cached), and up to five
 * open rooms with Qloo's own descriptions and hours.
 */
import type { ActKind, DayKey, Locality, MapHex, Receipt, Room, RoomBand, Sound } from '../lib/types';
import { venueFactsFor, type VenueFacts } from '../lib/venue-evidence';
import { config } from './config';
import { cityHeat, cityNeighborhoods, rooms as qlooRooms, type CityLocalities } from './qloo/api';
import { metroById, toHexes, type Metro } from './score';

export type CityDetail = {
  metro: Pick<Metro, 'id' | 'name' | 'state' | 'stateName' | 'query' | 'lat' | 'lon' | 'pop' | 'kind'>;
  hexes: MapHex[];
  cellCount: number;
  thin: boolean;
  neighborhoods: Locality[] | null;
  neighborhoodsPending: boolean;
  outline: [number, number][] | null;
  rooms: RoomView[];
  droppedClosed: string[];
  receipts: Receipt[];
  notices: string[];
};

export type RoomView = Room & {
  operationalFacts?: VenueFacts | null;
  rank: number;
  neighborhoodRank: number | null;
  openDays: DayKey[] | null;
  closedDays: DayKey[] | null;
  sizeGuess: RoomBand | null;
  sizeReason: string | null;
  pulledBy: { name: string; share: number }[] | null;
};

const inflightNeighborhoods = new Map<string, Promise<unknown>>();

/** Starts (or reuses) the slow locality call so a later request finds it cached. */
export function warmNeighborhoods(sound: Sound, metro: Metro, scope?: string) {
  const key = `${sound.hash}:${metro.id}`;
  if (!inflightNeighborhoods.has(key)) {
    const p = cityNeighborhoods(sound.entities, metro.query, metro.name, scope)
      .catch(() => null)
      .finally(() => inflightNeighborhoods.delete(key));
    inflightNeighborhoods.set(key, p);
  }
  return inflightNeighborhoods.get(key) as Promise<{ data: CityLocalities; receipt: Receipt } | null>;
}

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** "Gus thinks" room size from Qloo's own description words. Labeled as opinion in the UI. */
export function guessSize(room: Room): { band: RoomBand | null; reason: string | null } {
  const text = `${room.name} ${room.description ?? ''} ${room.ambience ?? ''}`.toLowerCase();
  const big = text.match(/\b(arena|amphitheat(er|re)|stadium|fairgrounds?|expo center|coliseum|pavilion|civic center|convention)\b/);
  if (big) return { band: 'big', reason: `"${big[0]}" in Qloo's description` };
  const small = text.match(/\b(intimate|small|basement|cozy|tiny|listening room|dive|neighborhood bar|close-up|up-close)\b/);
  if (small) return { band: 'small', reason: `"${small[0]}" in Qloo's description` };
  const mid = text.match(/\b(theat(er|re)|music hall|ballroom|auditorium|opera house|concert hall)\b/);
  if (mid) return { band: 'mid', reason: `"${mid[0]}" in Qloo's description` };
  return { band: null, reason: null };
}

export function openDays(room: Room): { open: DayKey[]; closed: DayKey[] } | null {
  if (!room.hours) return null;
  const open: DayKey[] = [];
  const closed: DayKey[] = [];
  for (const d of DAY_KEYS) {
    const h = room.hours[d];
    if (!h) continue;
    (h.closed ? closed : open).push(d);
  }
  return { open, closed };
}

/** null = Qloo has no hours for this room (unknown, not "open"). */
export function isOpenOn(room: Room, day: DayKey): boolean | null {
  const h = room.hours?.[day];
  if (!room.hours) return null;
  if (!h) return null;
  return !h.closed;
}

function neighborhoodRankFor(room: Room, neighborhoods: Locality[] | null): number | null {
  if (!neighborhoods?.length) return null;
  if (room.neighborhood) {
    const hit = neighborhoods.find((n) => n.name.toLowerCase() === room.neighborhood!.toLowerCase());
    if (hit) return hit.rank;
  }
  // Fall back to the nearest ranked neighborhood center within ~2.5 km.
  if (room.lat == null || room.lon == null) return null;
  let best: { rank: number; d: number } | null = null;
  for (const n of neighborhoods) {
    if (n.lat == null || n.lon == null) continue;
    const d = Math.hypot((n.lat - room.lat) * 111, (n.lon - room.lon) * 111 * Math.cos((room.lat * Math.PI) / 180));
    if (d < 2.5 && (!best || d < best.d)) best = { rank: n.rank, d };
  }
  return best?.rank ?? null;
}

export function shapeRooms(
  raw: Room[],
  sound: Sound,
  neighborhoods: Locality[] | null,
  band: RoomBand | null,
  limit: number = config.rooms.perCity,
): { rooms: RoomView[]; droppedClosed: string[] } {
  const droppedClosed = raw.filter((r) => r.isClosed).map((r) => r.name);
  const names = new Map(sound.entities.map((e) => [e.id.toUpperCase(), e.name]));
  let views: RoomView[] = raw
    .filter((r) => !r.isClosed && r.address)
    .map((r) => {
      const days = openDays(r);
      const size = guessSize(r);
      const explain = r.explain.filter((x) => names.has(x.entityId.toUpperCase()));
      const total = explain.reduce((s, x) => s + x.score, 0);
      return {
        ...r,
        rank: 0,
        neighborhoodRank: neighborhoodRankFor(r, neighborhoods),
        openDays: days?.open ?? null,
        closedDays: days?.closed ?? null,
        sizeGuess: size.band,
        sizeReason: size.reason,
        // Explainability is always 1 with a single signal, so it's only shown for 2+ (PRD 4.1).
        pulledBy:
          sound.entities.length >= 2 && total > 0
            ? explain
                .map((x) => ({ name: names.get(x.entityId.toUpperCase())!, share: Math.round((x.score / total) * 100) / 100 }))
                .sort((a, b) => b.share - a.share)
            : null,
      };
    });
  // A room that Gus thinks is the wrong size for the artist's band drops below the rest,
  // but stays visible: Gus's guess is an opinion, not a fact.
  if (band) {
    views = [...views].sort((a, b) => {
      const pa = a.sizeGuess && a.sizeGuess !== band ? 1 : 0;
      const pb = b.sizeGuess && b.sizeGuess !== band ? 1 : 0;
      return pa - pb || (b.affinity ?? 0) - (a.affinity ?? 0);
    });
  }
  views = views.slice(0, limit).map((v, i) => ({ ...v, rank: i + 1 }));
  return { rooms: views, droppedClosed };
}

export async function cityDetail(
  sound: Sound,
  metroId: string,
  opts: { kind: ActKind; band?: RoomBand | null; scope?: string; waitForNeighborhoods?: boolean },
): Promise<CityDetail> {
  const metro = metroById(metroId);
  if (!metro) throw new Error(`Unknown metro ${metroId}`);
  const receipts: Receipt[] = [];
  const notices: string[] = [];

  const neighborhoodsPromise = warmNeighborhoods(sound, metro, opts.scope);
  const [grid, roomRes] = await Promise.all([
    cityHeat(sound.entities, metro.query, opts.scope).catch((e) => ({ error: e })),
    qlooRooms(sound.entities, metro.query, opts.kind === 'comedy', opts.scope).catch((e) => ({ error: e })),
  ]);

  let hexes: MapHex[] = [];
  let cellCount = 0;
  if ('data' in grid) {
    receipts.push(grid.receipt);
    cellCount = grid.data.length;
    hexes = toHexes(grid.data, 8, 900);
  } else notices.push('Qloo did not return street-level heat for this city.');

  // Neighborhoods: wait briefly (they're usually cached for demo cities), else report pending.
  let neighborhoods: Locality[] | null = null;
  let outline: [number, number][] | null = null;
  let pending = false;
  const loc = await (opts.waitForNeighborhoods
    ? neighborhoodsPromise
    : Promise.race([neighborhoodsPromise, new Promise<null>((r) => setTimeout(() => r(null), 1500))]));
  if (loc) {
    receipts.push(loc.receipt);
    neighborhoods = loc.data.neighborhoods;
    outline = loc.data.outline;
  } else pending = true;

  let rooms: RoomView[] = [];
  let droppedClosed: string[] = [];
  if ('data' in roomRes) {
    receipts.push(roomRes.receipt);
    ({ rooms, droppedClosed } = shapeRooms(roomRes.data, sound, neighborhoods, opts.band ?? null));
    rooms = rooms.map((room) => ({ ...room, operationalFacts: venueFactsFor(room, metro.id) }));
    if (!rooms.length) notices.push(`The graph's quiet here: Qloo has no open ${opts.kind === 'comedy' ? 'comedy rooms' : 'music rooms'} for this Sound in ${metro.name}.`);
    if (opts.kind === 'comedy' && rooms.length < 3) notices.push('Comedy-room coverage is thinner than music in Qloo; bars that host shows are included.');
  } else notices.push('Rooms are unavailable right now (Qloo error).');

  const thin = cellCount < 50;
  if (thin) notices.push("The graph's quiet here. I won't make stuff up.");

  return {
    metro: { id: metro.id, name: metro.name, state: metro.state, stateName: metro.stateName, query: metro.query, lat: metro.lat, lon: metro.lon, pop: metro.pop, kind: metro.kind as 'metro' | 'college' },
    hexes,
    cellCount,
    thin,
    neighborhoods,
    neighborhoodsPending: pending,
    outline,
    rooms,
    droppedClosed,
    receipts,
    notices,
  };
}
