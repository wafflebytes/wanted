/**
 * Pulse: what's happening with an act's people right now. Two live sources, both real:
 *
 * 1. Signatures on the act's WANTED posters (our own claims table): today, this week, last
 *    week, which city leads, and the latest few, initials only.
 * 2. Public chatter: posts that name the act on Bluesky and Lemmy, the two big open social
 *    networks with public search. No scraping behind logins, no paid APIs, cached 15 minutes.
 *    When the act is new to the internet, we listen for the acts it sounds like and say so.
 *
 * The Wanted Meter is a plain formula over those two numbers, printed under the meter.
 */
import { all, kvGet, kvSet } from './db';
import type { ArtistRow } from './artists';
import { metroById } from './score';
import { recordOutbound } from './outbound';

export type ChatterPost = { id: string; kind: 'talk' | 'radio' | 'listing'; source: 'bluesky' | 'lemmy'; author: string; handle: string; avatar: string | null; text: string; url: string; at: number; likes: number; about: string };

export type Pulse = {
  signatures: {
    total: number;
    today: number;
    week: number;
    lastWeek: number;
    leader: { city: string; name: string; count: number } | null;
    latest: { initials: string; city: string; name: string; neighborhood: string | null; at: number; demo: boolean; font: number; number: number }[];
    daily: number[];
    /** Every city with a signature in the last two weeks: this week, last week, all-time, and how far from proof. */
    cities: { city: string; name: string; week: number; lastWeek: number; total: number; toProof: number; hoods: string[] }[];
  };
  chatter: { posts: ChatterPost[]; week: number; radio: number; listings: number; about: string[]; sources: string[]; fetchedAt: number };
  meter: { value: number; delta: number; formula: string };
};

const DAY = 86_400_000;
const UA = 'Wanted/0.1 (tour planner; +https://wanted.fm)';

async function blueskySearch(q: string): Promise<Omit<ChatterPost, 'kind'>[]> {
  const url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=25&sort=latest&lang=en`;
  recordOutbound({ kind: 'web', url, body: '' });
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as { posts?: { uri: string; author: { handle: string; displayName?: string; avatar?: string }; record: { text?: string; createdAt?: string }; likeCount?: number }[] };
  return (data.posts ?? []).map((p): Omit<ChatterPost, 'kind'> => {
    const rkey = p.uri.split('/').pop();
    return {
      id: `bsky:${p.uri}`,
      source: 'bluesky' as const,
      author: p.author.displayName || p.author.handle,
      handle: `@${p.author.handle}`,
      avatar: p.author.avatar ?? null,
      text: (p.record.text ?? '').trim(),
      url: `https://bsky.app/profile/${p.author.handle}/post/${rkey}`,
      at: p.record.createdAt ? Date.parse(p.record.createdAt) : 0,
      likes: p.likeCount ?? 0,
      about: q.replace(/"/g, ''),
    };
  });
}

async function lemmySearch(q: string): Promise<Omit<ChatterPost, 'kind'>[]> {
  const url = `https://lemmy.world/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=New&limit=10`;
  recordOutbound({ kind: 'web', url, body: '' });
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as { posts?: { post: { id: number; name: string; body?: string; ap_id: string; published: string }; creator: { name: string; display_name?: string; avatar?: string }; community: { name: string }; counts?: { score?: number } }[] };
  return (data.posts ?? []).map((p) => ({
    id: `lemmy:${p.post.id}`,
    source: 'lemmy' as const,
    author: p.creator.display_name || p.creator.name,
    handle: `in c/${p.community.name}`,
    avatar: p.creator.avatar ?? null,
    text: [p.post.name, p.post.body].filter(Boolean).join('\n').trim().slice(0, 400),
    url: p.post.ap_id,
    at: Date.parse(p.post.published.endsWith('Z') ? p.post.published : `${p.post.published}Z`),
    likes: p.counts?.score ?? 0,
    about: q.replace(/"/g, ''),
  }));
}

/** Radio bots and ticket bots post a lot; they're a signal, just not conversation. */
function kindOf(p: Omit<ChatterPost, 'kind'>): ChatterPost['kind'] {
  const t = p.text.toLowerCase();
  if (/(#?now ?playing|detected:|on air|listen live|listen:|tune in|spinning now)/.test(t) || /(radio|fm\b|playlist|\bfm\.)/.test(p.handle.toLowerCase())) return 'radio';
  if (/(tickets?|on sale|start time|doors|presale)/.test(t) && /(alert|events|tix|ticket|concert)/.test(p.handle.toLowerCase())) return 'listing';
  return 'talk';
}

// Fan Mail is on screen in front of the act (and judges): no swearing, slurs or culture-war
// takes, nothing that isn't in English, and no ranked lists that only name-drop the act.
const ROUGH = /\b(fuck\w*|shit\w*|cunt|bitch\w*|dick|cock|pussy|buceta|porra|caralho|puta|merda|nsfw|porn\w*|nazi\w*|racis\w*|appropriation|slur|kill\w*|rape\w*|suicid\w*|drugs?|cocaine)\b/i;
const ENGLISH = /\b(the|and|to|of|is|it|i|you|my|this|that|in|for|with|was|so|just|love|song|album)\b/gi;
function decent(p: Omit<ChatterPost, 'kind'>) {
  if (ROUGH.test(p.text) || ROUGH.test(p.author) || ROUGH.test(p.handle)) return false;
  if ((p.text.match(ENGLISH) ?? []).length < 3) return false;
  const listy = p.text.split('\n').filter((l) => /^\s*(\d+[.)]|#\w)/.test(l)).length;
  return listy < 3;
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Who to listen for: the act itself when it has a real name, else the acts it sounds like. */
export function listenFor(artist: ArtistRow): string[] {
  const own = !/^act like /i.test(artist.name) && !artist.isDemo ? [artist.name] : [];
  const refs = artist.sound.entities.filter((e) => e.role !== 'self').map((e) => e.name);
  const self = artist.sound.entities.filter((e) => e.role === 'self').map((e) => e.name);
  return [...new Set([...own, ...self, ...refs])].slice(0, 3);
}

export async function chatterFor(artist: ArtistRow): Promise<Pulse['chatter']> {
  const about = listenFor(artist);
  const key = `chatter:v3:${about.join('|')}`;
  const hit = await kvGet<Pulse['chatter']>(key);
  if (hit && Date.now() - hit.fetchedAt < 15 * 60_000) return hit;
  const results = await Promise.allSettled(about.flatMap((n) => [blueskySearch(`"${n}"`), lemmySearch(n)]));
  const seen = new Set<string>();
  const posts = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    // Keep posts that actually name the act, have words in them, and aren't link spam.
    .filter((p) => p.text.length > 24 && fold(p.text).includes(fold(p.about)) && decent(p) && !seen.has(p.id) && (seen.add(p.id), true))
    .map((p) => ({ ...p, kind: kindOf(p) }))
    .sort((a, b) => b.at - a.at);
  const recent = posts.filter((p) => Date.now() - p.at < 7 * DAY);
  const out = {
    posts: [...posts.filter((p) => p.kind === 'talk').slice(0, 20), ...posts.filter((p) => p.kind !== 'talk').slice(0, 6)],
    week: recent.filter((p) => p.kind === 'talk').length,
    radio: recent.filter((p) => p.kind === 'radio').length,
    listings: recent.filter((p) => p.kind === 'listing').length,
    about,
    sources: ['Bluesky', 'Lemmy'],
    fetchedAt: Date.now(),
  };
  if (posts.length || !hit) await kvSet(key, out);
  return posts.length ? out : (hit ?? out);
}

export async function signaturesFor(artist: ArtistRow): Promise<Pulse['signatures']> {
  const now = Date.now();
  const rows = await all<{ city: string; neighborhood: string | null; signer_initials: string | null; created_at: number; is_demo: number; font: number; number: number }>(
    'select city, neighborhood, signer_initials, created_at, is_demo, font, number from claims where artist_id = ? and created_at > ? order by created_at desc',
    [artist.id, now - 14 * DAY],
  );
  const total = (await all<{ n: number }>('select count(*) as n from claims where artist_id = ?', [artist.id]))[0]?.n ?? 0;
  const week = rows.filter((r) => now - r.created_at < 7 * DAY);
  const byCity = new Map<string, number>();
  for (const r of week) byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1);
  const lead = [...byCity.entries()].sort((a, b) => b[1] - a[1])[0];
  const name = (id: string) => metroById(id)?.name ?? id;
  const totals = new Map((await all<{ city: string; n: number }>('select city, count(*) as n from claims where artist_id = ? group by city', [artist.id])).map((r) => [r.city, Number(r.n)]));
  const cityIds = [...new Set(rows.map((r) => r.city))];
  const cities = cityIds
    .map((id) => {
      const mine = rows.filter((r) => r.city === id);
      const wk = mine.filter((r) => now - r.created_at < 7 * DAY);
      const hoodCount = new Map<string, number>();
      for (const r of wk) if (r.neighborhood) hoodCount.set(r.neighborhood, (hoodCount.get(r.neighborhood) ?? 0) + 1);
      const total = totals.get(id) ?? mine.length;
      return {
        city: id,
        name: name(id),
        week: wk.length,
        lastWeek: mine.length - wk.length,
        total,
        // Gus pitches venues once a city has 50 signatures (see watcher.ts).
        toProof: Math.max(0, 50 - total),
        hoods: [...hoodCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => h),
      };
    })
    .sort((a, b) => b.week - a.week || b.total - a.total)
    .slice(0, 6);
  const daily = Array.from({ length: 14 }, (_, i) => rows.filter((r) => r.created_at > now - (14 - i) * DAY && r.created_at <= now - (13 - i) * DAY).length);
  return {
    total: Number(total),
    today: rows.filter((r) => now - r.created_at < DAY).length,
    week: week.length,
    lastWeek: rows.length - week.length,
    leader: lead ? { city: lead[0], name: name(lead[0]), count: lead[1] } : null,
    latest: rows.slice(0, 12).map((r) => ({ initials: r.signer_initials ?? 'A fan', city: r.city, name: name(r.city), neighborhood: r.neighborhood, at: r.created_at, demo: !!r.is_demo, font: r.font, number: r.number })),
    daily,
    cities,
  };
}

/** 0..100: signatures carry most of it, public chatter the rest; both saturate. */
function meter(artist: ArtistRow, sig: Pulse['signatures'], chat: Pulse['chatter']) {
  const score = (s: number, c: number) => Math.round(100 * (0.7 * (1 - Math.exp(-s / 40)) + 0.3 * (1 - Math.exp(-c / 15))));
  // Talk about the acts you sound like is context, not demand for you: it never moves your meter.
  const talk = chat.about.includes(artist.name) ? chat.week + chat.radio * 0.5 : 0;
  const value = score(sig.week, talk);
  const before = score(sig.lastWeek, talk);
  return { value, delta: value - before, formula: '70% poster signatures this week + 30% public posts naming you (radio spins count half). Both saturate, so 100 means a city-filling week, not infinity.' };
}

export async function pulseFor(artist: ArtistRow): Promise<Pulse> {
  const [signatures, chatter] = await Promise.all([signaturesFor(artist), chatterFor(artist).catch(() => ({ posts: [], week: 0, radio: 0, listings: 0, about: listenFor(artist), sources: ['Bluesky', 'Lemmy'], fetchedAt: Date.now() }))]);
  return { signatures, chatter, meter: meter(artist, signatures, chatter) };
}
