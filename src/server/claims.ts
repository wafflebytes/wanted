/**
 * Signatures (stored as claims) and proof ratios (FR-19 to FR-23b, PRD 4.2).
 *
 * Privacy line: neighborhoods, contacts and device hashes live only here. Nothing in this
 * file is ever passed to Qloo or to an LLM; Gus's watcher receives aggregate counts only.
 */
import type { CityProof, ClaimView } from '../lib/types';
import { config } from './config';
import { deviceHash, encrypt, id, ipHash } from './crypto';
import { all, one, run } from './db';
import { getArtist, openedCities, type ArtistRow } from './artists';
import { metroById } from './score';

export class ClaimError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

export function wearLevel(count: number): 0 | 1 | 2 | 3 {
  const [a, b, c] = config.proof.batteredAt;
  return count >= c ? 3 : count >= b ? 2 : count >= a ? 1 : 0;
}

function cleanInitials(raw: string | null | undefined): string {
  const s = (raw ?? '').normalize('NFKC').replace(/[^\p{L}\p{N} .'-]/gu, '').trim();
  return s.slice(0, 18) || 'A fan';
}

/** Fixed-window rate limit. Returns false when over the limit. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const window = Math.floor(Date.now() / windowMs);
  await run(
    `insert into rate_limits(key, win, count) values(?, ?, 1)
     on conflict(key, win) do update set count = count + 1`,
    [key, window],
  );
  const row = await one<{ count: number }>('select count from rate_limits where key = ? and win = ?', [key, window]);
  if (Math.random() < 0.02) await run('delete from rate_limits where win < ?', [window - 5]);
  return (row?.count ?? 0) <= limit;
}

export type SignInput = {
  artist: string; // slug or id
  city: string; // metro id
  neighborhood: string | null;
  initials: string | null;
  contact: string | null;
  deviceToken: string;
  ref: string | null;
  ip: string;
  isDemo?: boolean;
  createdAt?: number;
};

export type SignResult = {
  claim: ClaimView & { refCode: string; earlyAccess: boolean };
  alreadySigned: boolean;
  count: number;
  wear: 0 | 1 | 2 | 3;
  artist: Pick<ArtistRow, 'id' | 'slug' | 'name'>;
};

export async function sign(input: SignInput): Promise<SignResult> {
  const artist = await getArtist(input.artist);
  if (!artist) throw new ClaimError('No poster for that artist.', 404, 'artist');
  const metro = metroById(input.city);
  const opened = (await openedCities(artist.id)).find((c) => c.city === input.city);
  if (!metro || !opened) throw new ClaimError('This city has no WANTED poster yet.', 404, 'city');

  if (!input.isDemo) {
    // PRD 16.8: bursts above 20 per minute from one IP are throttled.
    const ok = await rateLimit(`sign:${ipHash(input.ip)}`, 20, 60_000);
    if (!ok) throw new ClaimError('Easy, partner. Too many signatures from this connection. Try again in a minute.', 429, 'rate');
  }

  const dev = deviceHash(input.deviceToken);
  const existing = await one<ClaimRaw>('select * from claims where artist_id = ? and city = ? and device_hash = ?', [
    artist.id,
    input.city,
    dev,
  ]);
  if (existing) {
    const count = await cityCount(artist.id, input.city);
    return { claim: toView(existing), alreadySigned: true, count, wear: wearLevel(count), artist };
  }

  const neighborhood = input.neighborhood?.trim().slice(0, 80) || null;
  const claimId = id('c_');
  const refCode = id('r').slice(0, 9);
  // The signature number is assigned inside the insert so concurrent signers can't share one.
  await run(
    `insert into claims(id, artist_id, city, neighborhood, device_hash, referrer, ref_code, contact_enc, signer_initials, font, number, is_demo, ip_hash, created_at)
     select ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce(max(number), 0) + 1, ?, ?, ? from claims where artist_id = ? and city = ?`,
    [
      claimId,
      artist.id,
      input.city,
      neighborhood,
      dev,
      input.ref?.slice(0, 16) ?? null,
      refCode,
      input.contact?.trim() ? encrypt(input.contact.trim().slice(0, 200)) : null,
      cleanInitials(input.initials),
      Math.floor(Math.random() * 3),
      input.isDemo ? 1 : 0,
      ipHash(input.ip),
      input.createdAt ?? Date.now(),
      artist.id,
      input.city,
    ],
  );

  // Bring-a-friend (FR-23): when a signer's referral link brings 2 friends, they get early access.
  if (input.ref) {
    const friends = await one<{ n: number }>('select count(*) as n from claims where referrer = ? and artist_id = ?', [input.ref, artist.id]);
    if ((friends?.n ?? 0) >= config.proof.friendsForEarlyAccess) {
      await run('update claims set early_access = 1 where ref_code = ? and artist_id = ?', [input.ref, artist.id]);
    }
  }

  const raw = (await one<ClaimRaw>('select * from claims where id = ?', [claimId]))!;
  const count = await cityCount(artist.id, input.city);
  return { claim: toView(raw), alreadySigned: false, count, wear: wearLevel(count), artist };
}

type ClaimRaw = {
  id: string;
  city: string;
  neighborhood: string | null;
  number: number;
  signer_initials: string | null;
  font: number;
  created_at: number;
  is_demo: number;
  ref_code: string;
  early_access: number;
};

function toView(r: ClaimRaw): ClaimView & { refCode: string; earlyAccess: boolean } {
  return {
    number: r.number,
    neighborhood: r.neighborhood,
    city: r.city,
    deputy: r.number <= config.proof.deputyLimit,
    initials: r.signer_initials ?? 'A fan',
    font: r.font,
    createdAt: r.created_at,
    isDemo: !!r.is_demo,
    refCode: r.ref_code,
    earlyAccess: !!r.early_access,
  };
}

export async function claimByDevice(artistId: string, city: string, deviceToken: string) {
  const r = await one<ClaimRaw>('select * from claims where artist_id = ? and city = ? and device_hash = ?', [
    artistId,
    city,
    deviceHash(deviceToken),
  ]);
  if (!r) return null;
  const friends = await one<{ n: number }>('select count(*) as n from claims where referrer = ? and artist_id = ?', [r.ref_code, artistId]);
  return { ...toView(r), friends: friends?.n ?? 0 };
}

export async function claimByNumber(artistId: string, city: string, number: number) {
  const r = await one<ClaimRaw>('select * from claims where artist_id = ? and city = ? and number = ?', [artistId, city, number]);
  return r ? toView(r) : null;
}

export async function cityCount(artistId: string, city: string): Promise<number> {
  const r = await one<{ n: number }>('select count(*) as n from claims where artist_id = ? and city = ?', [artistId, city]);
  return r?.n ?? 0;
}

export async function recentSignatures(artistId: string, city: string, limit = 24): Promise<ClaimView[]> {
  const rows = await all<ClaimRaw>(
    'select * from claims where artist_id = ? and city = ? order by number desc limit ?',
    [artistId, city, limit],
  );
  return rows.map(toView);
}

/**
 * Proof per opened city. Proof ratio = the city's share of the artist's signatures divided
 * by its share of Qloo heat across opened cities. Needs 2+ opened cities. Compares shares,
 * never headcounts, because Qloo never predicts headcounts.
 */
export async function proofFor(artistId: string, opts: { includeDemo: boolean }): Promise<CityProof[]> {
  const cities = await openedCities(artistId);
  const counts = await all<{ city: string; n: number; demo: number }>(
    'select city, count(*) as n, sum(is_demo) as demo from claims where artist_id = ? group by city',
    [artistId],
  );
  const hoods = await all<{ city: string; neighborhood: string | null; n: number }>(
    `select city, neighborhood, count(*) as n from claims where artist_id = ? ${opts.includeDemo ? '' : 'and is_demo = 0'}
     group by city, neighborhood order by n desc`,
    [artistId],
  );
  const byCity = new Map(counts.map((c) => [c.city, c]));
  const counted = (c: string) => {
    const row = byCity.get(c);
    if (!row) return 0;
    return opts.includeDemo ? row.n : row.n - (row.demo ?? 0);
  };
  const total = cities.reduce((s, c) => s + counted(c.city), 0);
  return cities.map((c) => {
    const row = byCity.get(c.city);
    const signatures = counted(c.city);
    const share = total > 0 ? signatures / total : null;
    const ratio = share !== null && c.heatShare ? share / c.heatShare : null;
    return {
      city: c.city,
      signatures,
      realSignatures: (row?.n ?? 0) - (row?.demo ?? 0),
      demoSignatures: row?.demo ?? 0,
      signatureShare: share === null ? null : Math.round(share * 1000) / 1000,
      heatShare: c.heatShare === null ? null : Math.round(c.heatShare * 1000) / 1000,
      ratio: ratio === null ? null : Math.round(ratio * 100) / 100,
      wear: wearLevel((row?.n ?? 0)),
      neighborhoods: hoods.filter((h) => h.city === c.city && h.neighborhood).map((h) => ({ name: h.neighborhood!, count: h.n })),
      crossed: signatures >= config.proof.minSignatures && ratio !== null && ratio >= config.proof.ratioThreshold,
    };
  });
}
