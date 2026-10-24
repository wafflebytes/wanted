/**
 * "Paste your link": turns whatever an artist has handy into who they are and who they
 * sound like, so nobody has to answer "what do you sound like?" from a blank page.
 *
 * 1. Identify the act from the link. Spotify, SoundCloud and YouTube have public oEmbed;
 *    Apple Music and Deezer have public lookup APIs; Bandcamp has og tags; Rate Your Music
 *    links carry the artist's name in the path. A bare name works too.
 * 2. Find who they sound like with Deezer's related-artists graph (free, no key), then pin
 *    each one to a Qloo entity, because Qloo is what predicts where their crowd lives.
 * Nothing is auto-confirmed: the client shows the matches and the artist keeps or drops each.
 */
import type { ActEntity } from '../lib/types';
import { entitiesBySpotify, searchActs } from './qloo/api';
import { recordOutbound } from './outbound';

export type LinkSource = 'spotify' | 'apple' | 'deezer' | 'bandcamp' | 'soundcloud' | 'youtube' | 'rym' | 'instagram' | 'name';

export type LinkResult = {
  source: LinkSource;
  name: string;
  image: string | null;
  fans: number | null;
  genres: string[];
  /** The act itself in Qloo, when Qloo knows it (small acts often aren't there, and that's fine). */
  self: ActEntity | null;
  similar: { name: string; image: string | null; fans: number | null; entity: ActEntity | null }[];
  receipts: unknown[];
};

const UA = 'Wanted/0.1 (tour planner; +https://wanted.fm)';

async function getJson<T>(url: string): Promise<T | null> {
  recordOutbound({ kind: 'web', url, body: '' });
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function getText(url: string): Promise<string | null> {
  recordOutbound({ kind: 'web', url, body: '' });
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    return res.ok ? (await res.text()).slice(0, 200_000) : null;
  } catch {
    return null;
  }
}

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

/** Who is this link? Returns a display name and, for Spotify, the id Qloo can match exactly. */
async function identify(input: string): Promise<{ source: LinkSource; name: string; spotifyId?: string; image?: string | null } | null> {
  const raw = input.trim();
  let url: URL | null = null;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!url.hostname.includes('.')) url = null;
  } catch {
    url = null;
  }
  if (!url || /\s/.test(raw)) return raw ? { source: 'name', name: raw.replace(/^@/, '') } : null;
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const path = url.pathname;

  if (host.endsWith('spotify.com')) {
    const id = path.match(/artist\/([A-Za-z0-9]{22})/)?.[1];
    const o = await getJson<{ title?: string; thumbnail_url?: string }>(`https://open.spotify.com/oembed?url=${encodeURIComponent(url.toString())}`);
    if (o?.title) return { source: 'spotify', name: o.title, spotifyId: id, image: o.thumbnail_url ?? null };
  }
  if (host.endsWith('music.apple.com')) {
    const id = path.match(/\/(\d{5,})(?:$|\?)/)?.[1] ?? path.split('/').pop();
    const o = id ? await getJson<{ results?: { artistName?: string }[] }>(`https://itunes.apple.com/lookup?id=${id}`) : null;
    const name = o?.results?.[0]?.artistName ?? (path.match(/artist\/([^/]+)/)?.[1] ? titleCase(decodeURIComponent(path.match(/artist\/([^/]+)/)![1])) : null);
    if (name) return { source: 'apple', name };
  }
  if (host.endsWith('deezer.com')) {
    const id = path.match(/artist\/(\d+)/)?.[1];
    const o = id ? await getJson<{ name?: string; picture_xl?: string }>(`https://api.deezer.com/artist/${id}`) : null;
    if (o?.name) return { source: 'deezer', name: o.name, image: o.picture_xl ?? null };
  }
  if (host.endsWith('soundcloud.com')) {
    const o = await getJson<{ author_name?: string; title?: string; thumbnail_url?: string }>(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`);
    if (o?.author_name) return { source: 'soundcloud', name: o.author_name, image: o.thumbnail_url ?? null };
  }
  if (host.endsWith('youtube.com') || host === 'youtu.be') {
    const o = await getJson<{ author_name?: string }>(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`);
    if (o?.author_name) return { source: 'youtube', name: o.author_name.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '') };
    const handle = path.match(/@([^/]+)/)?.[1];
    if (handle) return { source: 'youtube', name: titleCase(handle) };
  }
  if (host.endsWith('bandcamp.com')) {
    const html = await getText(url.origin);
    const name = html?.match(/<meta property="og:site_name" content="([^"]+)"/)?.[1] ?? html?.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
    return { source: 'bandcamp', name: name ?? titleCase(host.split('.')[0]) };
  }
  if (host.endsWith('rateyourmusic.com') || host.endsWith('sonemic.com')) {
    const slug = path.match(/artist\/([^/]+)/)?.[1];
    if (slug) return { source: 'rym', name: titleCase(decodeURIComponent(slug)) };
  }
  if (host.endsWith('instagram.com') || host.endsWith('tiktok.com') || host.endsWith('x.com') || host.endsWith('twitter.com')) {
    const handle = path.split('/').filter(Boolean)[0]?.replace(/^@/, '');
    if (handle) return { source: 'instagram', name: titleCase(handle.replace(/(music|official|\d+)$/i, '')) };
  }
  return null;
}

type DeezerArtist = { id: number; name: string; picture_xl?: string; picture_big?: string; nb_fan?: number };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function qlooMatch(name: string): Promise<{ entity: ActEntity | null; receipt: unknown }> {
  try {
    const r = await searchActs(name, 'artist', 'link', 5);
    const exact = r.data.filter((c) => norm(c.name) === norm(name)).sort((a, b) => b.popularity - a.popularity)[0];
    return { entity: exact ?? null, receipt: r.receipt };
  } catch {
    return { entity: null, receipt: null };
  }
}

/** Fast pass (about a second): who the act is and who Deezer says they sit next to. No Qloo yet. */
export async function resolveLink(input: string): Promise<(LinkResult & { spotifyId: string | null }) | null> {
  const who = await identify(input);
  if (!who) return null;
  const dz = (await getJson<{ data?: DeezerArtist[] }>(`https://api.deezer.com/search/artist?q=${encodeURIComponent(who.name)}&limit=5`))?.data ?? [];
  // Deezer has duplicate profiles for big names; the real one is the exact match with the most fans.
  const me = dz.filter((a) => norm(a.name) === norm(who.name)).sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0] ?? (who.source === 'name' ? null : dz[0]) ?? null;
  const related = me ? ((await getJson<{ data?: DeezerArtist[] }>(`https://api.deezer.com/artist/${me.id}/related?limit=10`))?.data ?? []) : [];
  return {
    source: who.source,
    name: me?.name ?? who.name,
    image: who.image ?? me?.picture_xl ?? null,
    fans: me?.nb_fan ?? null,
    genres: [],
    self: null,
    similar: related.slice(0, 8).map((a) => ({ name: a.name, image: a.picture_xl ?? a.picture_big ?? null, fans: a.nb_fan ?? null, entity: null })),
    receipts: [],
    spotifyId: who.spotifyId ?? null,
  };
}

/** Slow pass, run while the artist looks at their card: pin the act and its neighbors to Qloo. */
export async function matchToQloo(input: { name: string; spotifyId: string | null; similar: LinkResult['similar'] }) {
  const receipts: unknown[] = [];
  let self: ActEntity | null = null;
  if (input.spotifyId) {
    try {
      const r = await entitiesBySpotify(input.spotifyId, 'link');
      self = r.data[0] ?? null;
      receipts.push(r.receipt);
    } catch {}
  }
  const [mine, ...rest] = await Promise.all([self ? Promise.resolve({ entity: self, receipt: null }) : qlooMatch(input.name), ...input.similar.slice(0, 8).map((s) => qlooMatch(s.name))]);
  for (const m of [mine, ...rest]) if (m.receipt) receipts.push(m.receipt);
  const similar = input.similar
    .slice(0, 8)
    .map((s, i) => ({ ...s, entity: rest[i].entity }))
    // Only acts Qloo can read are useful as a sound; keep at most five.
    .filter((s) => s.entity)
    .slice(0, 5);
  return { self: mine.entity, genres: mine.entity?.genres.slice(0, 3) ?? [], similar, receipts };
}
