/**
 * Which night to ask a city's venues for. The tour plan sets one; the artist can pick another
 * from the few Gus suggests (weekends draw, venues that are open that night, nothing they told
 * him they won't play). A picked night is per act and city, and it's what venues get asked for.
 */
import type { DayKey } from '../lib/types';
import { addDays, dayFactor, dayOf, DAYS } from '../lib/tour';
import type { ArtistRow } from './artists';
import { isOpenOn } from './city';
import { kvGet, kvSet } from './db';
import { recall } from './gus/memory';
import { metroById } from './score';
import { cityData, loadPlan } from './service';

export type Night = { date: string; day: DayKey; open: number; venues: number };

const key = (artistId: string) => `nights:${artistId}`;
const today = () => new Date().toISOString().slice(0, 10);
/** A Friday three weeks out (the same default deals.ts uses; kept here so the two don't import each other). */
function defaultDate(): string {
  let d = addDays(today(), 21);
  while (dayOf(d) !== 'friday') d = addDays(d, 1);
  return d;
}

export async function pickedNights(artistId: string): Promise<Record<string, string>> {
  return (await kvGet<Record<string, string>>(key(artistId))) ?? {};
}

/** Set (or clear, with null) a city's night. Returns the one it replaced, for Undo. */
export async function setNight(artistId: string, cityId: string, date: string | null): Promise<string | null> {
  const all = await pickedNights(artistId);
  const was = all[cityId] ?? null;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) all[cityId] = date;
  else delete all[cityId];
  await kvSet(key(artistId), all);
  return was;
}

/** The night venues get asked for: the artist's pick, else the tour plan's, else a Friday a few weeks out. */
export async function nightFor(artistId: string, cityId: string): Promise<string> {
  const picked = (await pickedNights(artistId))[cityId];
  if (picked && picked >= today()) return picked;
  const plan = await loadPlan(artistId);
  let date = plan?.stops.find((s) => s.metroId === cityId)?.date ?? defaultDate();
  // Never ask for a night they told him they won't play: the next one they will.
  const skip = ruledOut((await recall(artistId).catch(() => [])).map((m) => m.fact));
  for (let i = 0; i < 7 && skip.has(dayOf(date)); i++) date = addDays(date, 1);
  return date;
}

/** Days the artist told Gus they won't play ("Won't play Mondays", "no Sundays"). */
export function ruledOut(facts: string[]): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const f of facts) {
    const t = f.toLowerCase();
    if (!/(don'?t|do not|won'?t|will not|never|can'?t|cannot|no |not on|skip|avoid|off on)/.test(t)) continue;
    for (const d of DAYS) if (new RegExp(`\\b${d}s?\\b`).test(t)) out.add(d);
  }
  return out;
}

/** Three nights around the one he'd ask for, best first. */
export async function suggestNights(artist: ArtistRow, cityId: string): Promise<{ current: string; nights: Night[] }> {
  if (!metroById(cityId)) return { current: defaultDate(), nights: [] };
  const [current, d, memories] = await Promise.all([nightFor(artist.id, cityId), cityData(artist, cityId, false), recall(artist.id).catch(() => [])]);
  const skip = ruledOut(memories.map((m) => m.fact));
  const soonest = addDays(today(), 10);
  const scored: (Night & { score: number })[] = [];
  for (let k = -3; k <= 7; k++) {
    const date = addDays(current, k);
    if (date < soonest) continue;
    const day = dayOf(date);
    if (skip.has(day)) continue;
    const open = d.rooms.filter((r) => isOpenOn(r, day) !== false).length;
    if (d.rooms.length && !open) continue;
    const share = d.rooms.length ? open / d.rooms.length : 1;
    scored.push({ date, day, open, venues: d.rooms.length, score: dayFactor(day) * (0.35 + 0.65 * share) - Math.abs(k) * 0.004 });
  }
  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return { current, nights: scored.slice(0, 3).map(({ score: _s, ...n }) => n) };
}
