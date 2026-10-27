/**
 * Tour Builder (FR-9 to FR-12, PRD 6.4, 9.5). Pure TypeScript shared by the server and the
 * app: routing and scoring stay in code; Gus only writes the lines.
 *
 * - Pick cities by Wanted Score within the region, keep locked stops, avoid splitting a crowd.
 * - Sequence with nearest-neighbor + 2-opt on van drive time (haversine x road factor).
 * - Shift the start day so the strongest stops land on weekends.
 * - Choose each stop's room: open that night (Qloo hours), right size, hottest neighborhood.
 * - Score every stop transparently; roast what's wrong, with a Fix and a Why.
 */
import { driveEstimate, haversineKm } from './geo';
import { inRegions, type Region } from './regions';
import type { DayKey, MetroScore, Roast, RoastCard, RoastFix, RoomBand, StopScore, TourStop } from './types';

export type TourConfig = {
  weights: { wanted: number; proof: number; roomFit: number; openNight: number; drive: number };
  proofCap: number;
  splitKm: number;
  splitDays: number;
  splitPenalty: number;
  roadFactor: number;
  vanKmh: number;
  longHaulHours: number;
};

export const DEFAULT_TOUR_CONFIG: TourConfig = {
  weights: { wanted: 0.4, proof: 0.2, roomFit: 0.15, openNight: 0.1, drive: 0.15 },
  proofCap: 3,
  splitKm: 150,
  splitDays: 21,
  splitPenalty: 6,
  roadFactor: 1.25,
  vanKmh: 88,
  longHaulHours: 5,
};

/** A room as the planner sees it (a subset of RoomView). */
export type PlannerRoom = {
  id: string;
  name: string;
  neighborhood: string | null;
  neighborhoodRank: number | null;
  hours: Partial<Record<DayKey, { closed: boolean }>> | null;
  sizeGuess: RoomBand | null;
  affinity: number | null;
  lat: number | null;
  lon: number | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  description: string | null;
};

export type PlanInput = {
  candidates: MetroScore[];
  regions: Region[];
  startDate: string;
  dates: number;
  roomBand: RoomBand;
  homeBase: { lat: number; lon: number; id?: string } | null;
  /** metro id -> proof ratio (only cities with 2+ opened cities have one). */
  proof: Record<string, { ratio: number | null; signatures: number; crossed: boolean }>;
  /** metro id -> rooms ranked by Qloo (may be missing until fetched). */
  rooms: Record<string, PlannerRoom[]>;
  /** The current route; stops with `locked` keep their position, city, date and room (FR-12). */
  previous?: TourStop[];
  /** Cities the artist dropped; never re-picked. */
  excluded?: string[];
  config?: TourConfig;
};

export const DAYS: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function dayOf(date: string): DayKey {
  const [y, m, d] = date.split('-').map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Weekend nights draw; Monday to Wednesday is the "weekday trap". */
export function dayFactor(day: DayKey): number {
  if (day === 'friday' || day === 'saturday') return 1;
  if (day === 'thursday' || day === 'sunday') return 0.85;
  return 0.6;
}

export function isWeakDay(day: DayKey) {
  return day === 'monday' || day === 'tuesday' || day === 'wednesday';
}

function roomOpen(room: PlannerRoom | null, day: DayKey): boolean | null {
  if (!room?.hours) return null;
  const h = room.hours[day];
  if (!h) return null;
  return !h.closed;
}

// ---------- city selection ----------

function pickCities(input: PlanInput, slots: number, already: MetroScore[]): MetroScore[] {
  const excluded = new Set([...(input.excluded ?? []), ...already.map((a) => a.id)]);
  const pool = input.candidates
    .filter((c) => c.score !== null && !excluded.has(c.id) && inRegions(c.state, input.regions))
    .map((c) => {
      const p = input.proof[c.id];
      // Proven demand outranks prediction: a crossed city jumps the queue.
      const boost = p?.crossed ? 100 : p?.ratio ? Math.min(p.ratio, 3) * 4 : 0;
      return { c, value: (c.score ?? 0) + boost };
    })
    .sort((a, b) => b.value - a.value);
  const chosen: MetroScore[] = [];
  const near = (a: MetroScore, b: MetroScore) => haversineKm(a.lat, a.lon, b.lat, b.lon) * DEFAULT_TOUR_CONFIG.roadFactor < 130;
  // "Anywhere in the US": grow one drivable cluster from the strongest city instead of
  // connecting the country's top cities coast to coast. Each candidate pays about one score
  // point per 60 km from the nearest city already on the tour, and nothing past a day's
  // drive (~700 road km) joins unless fans there already proved it.
  if (!input.regions.length) {
    const left = [...pool];
    // First pass keeps one crowd per night; the second lets neighbors share a crowd but
    // still never reaches past the cap, so a thin cluster stays short instead of flying south.
    for (const allowNear of [false, true]) {
      while (chosen.length < slots && left.length) {
        const anchor = [...already, ...chosen];
        let bi = 0;
        let bv = -Infinity;
        left.forEach(({ c, value }, i) => {
          const proven = !!input.proof[c.id]?.crossed;
          if (!allowNear && !proven && anchor.some((x) => near(x, c))) return;
          const km = anchor.length ? Math.min(...anchor.map((x) => haversineKm(x.lat, x.lon, c.lat, c.lon))) : 0;
          if (km * DEFAULT_TOUR_CONFIG.roadFactor > 700 && !proven) return;
          const v = value - km / 60;
          if (v > bv) {
            bv = v;
            bi = i;
          }
        });
        if (bv === -Infinity) break;
        chosen.push(left.splice(bi, 1)[0].c);
      }
    }
    return chosen;
  }
  for (const { c } of pool) {
    if (chosen.length >= slots) break;
    // Don't split one crowd across two nights unless the second city has proof of its own.
    if ([...already, ...chosen].some((x) => near(x, c)) && !input.proof[c.id]?.crossed) continue;
    chosen.push(c);
  }
  // If the region is small, relax the split rule rather than return a short tour.
  for (const { c } of pool) {
    if (chosen.length >= slots) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  return chosen;
}

// ---------- sequencing ----------

type Pt = { lat: number; lon: number };

function hours(a: Pt, b: Pt, cfg: TourConfig) {
  return driveEstimate(a.lat, a.lon, b.lat, b.lon, cfg.roadFactor, cfg.vanKmh).hours;
}

function routeCost(order: Pt[], start: Pt | null, cfg: TourConfig) {
  let total = 0;
  let prev = start;
  for (const p of order) {
    if (prev) total += hours(prev, p, cfg);
    prev = p;
  }
  return total;
}

/** Nearest neighbor from the home base, then 2-opt until no improvement. */
export function sequence<T extends Pt>(points: T[], start: Pt | null, cfg: TourConfig = DEFAULT_TOUR_CONFIG): T[] {
  if (points.length <= 2) return points;
  const remaining = [...points];
  const order: T[] = [];
  let cur: Pt = start ?? remaining[0];
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((p, i) => {
      const d = hours(cur, p, cfg);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const [next] = remaining.splice(bi, 1);
    order.push(next);
    cur = next;
  }
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        if (routeCost(candidate, start, cfg) + 1e-9 < routeCost(order, start, cfg)) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

// ---------- rooms ----------

function chooseRoom(rooms: PlannerRoom[] | undefined, day: DayKey, band: RoomBand): PlannerRoom | null {
  if (!rooms?.length) return null;
  const ranked = [...rooms].sort((a, b) => {
    const open = (r: PlannerRoom) => (roomOpen(r, day) === false ? 2 : roomOpen(r, day) === null ? 1 : 0);
    const size = (r: PlannerRoom) => (r.sizeGuess && r.sizeGuess !== band ? 1 : 0);
    const hood = (r: PlannerRoom) => r.neighborhoodRank ?? 12;
    return open(a) - open(b) || size(a) - size(b) || (b.affinity ?? 0) - (a.affinity ?? 0) || hood(a) - hood(b);
  });
  return ranked[0];
}

// ---------- scoring ----------

export function scoreStop(
  stop: Pick<TourStop, 'day' | 'driveHoursFromPrev' | 'roomNeighborhoodRank'> & { metroScore: number | null; proofRatio: number | null; room: PlannerRoom | null },
  cfg: TourConfig = DEFAULT_TOUR_CONFIG,
): StopScore {
  const w = cfg.weights;
  const wanted = (stop.metroScore ?? 0) / 100;
  // No signatures yet means "as predicted": ratio 1.
  const ratio = stop.proofRatio ?? 1;
  const proof = Math.min(ratio, cfg.proofCap) / cfg.proofCap;
  const rank = stop.roomNeighborhoodRank;
  const roomFit = stop.room ? (rank === null ? 0.5 : Math.max(0, 1 - (rank - 1) / 10)) : 0;
  const open = roomOpen(stop.room, stop.day);
  const openNight = (open === true ? 1 : open === null ? 0.6 : 0) * dayFactor(stop.day);
  const drive = Math.max(0, 1 - stop.driveHoursFromPrev / 10);
  const parts = {
    wanted: round1(wanted * w.wanted * 100),
    proof: round1(proof * w.proof * 100),
    roomFit: round1(roomFit * w.roomFit * 100),
    openNight: round1(openNight * w.openNight * 100),
    drive: round1(drive * w.drive * 100),
  };
  return {
    total: round1(parts.wanted + parts.proof + parts.roomFit + parts.openNight + parts.drive),
    parts,
    inputs: {
      wantedScore: stop.metroScore,
      proofRatio: stop.proofRatio,
      neighborhoodRank: rank,
      openThatNight: open,
      driveHours: round1(stop.driveHoursFromPrev),
    },
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function crowdSplitPenalty(stops: TourStop[], cfg: TourConfig = DEFAULT_TOUR_CONFIG) {
  let penalty = 0;
  const pairs: [number, number][] = [];
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const km = haversineKm(stops[i].lat, stops[i].lon, stops[j].lat, stops[j].lon);
      if (km <= cfg.splitKm && Math.abs(daysBetween(stops[i].date, stops[j].date)) <= cfg.splitDays) {
        penalty += cfg.splitPenalty;
        pairs.push([i, j]);
      }
    }
  }
  return { penalty, pairs };
}

export function totalScore(stops: TourStop[], cfg: TourConfig = DEFAULT_TOUR_CONFIG) {
  if (!stops.length) return { total: 0, splitPenalty: 0 };
  const mean = stops.reduce((s, x) => s + x.score.total, 0) / stops.length;
  const { penalty } = crowdSplitPenalty(stops, cfg);
  return { total: Math.max(0, round1(mean - penalty)), splitPenalty: penalty };
}

// ---------- plan ----------

function buildStops(order: MetroScore[], input: PlanInput, startDate: string, cfg: TourConfig, lockedById: Map<string, TourStop>): TourStop[] {
  const stops: TourStop[] = [];
  let date = startDate;
  let prev: Pt | null = input.homeBase;
  for (const m of order) {
    const locked = lockedById.get(m.id);
    const d = prev ? driveEstimate(prev.lat, prev.lon, m.lat, m.lon, cfg.roadFactor, cfg.vanKmh) : { km: 0, hours: 0 };
    if (locked) date = locked.date;
    else if (stops.length) {
      // One show a day; a drive over 7 hours gets a travel day.
      date = addDays(date, d.hours > 7 ? 2 : 1);
    }
    const day = dayOf(date);
    const room = locked?.room
      ? (input.rooms[m.id]?.find((r) => r.id === locked.room!.id) ?? (locked.room as unknown as PlannerRoom))
      : chooseRoom(input.rooms[m.id], day, input.roomBand);
    const nRank = room?.neighborhoodRank ?? null;
    const p = input.proof[m.id];
    const score = scoreStop(
      { day, driveHoursFromPrev: d.hours, roomNeighborhoodRank: nRank, metroScore: m.score, proofRatio: p?.ratio ?? null, room },
      cfg,
    );
    stops.push({
      metroId: m.id,
      city: m.name,
      state: m.state,
      lat: m.lat,
      lon: m.lon,
      date,
      day,
      locked: !!locked,
      room: room as unknown as TourStop['room'],
      roomNeighborhoodRank: nRank,
      driveKmFromPrev: Math.round(d.km),
      driveHoursFromPrev: round1(d.hours),
      score,
    });
    prev = m;
  }
  return stops;
}

export function plan(input: PlanInput): { stops: TourStop[]; total: number; splitPenalty: number } {
  const cfg = input.config ?? DEFAULT_TOUR_CONFIG;
  const previous = input.previous ?? [];
  const locked = previous.filter((s) => s.locked);
  const lockedById = new Map(locked.map((s) => [s.metroId, s]));
  const lockedMetros = locked
    .map((s) => input.candidates.find((c) => c.id === s.metroId))
    .filter((x): x is MetroScore => !!x);
  const n = Math.max(1, Math.min(20, input.dates));
  const fresh = pickCities(input, n - lockedMetros.length, lockedMetros);

  let order: MetroScore[];
  if (!locked.length) {
    order = sequence(fresh, input.homeBase, cfg);
  } else {
    // Re-plan only unlocked stops: locked ones keep their slot; the rest fill the gaps in route order.
    const unlocked = sequence(fresh, input.homeBase, cfg);
    order = [];
    for (let i = 0, u = 0; i < n; i++) {
      const keep = previous[i]?.locked ? input.candidates.find((c) => c.id === previous[i].metroId) : undefined;
      if (keep) order.push(keep);
      else if (u < unlocked.length) order.push(unlocked[u++]);
    }
  }

  // Shift the start within a week so strong cities hit weekends (only when nothing is locked).
  let best: { stops: TourStop[]; total: number; splitPenalty: number } | null = null;
  const shifts = locked.length ? [0] : [0, 1, 2, 3, 4, 5, 6];
  for (const shift of shifts) {
    const stops = buildStops(order, input, addDays(input.startDate, shift), cfg, lockedById);
    const { total, splitPenalty } = totalScore(stops, cfg);
    if (!best || total > best.total) best = { stops, total, splitPenalty };
  }
  return best!;
}

/**
 * Re-scores an edited route (after Fix, swap, drop or a manual reorder) without re-picking
 * cities. Dates are rebuilt from the tour's original start; when nothing is locked, the start
 * may slide up to six days so strong cities land on weekends. A room the artist picked by
 * hand is kept; any other room is re-chosen for its (possibly new) night, so an edit never
 * strands a stop in a room that's dark that night.
 */
export function rescore(stops: TourStop[], input: PlanInput, opts: { startDate?: string; shift?: boolean } = {}): { stops: TourStop[]; total: number; splitPenalty: number } {
  const cfg = input.config ?? DEFAULT_TOUR_CONFIG;
  const metros = stops.map((s) => input.candidates.find((c) => c.id === s.metroId)).filter((x): x is MetroScore => !!x);
  const lockedById = new Map(stops.filter((s) => s.locked).map((s) => [s.metroId, s]));
  const start = opts.startDate ?? [...stops.map((s) => s.date)].sort()[0] ?? input.startDate;
  const shifts = opts.shift && !lockedById.size ? [0, 1, 2, 3, 4, 5, 6] : [0];
  let best: { stops: TourStop[]; total: number; splitPenalty: number } | null = null;
  for (const k of shifts) {
    const rebuilt = buildStops(metros, input, addDays(start, k), cfg, lockedById);
    rebuilt.forEach((s, i) => {
      const before = stops[i]?.metroId === s.metroId ? stops[i] : null;
      if (!before?.room || !before.roomPinned) return;
      const room = input.rooms[s.metroId]?.find((r) => r.id === before.room!.id);
      if (!room) return;
      s.room = room as unknown as TourStop['room'];
      s.roomPinned = true;
      s.roomNeighborhoodRank = room.neighborhoodRank;
      s.score = scoreStop(
        { day: s.day, driveHoursFromPrev: s.driveHoursFromPrev, roomNeighborhoodRank: room.neighborhoodRank, metroScore: metros[i].score, proofRatio: input.proof[s.metroId]?.ratio ?? null, room },
        cfg,
      );
    });
    const { total, splitPenalty } = totalScore(rebuilt, cfg);
    if (!best || total > best.total) best = { stops: rebuilt, total, splitPenalty };
  }
  return best!;
}

// ---------- roasts ----------

const TOP_POP = 10;

export function roasts(stops: TourStop[], input: PlanInput): Roast[] {
  const cfg = input.config ?? DEFAULT_TOUR_CONFIG;
  const out: Roast[] = [];
  const inRoute = new Set(stops.map((s) => s.metroId));
  const regional = input.candidates
    .filter((c) => c.score !== null && inRegions(c.state, input.regions) && !(input.excluded ?? []).includes(c.id))
    .sort((a, b) => b.score! - a.score!);
  const unused = regional.filter((c) => !inRoute.has(c.id));
  const scoreOf = (id: string) => input.candidates.find((c) => c.id === id)?.score ?? 0;
  const third = regional[Math.floor((regional.length * 2) / 3)]?.score ?? 0;
  const median = [...stops].map((s) => scoreOf(s.metroId)).sort((a, b) => a - b)[Math.floor(stops.length / 2)] ?? 0;

  const bestNear = (s: TourStop, prev: TourStop | null) =>
    unused
      .filter((c) => !prev || haversineKm(prev.lat, prev.lon, c.lat, c.lon) < haversineKm(prev.lat, prev.lon, s.lat, s.lon) * 1.6)
      .filter((c) => !stops.some((x) => haversineKm(x.lat, x.lon, c.lat, c.lon) * cfg.roadFactor < 130))[0] ?? null;

  stops.forEach((s, i) => {
    if (s.locked) return;
    const prev = i > 0 ? stops[i - 1] : null;
    const sc = scoreOf(s.metroId);

    // Cold city: bottom third of the region's candidates.
    if (sc <= third) {
      const alt = bestNear(s, prev);
      out.push({
        id: `cold-city:${i}`,
        rule: 'cold-city',
        stopIndex: i,
        line: '',
        why: `${s.city} scores ${sc} on the Wanted Score, in the bottom third of ${regional.length} cities in your region.${alt ? ` ${alt.name} scores ${alt.score}.` : ''}`,
        fix: alt ? { kind: 'swap-city', stopIndex: i, metroId: alt.id } : { kind: 'drop', stopIndex: i },
        severity: 2,
      });
    }

    // Long haul into a weaker stop than a closer alternative.
    if (prev && s.driveHoursFromPrev > cfg.longHaulHours) {
      const alt = unused.find(
        (c) =>
          (c.score ?? 0) > sc &&
          driveEstimate(prev.lat, prev.lon, c.lat, c.lon, cfg.roadFactor, cfg.vanKmh).hours < s.driveHoursFromPrev - 1,
      );
      if (alt) {
        const altHours = driveEstimate(prev.lat, prev.lon, alt.lat, alt.lon, cfg.roadFactor, cfg.vanKmh).hours;
        out.push({
          id: `long-haul:${i}`,
          rule: 'long-haul',
          stopIndex: i,
          line: '',
          why: `${s.driveHoursFromPrev} hours from ${prev.city} to ${s.city} (score ${sc}). ${alt.name} scores ${alt.score} and is ${round1(altHours)} hours away.`,
          fix: { kind: 'swap-city', stopIndex: i, metroId: alt.id },
          severity: 2,
        });
      }
    }

    // Weekday trap: a weak city Monday to Wednesday right after a strong weekend stop.
    if (prev && isWeakDay(s.day) && (prev.day === 'friday' || prev.day === 'saturday') && sc < median && scoreOf(prev.metroId) >= median) {
      const alt = bestNear(s, prev);
      out.push({
        id: `weekday-trap:${i}`,
        rule: 'weekday-trap',
        stopIndex: i,
        line: '',
        why: `${s.city} lands on a ${cap(s.day)} right after ${prev.city} on a ${cap(prev.day)}, and scores below the route's median (${sc} vs ${median}).`,
        fix: alt ? { kind: 'swap-city', stopIndex: i, metroId: alt.id } : null,
        severity: 1,
      });
    }

    // Closed that night (Qloo hours say the room is dark).
    if (s.room && roomOpen(s.room as unknown as PlannerRoom, s.day) === false) {
      const open = input.rooms[s.metroId]?.find((r) => roomOpen(r, s.day) !== false && r.id !== s.room!.id);
      out.push({
        id: `closed-night:${i}`,
        rule: 'closed-night',
        stopIndex: i,
        line: '',
        why: `Qloo's hours for ${s.room.name} list it closed on ${cap(s.day)}s.${open ? ` ${open.name} is open that night.` : ''}`,
        fix: open ? { kind: 'change-room', stopIndex: i, roomId: open.id } : { kind: 'move-date', stopIndex: i, date: addDays(s.date, 1) },
        severity: 3,
      });
    }

    // Wrong side of town: the room sits outside the hottest neighborhoods while one inside is available.
    if (s.room && (s.roomNeighborhoodRank === null || s.roomNeighborhoodRank > 5)) {
      const better = input.rooms[s.metroId]?.find(
        (r) => r.neighborhoodRank !== null && r.neighborhoodRank <= 3 && roomOpen(r, s.day) !== false && r.id !== s.room!.id,
      );
      if (better) {
        out.push({
          id: `wrong-side:${i}`,
          rule: 'wrong-side',
          stopIndex: i,
          line: '',
          why: `${s.room.name} is ${s.roomNeighborhoodRank ? `in Qloo's #${s.roomNeighborhoodRank} neighborhood` : 'outside Qloo\'s ranked neighborhoods'}. ${better.name} is in ${better.neighborhood ?? 'a top-3 neighborhood'} (#${better.neighborhoodRank}).`,
          fix: { kind: 'change-room', stopIndex: i, roomId: better.id },
          severity: 1,
        });
      }
    }
  });

  // Crowd split: two stops within 90 minutes of each other share one crowd.
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const d = driveEstimate(stops[i].lat, stops[i].lon, stops[j].lat, stops[j].lon, cfg.roadFactor, cfg.vanKmh);
      if (d.hours <= 1.5) {
        const weaker = scoreOf(stops[i].metroId) < scoreOf(stops[j].metroId) ? i : j;
        if (stops[weaker].locked) continue;
        const alt = bestNear(stops[weaker], weaker > 0 ? stops[weaker - 1] : null);
        out.push({
          id: `crowd-split:${i}-${j}`,
          rule: 'crowd-split',
          stopIndex: weaker,
          line: '',
          why: `${stops[i].city} and ${stops[j].city} are ${round1(d.hours)} hours apart, so they draw from one crowd.`,
          fix: alt ? { kind: 'swap-city', stopIndex: weaker, metroId: alt.id } : { kind: 'drop', stopIndex: weaker },
          severity: 2,
        });
      }
    }
  }

  // Famous-hub bias: the route leans on the biggest metros even though their lift is weak.
  const hubs = [...input.candidates].sort((a, b) => b.pop - a.pop).slice(0, TOP_POP).map((c) => c.id);
  const routeHubs = stops.filter((s) => hubs.includes(s.metroId));
  if (routeHubs.length >= 3) {
    const lifts = routeHubs.map((s) => input.candidates.find((c) => c.id === s.metroId)?.liftPct ?? 0);
    const meanLift = lifts.reduce((a, b) => a + b, 0) / lifts.length;
    if (meanLift < 0.5) {
      const weakest = routeHubs.reduce((a, b) =>
        (input.candidates.find((c) => c.id === a.metroId)?.liftPct ?? 0) <= (input.candidates.find((c) => c.id === b.metroId)?.liftPct ?? 0) ? a : b,
      );
      const sleeper = unused.find((c) => c.sleeper) ?? unused[0];
      out.push({
        id: 'famous-hub',
        rule: 'famous-hub',
        stopIndex: stops.indexOf(weakest),
        line: '',
        why: `${routeHubs.map((s) => s.city).join(', ')} are among the ${TOP_POP} biggest metros, but your lift there averages the ${Math.round(meanLift * 100)}th percentile.${sleeper ? ` ${sleeper.name} is a sleeper city for you.` : ''}`,
        fix: sleeper && !weakest.locked ? { kind: 'swap-city', stopIndex: stops.indexOf(weakest), metroId: sleeper.id } : null,
        severity: 2,
      });
    }
  }

  // Ignored proof: a city put up a WANTED poster and crossed the threshold, but isn't on the route.
  for (const [metroId, p] of Object.entries(input.proof)) {
    if (!p.crossed || inRoute.has(metroId)) continue;
    const m = input.candidates.find((c) => c.id === metroId);
    if (!m) continue;
    out.push({
      id: `ignored-proof:${metroId}`,
      rule: 'ignored-proof',
      stopIndex: null,
      line: '',
      why: `${m.name} has ${p.signatures} signatures and a proof ratio of ${p.ratio}, and it isn't on the route.`,
      fix: { kind: 'add-city', metroId },
      severity: 3,
    });
  }

  return dedupe(out).sort((a, b) => b.severity - a.severity);
}

/**
 * Writes a roast as a card a musician reads at a glance: what's off, the swap, why in a few
 * words, and the button. Runs after fixes are verified, so `to` names what the button does.
 */
export type CardNames = { city: (id: string) => string | undefined; room: (metroId: string, id: string) => string | undefined; signatures: (id: string) => number | undefined };

/** Name lookups from a plan's own inputs, for the server. */
export const namesFrom = (input: PlanInput): CardNames => ({
  city: (id) => input.candidates.find((c) => c.id === id)?.name,
  room: (metroId, id) => input.rooms[metroId]?.find((x) => x.id === id)?.name,
  signatures: (id) => input.proof[id]?.signatures,
});

export function roastCard(r: Roast, stops: TourStop[], names: CardNames): RoastCard {
  const s = r.stopIndex !== null ? stops[r.stopIndex] : null;
  const f = r.fix;
  const city = (id: string) => names.city(id) ?? 'a better city';
  const room = (metroId: string, id: string) => names.room(metroId, id) ?? 'a better room';
  const to = !f ? null : f.kind === 'swap-city' ? city(f.metroId) : f.kind === 'change-room' && s ? room(s.metroId, f.roomId) : f.kind === 'add-city' ? city(f.metroId) : f.kind === 'move-date' ? `${cap(dayOf(f.date))}` : null;
  const action = !f ? 'Got it' : f.kind === 'drop' ? `Drop ${s?.city ?? 'it'}` : f.kind === 'add-city' ? `Add ${to}` : f.kind === 'change-room' ? 'Switch venues' : f.kind === 'move-date' ? `Move to ${to}` : f.kind === 'swap-city' ? `Go to ${to}` : 'Swap the dates';
  const day = s ? cap(s.day) : '';
  switch (r.rule) {
    case 'wrong-side':
      return { title: `A better room in ${s?.city}`, from: s?.room?.name ?? null, to, note: 'Closer to where your fans live.', action };
    case 'closed-night':
      return { title: `${s?.room?.name} is closed that ${day}`, from: s?.room?.name ?? null, to, note: to ? 'Open that night.' : 'Push the show a day.', action };
    case 'cold-city':
      return { title: `${s?.city} is quiet for you`, from: s?.city ?? null, to, note: to ? 'More of your people there.' : 'Few fans here yet.', action };
    case 'long-haul':
      return { title: `A long drive into ${s?.city}`, from: s?.city ?? null, to, note: `${Math.round(s?.driveHoursFromPrev ?? 0)} hours in the van. ${to} is closer.`, action };
    case 'weekday-trap':
      return { title: `${s?.city} on a ${day}`, from: s?.city ?? null, to, note: 'A slow night right after a big weekend.', action };
    case 'crowd-split':
      return { title: `Two shows, one crowd`, from: s?.city ?? null, to, note: `${s?.city} is too close to another stop.`, action };
    case 'famous-hub':
      return { title: 'Big cities, small crowds', from: s?.city ?? null, to, note: to ? `${to} likes you more.` : 'Your fans are elsewhere.', action };
    case 'ignored-proof': {
      // With no fix to offer, the city still comes from the roast's own id ("ignored-proof:<metro>").
      const metro = f && f.kind === 'add-city' ? f.metroId : r.id.split(':')[1];
      const name = to ?? (metro ? names.city(metro) : undefined);
      const n = metro ? names.signatures(metro) : undefined;
      return { title: name ? `${name} asked for you` : 'A city asked for you', from: null, to, note: `${n ?? 'Enough'} people signed. It's not on the route.`, action };
    }
  }
}


function dedupe(rs: Roast[]): Roast[] {
  const seen = new Set<string>();
  return rs.filter((r) => {
    const k = `${r.rule}:${r.stopIndex}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Applies a roast Fix (or a manual edit) and returns the new stop list, not yet rescored. */
export function applyFix(stops: TourStop[], fix: RoastFix, input: PlanInput): TourStop[] {
  const next = stops.map((s) => ({ ...s }));
  const metro = (id: string) => input.candidates.find((c) => c.id === id);
  const asStop = (m: MetroScore, like: TourStop): TourStop => ({
    ...like,
    metroId: m.id,
    city: m.name,
    state: m.state,
    lat: m.lat,
    lon: m.lon,
    room: null,
    roomNeighborhoodRank: null,
    roomPinned: false,
    locked: false,
  });
  switch (fix.kind) {
    case 'swap-city': {
      const m = metro(fix.metroId);
      if (m) next[fix.stopIndex] = asStop(m, next[fix.stopIndex]);
      break;
    }
    case 'drop':
      next.splice(fix.stopIndex, 1);
      break;
    case 'swap-dates': {
      const a = next[fix.a];
      const b = next[fix.b];
      next[fix.a] = { ...b, date: a.date, day: a.day };
      next[fix.b] = { ...a, date: b.date, day: b.day };
      break;
    }
    case 'change-room': {
      const room = input.rooms[next[fix.stopIndex].metroId]?.find((r) => r.id === fix.roomId);
      if (room) next[fix.stopIndex] = { ...next[fix.stopIndex], room: room as unknown as TourStop['room'], roomNeighborhoodRank: room.neighborhoodRank, roomPinned: true };
      break;
    }
    case 'move-date':
      next[fix.stopIndex] = { ...next[fix.stopIndex], date: fix.date, day: dayOf(fix.date), locked: true };
      break;
    case 'add-city': {
      const m = metro(fix.metroId);
      if (!m) break;
      // Replace the weakest unlocked stop.
      let wi = -1;
      next.forEach((s, i) => {
        if (s.locked) return;
        if (wi < 0 || (metro(s.metroId)?.score ?? 0) < (metro(next[wi].metroId)?.score ?? 0)) wi = i;
      });
      if (wi >= 0) next[wi] = asStop(m, next[wi]);
      break;
    }
  }
  return next;
}

/**
 * Cities that could take stop i's night: in the artist's regions, not on the route, not
 * splitting a crowd with another stop, ranked by Wanted score less the extra driving.
 */
export function swapCandidates(stops: TourStop[], i: number, input: PlanInput, k = 6): MetroScore[] {
  const cfg = input.config ?? DEFAULT_TOUR_CONFIG;
  const onRoute = new Set(stops.map((s) => s.metroId));
  const prev = stops[i - 1] ?? input.homeBase;
  const next = stops[i + 1] ?? null;
  const legs = (c: Pt) => (prev ? hours(prev, c, cfg) : 0) + (next ? hours(c, next, cfg) : 0);
  return input.candidates
    .filter((c) => c.score !== null && !onRoute.has(c.id) && inRegions(c.state, input.regions) && !(input.excluded ?? []).includes(c.id))
    .filter((c) => !stops.some((x, j) => j !== i && haversineKm(x.lat, x.lon, c.lat, c.lon) * cfg.roadFactor < 130))
    .map((c) => ({ c, v: (c.score ?? 0) - 3 * legs(c) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, k)
    .map((x) => x.c);
}

/**
 * Applies an edit and rescores it the way the planner would: as edited and, for a city
 * change, re-sequenced, each with the weekday shift from the tour's start. The better
 * option wins. Used both to preview a Fix (its gain) and to apply it, so what Gus
 * promises is exactly what the button does.
 */
export function tryFix(stops: TourStop[], fix: RoastFix, input: PlanInput, startDate: string) {
  const next = applyFix(stops, fix, input);
  const options = [next];
  if (fix.kind === 'swap-city' || fix.kind === 'add-city') options.push(resequence(next, input));
  const shift = fix.kind !== 'move-date' && fix.kind !== 'swap-dates';
  return options.map((o) => rescore(o, input, { startDate, shift })).sort((a, b) => b.total - a.total)[0];
}

/** Re-sequences a stop list after a city swap, keeping locked stops where they are. */
export function resequence(stops: TourStop[], input: PlanInput): TourStop[] {
  const cfg = input.config ?? DEFAULT_TOUR_CONFIG;
  if (stops.some((s) => s.locked)) return stops;
  return sequence(stops, input.homeBase, cfg);
}
