/**
 * Parameter allowlist per Qloo endpoint and filter.type (PRD 4.1, risk "silent param drops").
 *
 * Qloo silently ignores unknown or wrong-type params, so a typo looks like a working call
 * with the wrong answer. Every request we send is checked against this list first; an
 * unlisted param is a bug in our code and throws before any network call.
 */

const SIGNALS = ['signal.interests.entities', 'signal.interests.tags', 'signal.location', 'signal.location.query'];
const LOCATION = ['filter.location', 'filter.location.query', 'filter.location.radius'];
const PAGING = ['take', 'page'];

export const INSIGHTS_ALLOWLIST: Record<string, string[]> = {
  'urn:heatmap': [...SIGNALS, ...LOCATION, 'output.heatmap.boundary'],
  'urn:entity:place': [
    ...SIGNALS,
    ...LOCATION,
    ...PAGING,
    'filter.tags',
    'operator.filter.tags',
    'filter.exclude.tags',
    'filter.popularity.min',
    'filter.popularity.max',
    'feature.explainability',
  ],
  'urn:entity:artist': [
    ...SIGNALS,
    ...PAGING,
    'filter.popularity.min',
    'filter.popularity.max',
    'filter.exclude.entities',
    'filter.results.entities',
    'filter.tags',
    'feature.explainability',
  ],
  'urn:entity:person': [...SIGNALS, ...PAGING, 'filter.popularity.max', 'filter.exclude.entities', 'filter.results.entities', 'filter.tags'],
  'urn:demographics': ['signal.interests.entities', 'signal.interests.tags'],
  'urn:tag': [...SIGNALS, ...PAGING, 'filter.tag.types', 'filter.parents.types'],
  'urn:entity:movie': [...SIGNALS, ...PAGING, 'filter.popularity.min'],
  'urn:entity:tv_show': [...SIGNALS, ...PAGING, 'filter.popularity.min'],
  'urn:entity:brand': [...SIGNALS, ...PAGING, 'filter.popularity.min'],
  'urn:entity:podcast': [...SIGNALS, ...PAGING, 'filter.popularity.min'],
  'urn:entity:book': [...SIGNALS, ...PAGING, 'filter.popularity.min'],
};

export const PATH_ALLOWLIST: Record<string, string[]> = {
  '/search': ['query', 'types', 'take', 'page'],
  '/entities': ['entity_ids', 'external.spotify.ids'],
  '/v2/tags': ['filter.query', 'filter.tag.types', 'take', 'page'],
  '/v2/analysis/compare': ['a.signal.interests.entities', 'b.signal.interests.entities', 'take', 'page'],
};

/** Paths we never call (PRD 4.1: no /recs, no /recommendations; /v2/trending is empty for artists). */
const FORBIDDEN = ['/recs', '/recommendations', '/v2/trending'];

export type QlooParams = Record<string, string | number | boolean | string[] | undefined>;

export function validateParams(path: string, params: QlooParams, body?: Record<string, unknown>) {
  if (FORBIDDEN.some((p) => path.startsWith(p))) throw new Error(`Qloo path not allowed: ${path}`);
  const keys = [...Object.keys(params), ...Object.keys(body ?? {})].filter(
    (k) => (params[k] ?? body?.[k]) !== undefined,
  );
  let allowed: string[] | undefined;
  if (path === '/v2/insights') {
    const type = String(params['filter.type'] ?? body?.['filter.type'] ?? '');
    allowed = INSIGHTS_ALLOWLIST[type];
    if (!allowed) throw new Error(`Qloo filter.type not in allowlist: ${type || '(missing)'}`);
    allowed = ['filter.type', ...allowed];
  } else {
    allowed = PATH_ALLOWLIST[path];
    if (!allowed) throw new Error(`Qloo path not in allowlist: ${path}`);
  }
  const bad = keys.filter((k) => !allowed!.includes(k));
  if (bad.length) throw new Error(`Qloo params not in allowlist for ${path}: ${bad.join(', ')}`);
  if (params.take !== undefined && Number(params.take) > 50) throw new Error('Qloo take max is 50');
}

/** Normalizes params into the query string Qloo expects (arrays become comma lists). */
export function toSearchParams(params: QlooParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const v = params[key];
    if (v === undefined) continue;
    sp.set(key, Array.isArray(v) ? v.join(',') : String(v));
  }
  return sp;
}
