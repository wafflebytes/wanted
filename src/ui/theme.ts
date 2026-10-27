/**
 * Design tokens (PRD 8.1): Liquid Glass chrome over a black canvas, sticker-loud content.
 * One set of tokens for iOS, Android and web.
 */
import { Platform } from 'react-native';

export const C = {
  canvas: '#000000',
  card: '#141414',
  cardHi: '#1C1C1E',
  line: 'rgba(255,255,255,0.08)',
  lineHi: 'rgba(255,255,255,0.16)',
  text: '#FFFFFF',
  // Label hierarchy on black (iOS dark secondaryLabel family). Both clear 4.5:1 at body
  // sizes; text3 is for captions and metadata, never for anything people must act on.
  text2: 'rgba(235,235,245,0.68)',
  text3: 'rgba(235,235,245,0.52)',
  /** Fills for chips, wells and tracks (iOS tertiary/quaternary system fill, dark). */
  fill: 'rgba(118,118,128,0.24)',
  fill2: 'rgba(118,118,128,0.14)',
  purple: '#9B30E0',
  purpleHi: '#B45CF0',
  blue: '#1F8AFF',
  blueDeep: '#006AEE',
  heatLo: '#2B2D42',
  heatMid: '#FFB000',
  heatHi: '#FF4D2E',
  gold: '#F5C542',
  sunset: '#FF6A1A',
  amber: '#FFB000',
  flame: '#FF4D2E',
  cream: '#F4E9D3',
  ink: '#1A120B',
  posterInk: '#3a2213',
  posterRed: '#a3261b',
  good: '#34C759',
  bad: '#FF453A',
  warn: '#FFB000',
  // Provenance (FR-26): who is saying it.
  qloo: '#FFB000',
  fans: '#B45CF0',
  gus: '#7FD1FF',
} as const;

export const R = { sm: 12, md: 20, card: 26, lg: 32, pill: 999 } as const;

/**
 * Wanted's spacing scale, in points. iPhone 16 (393 pt wide) is the reference: a 16 pt
 * gutter leaves a 361 pt column. One scale, used everywhere, instead of literals at call sites.
 */
export const S = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40, gutter: 16 } as const;

/** Minimum touch target (HIG: 44x44 pt on iOS). */
export const HIT = 44;

/**
 * Type system, one voice everywhere:
 * - Karl ST Trial Regular: main display titles, with Medium for smaller titles and
 *   emphasis, and Bold for the wordmark and hero numbers. No synthetic weights.
 * - Archivo Expanded: printed poster artwork only, matching the server-rendered shares.
 * - SF Pro (system): everything you read or tap. Native, Dynamic Type, no surprises.
 * - SF Pro Rounded: Gus speaking. Warm and solid, never light or italic.
 * - Chivo Mono: raw evidence only (receipts, API numbers) for people who want to probe.
 * - Handwriting faces: fan signatures, nothing else.
 */
const SYSTEM_WEB = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif';
const ROUNDED_WEB = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif';
export const F = {
  logo: 'KarlSTTrial-Bold',
  display: 'KarlSTTrial-Regular',
  displayBlack: 'KarlSTTrial-Bold',
  displayBold: 'KarlSTTrial-Medium',
  poster: 'Archivo-ExpandedExtraBold',
  posterBlack: 'Archivo-ExpandedBlack',
  head: Platform.select({ web: SYSTEM_WEB, default: undefined }),
  bold: Platform.select({ web: SYSTEM_WEB, default: undefined }),
  body: Platform.select({ web: SYSTEM_WEB, default: undefined }),
  bodyMed: Platform.select({ web: SYSTEM_WEB, default: undefined }),
  /** Retired: Gus now speaks in the rounded face. Kept as an alias so old call sites stay sane. */
  serif: Platform.select({ ios: 'ui-rounded', web: ROUNDED_WEB, default: undefined }),
  mono: 'ChivoMono-Regular',
  monoMed: 'ChivoMono-Medium',
  monoBold: 'ChivoMono-Bold',
  sig: ['Caveat-SemiBold', 'NothingYouCouldDo-Regular', 'HomemadeApple-Regular'] as const,
  /** Rounded system face for Gus's lines and soft controls. */
  rounded: Platform.select({ ios: 'ui-rounded', web: ROUNDED_WEB, default: undefined }),
} as const;

export const FONT_FILES = {
  'KarlSTTrial-Regular': require('../../assets/fonts/KarlSTTrial-Regular.ttf'),
  'KarlSTTrial-Medium': require('../../assets/fonts/KarlSTTrial-Medium.ttf'),
  'KarlSTTrial-Bold': require('../../assets/fonts/KarlSTTrial-Bold.ttf'),
  'Archivo-ExpandedBold': require('../../assets/fonts/Archivo-ExpandedBold.ttf'),
  'Archivo-ExpandedExtraBold': require('../../assets/fonts/Archivo-ExpandedExtraBold.ttf'),
  'Archivo-ExpandedBlack': require('../../assets/fonts/Archivo-ExpandedBlack.ttf'),
  'ChivoMono-Regular': require('../../assets/fonts/ChivoMono-Regular.ttf'),
  'ChivoMono-Medium': require('../../assets/fonts/ChivoMono-Medium.ttf'),
  'ChivoMono-Bold': require('../../assets/fonts/ChivoMono-Bold.ttf'),
  'Caveat-SemiBold': require('../../assets/fonts/Caveat-SemiBold.ttf'),
  'NothingYouCouldDo-Regular': require('../../assets/fonts/NothingYouCouldDo-Regular.ttf'),
  'HomemadeApple-Regular': require('../../assets/fonts/HomemadeApple-Regular.ttf'),
};

/** Heat ramp #2B2D42 -> #FFB000 -> #FF4D2E as RGB, t in 0..1. */
export function heatRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const a = [0x2b, 0x2d, 0x42];
  const b = [0xff, 0xb0, 0x00];
  const c = [0xff, 0x4d, 0x2e];
  const [p, q, k] = x < 0.5 ? [a, b, x / 0.5] : [b, c, (x - 0.5) / 0.5];
  return [0, 1, 2].map((i) => Math.round(p[i] + (q[i] - p[i]) * k)) as [number, number, number];
}

/**
 * The map's halftone scale, like embers: a dark coal where few people are, through orange and
 * gold, to near-white where they cluster. Used for the dots on every map and the poster stamp.
 */
const EMBER: [number, [number, number, number]][] = [
  [0, [0x3b, 0x24, 0x2c]],
  [0.35, [0xb4, 0x4a, 0x2a]],
  [0.65, [0xff, 0x9f, 0x1c]],
  [0.88, [0xff, 0xd2, 0x6a]],
  [1, [0xff, 0xf1, 0xd0]],
];
export function emberRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const i = Math.max(0, EMBER.findIndex(([at]) => at >= x) - 1);
  const [a, p] = EMBER[i];
  const [b, q] = EMBER[Math.min(EMBER.length - 1, i + 1)];
  const k = b === a ? 0 : (x - a) / (b - a);
  return [0, 1, 2].map((j) => Math.round(p[j] + (q[j] - p[j]) * k)) as [number, number, number];
}
export function emberColor(t: number) {
  const [r, g, b] = emberRgb(t);
  return `rgb(${r},${g},${b})`;
}

export function heatColor(t: number, alpha = 1) {
  const [r, g, b] = heatRgb(t);
  return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** A CSS gradient as a view background: React Native's experimental prop, plain CSS on the web. */
export function gradient(css: string): object {
  return Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css };
}

export const IMAGES = {
  'poster-0': require('../../assets/images/poster-0.webp'),
  'poster-1': require('../../assets/images/poster-1.webp'),
  'poster-2': require('../../assets/images/poster-2.webp'),
  'poster-3': require('../../assets/images/poster-3.webp'),
  backdrop: require('../../assets/images/backdrop.webp'),
  cover: require('../../assets/images/cover.webp'),
  'deputy-star': require('../../assets/images/deputy-star.webp'),
  'stamp-caught-live': require('../../assets/images/stamp-caught-live.webp'),
  'maya-engraving': require('../../assets/images/maya-engraving.webp'),
  'maya-sticker': require('../../assets/images/maya-sticker.webp'),
  'maya-mugshot': require('../../assets/images/maya-mugshot.webp'),
  'gus-signing': require('../../assets/images/gus-signing.webp'),
  'gus-lets-ride': require('../../assets/images/gus-lets-ride.webp'),
  'gus-loading': require('../../assets/images/gus-loading.webp'),
  'gus-tumbleweed': require('../../assets/images/gus-tumbleweed.webp'),
  'gus-mark': require('../../assets/images/gus-mark.webp'),
  van: require('../../assets/images/van.webp'),
  'gus-idle': require('../../assets/images/gus-idle.webp'),
  'gus-thinking': require('../../assets/images/gus-thinking.webp'),
  'gus-proud': require('../../assets/images/gus-proud.webp'),
  'gus-unimpressed': require('../../assets/images/gus-unimpressed.webp'),
  'gus-losing-it': require('../../assets/images/gus-losing-it.webp'),
  'gus-reading': require('../../assets/images/gus-reading.webp'),
  'gus-wave': require('../../assets/images/gus-wave.webp'),
  'gus-cut-idle': require('../../assets/images/gus-cut-idle.webp'),
  'gus-cut-thinking': require('../../assets/images/gus-cut-thinking.webp'),
  'gus-cut-proud': require('../../assets/images/gus-cut-proud.webp'),
  'gus-cut-unimpressed': require('../../assets/images/gus-cut-unimpressed.webp'),
  'gus-cut-losing-it': require('../../assets/images/gus-cut-losing-it.webp'),
  'gus-cut-reading': require('../../assets/images/gus-cut-reading.webp'),
  'gus-cut-wave': require('../../assets/images/gus-cut-wave.webp'),
} as const;

export type ImageKey = keyof typeof IMAGES;
