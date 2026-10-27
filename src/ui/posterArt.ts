/**
 * Poster art per city. Each city can have its own paper (local motifs in the border), every
 * other city falls back to its region's paper, then to the original. The measured layout for
 * each drawing lives in src/lib/poster.ts so the share-image renderer uses the same boxes.
 *
 * To add art: put the file in assets/images/posters/ (WebP, app) and assets/og/posters/ (PNG,
 * share images), add its layout in src/lib/poster.ts and its require() below.
 * Wear is a transparent overlay laid on top at 50, 100 and 250 signatures.
 */
import type { ImageSourcePropType } from 'react-native';
import { posterArtFor, type PosterLayout } from '@/lib/poster';
import { IMAGES, type ImageKey } from './theme';

export { regionFor, type Region } from '@/lib/poster';

const FILES: Record<string, ImageSourcePropType> = {
  'burlington-vt': require('../../assets/images/posters/burlington-vt.webp'),
  'columbus-oh': require('../../assets/images/posters/columbus-oh.webp'),
  'ithaca-ny': require('../../assets/images/posters/ithaca-ny.webp'),
  'portland-me': require('../../assets/images/posters/portland-me.webp'),
  'poughkeepsie-ny': require('../../assets/images/posters/poughkeepsie-ny.webp'),
  'santa-cruz-ca': require('../../assets/images/posters/santa-cruz-ca.webp'),
  'region-northeast': require('../../assets/images/posters/region-northeast.webp'),
  'region-midwest': require('../../assets/images/posters/region-midwest.webp'),
  'region-south': require('../../assets/images/posters/region-south.webp'),
  'region-mountain': require('../../assets/images/posters/region-mountain.webp'),
  'region-northwest': require('../../assets/images/posters/region-northwest.webp'),
  'region-california': require('../../assets/images/posters/region-california.webp'),
};

/** Overlays for wear 1, 2 and 3 (transparent, same size): require('../../assets/images/posters/wear-1.webp'). Until they exist, a worn poster keeps its clean city art. */
const WEAR: (ImageSourcePropType | undefined)[] = [];

/** The paper to draw, its measured boxes, and the wear to lay over it. `custom` says the art brings its own palette. */
export function posterArt(cityId: string | undefined, state: string, wear: 0 | 1 | 2 | 3): { base: ImageSourcePropType; overlay: ImageSourcePropType | null; custom: boolean; layout: PosterLayout | null } {
  const own = posterArtFor(cityId, state);
  const overlay = wear ? (WEAR[wear - 1] ?? null) : null;
  if (!own) return { base: IMAGES[`poster-${wear}` as ImageKey], overlay: null, custom: false, layout: null };
  return { base: FILES[own.file], overlay, custom: true, layout: own.layout };
}
