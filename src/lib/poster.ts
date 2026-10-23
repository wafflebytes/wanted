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

/** Wear level by signature count (PRD 8.3): 50, 100, 250. */
export function posterAsset(wear: 0 | 1 | 2 | 3) {
  return `poster-${wear}`;
}

export const SIGNATURE_FONTS = ['Caveat-SemiBold', 'NothingYouCouldDo-Regular', 'HomemadeApple-Regular'] as const;

/**
 * Deterministic scatter for signatures in the poster margins and lower band, so the same
 * signature number always lands in the same spot and the poster fills up as it's signed.
 */
export function signatureSpot(n: number): { x: number; y: number; rot: number; size: number } {
  const rand = (k: number) => {
    const s = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const zone = n % 4;
  const jitter = rand(1);
  if (zone === 0) return { x: 100 + rand(2) * 40, y: 440 + ((n * 97) % 560), rot: -78 + rand(3) * 20, size: 26 + jitter * 8 };
  if (zone === 1) return { x: 858 + rand(2) * 30, y: 450 + ((n * 131) % 560), rot: 72 + rand(3) * 20, size: 26 + jitter * 8 };
  if (zone === 2) return { x: 230 + rand(2) * 520, y: 950 + rand(4) * 60, rot: -14 + rand(3) * 28, size: 30 + jitter * 10 };
  return { x: 150 + rand(2) * 640, y: 1418 + rand(4) * 40, rot: -10 + rand(3) * 20, size: 24 + jitter * 6 };
}

export const MADE_WITH = "Made with Wanted. Find out where you're wanted.";
