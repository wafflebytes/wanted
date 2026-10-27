/**
 * The road: what Gus does with a long leg. A tour has days between shows, and a long drive eats
 * them while they cost money. For any leg of 8 hours or more Gus lays out three honest ways:
 *
 *   on the way  play a city on the way where people already love your sound (Qloo's city
 *               scores and places), so a dark night becomes a paid one
 *   drive       split the drive over two days, one room in between
 *   fly         the band flies; Gus says plainly when the van is still needed after
 *
 * Real: the tour (dates, drive km and hours), the city picked on the way and how much it loves
 * your sound, where that crowd hangs, openers. Fixture until wired: fares and flight times, gas
 * price, the door guess, room rates (docs/design/AGENT-UX.md, The road).
 */
import type { TourPlan, TourStop } from '@/lib/types';
import type { MapData } from '@/ui/types';

export type Night = { date: string; kind: 'off' | 'drive' | 'show' | 'fly' | 'there'; title: string; sub: string };
/** What fits in a day's cell: a word or the hours. */
export const short = (n: Night) => (n.kind === 'drive' ? n.title.replace('Drive ', '') : n.kind === 'there' ? 'Show' : n.kind === 'show' ? 'Play' : n.kind === 'fly' ? 'Fly' : 'Off');
export type Lane = {
  id: 'way' | 'drive' | 'fly';
  name: string;
  line: string;
  net: number; // what this way does to your money over the leg; + is money in
  nights: Night[];
  arrive: string; // what it does to load-in at the next room
  ok: boolean;
  catch?: string;
};
export type Via = { id: string; name: string; state: string; lat: number; lon: number; love: number; top: number; signers: number; detour: number; hrs1: number; hrs2: number };
export type Leg = { i: number; from: TourStop; to: TourStop; next: TourStop | null; km: number; hrs: number; gap: number; via: Via | null; lanes: Lane[] };

const PARTY = 3;
const GAS = 3.35; // $ per gallon, fixture
const MPG = 14; // a loaded van
const ROOM = 129; // a room for the night, fixture
const SPEED = 82; // km/h door to door with stops, close to the tour's own drive times
const ROAD = 1.22; // road km per straight-line km

const rad = (d: number) => (d * Math.PI) / 180;
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dl = rad(b.lat - a.lat);
  const dn = rad(b.lon - a.lon);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const gas = (k: number) => Math.round((k / 1.609 / MPG) * GAS);
const hrsFor = (straight: number) => (straight * ROAD) / SPEED;
export const hrsLabel = (h: number) => (h < 1 ? 'under an hour' : `${Math.round(h)} h`);

const hour = (h: number) => { const m = Math.round(h * 4) * 15; return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m / 60 < 12 ? 'am' : 'pm'}`; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(new Date(`${s}T12:00Z`).getTime() + n * 86_400_000));
export const dayName = (s: string) => new Date(`${s}T12:00`).toLocaleDateString('en-US', { weekday: 'short' });
export const dayNum = (s: string) => new Date(`${s}T12:00`).getDate();
export const niceDate = (s: string) => new Date(`${s}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Airports for the fixture fares. Elsewhere the city's first three letters stand in. */
const AIR: Record<string, string> = { 'burlington-vt': 'BTV', 'asheville-nc': 'AVL', 'boston-ma': 'BOS', 'portland-me': 'PWM', 'albany-ny': 'ALB', 'ithaca-ny': 'ITH', 'columbus-oh': 'CMH', 'charlottesville-va': 'CHO' };
export const airport = (s: TourStop) => AIR[s.metroId] ?? s.city.slice(0, 3).toUpperCase();

/**
 * The city on the way: off the tour, between 25% and 75% of the leg, within about 140 km of the
 * straight line, the one whose people love your sound most (signers count double).
 */
export function pickVia(from: TourStop, to: TourStop, plan: TourPlan, map: MapData | null): Via | null {
  if (!map) return null;
  const on = new Set(plan.stops.map((s) => s.metroId));
  const signed = Object.fromEntries(map.proof.map((p) => [p.city, p.signatures]));
  const d = km(from, to);
  let best: (Via & { s: number }) | null = null;
  for (const m of map.metros) {
    if (on.has(m.id) || m.score == null) continue;
    const a = km(from, m);
    const b = km(m, to);
    // Where it sits along the leg, and how far off the line.
    const t = (a * a - b * b + d * d) / (2 * d * d);
    const off = Math.sqrt(Math.max(0, a * a - (t * d) ** 2));
    if (t < 0.25 || t > 0.75 || off > 140) continue;
    const signers = signed[m.id] ?? 0;
    const s = m.score + signers * 2 - off / 20;
    if (!best || s > best.s) best = { id: m.id, name: m.name, state: m.state, lat: m.lat, lon: m.lon, love: m.score, top: m.rank ?? 99, signers, detour: Math.max(0, hrsFor(a + b - d)), hrs1: hrsFor(a), hrs2: hrsFor(b), s };
  }
  if (!best) return null;
  const { s: _, ...via } = best;
  return via;
}

export function legFor(plan: TourPlan, i: number, map: MapData | null): Leg | null {
  const from = plan.stops[i - 1];
  const to = plan.stops[i];
  if (!from || !to) return null;
  const next = plan.stops[i + 1] ?? null;
  const gap = Math.round((new Date(`${to.date}T12:00Z`).getTime() - new Date(`${from.date}T12:00Z`).getTime()) / 86_400_000) - 1;
  const via = pickVia(from, to, plan, map);
  const hrs = to.driveHoursFromPrev;
  const dates = Array.from({ length: Math.max(0, gap) }, (_, k) => addDays(from.date, k + 1));
  const off = (date: string, where: string): Night => ({ date, kind: 'off', title: 'Off', sub: `in ${where}` });
  const lanes: Lane[] = [];

  // Drive it straight: the last one or two nights are on the road, the rest are dark.
  const split = hrs > 10 ? 2 : 1;
  const driveCost = gas(to.driveKmFromPrev) + ROOM * (split - 1);
  lanes.push({
    id: 'drive',
    name: 'Drive it',
    line: split === 2 ? `Two days of ${hrsLabel(hrs / 2)}, a room halfway` : `One day, ${hrsLabel(hrs)}`,
    net: -driveCost,
    nights: dates.map((d, k) =>
      k >= dates.length - split
        ? { date: d, kind: 'drive', title: `Drive ${hrsLabel(hrs / split)}`, sub: k === dates.length - 1 ? `into ${to.city}` : 'room halfway' }
        : off(d, from.city),
    ),
    arrive: `In ${to.city} the night before. You load in rested.`,
    ok: true,
  });

  // On the way: drive to the city, play it, drive on. Only when there are nights to fill.
  if (via && dates.length >= 2) {
    const door = Math.round((40 + via.love * 0.5 + via.signers) * 15 * 0.7);
    const wayGas = gas((km(from, via) + km(via, to)) * ROAD);
    // Leave at 9 the day of the show if the second drive gets you in by 2:30; otherwise go the day before.
    const sameDay = 9 + via.hrs2 <= 14.5;
    const showAt = dates.length - (sameDay ? 1 : 2);
    // Nobody should drive 12 hours into a show: split the first drive when there's a night for it.
    const two = via.hrs1 > 9 && showAt >= 2;
    lanes.push({
      id: 'way',
      name: `Play ${via.name}`,
      line: `${via.name} is on the way, and people there love your sound`,
      net: door - wayGas - (sameDay ? 0 : ROOM) - (two ? ROOM : 0),
      nights: dates.map((d, k) =>
        two && k === showAt - 2
          ? { date: d, kind: 'drive', title: `Drive ${hrsLabel(via.hrs1 / 2)}`, sub: 'room halfway' }
          : k === showAt - 1
          ? { date: d, kind: 'drive', title: `Drive ${hrsLabel(two ? via.hrs1 / 2 : via.hrs1)}`, sub: `to ${via.name}` }
          : k === showAt
            ? { date: d, kind: 'show', title: `Play ${via.name}`, sub: `about ${Math.round(door / 15 / 0.7)} people` }
            : k > showAt
              ? { date: d, kind: 'drive', title: `Drive ${hrsLabel(via.hrs2)}`, sub: `into ${to.city}` }
              : off(d, from.city),
      ),
      arrive: sameDay ? `Leave ${via.name} at 9, in ${to.city} by ${hour(9 + via.hrs2)}, before the 4:30 load-in.` : `In ${to.city} the night before, after ${hrsLabel(via.hrs2)} from ${via.name}.`,
      ok: true,
    });
  }

  // Fly: three fares plus gear you can't carry on. Honest about the van.
  const fare = Math.round((119 + to.driveKmFromPrev * 0.06) / 5) * 5;
  const vanNeeded = next && next.driveHoursFromPrev > 0;
  lanes.push({
    id: 'fly',
    name: 'Fly',
    line: `${airport(from)} to ${airport(to)}, one stop, ${PARTY} seats`,
    net: -(fare * PARTY + 180),
    nights: dates.map((d, k) => (k === dates.length - 1 ? { date: d, kind: 'fly', title: 'Fly 6:05a', sub: `land ${airport(to)} 11:40a` } : off(d, from.city))),
    arrive: `Land the day before. Borrow amps and drums in ${to.city}, about $180.`,
    ok: !vanNeeded,
    catch: vanNeeded ? `The van stays in ${from.city}, and you need it in ${next!.city} on ${niceDate(next!.date).split(',')[0]}.` : undefined,
  });

  return { i, from, to, next, km: to.driveKmFromPrev, hrs, gap, via, lanes };
}

/** Gus's pick: the way that nets the most and works. */
export const pickLane = (l: Leg) => [...l.lanes].filter((x) => x.ok).sort((a, b) => b.net - a.net)[0];
