import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { useApi } from './hooks';
import type { ArtistState } from './types';

/** The artist slug from the route (`/a/[artist]/...`). */
export function useArtistSlug(): string {
  const local = useLocalSearchParams<{ artist?: string }>();
  const global = useGlobalSearchParams<{ artist?: string }>();
  return String(local.artist ?? global.artist ?? '');
}

/** Artist state (opened cities with proof, inbox), refreshed every 8 s so signatures show up live. */
export function useArtist(poll = 8000) {
  const slug = useArtistSlug();
  const q = useApi<ArtistState>(slug ? `/artist/${slug}` : null, { poll });
  return { slug, ...q };
}
