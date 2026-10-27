/**
 * "Without Qloo", measured (FR-30, PRD 4.4 move 1). The generic LLM answers the same
 * question with the same inputs; every one of its claims is checked live against Qloo:
 * does the venue exist, is it closed, is it open that night, does it host shows, is the
 * neighborhood in Qloo's list for this Sound, which sleeper cities did it miss.
 */
import type { DayKey, Receipt } from '../lib/types';
import { REGION_LABELS, type Region } from '../lib/regions';
import type { ArtistRow } from './artists';
import { cityDetail, isOpenOn } from './city';
import { askGenericLlm, checkNeighborhood, type BaselineAnswer } from './gus/baseline';
import { searchPlace } from './qloo/api';
import { findMetro, metroById } from './score';
import type { ScoutResult } from './sound';

/**
 * A checked claim. `wrong` is reserved for things Qloo's data contradicts (the venue is in
 * another city, permanently closed, or closed that night). `unverified` means there is no
 * taste evidence behind it, which is a guess rather than a proven error. Keeping the two apart
 * keeps the comparison honest.
 */
export type Mark = { ok: boolean; level: 'ok' | 'unverified' | 'wrong'; reason: string };
const ok = (reason: string): Mark => ({ ok: true, level: 'ok', reason });
const unverified = (reason: string): Mark => ({ ok: false, level: 'unverified', reason });
const wrong = (reason: string): Mark => ({ ok: false, level: 'wrong', reason });

export type WithoutQlooReport = {
  inputs: { act: string; references: string[]; region: string; focusCity: string; focusDay: DayKey; roomBand: string };
  llm: BaselineAnswer;
  cities: { name: string; metroId: string | null; wantedRank: number | null; inWantedTop15: boolean; sleeper: boolean; mark: Mark }[];
  missedSleepers: { name: string; liftRank: number | null }[];
  overlapTop15: number;
  neighborhoods: { name: string; qlooRank: number | null; mark: Mark }[];
  rooms: { name: string; found: string | null; address: string | null; mark: Mark }[];
  wanted: {
    top15: { name: string; state: string; score: number | null; sleeper: boolean }[];
    neighborhoods: string[];
    rooms: { name: string; neighborhood: string | null; closedDays: string[] | null }[];
  };
  /** Share of claims Qloo contradicts, and share with no evidence behind them. */
  errorRate: { rooms: number | null; neighborhoods: number | null };
  unverifiedRate: { rooms: number | null; neighborhoods: number | null; cities: number | null };
  receipts: Receipt[];
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function withoutQloo(input: {
  artist: ArtistRow;
  scout: ScoutResult;
  focusCity: string;
  focusDay: DayKey;
  regions: Region[];
  dates: number;
  startDate: string;
}): Promise<WithoutQlooReport> {
  const { artist, scout } = input;
  const focus = metroById(input.focusCity);
  if (!focus) throw new Error('Unknown focus city');
  const scope = `artist:${artist.id}`;
  const refs = artist.sound.entities.filter((e) => e.role !== 'self').map((e) => e.name);
  const regionLabel = input.regions.length ? input.regions.map((r) => REGION_LABELS[r]).join(' and ') : 'anywhere in the US';

  const [llm, detail] = await Promise.all([
    askGenericLlm({
      actName: artist.name,
      references: refs,
      kind: artist.kind,
      regionLabel,
      dates: input.dates,
      startDate: input.startDate,
      roomBand: artist.roomBand ?? 'small',
      focusCity: `${focus.name}, ${focus.state}`,
      focusDay: input.focusDay,
    }),
    cityDetail(artist.sound, focus.id, { kind: artist.kind, band: artist.roomBand, scope, waitForNeighborhoods: true }),
  ]);
  const receipts: Receipt[] = [...detail.receipts];

  // Cities.
  const top15 = scout.ranked.slice(0, 15);
  const top15Ids = new Set(top15.map((m) => m.id));
  const cities = llm.cities.map((c) => {
    const m = findMetro(c);
    const scored = m ? scout.metros.find((x) => x.id === m.id) : undefined;
    const inTop = !!m && top15Ids.has(m.id);
    const mark: Mark = !m
      ? unverified('Not one of the ~190 metros Wanted scores')
      : inTop
        ? ok(`Also in Wanted's top 15 (#${scored?.rank})`)
        : unverified(scored?.rank ? `Qloo's taste data ranks it #${scored.rank} of ${scout.ranked.length} for this Sound` : 'Qloo has no heat here for this Sound');
    return { name: c, metroId: m?.id ?? null, wantedRank: scored?.rank ?? null, inWantedTop15: inTop, sleeper: !!scored?.sleeper, mark };
  });
  const llmIds = new Set(cities.map((c) => c.metroId).filter(Boolean));
  const missedSleepers = scout.sleepers.filter((s) => !llmIds.has(s.id)).map((s) => ({ name: `${s.name}, ${s.state}`, liftRank: s.liftRank }));

  // Neighborhoods.
  const qHoods = detail.neighborhoods ?? [];
  const neighborhoods = llm.neighborhoods.map((n) => {
    const c = checkNeighborhood(n, qHoods);
    const mark: Mark = !qHoods.length
      ? unverified("Qloo's neighborhood list is still loading")
      : c.inQloo
        ? c.rank! <= 10
          ? ok(`Qloo ranks it #${c.rank} for this Sound`)
          : unverified(`In Qloo's list, but only #${c.rank} for this Sound`)
        : unverified(`Not in Qloo's ranked list for this Sound, so there's no taste evidence behind it`);
    return { name: n, qlooRank: c.rank, mark };
  });

  // Rooms: exists, not closed, open that night, hosts shows.
  // "The Basement (North Market)" -> "basement"; the parenthetical is the LLM's own gloss.
  const clean = (x: string) => x.toLowerCase().replace(/\(.*?\)/g, '').replace(/^the /, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const same = (a: string, b: string) => a === b || (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a)));
  const rooms = await Promise.all(
    llm.rooms.map(async (name) => {
      const want = clean(name).split(',')[0];
      // A room Qloo already ranked for this act in this metro (suburbs included) is real and fits.
      const mine = detail.rooms.find((r) => same(clean(r.name).split(' - ')[0], want));
      if (mine) return { name, found: mine.name, address: mine.address, mark: ok('One of the rooms Wanted ranked for this Sound here too') };
      try {
        const r = await searchPlace(name, focus.query, scope);
        receipts.push(r.receipt);
        const hit = r.data.find((p) => clean(p.name).includes(want) || want.includes(clean(p.name))) ?? null;
        const inCity = !!hit && (hit.address?.toLowerCase().includes(focus.name.toLowerCase()) || hit.address?.includes(`, ${focus.state}`));
        let mark: Mark;
        if (!hit) mark = unverified(`Qloo has no venue by that name in ${focus.name}`);
        else if (!inCity) mark = hit.address ? wrong(`Qloo places it at ${hit.address}, not in ${focus.name}`) : unverified(`Qloo has no venue by that name in ${focus.name}`);
        else if (hit.isClosed) mark = wrong('Qloo lists it as permanently closed');
        else if (isOpenOn(hit, input.focusDay) === false) mark = wrong(`Closed on ${cap(input.focusDay)}s per Qloo's hours`);
        else if (!hit.hostsShows) mark = unverified("Exists, but Qloo doesn't tag it as a live music or comedy room");
        else mark = ok(isOpenOn(hit, input.focusDay) === null ? 'Exists and hosts shows (no hours on file)' : `Open ${cap(input.focusDay)}s and hosts shows`);
        return { name, found: hit?.name ?? null, address: hit?.address ?? null, mark };
      } catch {
        return { name, found: null, address: null, mark: unverified('Could not check (Qloo error)') };
      }
    }),
  );

  const rate = (xs: { mark: Mark }[], level: Mark['level']) => (xs.length ? Math.round((xs.filter((x) => x.mark.level === level).length / xs.length) * 100) / 100 : null);
  return {
    inputs: {
      act: artist.name,
      references: refs,
      region: regionLabel,
      focusCity: `${focus.name}, ${focus.state}`,
      focusDay: input.focusDay,
      roomBand: artist.roomBand ?? 'small',
    },
    llm,
    cities,
    missedSleepers,
    overlapTop15: cities.filter((c) => c.inWantedTop15).length,
    neighborhoods,
    rooms,
    wanted: {
      top15: top15.map((m) => ({ name: m.name, state: m.state, score: m.score, sleeper: m.sleeper })),
      neighborhoods: qHoods.slice(0, 3).map((n) => n.name),
      rooms: detail.rooms.map((r) => ({ name: r.name, neighborhood: r.neighborhood, closedDays: r.closedDays })),
    },
    errorRate: { rooms: rate(rooms, 'wrong'), neighborhoods: rate(neighborhoods, 'wrong') },
    unverifiedRate: { rooms: rate(rooms, 'unverified'), neighborhoods: rate(neighborhoods, 'unverified'), cities: rate(cities, 'unverified') },
    receipts,
  };
}
