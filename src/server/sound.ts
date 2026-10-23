/**
 * Sounds and the country Scout (PRD FR-1, FR-4, 4.1b, 4.1c).
 *
 * A Sound is the 1 to 3 Qloo entities that define an act's taste:
 *  - an invented persona (Maya Ortiz) or "I sound like X and Y": the reference acts, equal weight;
 *  - a real act with rich data: the act alone;
 *  - a real act whose own heat is thin (< 1,500 cells): the act at weight 3 plus each
 *    reference at weight 1, sent as a weighted POST, and the UI says so.
 */
import type { ActKind, HeatCell, MetroScore, Receipt, Sound, SoundEntity } from '../lib/types';
import { config } from './config';
import { stableHash } from './crypto';
import { all, batch, one } from './db';
import { countryHeat, entitiesBySpotify, genreHeat, searchActs } from './qloo/api';
import { metroHeat, scoreMetros, summarize, toHexes } from './score';

export function soundHash(entities: SoundEntity[], tags: string[] = []): string {
  const parts = entities.map((e) => ({ id: e.id.toUpperCase(), w: e.weight ?? 1 })).sort((a, b) => a.id.localeCompare(b.id));
  return stableHash({ parts, tags: [...tags].sort() }).slice(0, 16);
}

export function parseSpotifyArtist(input: string): string | null {
  const m = input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/([A-Za-z0-9]{22})/) ?? input.match(/^spotify:artist:([A-Za-z0-9]{22})$/);
  return m ? m[1] : null;
}

/** Candidates for the confirm sheet. Never auto-picks (fuzzy search can choose the wrong act). */
export async function resolveCandidates(query: string, kind: ActKind | 'any', scope?: string) {
  const spotify = parseSpotifyArtist(query.trim());
  if (spotify) {
    const r = await entitiesBySpotify(spotify, scope);
    return { candidates: r.data, receipts: [r.receipt] };
  }
  const qKind = kind === 'comedy' ? 'person' : kind === 'music' ? 'artist' : 'any';
  const r = await searchActs(query.trim(), qKind, scope);
  let candidates = r.data;
  const receipts = [r.receipt];
  // Comedians are usually people, but some are artist entities; search both if thin.
  if (kind === 'comedy' && candidates.length < 3) {
    const r2 = await searchActs(query.trim(), 'artist', scope, 4);
    receipts.push(r2.receipt);
    const seen = new Set(candidates.map((c) => c.id));
    candidates = [...candidates, ...r2.data.filter((c) => !seen.has(c.id))];
  }
  return { candidates, receipts };
}

export type ScoutResult = {
  sound: Sound;
  metros: MetroScore[];
  ranked: MetroScore[];
  sleepers: MetroScore[];
  byHeat: MetroScore[];
  hexes: ReturnType<typeof toHexes>;
  receipts: Receipt[];
  baselineSize: number;
  notices: string[];
};

export async function loadBaseline(): Promise<Map<string, number>> {
  const rows = await all<{ metro_id: string; heat: number }>('select metro_id, heat from baseline_panel');
  return new Map(rows.map((r) => [r.metro_id, r.heat]));
}

/**
 * Builds the Sound (with the thin-data check and blend) and returns its country heat.
 * `self` is the act's own entity, if Qloo knows it; `refs` are the reference acts.
 */
export async function buildSound(
  self: SoundEntity | null,
  refs: SoundEntity[],
  kind: ActKind,
  scope?: string,
): Promise<{ sound: Sound; cells: HeatCell[]; receipts: Receipt[]; notices: string[] }> {
  const receipts: Receipt[] = [];
  const notices: string[] = [];
  if (!self && !refs.length) throw new Error('A Sound needs at least one act.');

  if (self) {
    const own = await countryHeat([{ ...self, weight: 1 }], scope);
    receipts.push(own.receipt);
    const thin = own.data.length < config.sound.thinCellThreshold;
    if (!thin || !refs.length) {
      if (thin) notices.push(`Data thin: Qloo has ${own.data.length} cells for ${self.name} and no reference acts to blend.`);
      const entities = [{ ...self, weight: 1, role: 'self' as const }];
      return {
        sound: { hash: soundHash(entities), entities, kind, blended: false, thin, cellCount: own.data.length },
        cells: own.data,
        receipts,
        notices,
      };
    }
    const entities: SoundEntity[] = [
      { ...self, weight: config.sound.ownWeight, role: 'self' },
      ...refs.slice(0, 2).map((r) => ({ ...r, weight: config.sound.referenceWeight, role: 'reference' as const })),
    ];
    const blended = await countryHeat(entities, scope);
    receipts.push(blended.receipt);
    notices.push(
      `Data thin: Qloo has ${own.data.length} cells for ${self.name} (under ${config.sound.thinCellThreshold}), so Wanted blended in ${refs
        .slice(0, 2)
        .map((r) => r.name)
        .join(' and ')} at weight 1 against ${self.name} at weight 3.`,
    );
    return {
      sound: { hash: soundHash(entities), entities, kind, blended: true, thin: true, cellCount: blended.data.length },
      cells: blended.data,
      receipts,
      notices,
    };
  }

  const entities = refs.slice(0, 3).map((r) => ({ ...r, weight: 1, role: 'reference' as const }));
  const heat = await countryHeat(entities, scope);
  receipts.push(heat.receipt);
  const thin = heat.data.length < config.sound.thinCellThreshold;
  if (thin) notices.push(`Data thin: only ${heat.data.length} cells for this Sound.`);
  return {
    sound: { hash: soundHash(entities), entities, kind, blended: false, thin, cellCount: heat.data.length },
    cells: heat.data,
    receipts,
    notices,
  };
}

/** Genre-tag fallback when Qloo has no entity for the act at all. */
export async function buildGenreSound(tagIds: string[], kind: ActKind, scope?: string) {
  const r = await genreHeat(tagIds, scope);
  const sound: Sound = {
    hash: soundHash([], tagIds),
    entities: [],
    kind,
    blended: false,
    thin: r.data.length < config.sound.thinCellThreshold,
    cellCount: r.data.length,
  };
  return { sound, cells: r.data, receipts: [r.receipt], notices: ['Qloo has no entity for this act, so the map uses genre-tag heat.'] };
}

/** Aggregates country heat into metro scores and map hexes, and caches the metro scores. */
export async function scoreSound(
  sound: Sound,
  cells: HeatCell[],
  receipts: Receipt[],
  notices: string[],
): Promise<ScoutResult> {
  const baseline = await loadBaseline();
  if (!baseline.size) notices.push('Baseline panel not seeded yet, so lift (and sleeper cities) are unavailable. Run npm run seed.');
  const heat = metroHeat(cells);
  const metros = scoreMetros(heat, baseline);
  // Without a baseline, fall back to heat-only scores so the map still works (labeled above).
  if (!baseline.size) {
    for (const m of metros) {
      m.score = m.heatPct === null ? null : Math.round(m.heatPct * 1000) / 10;
      m.rank = m.heatRank;
    }
  }
  const { ranked, sleepers, byHeat } = summarize(metros);
  const hexes = toHexes(cells, 4, 3000, metros);

  await batch(
    metros
      .filter((m) => m.heat !== null)
      .map((m) => ({
        sql: `insert into metro_scores(sound_hash, metro_id, heat, lift, score, cells) values(?, ?, ?, ?, ?, ?)
              on conflict(sound_hash, metro_id) do update set heat = excluded.heat, lift = excluded.lift, score = excluded.score, cells = excluded.cells`,
        args: [sound.hash, m.id, m.heat, m.lift, m.score, m.cells],
      })),
  );

  return { sound, metros, ranked, sleepers, byHeat, hexes, receipts, baselineSize: baseline.size, notices };
}

export async function scout(self: SoundEntity | null, refs: SoundEntity[], kind: ActKind, scope?: string) {
  const built = await buildSound(self, refs, kind, scope);
  return scoreSound(built.sound, built.cells, built.receipts, built.notices);
}

/** Heat of a metro for a Sound, from the cached metro_scores table. */
export async function cachedMetroScores(soundHashValue: string) {
  return all<{ metro_id: string; heat: number; lift: number | null; score: number | null; cells: number }>(
    'select metro_id, heat, lift, score, cells from metro_scores where sound_hash = ?',
    [soundHashValue],
  );
}

export async function metroScoreFor(soundHashValue: string, metroId: string) {
  return one<{ heat: number; lift: number | null; score: number | null }>(
    'select heat, lift, score from metro_scores where sound_hash = ? and metro_id = ?',
    [soundHashValue, metroId],
  );
}

/** Re-scores a known Sound from cached country heat (fast after the first Scout). */
export async function scoreForSound(sound: Sound, scope?: string): Promise<ScoutResult> {
  if (!sound.entities.length) throw new Error('Genre-only Sounds are scored at Scout time.');
  const heat = await countryHeat(sound.entities, scope);
  const notices = sound.blended
    ? [`Data thin: blended reference acts into this Sound (weights ${sound.entities.map((e) => `${e.name} ${e.weight ?? 1}`).join(', ')}).`]
    : sound.thin
      ? [`Data thin: only ${sound.cellCount} cells for this Sound.`]
      : [];
  return scoreSound(sound, heat.data, [heat.receipt], notices);
}
