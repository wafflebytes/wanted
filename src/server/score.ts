/**
 * The Wanted Score (PRD 4.1b).
 *
 * Raw heat follows population: affinity and popularity correlate at 0.78 to 0.96 across
 * test artists, so heat alone says "play NYC" to everyone. Wanted ranks metros on:
 *   heat = popularity-weighted mean affinity of the act's cells within 30 km of the metro center
 *   lift = heat minus the baseline panel's heat for the same metro
 *   Wanted Score = 0.6 x heat percentile + 0.4 x lift percentile
 * Sleeper cities are top 15 by lift but outside the top 15 by heat.
 */
import { latLngToCell } from 'h3-js';
import metrosFile from '../../data/metros.json';
import { bbox, haversineKm } from '../lib/geo';
import type { HeatCell, MapHex, MetroScore } from '../lib/types';
import { config } from './config';

export type Metro = (typeof metrosFile.metros)[number];
export const METROS: Metro[] = metrosFile.metros as Metro[];
export const METRO_BY_ID = new Map(METROS.map((m) => [m.id, m]));

export function metroById(id: string): Metro | undefined {
  return METRO_BY_ID.get(id);
}

/** Finds a metro by id, "Columbus", "Columbus, OH" or "Columbus, Ohio". */
export function findMetro(q: string): Metro | undefined {
  const s = q.trim().toLowerCase();
  if (METRO_BY_ID.has(s)) return METRO_BY_ID.get(s);
  const [city, st] = s.split(',').map((x) => x.trim());
  const matches = METROS.filter((m) => m.name.toLowerCase() === city);
  if (st) {
    return matches.find((m) => m.state.toLowerCase() === st || m.stateName.toLowerCase() === st) ?? matches[0];
  }
  return matches.sort((a, b) => b.pop - a.pop)[0];
}

export type MetroHeat = { id: string; heat: number | null; cells: number };

/**
 * Popularity-weighted mean affinity of the act's cells within the metro radius
 * (see config.score.heatField for why it isn't affinity_rank). A coarse grid keeps this fast.
 */
export function metroHeat(
  cells: HeatCell[],
  radiusKm: number = config.score.metroRadiusKm,
  field: 'a' | 'r' = config.score.heatField,
  weighted: boolean = config.score.popularityWeighted,
): MetroHeat[] {
  const grid = new Map<string, HeatCell[]>();
  const key = (lat: number, lon: number) => `${Math.floor(lat)}:${Math.floor(lon)}`;
  for (const c of cells) {
    const k = key(c.lat, c.lon);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(c);
  }
  return METROS.map((m) => {
    const b = bbox(m.lat, m.lon, radiusKm);
    let sum = 0;
    let wsum = 0;
    let n = 0;
    for (let la = Math.floor(b.minLat); la <= Math.floor(b.maxLat); la++) {
      for (let lo = Math.floor(b.minLon); lo <= Math.floor(b.maxLon); lo++) {
        for (const c of grid.get(`${la}:${lo}`) ?? []) {
          if (haversineKm(m.lat, m.lon, c.lat, c.lon) <= radiusKm) {
            const w = weighted ? Math.max(0.05, c.p) : 1;
            sum += c[field] * w;
            wsum += w;
            n++;
          }
        }
      }
    }
    return { id: m.id, heat: n >= config.score.minCellsPerMetro ? sum / wsum : null, cells: n };
  });
}

/** Percentile rank in 0..1 (ties share the average rank). */
function percentiles(values: (number | null)[]): (number | null)[] {
  const present = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  present.sort((a, b) => a.v - b.v);
  const out: (number | null)[] = values.map(() => null);
  const n = present.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && present[j + 1].v === present[i].v) j++;
    const pct = n === 1 ? 1 : ((i + j) / 2) / (n - 1);
    for (let k = i; k <= j; k++) out[present[k].i] = pct;
    i = j + 1;
  }
  return out;
}

function ranks(values: (number | null)[]): (number | null)[] {
  const order = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
  const out: (number | null)[] = values.map(() => null);
  order.forEach((x, r) => (out[x.i] = r + 1));
  return out;
}

export type ScoreOptions = { heatWeight?: number; liftWeight?: number; sleeperTopN?: number };

/**
 * Scores every metro. `baseline` maps metro id to the panel's mean heat; a metro with no
 * baseline gets no lift (and so no score), which keeps the score honest.
 */
export function scoreMetros(act: MetroHeat[], baseline: Map<string, number>, opts: ScoreOptions = {}): MetroScore[] {
  const hw = opts.heatWeight ?? config.score.heatWeight;
  const lw = opts.liftWeight ?? config.score.liftWeight;
  const topN = opts.sleeperTopN ?? config.score.sleeperTopN;

  const heats = act.map((a) => a.heat);
  const lifts = act.map((a) => {
    const b = baseline.get(a.id);
    return a.heat !== null && b !== undefined ? a.heat - b : null;
  });
  const heatPct = percentiles(heats);
  const liftPct = percentiles(lifts);
  const scores = act.map((_, i) =>
    heatPct[i] !== null && liftPct[i] !== null ? Math.round((hw * heatPct[i]! + lw * liftPct[i]!) * 1000) / 10 : null,
  );
  const heatRank = ranks(heats);
  const liftRank = ranks(lifts);
  const rank = ranks(scores);

  return act.map((a, i) => {
    const m = METRO_BY_ID.get(a.id)!;
    const sleeper = liftRank[i] !== null && liftRank[i]! <= topN && (heatRank[i] === null || heatRank[i]! > topN);
    return {
      id: m.id,
      name: m.name,
      state: m.state,
      query: m.query,
      lat: m.lat,
      lon: m.lon,
      pop: m.pop,
      kind: m.kind as MetroScore['kind'],
      cells: a.cells,
      heat: a.heat === null ? null : round4(a.heat),
      lift: lifts[i] === null ? null : round4(lifts[i]!),
      heatPct: heatPct[i] === null ? null : round4(heatPct[i]!),
      liftPct: liftPct[i] === null ? null : round4(liftPct[i]!),
      score: scores[i],
      heatRank: heatRank[i],
      liftRank: liftRank[i],
      rank: rank[i],
      sleeper,
      thin: a.heat === null,
    };
  });
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

/** Top metros by score, then the sleeper list (PRD FR-4). */
export function summarize(scores: MetroScore[]) {
  const ranked = scores.filter((s) => s.score !== null).sort((a, b) => a.rank! - b.rank!);
  const byHeat = scores.filter((s) => s.heat !== null).sort((a, b) => a.heatRank! - b.heatRank!);
  const sleepers = scores.filter((s) => s.sleeper).sort((a, b) => a.liftRank! - b.liftRank!);
  return { ranked, byHeat, sleepers };
}

/**
 * Turns geohash cells into H3 hexes for the map (country: res 4, city: res 8). Each hex
 * keeps the max affinity of its cells. Country hexes inherit the Wanted Score of the
 * nearest scored metro within the radius, so color can follow score while height follows heat.
 */
export function toHexes(
  cells: HeatCell[],
  res: number,
  limit: number,
  scores?: MetroScore[],
): MapHex[] {
  const byHex = new Map<string, { heat: number; lat: number; lon: number }>();
  for (const c of cells) {
    const h = latLngToCell(c.lat, c.lon, res);
    const prev = byHex.get(h);
    const v = c[config.score.heatField];
    if (!prev || v > prev.heat) byHex.set(h, { heat: v, lat: c.lat, lon: c.lon });
  }
  const scored = scores?.filter((s) => s.score !== null) ?? [];
  const hexes: MapHex[] = [];
  for (const [h3, v] of byHex) {
    let metro: string | null = null;
    let score: number | null = null;
    if (scored.length) {
      let best = Infinity;
      for (const s of scored) {
        if (Math.abs(s.lat - v.lat) > 1 || Math.abs(s.lon - v.lon) > 1.4) continue;
        const d = haversineKm(s.lat, s.lon, v.lat, v.lon);
        if (d <= config.score.metroRadiusKm * 1.6 && d < best) {
          best = d;
          metro = s.id;
          score = s.score;
        }
      }
    }
    hexes.push({ h3, heat: round4(v.heat), score, metro });
  }
  hexes.sort((a, b) => b.heat - a.heat);
  return hexes.slice(0, limit);
}

/** Baseline across the panel: mean of each panel artist's metro heat. */
export function panelBaseline(perArtist: MetroHeat[][]): Map<string, { heat: number; n: number }> {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const artist of perArtist) {
    for (const m of artist) {
      if (m.heat === null) continue;
      const a = acc.get(m.id) ?? { sum: 0, n: 0 };
      a.sum += m.heat;
      a.n++;
      acc.set(m.id, a);
    }
  }
  return new Map([...acc].map(([id, a]) => [id, { heat: a.sum / a.n, n: a.n }]));
}
