/**
 * Crowd Card (FR-13 to FR-17). Everything here is the act's crowd, not the city's, except
 * the pre-show hang spots, which are city-specific.
 *
 * Demographics are skews from -1 to 1 per entity, never shares: copy says "skews 25 to 34",
 * never "40% are 25 to 29".
 */
import type { ActEntity, Receipt, Room, Sound, TasteItem, VibeTag } from '../lib/types';
import { compare, crossDomain, demographics, hangSpots, openers, vibeTags } from './qloo/api';

export type SkewBar = { key: string; label: string; skew: number };

export type CrowdCard = {
  who: { age: SkewBar[]; gender: SkewBar[]; line: string | null } | null;
  love: { shows: TasteItem[]; brands: TasteItem[]; podcasts: TasteItem[] };
  vibe: VibeTag[];
  openers: (ActEntity & { shared: { name: string; score: number }[] })[];
  hang: { neighborhood: string; spots: Pick<Room, 'id' | 'name' | 'address' | 'neighborhood' | 'description' | 'website'>[] } | null;
  receipts: Receipt[];
};

const AGE_LABELS: Record<string, string> = {
  '24_and_younger': 'Under 25',
  '25_to_29': '25 to 29',
  '30_to_34': '30 to 34',
  '35_to_44': '35 to 44',
  '45_to_54': '45 to 54',
  '55_and_older': '55 and up',
};

/** "skews 25 to 34": the contiguous run of positive-skew age bands. Never a percentage. */
export function skewLine(age: SkewBar[], gender: SkewBar[]): string | null {
  const pos = age.filter((a) => a.skew > 0.1);
  if (!pos.length) return null;
  const idx = pos.map((p) => age.findIndex((a) => a.key === p.key));
  const first = age[Math.min(...idx)];
  const last = age[Math.max(...idx)];
  let ageText: string;
  if (first.key === last.key) ageText = `skews ${first.label.toLowerCase()}`;
  else if (first.key === '24_and_younger') ageText = last.key === '55_and_older' ? 'skews all ages' : `skews under ${Number(last.label.split(' to ')[1]) + 1}`;
  else if (last.key === '55_and_older') ageText = `skews ${first.label.split(' to ')[0]} and up`;
  else ageText = `skews ${first.label.split(' to ')[0]} to ${last.label.split(' to ')[1]}`;
  const g = gender.find((x) => Math.abs(x.skew) >= 0.2 && x.skew > 0);
  return g ? `${ageText}, leans ${g.label.toLowerCase()}` : ageText;
}

export function averageSkews(rows: { age: Record<string, number>; gender: Record<string, number> }[]) {
  const avg = (pick: (r: (typeof rows)[number]) => Record<string, number>, keys: string[]) =>
    keys.map((k) => {
      const vals = rows.map((r) => pick(r)[k]).filter((v): v is number => typeof v === 'number');
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    });
  const ageKeys = Object.keys(AGE_LABELS);
  const ages = avg((r) => r.age, ageKeys);
  const genders = avg((r) => r.gender, ['female', 'male']);
  const age: SkewBar[] = ageKeys.map((k, i) => ({ key: k, label: AGE_LABELS[k], skew: Math.round(ages[i] * 100) / 100 }));
  const gender: SkewBar[] = [
    { key: 'female', label: 'Women', skew: Math.round(genders[0] * 100) / 100 },
    { key: 'male', label: 'Men', skew: Math.round(genders[1] * 100) / 100 },
  ];
  return { age, gender };
}

export async function crowdCard(
  sound: Sound,
  opts: { topNeighborhood?: string | null; cityQuery?: string | null; scope?: string },
): Promise<CrowdCard> {
  const receipts: Receipt[] = [];
  const keep = <T,>(r: { data: T; receipt: Receipt } | null): T | null => {
    if (!r) return null;
    receipts.push(r.receipt);
    return r.data;
  };
  const safe = <T,>(p: Promise<{ data: T; receipt: Receipt }>) => p.catch(() => null);
  const soft = sound.entities;

  const [demo, tv, movies, brands, pods, vibe, opens] = await Promise.all([
    safe(demographics(soft, opts.scope)),
    safe(crossDomain(soft, 'tv_show', opts.scope, 4)),
    safe(crossDomain(soft, 'movie', opts.scope, 3)),
    safe(crossDomain(soft, 'brand', opts.scope, 4)),
    safe(crossDomain(soft, 'podcast', opts.scope, 4)),
    safe(vibeTags(soft, opts.scope)),
    safe(openers(soft, sound.kind === 'comedy' ? 'person' : 'artist', opts.scope)),
  ]);

  const demoRows = keep(demo);
  const who = demoRows?.length
    ? (() => {
        const { age, gender } = averageSkews(demoRows);
        return { age, gender, line: skewLine(age, gender) };
      })()
    : null;

  const tvItems = keep(tv) ?? [];
  const movieItems = keep(movies) ?? [];
  const shows = [...tvItems.slice(0, 2), ...movieItems.slice(0, 1)];
  if (shows.length < 3) shows.push(...tvItems.slice(2, 2 + 3 - shows.length));

  const openerList = (keep(opens) ?? []).filter((o) => o.popularity > 0).slice(0, 3);
  const withShared = await Promise.all(
    openerList.map(async (o) => {
      const c = await compare(
        soft.map((s) => s.id),
        [o.id],
        opts.scope,
      ).catch(() => null);
      if (c) receipts.push(c.receipt);
      return { ...o, shared: c?.data.slice(0, 3).map((t) => ({ name: t.name, score: t.score })) ?? [] };
    }),
  );

  let hang: CrowdCard['hang'] = null;
  if (opts.topNeighborhood && opts.cityQuery) {
    const h = keep(await safe(hangSpots(soft, opts.topNeighborhood, opts.cityQuery, opts.scope)));
    if (h?.length) {
      hang = {
        neighborhood: opts.topNeighborhood,
        spots: h
          .filter((s) => !s.isClosed)
          .slice(0, 3)
          .map(({ id, name, address, neighborhood, description, website }) => ({ id, name, address, neighborhood, description, website })),
      };
    }
  }

  return {
    who,
    love: { shows: shows.slice(0, 3), brands: (keep(brands) ?? []).slice(0, 3), podcasts: (keep(pods) ?? []).slice(0, 3) },
    vibe: (keep(vibe) ?? []).slice(0, 8),
    openers: withShared,
    hang,
    receipts,
  };
}
