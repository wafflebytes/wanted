import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { createContext, useContext, useEffect } from 'react';
import { useApi } from './hooks';
import { session } from './session';
import type { ArtistState } from './types';

/**
 * The artist layout puts its slug here. Native tab screens don't get the `[artist]` param
 * themselves, and the global params can still name the previous act right after a switch.
 */
export const ArtistSlug = createContext<string | null>(null);

/** The artist slug from the route (`/a/[artist]/...`). */
export function useArtistSlug(): string {
  const fromLayout = useContext(ArtistSlug);
  const local = useLocalSearchParams<{ artist?: string }>();
  const global = useGlobalSearchParams<{ artist?: string }>();
  return String(fromLayout ?? local.artist ?? global.artist ?? '');
}

/** Artist state (opened cities with proof, inbox), refreshed every 8 s so signatures show up live. */
export function useArtist(poll = 8000) {
  const slug = useArtistSlug();
  const q = useApi<ArtistState>(slug ? `/artist/${slug}` : null, { poll });
  return { slug, ...q };
}

/** Remember the open artist: the last one (relaunch lands here) and, for real acts, the switcher list. */
export function useRememberArtist(slug: string, data: ArtistState | null | undefined) {
  useEffect(() => {
    if (slug) session.setLastArtist(slug);
  }, [slug]);
  useEffect(() => {
    const a = data?.artist;
    if (!a || a.isDemo || a.slug !== slug) return;
    session.addAct({ slug, name: a.name, sounds: a.sound.entities.filter((e) => e.role !== 'self').map((e) => e.name) });
  }, [data?.artist.slug]);
}
