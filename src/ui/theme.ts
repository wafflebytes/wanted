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
  /** Glass over the map and in sheets (dark overlay material). */
  glass: 'rgba(30,30,34,0.72)',
  /** Flighty-style feature cards: deep stage purple, proof green, roast red. */
  stageDeep: '#2A0E4A',
  proofDeep: '#0D3B22',
  roastDeep: '#4A0F0C',
} as const;

export const R = { sm: 12, md: 20, card: 26, lg: 32, pill: 999 } as const;

/**
 * Wanted's spacing scale, in points. iPhone 16 (393 pt wide) is the reference: a 16 pt
 * gutter leaves a 361 pt column. One scale, used everywhere, instead of literals at call sites.
 */
export const S = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40, gutter: 16 } as const;

/** Minimum touch target (HIG: 44x44 pt on iOS). */
export const HIT = 44;

/** Font families, loaded in the root layout. */
export const F = {
  logo: 'Archivo-Medium',
  display: 'Archivo-ExpandedExtraBold',
  displayBlack: 'Archivo-ExpandedBlack',
  displayBold: 'Archivo-ExpandedBold',
  head: 'Archivo-SemiBold',
  bold: 'Archivo-Bold',
  body: Platform.select({ web: 'Archivo-Regular', default: undefined }),
  bodyMed: Platform.select({ web: 'Archivo-Medium', default: undefined }),
  serif: 'InstrumentSerif-Regular',
  mono: 'ChivoMono-Regular',
  monoMed: 'ChivoMono-Medium',
  monoBold: 'ChivoMono-Bold',
  sig: ['Caveat-SemiBold', 'NothingYouCouldDo-Regular', 'HomemadeApple-Regular'] as const,
  /** Rounded system face for buttons, chips and Gus's lines (PRD 8.1). */
  rounded: Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', default: undefined }),
} as const;

export const FONT_FILES = {
  'Archivo-Regular': require('../../assets/fonts/Archivo-Regular.ttf'),
  'Archivo-Medium': require('../../assets/fonts/Archivo-Medium.ttf'),
  'Archivo-SemiBold': require('../../assets/fonts/Archivo-SemiBold.ttf'),
  'Archivo-Bold': require('../../assets/fonts/Archivo-Bold.ttf'),
  'Archivo-ExpandedBold': require('../../assets/fonts/Archivo-ExpandedBold.ttf'),
  'Archivo-ExpandedExtraBold': require('../../assets/fonts/Archivo-ExpandedExtraBold.ttf'),
  'Archivo-ExpandedBlack': require('../../assets/fonts/Archivo-ExpandedBlack.ttf'),
  'InstrumentSerif-Regular': require('../../assets/fonts/InstrumentSerif-Regular.ttf'),
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

export function heatColor(t: number, alpha = 1) {
  const [r, g, b] = heatRgb(t);
  return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
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
  // Die-cut stickers cut from the reference sheet (scripts/build-stickers.py): Gus stands free.
  'sticker-full': require('../../assets/images/stickers/gus-full.webp'),
  'sticker-full-3q': require('../../assets/images/stickers/gus-full-3q.webp'),
  'sticker-reading': require('../../assets/images/stickers/gus-reading.webp'),
  'sticker-thinking': require('../../assets/images/stickers/gus-thinking.webp'),
  'sticker-proud': require('../../assets/images/stickers/gus-proud.webp'),
  'sticker-unimpressed': require('../../assets/images/stickers/gus-unimpressed.webp'),
  'sticker-losing-it': require('../../assets/images/stickers/gus-losing-it.webp'),
  'sticker-wave': require('../../assets/images/stickers/gus-wave.webp'),
} as const;

/** Sticker aspect ratios (width / height), so a sticker sized by height keeps its die-cut shape. */
export const STICKER_RATIO = {
  'sticker-full': 252 / 702,
  'sticker-full-3q': 227 / 703,
  'sticker-reading': 301 / 276,
  'sticker-thinking': 285 / 282,
  'sticker-proud': 390 / 298,
  'sticker-unimpressed': 253 / 305,
  'sticker-losing-it': 323 / 324,
  'sticker-wave': 303 / 300,
} as const;

export type ImageKey = keyof typeof IMAGES;
