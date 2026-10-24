/**
 * Poster art per city. Each city can have its own paper (local motifs in the border), every
 * other city falls back to its region's paper, then to the original. Wear is a transparent
 * overlay laid on top at 50, 100 and 250 signatures, so one drawing per city covers every stage.
 *
 * To add art: put the file in assets/images/posters/ and add a line below. Every drawing must
 * follow design/poster-kit/layout-guide.png so the name, city and photo land on plain paper.
 */
import type { ImageSourcePropType } from 'react-native';
import { IMAGES, type ImageKey } from './theme';

export type Region = 'northeast' | 'midwest' | 'south' | 'mountain' | 'northwest' | 'california';

/** 'columbus-oh': require('../../assets/images/posters/columbus-oh.webp') */
const CITY: Record<string, ImageSourcePropType> = {};

/** northeast: require('../../assets/images/posters/region-northeast.webp') */
const REGION: Partial<Record<Region, ImageSourcePropType>> = {};

/** Overlays for wear 1, 2 and 3: require('../../assets/images/posters/wear-1.webp') */
const WEAR: (ImageSourcePropType | undefined)[] = [];

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

/** The paper to draw and the wear to lay over it. `custom` says the art brings its own palette. */
export function posterArt(cityId: string | undefined, state: string, wear: 0 | 1 | 2 | 3): { base: ImageSourcePropType; overlay: ImageSourcePropType | null; custom: boolean } {
  const region = regionFor(state);
  const own = (cityId && CITY[cityId]) || (region && REGION[region]);
  if (!own) return { base: IMAGES[`poster-${wear}` as ImageKey], overlay: null, custom: false };
  return { base: own, overlay: wear ? (WEAR[wear - 1] ?? null) : null, custom: true };
}
