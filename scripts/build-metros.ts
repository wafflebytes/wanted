/**
 * Builds data/metros.json: the ~150 largest US metros plus ~40 college towns that
 * Wanted scores every Sound against (PRD 4.1b).
 *
 * Sources (US Census Bureau, public domain):
 *   - Vintage 2024 CBSA population estimates (cbsa-est2024-alldata.csv)
 *   - 2024 Gazetteer places file (principal-city internal points)
 *
 * The metro "center" is the internal point of the first principal city in the CBSA
 * title, not the CBSA's own centroid, which can sit in an empty rural county.
 *
 * Usage: npm run metros:build
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CBSA_URL =
  'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/metro/totals/cbsa-est2024-alldata.csv';
const PLACES_URL =
  'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip';

const TOP_METROS = 150;

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico',
};

/**
 * College towns, matched by CBSA title prefix. Big university towns that sit inside
 * a top-150 metro (Madison, Durham-Chapel Hill, Provo) are already covered.
 */
const COLLEGE_TOWNS: string[] = [
  'Bloomington, IN', 'Iowa City, IA', 'Lawrence, KS', 'Athens-Clarke County, GA', 'Ann Arbor, MI',
  'Champaign-Urbana, IL', 'State College, PA', 'Ithaca, NY', 'Burlington-South Burlington, VT',
  'Charlottesville, VA', 'Boulder, CO', 'Fort Collins-Loveland, CO', 'Columbia, MO', 'Ames, IA',
  'Gainesville, FL', 'Tallahassee, FL', 'Eugene-Springfield, OR', 'Missoula, MT', 'Bozeman, MT',
  'Morgantown, WV', 'Lafayette-West Lafayette, IN', 'Bloomington, IL', 'College Station-Bryan, TX',
  'Lubbock, TX', 'Auburn-Opelika, AL', 'Oxford, MS', 'Starkville, MS', 'Boone, NC',
  'Blacksburg-Christiansburg-Radford, VA', 'Harrisonburg, VA', 'Logan, UT-ID', 'Corvallis, OR',
  'Pullman, WA', 'Moscow, ID', 'Laramie, WY', 'Manhattan, KS', 'Stillwater, OK',
  'Kalamazoo-Portage, MI', 'Lansing-East Lansing, MI', 'Athens, OH', 'Muncie, IN',
  'Carbondale-Marion, IL', 'Flagstaff, AZ', 'Chico, CA', 'San Luis Obispo-Paso Robles, CA',
  'Santa Cruz-Watsonville, CA', 'Bellingham, WA', 'Asheville, NC', 'Tuscaloosa, AL',
  'Hattiesburg, MS', 'Lincoln, NE',
];

/** Puerto Rico is outside the popest CBSA file; Qloo's US heatmap includes it. */
const EXTRA_METROS = [
  // 2020 Census, San Juan-Bayamon-Caguas MSA. Center: San Juan municipio.
  { title: 'San Juan-Bayamón-Caguas, PR', cbsa: '41980', pop: 2_081_265, lat: 18.4655, lon: -66.1057 },
];

type Metro = {
  id: string;
  name: string;
  state: string;
  stateName: string;
  title: string;
  cbsa: string;
  pop: number;
  lat: number;
  lon: number;
  kind: 'metro' | 'college';
  query: string;
};

function download(url: string, dest: string) {
  execFileSync('curl', ['-sfL', '-o', dest, url], { stdio: 'inherit' });
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // The popest file quotes names containing commas.
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) {
        cells.push(cur);
        cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** "Columbus, OH" -> { city: "Columbus", state: "OH" }; "Logan, UT-ID" -> Logan, UT. */
function principal(title: string) {
  const [cities, states] = title.split(', ');
  const city = cities.split('-')[0].trim();
  const state = states.split('-')[0].trim();
  return { city, state };
}

/** Display names that read better than the first principal city. */
const DISPLAY_OVERRIDES: Record<string, string> = {
  'Athens-Clarke County, GA': 'Athens',
  'Urban Honolulu, HI': 'Honolulu',
  'Champaign-Urbana, IL': 'Champaign',
  'Lafayette-West Lafayette, IN': 'Lafayette',
  'Burlington-South Burlington, VT': 'Burlington',
  'College Station-Bryan, TX': 'College Station',
  'Blacksburg-Christiansburg-Radford, VA': 'Blacksburg',
  'Lansing-East Lansing, MI': 'East Lansing',
  'San Juan-Bayamón-Caguas, PR': 'San Juan',
  'Kiryas Joel-Poughkeepsie-Newburgh, NY': 'Poughkeepsie',
};

function main() {
  const dir = mkdtempSync(join(tmpdir(), 'wanted-census-'));
  const cbsaPath = join(dir, 'cbsa.csv');
  const zipPath = join(dir, 'places.zip');
  console.log('Downloading Census CBSA estimates and places gazetteer...');
  download(CBSA_URL, cbsaPath);
  download(PLACES_URL, zipPath);
  execFileSync('unzip', ['-o', '-q', zipPath, '-d', dir]);

  const rows = parseCsv(readFileSync(cbsaPath, 'latin1')).filter((r) => !r.MDIV && !r.STCOU);

  // Places: USPS state + name ("Columbus city") -> internal point.
  const placeText = readFileSync(join(dir, '2024_Gaz_place_national.txt'), 'utf8');
  const places = new Map<string, { lat: number; lon: number; land: number }>();
  for (const line of placeText.split(/\r?\n/).slice(1)) {
    const c = line.split('\t').map((x) => x.trim());
    if (c.length < 12) continue;
    const [usps, , , name, , , aland, , , , lat, lon] = c;
    const base = name.replace(
      / (city|town|village|CDP|borough|municipality|city and borough|consolidated government \(balance\)|metropolitan government \(balance\)|unified government \(balance\)|urban county|comunidad|zona urbana)$/i,
      '',
    );
    const key = `${usps}|${base.toLowerCase()}`;
    const prev = places.get(key);
    const land = Number(aland);
    // Prefer the largest place with that name in the state (the incorporated city over a CDP).
    if (!prev || land > prev.land) places.set(key, { lat: Number(lat), lon: Number(lon), land });
  }

  function locate(title: string) {
    const { city, state } = principal(title);
    const candidates = [city, city.replace(/^St\. /, 'St. '), city.replace(/^Saint /, 'St. '), city.split('/')[0]];
    for (const c of candidates) {
      const hit = places.get(`${state}|${c.toLowerCase()}`);
      if (hit) return hit;
    }
    // Some titles use balance names ("Nashville-Davidson").
    for (const [key, val] of places) {
      if (key.startsWith(`${state}|${city.toLowerCase()}`)) return val;
    }
    return null;
  }

  const metros = rows
    .filter((r) => r.LSAD === 'Metropolitan Statistical Area')
    .sort((a, b) => Number(b.POPESTIMATE2024) - Number(a.POPESTIMATE2024))
    .slice(0, TOP_METROS);
  const chosen = new Map<string, { row: Record<string, string>; kind: Metro['kind'] }>();
  for (const row of metros) chosen.set(row.NAME, { row, kind: 'metro' });
  for (const prefix of COLLEGE_TOWNS) {
    const row = rows.find((r) => r.NAME === prefix || r.NAME.startsWith(prefix));
    if (!row) {
      console.warn(`  college town not found in CBSA file: ${prefix}`);
      continue;
    }
    // A college town already in the top 150 keeps the college flag for sleeper analysis.
    chosen.set(row.NAME, { row, kind: 'college' });
  }

  const out: Metro[] = [];
  for (const { row, kind } of chosen.values()) {
    const point = locate(row.NAME);
    if (!point) {
      console.warn(`  no principal-city point for ${row.NAME}; skipped`);
      continue;
    }
    const { city, state } = principal(row.NAME);
    const name = DISPLAY_OVERRIDES[row.NAME] ?? city;
    out.push({
      id: slugify(`${name}-${state}`),
      name,
      state,
      stateName: STATE_NAMES[state] ?? state,
      title: row.NAME,
      cbsa: row.CBSA,
      pop: Number(row.POPESTIMATE2024),
      lat: Number(point.lat.toFixed(5)),
      lon: Number(point.lon.toFixed(5)),
      kind,
      query: `${name}, ${STATE_NAMES[state] ?? state}`,
    });
  }
  for (const m of EXTRA_METROS) {
    const { state } = principal(m.title);
    const name = DISPLAY_OVERRIDES[m.title] ?? principal(m.title).city;
    out.push({
      id: slugify(`${name}-${state}`),
      name,
      state,
      stateName: STATE_NAMES[state],
      title: m.title,
      cbsa: m.cbsa,
      pop: m.pop,
      lat: m.lat,
      lon: m.lon,
      kind: 'metro',
      query: `${name}, ${STATE_NAMES[state]}`,
    });
  }
  out.sort((a, b) => b.pop - a.pop);

  const ids = new Set<string>();
  for (const m of out) {
    if (ids.has(m.id)) throw new Error(`duplicate metro id ${m.id}`);
    ids.add(m.id);
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(
    'data/metros.json',
    JSON.stringify(
      {
        source:
          'US Census Bureau: Vintage 2024 CBSA population estimates and 2024 Gazetteer places (public domain). San Juan PR from the 2020 Census.',
        generated: new Date().toISOString().slice(0, 10),
        metros: out,
      },
      null,
      1,
    ) + '\n',
  );
  console.log(`Wrote data/metros.json: ${out.length} metros (${out.filter((m) => m.kind === 'college').length} college towns).`);
}

main();
