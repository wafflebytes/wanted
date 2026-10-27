/**
 * WANTED poster layout, measured from the poster art (1024 x 1536). Shared by the in-app
 * poster component and the server share renderer so both put text on the same ruled lines.
 *
 * Measured 23 Oct from assets/source/blank-wanted-poster.png: frame inner box x 190..834,
 * y 409..1025; ruled lines at y 1107, 1183 and 1360; REWARD lettering y 1226..1300; side
 * rules at x 88 and 933; bottom border at y 1419.
 */
export const POSTER_W = 1024;
export const POSTER_H = 1536;

export type Box = { x: number; y: number; w: number; h: number };

export const POSTER_BOXES = {
  portrait: { x: 196, y: 415, w: 632, h: 604 },
  name: { x: 196, y: 1040, w: 632, h: 62 },
  city: { x: 196, y: 1114, w: 632, h: 64 },
  reward: { x: 196, y: 1303, w: 632, h: 52 },
  wantedIn: { x: 120, y: 1366, w: 784, h: 48 },
  count: { x: 742, y: 940, w: 168, h: 168 },
  leftMargin: { x: 96, y: 420, w: 84, h: 600 },
  rightMargin: { x: 850, y: 420, w: 78, h: 600 },
} satisfies Record<string, Box>;

export const POSTER_INK = '#3a2213';
export const POSTER_RED = '#a3261b';

/**
 * Each city's edition: an old print ink for its city line and stamp, and a paper tone.
 * Shared by the app poster and the share image so both print a city the same way.
 */
const INKS = [
  { name: 'Oxblood', ink: '#7a1f1a', paper: '#b8663f' },
  { name: 'Prairie', ink: '#2f5233', paper: '#8fa36a' },
  { name: 'Lake', ink: '#1f3b63', paper: '#7c93a8' },
  { name: 'Plum', ink: '#4f2347', paper: '#a07a96' },
  { name: 'Rust', ink: '#8a3b12', paper: '#c98a4a' },
  { name: 'Night', ink: '#1d1b2e', paper: '#6f6a80' },
] as const;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The city's edition: same city, same ink, every time and on every device. */
export function cityEdition(cityId: string) {
  const h = hash(cityId);
  return { ...INKS[h % INKS.length], tilt: ((h >> 4) % 17) - 9 };
}



/** Wear level by signature count (PRD 8.3): 50, 100, 250. */
export function posterAsset(wear: 0 | 1 | 2 | 3) {
  return `poster-${wear}`;
}

export const SIGNATURE_FONTS = ['Caveat-SemiBold', 'NothingYouCouldDo-Regular', 'HomemadeApple-Regular'] as const;

/**
 * Deterministic scatter for signatures in the poster margins and lower band, so the same
 * signature number always lands in the same spot and the poster fills up as it's signed.
 */
export function signatureSpot(n: number, lay?: PosterLayout | null): { x: number; y: number; rot: number; size: number } {
  const rand = (k: number) => {
    const s = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const zone = n % 4;
  const jitter = rand(1);
  if (zone === 0) return { x: 100 + rand(2) * 40, y: 440 + ((n * 97) % 560), rot: -78 + rand(3) * 20, size: 26 + jitter * 8 };
  if (zone === 1) return { x: 858 + rand(2) * 30, y: 450 + ((n * 131) % 560), rot: 72 + rand(3) * 20, size: 26 + jitter * 8 };
  // On custom art the lower band holds the name and city, so these land on the bottom of the photo instead.
  if (zone === 2) return lay ? { x: lay.portrait.x + 24 + rand(2) * (lay.portrait.w - 280), y: lay.portrait.y + lay.portrait.h - 70 + rand(4) * 36, rot: -8 + rand(3) * 16, size: 30 + jitter * 10 } : { x: 230 + rand(2) * 520, y: 950 + rand(4) * 60, rot: -14 + rand(3) * 28, size: 30 + jitter * 10 };
  return { x: 150 + rand(2) * 640, y: 1418 + rand(4) * 40, rot: -10 + rand(3) * 20, size: 24 + jitter * 6 };
}

export const MADE_WITH = "Made with Wanted. Find out where you're wanted.";

// ---------- per-city and per-region poster art ----------

export type Region = 'northeast' | 'midwest' | 'south' | 'mountain' | 'northwest' | 'california';

export type PosterLayout = typeof POSTER_BOXES;

/**
 * The generated posters don't share one layout, so each one carries its own measured boxes:
 * frame interior [x0, y0, x1, y1], name band [y0, y1], city band [y0, y1] and the band under
 * REWARD [y0, y1] (the reward line sits on top of it, the neighborhoods below). The count seal
 * and the city mark hang off the frame's lower corners, like on the original.
 */
const lay = (f: [number, number, number, number], n: [number, number], c: [number, number], r: [number, number]): PosterLayout => {
  const [x0, y0, x1, y1] = f;
  const bx = { x: Math.max(110, x0 - 70), w: Math.min(1024 - 220, x1 - x0 + 140) };
  const split = r[0] + (r[1] - r[0]) * 0.55;
  return {
    portrait: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    name: { x: x0, y: n[0], w: x1 - x0, h: n[1] - n[0] },
    city: { x: x0, y: c[0], w: x1 - x0, h: c[1] - c[0] },
    reward: { x: x0, y: r[0], w: x1 - x0, h: split - r[0] },
    wantedIn: { ...bx, y: split, h: r[1] - split },
    count: { x: x1 + 76 - 168, y: y1 - 85, w: 168, h: 168 },
    leftMargin: { x: 96, y: y0 + 4, w: Math.max(40, x0 - 110), h: y1 - y0 },
    rightMargin: { x: x1 + 20, y: y0 + 4, w: Math.max(40, 928 - x1 - 20), h: y1 - y0 },
  };
};


/** `file` is the poster's name in assets/images/posters (app) and assets/og/posters (share images). */
export type PosterArtEntry = { file: string; layout: PosterLayout };

const CITY_ART: Record<string, PosterArtEntry> = {
  'burlington-vt': { file: 'burlington-vt', layout: lay([200, 366, 824, 964], [998, 1046], [1066, 1124], [1298, 1388]) },
  'columbus-oh': { file: 'columbus-oh', layout: lay([200, 366, 824, 964], [998, 1046], [1066, 1124], [1298, 1388]) },
  'ithaca-ny': { file: 'ithaca-ny', layout: lay([214, 358, 830, 1004], [1066, 1108], [1120, 1164], [1334, 1376]) },
  'portland-me': { file: 'portland-me', layout: lay([204, 410, 826, 930], [968, 1022], [1056, 1126], [1322, 1392]) },
  'poughkeepsie-ny': { file: 'poughkeepsie-ny', layout: lay([204, 492, 822, 1012], [1052, 1098], [1124, 1170], [1326, 1374]) },
  'santa-cruz-ca': { file: 'santa-cruz-ca', layout: lay([250, 404, 792, 978], [1010, 1072], [1096, 1160], [1332, 1396]) },
};

const REGION_ART: Partial<Record<Region, PosterArtEntry>> = {
  northeast: { file: 'region-northeast', layout: lay([210, 386, 828, 1010], [1058, 1106], [1138, 1194], [1374, 1424]) },
  midwest: { file: 'region-midwest', layout: lay([210, 424, 810, 966], [1004, 1066], [1096, 1160], [1318, 1372]) },
  south: { file: 'region-south', layout: lay([292, 420, 742, 982], [1012, 1066], [1096, 1156], [1356, 1412]) },
  mountain: { file: 'region-mountain', layout: lay([184, 452, 840, 984], [1028, 1066], [1086, 1128], [1302, 1360]) },
  northwest: { file: 'region-northwest', layout: lay([210, 384, 810, 958], [1002, 1058], [1092, 1154], [1326, 1376]) },
  california: { file: 'region-california', layout: lay([244, 440, 792, 1018], [1068, 1116], [1132, 1182], [1322, 1390]) },
};

const STATES: Record<Region, string[]> = {
  northeast: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC'],
  midwest: ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'],
  south: ['VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'LA', 'AR', 'OK', 'TX'],
  mountain: ['MT', 'ID', 'WY', 'CO', 'UT', 'NV', 'AZ', 'NM'],
  northwest: ['WA', 'OR', 'AK'],
  california: ['CA', 'HI'],
};

export function regionFor(state: string): Region | null {
  const s = state.toUpperCase();
  return (Object.keys(STATES) as Region[]).find((r) => STATES[r].includes(s)) ?? null;
}

/** The poster art for a city (its own, else its region's), or null for the original paper. */
export function posterArtFor(cityId: string | undefined, state: string): PosterArtEntry | null {
  const region = regionFor(state);
  return (cityId && CITY_ART[cityId]) || (region && REGION_ART[region]) || null;
}
