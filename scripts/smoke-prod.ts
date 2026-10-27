/**
 * What a judge hits, checked against the live URL: every page, the JSON the pages need, the
 * images links unfurl to, and the agent surfaces. Fails on a non-200, a slow answer, or a
 * demo act with nothing for Gus to show (no call, no offer, no held date), or the MCP connector down.
 *
 *   npm run smoke:prod                       # https://trywanted.vercel.app
 *   npm run smoke:prod -- http://localhost:3100
 */
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? 'https://trywanted.vercel.app').replace(/\/$/, '');
const act = 'maya-ortiz';
const city = 'burlington-vt';
/** A city with a held date, read from the deals check; the booked story needs one. */
let heldCity = city;

type Check = { path: string | (() => string); kind?: 'page' | 'json' | 'image' | 'text'; budget?: number; post?: unknown; expect?: (body: unknown) => string | null };

const checks: Check[] = [
  { path: '/', kind: 'page' },
  { path: `/a/${act}`, kind: 'page' },
  { path: `/a/${act}/tour`, kind: 'page' },
  { path: `/a/${act}/posters`, kind: 'page' },
  { path: `/a/${act}/pulse`, kind: 'page' },
  { path: `/a/${act}/logbook`, kind: 'page' },
  { path: `/a/${act}/settings`, kind: 'page' },
  { path: `/w/${act}/${city}`, kind: 'page' },
  { path: '/no-such-page', kind: 'page' }, // the 404 page itself must render (status 404 is fine)
  { path: '/api/health', kind: 'json', expect: (b) => ((b as { qloo?: boolean }).qloo ? null : 'Qloo is not live') },
  { path: `/api/artist/${act}`, kind: 'json' },
  { path: `/api/artist/${act}/map`, kind: 'json', budget: 12_000, expect: (b) => ((b as { metros?: unknown[] }).metros?.length ? null : 'no metros') },
  { path: `/api/artist/${act}/city/${city}`, kind: 'json', budget: 15_000 },
  { path: `/api/artist/${act}/plan`, kind: 'json' },
  { path: `/api/artist/${act}/pulse`, kind: 'json' },
  { path: `/api/artist/${act}/crowd`, kind: 'json' },
  { path: `/api/artist/${act}/logbook`, kind: 'json' },
  {
    path: `/api/artist/${act}/deals`,
    kind: 'json',
    budget: 20_000,
    expect: (b) => {
      const deals = (b as { deals?: { status: string; city: string }[] }).deals ?? [];
      heldCity = deals.find((d) => d.status === 'held')?.city ?? heldCity;
      const s = new Set(deals.map((d) => d.status));
      const missing = ['held', 'waiting'].filter((x) => !s.has(x));
      return missing.length ? `demo act has no ${missing.join(' or ')} deal` : null;
    },
  },
  { path: `/img/poster/${act}/${city}?w=400`, kind: 'image', budget: 20_000 },
  { path: () => `/img/story/${act}/${heldCity}?kind=booked`, kind: 'image', budget: 20_000 },
  {
    path: '/api/mcp',
    kind: 'json',
    post: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'where_am_i_wanted', arguments: { limit: 3 } } },
    expect: (b) => ((b as { result?: { isError?: boolean } }).result?.isError === false ? null : 'MCP tool call failed'),
  },
  { path: '/opengraph-image.jpg', kind: 'image' },
  { path: '/llms.txt', kind: 'text' },
  { path: '/llms-full.txt', kind: 'text' },
  { path: '/robots.txt', kind: 'text' },
  { path: '/sitemap.xml', kind: 'text' },
];

async function run(c: Check) {
  const t = Date.now();
  const budget = c.budget ?? 8_000;
  const path = typeof c.path === 'function' ? c.path() : c.path;
  try {
    const init: RequestInit = c.post ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c.post) } : {};
    const res = await fetch(base + path, { ...init, signal: AbortSignal.timeout(Math.max(budget * 2, 30_000)), redirect: 'follow' });
    const ms = Date.now() - t;
    const ctype = res.headers.get('content-type') ?? '';
    let problem: string | null = null;
    const okStatus = path === '/no-such-page' ? res.status === 404 : res.ok;
    if (!okStatus) problem = `HTTP ${res.status}`;
    else if (c.kind === 'json') {
      if (!ctype.includes('json')) problem = `not JSON (${ctype})`;
      else problem = c.expect?.(await res.json()) ?? null;
    } else if (c.kind === 'image' && !ctype.startsWith('image/')) problem = `not an image (${ctype})`;
    else if (c.kind === 'page' && !ctype.includes('html')) problem = `not HTML (${ctype})`;
    if (!problem && ms > budget) problem = `slow: ${ms} ms > ${budget} ms`;
    return { path, ms, problem };
  } catch (e) {
    return { path, ms: Date.now() - t, problem: String(e).slice(0, 120) };
  }
}

async function main() {
  const results = [];
  for (const c of checks) results.push(await run(c)); // one at a time: cold starts show up honestly
  const bad = results.filter((r) => r.problem);
  for (const r of results) console.log(`${r.problem ? 'FAIL' : ' ok '} ${String(r.ms).padStart(6)} ms  ${r.path}${r.problem ? `  ← ${r.problem}` : ''}`);
  console.log(`\n${base}: ${results.length - bad.length}/${results.length} passed`);
  process.exit(bad.length ? 1 : 0);
}
main();
