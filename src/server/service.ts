/**
 * The service layer behind the API routes: assembles artist state, the map, plans,
 * pitches and posters from the modules below it.
 */
import { cellToLatLng } from 'h3-js';
import { applyFix, plan as planRoute, rescore, resequence, swapCandidates, tryFix, roasts as findRoasts, namesFrom, roastCard, type PlanInput, type PlannerRoom } from '../lib/tour';
import type { Region } from '../lib/regions';
import type { CityProof, DayKey, Locality, Receipt, Roast, RoastFix, RoomBand, TourConstraints, TourPlan, TourStop } from '../lib/types';
import { getArtist, openCity, openedCities, type ArtistRow } from './artists';
import { bountyView, ensureBounty } from './bounty';
import { cityDetail, shapeRooms, warmNeighborhoods, type RoomView } from './city';
import { cityCount, claimByDevice, proofFor, recentSignatures, wearLevel } from './claims';
import { config } from './config';
import { crowdCard } from './crowd';
import { deviceHash, id } from './crypto';
import { all, one, run } from './db';
import { pitchEmail, routeLines, type PitchEvidence } from './gus/agent';
import { HttpError } from './http';
import { cityNeighborhoods, rooms as qlooRooms } from './qloo/api';
import { findMetro, metroById } from './score';
import { scoreForSound, type ScoutResult } from './sound';
import { inbox } from './inbox';

// ---------- scout cache ----------

const scoutCache = new Map<string, { at: number; result: ScoutResult }>();

export async function scoutFor(artist: ArtistRow): Promise<ScoutResult> {
  const hit = scoutCache.get(artist.sound.hash);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.result;
  const result = await scoreForSound(artist.sound, `artist:${artist.id}`);
  scoutCache.set(artist.sound.hash, { at: Date.now(), result });
  if (scoutCache.size > 50) scoutCache.delete(scoutCache.keys().next().value!);
  return result;
}

export function rememberScout(result: ScoutResult) {
  scoutCache.set(result.sound.hash, { at: Date.now(), result });
}

export async function requireArtist(idOrSlug: string): Promise<ArtistRow> {
  const a = await getArtist(idOrSlug);
  if (!a) throw new HttpError(404, 'No such artist.');
  return a;
}

// ---------- neighborhoods (cached-only reads) ----------

/** Neighborhoods if cached or quick; otherwise starts the slow call and returns null. */
async function neighborhoodsFast(artist: ArtistRow, metroId: string, waitMs = 60): Promise<Locality[] | null> {
  const metro = metroById(metroId);
  if (!metro) return null;
  const p = warmNeighborhoods(artist.sound, metro, `artist:${artist.id}`);
  const r = await Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), waitMs))]);
  return r?.data.neighborhoods ?? null;
}

// ---------- artist state ----------

export async function artistState(artist: ArtistRow) {
  const opened = await openedCities(artist.id);
  const proof = await proofFor(artist.id, { includeDemo: artist.isDemo });
  const messages = await inbox(artist.id, 30);
  return {
    artist: publicArtist(artist),
    opened: opened.map((c) => ({ ...c, proof: proof.find((p) => p.city === c.city) ?? null, posterPath: `/w/${artist.slug}/${c.city}` })),
    inbox: messages,
    unread: messages.filter((m) => !m.read).length,
  };
}

export function publicArtist(a: ArtistRow) {
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    kind: a.kind,
    sound: a.sound,
    imageUrl: a.imageUrl,
    portrait: a.portrait,
    homeBase: a.homeBase,
    roomBand: a.roomBand,
    isDemo: a.isDemo,
  };
}

// ---------- map ----------

export async function mapData(artist: ArtistRow) {
  const r = await scoutFor(artist);
  const opened = await openedCities(artist.id);
  const proof = await proofFor(artist.id, { includeDemo: artist.isDemo });
  // Claims overlay: aggregate dots per neighborhood (never individual fans).
  const dots: { lat: number; lon: number; count: number; neighborhood: string; city: string; confirmed: boolean }[] = [];
  for (const p of proof) {
    if (!p.neighborhoods.length) continue;
    const hoods = await neighborhoodsFast(artist, p.city);
    const metro = metroById(p.city)!;
    for (const n of p.neighborhoods) {
      const loc = hoods?.find((h) => h.name.toLowerCase() === n.name.toLowerCase());
      dots.push({
        lat: loc?.lat ?? metro.lat,
        lon: loc?.lon ?? metro.lon,
        count: n.count,
        neighborhood: n.name,
        city: p.city,
        // A predicted hot neighborhood that also has signatures: "prediction confirmed".
        confirmed: !!loc && loc.rank <= 5,
      });
    }
  }
  return {
    sound: r.sound,
    notices: r.notices,
    baselineSize: r.baselineSize,
    metros: r.metros
      .filter((m) => m.score !== null)
      .map((m) => ({
        id: m.id,
        name: m.name,
        state: m.state,
        lat: m.lat,
        lon: m.lon,
        pop: m.pop,
        kind: m.kind,
        score: m.score,
        heat: m.heat,
        lift: m.lift,
        heatPct: m.heatPct,
        liftPct: m.liftPct,
        heatRank: m.heatRank,
        liftRank: m.liftRank,
        rank: m.rank,
        sleeper: m.sleeper,
        cells: m.cells,
      })),
    hexes: r.hexes,
    sleepers: r.sleepers.map((m) => m.id),
    opened: opened.map((o) => o.city),
    proof,
    dots,
    receipts: r.receipts,
  };
}

// ---------- city ----------

export async function cityData(artist: ArtistRow, metroId: string, wait = false) {
  const d = await cityDetail(artist.sound, metroId, {
    kind: artist.kind,
    band: artist.roomBand,
    scope: `artist:${artist.id}`,
    waitForNeighborhoods: wait,
  });
  const r = await scoutFor(artist);
  const score = r.metros.find((m) => m.id === metroId) ?? null;
  const proof = (await proofFor(artist.id, { includeDemo: artist.isDemo })).find((p) => p.city === metroId) ?? null;
  const hexes = d.hexes.map((h) => {
    const [lat, lon] = cellToLatLng(h.h3);
    return { ...h, lat, lon };
  });
  return { ...d, hexes, score, proof, opened: !!proof };
}

export async function crowdFor(artist: ArtistRow, metroId: string | null) {
  const metro = metroId ? metroById(metroId) : null;
  const hoods = metroId ? await neighborhoodsFast(artist, metroId, 1500) : null;
  return crowdCard(artist.sound, {
    topNeighborhood: hoods?.[0]?.name ?? null,
    cityQuery: metro?.query ?? null,
    scope: `artist:${artist.id}`,
  });
}

// ---------- posters ----------

export async function openPoster(artist: ArtistRow, metroId: string) {
  const metro = metroById(metroId);
  if (!metro) throw new HttpError(404, 'Unknown city.');
  const r = await scoutFor(artist);
  const m = r.metros.find((x) => x.id === metroId);
  // Wait for the neighborhoods (the poster prints the top three; fans pick from the list).
  const loc = await cityNeighborhoods(artist.sound.entities, metro.query, metro.name, `artist:${artist.id}`).catch(() => null);
  const top = loc?.data.neighborhoods.slice(0, 3).map((n) => n.name) ?? [];
  await openCity(artist, metroId, m?.heat ?? null, top);
  // Seal the Bounty's draw secret the day the poster goes up.
  await ensureBounty(artist, metroId);
  return { city: metroId, topNeighborhoods: top, posterPath: `/w/${artist.slug}/${metroId}` };
}

export async function posterState(slug: string, metroId: string, deviceToken: string | null) {
  const artist = await requireArtist(slug);
  const metro = metroById(metroId);
  const opened = (await openedCities(artist.id)).find((c) => c.city === metroId);
  if (!metro || !opened) throw new HttpError(404, 'This city has no WANTED poster yet.');
  const count = await cityCount(artist.id, metroId);
  const signatures = await recentSignatures(artist.id, metroId, 30);
  const loc = await cityNeighborhoods(artist.sound.entities, metro.query, metro.name, `poster:${artist.id}`).catch(() => null);
  const hoods = loc?.data.neighborhoods ?? [];
  const mine = deviceToken ? await claimByDevice(artist.id, metroId, deviceToken) : null;
  const r = await scoutFor(artist).catch(() => null);
  const score = r?.metros.find((x) => x.id === metroId) ?? null;
  // Mini heat map: the city's street-level hexes as points (no fan data).
  const city = await cityDetail(artist.sound, metroId, { kind: artist.kind, scope: `poster:${artist.id}` }).catch(() => null);
  return {
    artist: { slug: artist.slug, name: artist.name, kind: artist.kind, portrait: artist.portrait, imageUrl: artist.imageUrl, isDemo: artist.isDemo },
    city: { id: metro.id, name: metro.name, state: metro.state, lat: metro.lat, lon: metro.lon },
    count,
    wear: wearLevel(count),
    deputiesLeft: Math.max(0, config.proof.deputyLimit - count),
    topNeighborhoods: opened.topNeighborhoods,
    neighborhoods: hoods.slice(0, 40).map((n) => ({ name: n.name, rank: n.rank, lat: n.lat, lon: n.lon })),
    // Other signers' referral codes stay private; only your own card carries yours.
    signatures: signatures.map((x) => { const { refCode: _r, ...rest } = x as typeof x & { refCode?: string }; return rest; }),
    mine,
    played: opened.playedAt ? { at: opened.playedAt, venue: opened.playedVenue } : null,
    rank: score?.rank ?? null,
    bounty: await bountyView(artist, metroId, deviceToken ? deviceHash(deviceToken) : null),
    show: await heldShow(artist.id, metroId),
    hexes: (city?.hexes ?? []).slice(0, 400).map((h) => {
      const [lat, lon] = cellToLatLng(h.h3);
      return { h3: h.h3, heat: h.heat, lat, lon };
    }),
  };
}

/** The held date for a city, if any: what signers hear first. Only the room and the night. */
async function heldShow(artistId: string, metroId: string): Promise<{ room: string; date: string } | null> {
  const rows = await all<{ body: string }>('select body from deals where artist_id = ? and city = ? order by updated_at desc', [artistId, metroId]);
  for (const r of rows) {
    const d = JSON.parse(r.body) as { status: string; roomName: string; terms: { date: string } | null };
    if (d.status === 'held' && d.terms) return { room: d.roomName, date: d.terms.date };
  }
  return null;
}

// ---------- tour ----------

const toPlannerRoom = (r: RoomView): PlannerRoom => ({
  id: r.id,
  name: r.name,
  neighborhood: r.neighborhood,
  neighborhoodRank: r.neighborhoodRank,
  hours: r.hours,
  sizeGuess: r.sizeGuess,
  affinity: r.affinity,
  lat: r.lat,
  lon: r.lon,
  address: r.address,
  website: r.website,
  phone: r.phone,
  description: r.description,
});

async function roomsFor(artist: ArtistRow, metroIds: string[]): Promise<Record<string, PlannerRoom[]>> {
  const out: Record<string, PlannerRoom[]> = {};
  await Promise.all(
    metroIds.map(async (mid) => {
      const metro = metroById(mid);
      if (!metro) return;
      try {
        const [r, hoods] = await Promise.all([
          qlooRooms(artist.sound.entities, metro.query, artist.kind === 'comedy', `artist:${artist.id}`),
          neighborhoodsFast(artist, mid, 50),
        ]);
        out[mid] = shapeRooms(r.data, artist.sound, hoods, artist.roomBand, 8).rooms.map(toPlannerRoom);
      } catch {
        out[mid] = [];
      }
    }),
  );
  return out;
}

export async function loadPlan(artistId: string): Promise<TourPlan | null> {
  const row = await one<{ body: string }>('select body from plans where artist_id = ? order by updated_at desc limit 1', [artistId]);
  return row ? (JSON.parse(row.body) as TourPlan) : null;
}

async function savePlan(p: TourPlan) {
  await run(
    `insert into plans(id, artist_id, body, created_at, updated_at) values(?, ?, ?, ?, ?)
     on conflict(id) do update set body = excluded.body, updated_at = excluded.updated_at`,
    [p.id, p.artistId, JSON.stringify(p), p.updatedAt, p.updatedAt],
  );
}

/**
 * Every Fix is simulated before Gus offers it. The Tour Score is a mean over stops, so a
 * better room on one night moves it by a few tenths; any gain counts. A Fix that wouldn't
 * raise the score is withdrawn: the roast stays, with its Why, but no button makes the tour
 * worse. (Dropping a stop isn't used as a fallback: it lifts the mean by giving up a date.)
 */
async function verifyFixes(artist: ArtistRow, list: Roast[], current: { stops: TourStop[]; total: number }, base: PlanInput, start: string): Promise<Roast[]> {
  // A city swap is only as good as the city: try the roast's pick and the best few alternatives.
  const options = new Map<Roast, RoastFix[]>();
  for (const r of list) {
    if (!r.fix) continue;
    if (r.fix.kind !== 'swap-city') options.set(r, [r.fix]);
    else {
      const { stopIndex, metroId } = r.fix;
      const alts = swapCandidates(current.stops, stopIndex, base, 5).map((m) => m.id).filter((id) => id !== metroId);
      options.set(r, [metroId, ...alts].map((id) => ({ kind: 'swap-city', stopIndex, metroId: id })));
    }
  }
  const need = [...new Set([...options.values()].flat().flatMap((f) => ('metroId' in f && !base.rooms[f.metroId] ? [f.metroId] : [])))];
  if (need.length) Object.assign(base.rooms, await roomsFor(artist, need));
  const gainOf = (fix: RoastFix) => Math.round((tryFix(current.stops, fix, base, start).total - current.total) * 10) / 10;
  return list.map((r) => {
    const tries = options.get(r);
    if (!r.fix || !tries) return r;
    const best = tries.map((fix) => ({ fix, gain: gainOf(fix) })).sort((a, b) => b.gain - a.gain)[0];
    if (best.gain <= 0) return { ...r, fix: null };
    if (best.fix === r.fix) return { ...r, gain: best.gain };
    const m = 'metroId' in best.fix ? metroById(best.fix.metroId) : null;
    const score = m ? base.candidates.find((c) => c.id === m.id)?.score : null;
    const first = r.why.split('. ')[0].replace(/\.$/, '');
    return { ...r, fix: best.fix, gain: best.gain, why: m ? `${first}. ${m.name}${score !== null && score !== undefined ? ` (score ${score})` : ''} fits the route better.` : r.why };
  });
}

export type PlanAction =
  | { kind: 'new' }
  | { kind: 'fix'; fix: RoastFix }
  | { kind: 'lock'; stopIndex: number; locked: boolean }
  | { kind: 'drop'; stopIndex: number }
  | { kind: 'swap'; stopIndex: number; metroId: string }
  | { kind: 'room'; stopIndex: number; roomId: string }
  | { kind: 'replan' };

export async function planFor(artist: ArtistRow, constraints: TourConstraints & { regions: Region[]; excluded?: string[] }, action: PlanAction): Promise<TourPlan & { receipts: Receipt[] }> {
  const scout = await scoutFor(artist);
  const proof = await proofFor(artist.id, { includeDemo: artist.isDemo });
  const proofMap: PlanInput['proof'] = Object.fromEntries(proof.map((p) => [p.city, { ratio: p.ratio, signatures: p.signatures, crossed: p.crossed }]));
  const home = constraints.homeBase ? metroById(constraints.homeBase) ?? findMetro(constraints.homeBase) : null;
  const previous = action.kind === 'new' ? null : await loadPlan(artist.id);

  const base: PlanInput = {
    candidates: scout.metros,
    regions: constraints.regions,
    startDate: constraints.startDate,
    dates: constraints.dates,
    roomBand: constraints.roomBand,
    homeBase: home ? { lat: home.lat, lon: home.lon, id: home.id } : null,
    proof: proofMap,
    rooms: {},
    excluded: constraints.excluded ?? [],
    config: config.tour,
  };

  let stops: TourStop[];
  if (!previous || action.kind === 'new' || action.kind === 'replan') {
    // First pass picks the cities; then we fetch their rooms and plan for real.
    const draft = planRoute({ ...base, previous: previous?.stops });
    base.rooms = await roomsFor(artist, draft.stops.map((s) => s.metroId));
    stops = planRoute({ ...base, previous: previous?.stops }).stops;
  } else {
    let next = previous.stops.map((s) => ({ ...s }));
    if (action.kind === 'lock') next[action.stopIndex] = { ...next[action.stopIndex], locked: action.locked };
    else if (action.kind === 'drop') {
      base.excluded = [...(base.excluded ?? []), next[action.stopIndex].metroId];
      next.splice(action.stopIndex, 1);
    } else if (action.kind === 'room') {
      base.rooms = await roomsFor(artist, [next[action.stopIndex].metroId]);
      next = applyFix(next, { kind: 'change-room', stopIndex: action.stopIndex, roomId: action.roomId }, base);
    }
    const fix: RoastFix | null = action.kind === 'fix' ? action.fix : action.kind === 'swap' ? { kind: 'swap-city', stopIndex: action.stopIndex, metroId: action.metroId } : null;
    const extra = fix && 'metroId' in fix ? [fix.metroId] : [];
    base.rooms = { ...(await roomsFor(artist, [...new Set([...next.map((s) => s.metroId), ...extra])])), ...base.rooms };
    // Shifts are anchored on the artist's chosen start, so repeated edits never drift the tour.
    stops = fix ? tryFix(next, fix, base, constraints.startDate).stops : rescore(next, base, { startDate: [...previous.stops.map((s) => s.date)].sort()[0] ?? constraints.startDate }).stops;
  }

  if (!Object.keys(base.rooms).length) base.rooms = await roomsFor(artist, stops.map((s) => s.metroId));
  // Final pass: dates and rooms are already settled; this only recomputes totals.
  const scored = rescore(stops, base, { startDate: stops[0]?.date });
  const roastList = (await verifyFixes(artist, findRoasts(scored.stops, base), scored, base, constraints.startDate)).map((r) => ({ ...r, card: roastCard(r, scored.stops, namesFrom(base)) }));
  const lines = await routeLines({ stops: scored.stops, roasts: roastList, total: scored.total, artistName: artist.name });
  scored.stops.forEach((s, i) => (s.blurb = lines.blurbs[i]));

  const result: TourPlan = {
    id: previous?.id ?? id('p_'),
    artistId: artist.id,
    constraints: { ...constraints, homeBase: home?.id ?? null } as TourConstraints,
    stops: scored.stops,
    total: scored.total,
    splitPenalty: scored.splitPenalty,
    roasts: lines.roasts,
    gusLine: lines.planLine,
    gusModel: lines.model,
    updatedAt: Date.now(),
  };
  await savePlan(result);
  // Warm neighborhoods for every stop so room-fit improves on the next edit.
  for (const s of result.stops) void neighborhoodsFast(artist, s.metroId, 0);
  return { ...result, receipts: [] };
}

// ---------- pitch ----------

export async function pitchFor(artist: ArtistRow, metroId: string, roomId: string | null, date: { date: string; day: DayKey } | null) {
  const metro = metroById(metroId);
  if (!metro) throw new HttpError(404, 'Unknown city.');
  const scout = await scoutFor(artist);
  const score = scout.metros.find((m) => m.id === metroId);
  const city = await cityData(artist, metroId, true);
  const room = (roomId ? city.rooms.find((r) => r.id === roomId) : null) ?? city.rooms[0];
  if (!room) throw new HttpError(404, "Qloo has no open room for this Sound here, so there's nobody to pitch.");
  const proof: CityProof | null = city.proof;
  const realOnly = !artist.isDemo;
  const signatures = proof ? (realOnly ? proof.realSignatures : proof.signatures) : 0;
  const crowd = await crowdFor(artist, null);
  const opener = crowd.openers[0] ?? null;
  const deputies = Math.min(signatures, config.proof.deputyLimit);
  const evidence: PitchEvidence = {
    artist: {
      name: artist.name,
      kind: artist.kind,
      soundsLike: artist.sound.entities.filter((e) => e.role !== 'self').map((e) => e.name),
    },
    room: { name: room.name, neighborhood: room.neighborhood, website: room.website },
    city: { name: metro.name, state: metro.state },
    date: date ? { date: date.date, day: date.day } : null,
    roomBand: artist.roomBand ?? 'small',
    qloo: {
      wantedScore: score?.score ?? null,
      cityRank: score?.rank ?? null,
      citiesScored: scout.ranked.length,
      heatRank: score?.heatRank ?? null,
      liftRank: score?.liftRank ?? null,
      sleeper: !!score?.sleeper,
      topNeighborhoods: (city.neighborhoods ?? []).slice(0, 3).map((n) => n.name),
      roomInTopNeighborhood: room.neighborhoodRank !== null && room.neighborhoodRank <= 3,
      pulledBy: room.pulledBy,
      vibe: crowd.vibe.slice(0, 4).map((v) => v.name),
    },
    fans: {
      signatures,
      deputies,
      neighborhoods: (proof?.neighborhoods ?? []).slice(0, 3),
      signatureShare: proof?.signatureShare ?? null,
      heatShare: proof?.heatShare ?? null,
      proofRatio: proof?.ratio ?? null,
      isDemoData: artist.isDemo && signatures > 0,
    },
    opener: opener ? { name: opener.name, shared: opener.shared.map((s) => s.name) } : null,
  };
  if (evidence.artist.soundsLike.length === 0) evidence.artist.soundsLike = artist.sound.entities.map((e) => e.name);
  const email = await pitchEmail(evidence);
  return { evidence, email, room, receipts: [...city.receipts, ...crowd.receipts] };
}
