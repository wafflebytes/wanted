/**
 * The Bounty (FR-23d): one signer per city meets the artist at soundcheck.
 *
 * Every signature is an entry: 1 for signing, 1 more for a Deputy, 1 more per friend who
 * signed with your link (up to 3). The draw is provably fair: when the poster goes up, a
 * random secret is sealed and only its SHA-256 is shown. At the draw, the snapshot (signature
 * numbers and entry counts, no identities) is hashed, the winning ticket is
 * sha256(secret:snapshotHash) mod total, and the secret is revealed so anyone can recompute it.
 * Free to enter; the odds come from entries, never money.
 */
import type { ArtistRow } from './artists';
import { config } from './config';
import { secretHex, sha256 } from './crypto';
import { all, one, run } from './db';
import { log } from './logbook';
import { metroById } from './score';
import { postInbox } from './inbox';

const MAX_FRIEND_ENTRIES = 3;

type Row = {
  artist_id: string;
  city: string;
  secret: string;
  commit_hash: string;
  prize: string;
  status: 'open' | 'drawn';
  snapshot: string | null;
  snapshot_hash: string | null;
  ticket: number | null;
  total: number | null;
  winner_claim_id: string | null;
  winner_number: number | null;
  drawn_by: string | null;
  drawn_at: number | null;
  created_at: number;
};

export type BountyEntry = { claimId: string; number: number; entries: number; deputy: boolean; friends: number; deviceHash: string };

export type BountyView = {
  prize: string;
  status: 'open' | 'drawn';
  /** SHA-256 of the sealed secret, shown since the poster went up. */
  commit: string;
  signers: number;
  totalEntries: number;
  rules: string;
  mine: { entries: number; deputy: boolean; friends: number } | null;
  drawn: {
    at: number;
    by: 'artist' | 'gus';
    winner: { number: number; initials: string; neighborhood: string | null };
    mineWon: boolean;
    /** Everything needed to recompute the draw. */
    proof: { secret: string; snapshotHash: string; snapshot: string; ticket: number; total: number };
  } | null;
};

const prizeFor = (artist: ArtistRow) => `Meet ${artist.name.split(' ')[0]} at soundcheck, plus a spot on the guest list.`;

/** Creates the city's Bounty (and seals its secret) the first time anyone looks. */
export async function ensureBounty(artist: ArtistRow, city: string): Promise<Row> {
  const existing = await one<Row>('select * from bounties where artist_id = ? and city = ?', [artist.id, city]);
  if (existing) return existing;
  const secret = secretHex();
  await run('insert into bounties(artist_id, city, secret, commit_hash, prize, created_at) values(?, ?, ?, ?, ?, ?) on conflict(artist_id, city) do nothing', [
    artist.id,
    city,
    secret,
    sha256(secret),
    prizeFor(artist),
    Date.now(),
  ]);
  return (await one<Row>('select * from bounties where artist_id = ? and city = ?', [artist.id, city]))!;
}

/** Entries per signature, in signature-number order. Demo signatures count only for a demo artist. */
export async function bountyEntries(artist: ArtistRow, city: string): Promise<BountyEntry[]> {
  const rows = await all<{ id: string; number: number; ref_code: string; device_hash: string; friends: number }>(
    `select c.id, c.number, c.ref_code, c.device_hash,
       (select count(*) from claims f where f.referrer = c.ref_code and f.artist_id = c.artist_id and f.city = c.city ${artist.isDemo ? '' : 'and f.is_demo = 0'}) as friends
     from claims c where c.artist_id = ? and c.city = ? ${artist.isDemo ? '' : 'and c.is_demo = 0'} order by c.number`,
    [artist.id, city],
  );
  return rows.map((r) => {
    const deputy = r.number <= config.proof.deputyLimit;
    const friends = Math.min(MAX_FRIEND_ENTRIES, Number(r.friends));
    return { claimId: r.id, number: Number(r.number), entries: 1 + (deputy ? 1 : 0) + friends, deputy, friends, deviceHash: r.device_hash };
  });
}

/** The public record of a draw: one "number:entries" line per signature. */
export function snapshotOf(entries: Pick<BountyEntry, 'number' | 'entries'>[]): string {
  return entries.map((e) => `${e.number}:${e.entries}`).join('\n');
}

/** Picks the winning signature number. Pure, so anyone (and the evals) can recompute it. */
export function pickWinner(secret: string, snapshot: string, round = 0): { number: number; ticket: number; total: number; snapshotHash: string } | null {
  const lines = snapshot.split('\n').filter(Boolean).map((l) => l.split(':').map(Number) as [number, number]);
  const total = lines.reduce((s, [, n]) => s + n, 0);
  if (!total) return null;
  const snapshotHash = sha256(snapshot);
  const ticket = Number(BigInt(`0x${sha256(`${secret}:${snapshotHash}${round ? `:${round}` : ''}`)}`) % BigInt(total));
  let acc = 0;
  for (const [number, n] of lines) {
    acc += n;
    if (ticket < acc) return { number, ticket, total, snapshotHash };
  }
  return null;
}

export async function bountyView(artist: ArtistRow, city: string, deviceHash: string | null): Promise<BountyView> {
  const b = await ensureBounty(artist, city);
  const entries = await bountyEntries(artist, city);
  const me = deviceHash ? entries.find((e) => e.deviceHash === deviceHash) : null;
  let drawn: BountyView['drawn'] = null;
  if (b.status === 'drawn' && b.winner_number !== null) {
    const w = await one<{ signer_initials: string | null; neighborhood: string | null; device_hash: string }>(
      'select signer_initials, neighborhood, device_hash from claims where artist_id = ? and city = ? and number = ?',
      [artist.id, city, b.winner_number],
    );
    drawn = {
      at: b.drawn_at ?? b.created_at,
      by: b.drawn_by === 'gus' ? 'gus' : 'artist',
      winner: { number: b.winner_number, initials: w?.signer_initials ?? 'A fan', neighborhood: w?.neighborhood ?? null },
      mineWon: !!deviceHash && w?.device_hash === deviceHash,
      proof: { secret: b.secret, snapshotHash: b.snapshot_hash ?? '', snapshot: b.snapshot ?? '', ticket: b.ticket ?? 0, total: b.total ?? 0 },
    };
  }
  return {
    prize: b.prize,
    status: b.status,
    commit: b.commit_hash,
    signers: entries.length,
    totalEntries: entries.reduce((s, e) => s + e.entries, 0),
    rules: 'Free, one per person. Signing gets you a chance. A Deputy badge gets you another, and so does each friend who signs with your link (up to 3).',
    mine: me ? { entries: me.entries, deputy: me.deputy, friends: me.friends } : null,
    drawn,
  };
}

/**
 * Draws the city's Bounty. Runs once: a drawn Bounty returns its existing result. `by` is who
 * pressed it: the artist, or Gus when the hold for this city was paid.
 */
export async function drawBounty(artist: ArtistRow, city: string, by: 'artist' | 'gus'): Promise<BountyView> {
  const b = await ensureBounty(artist, city);
  if (b.status === 'drawn') return bountyView(artist, city, null);
  const entries = await bountyEntries(artist, city);
  const snapshot = snapshotOf(entries);
  const pick = pickWinner(b.secret, snapshot);
  if (!pick) return bountyView(artist, city, null);
  const winner = entries.find((e) => e.number === pick.number)!;
  const now = Date.now();
  // Guarded on status so two presses can't draw twice.
  await run(
    `update bounties set status = 'drawn', snapshot = ?, snapshot_hash = ?, ticket = ?, total = ?, winner_claim_id = ?, winner_number = ?, drawn_by = ?, drawn_at = ?
     where artist_id = ? and city = ? and status = 'open'`,
    [snapshot, pick.snapshotHash, pick.ticket, pick.total, winner.claimId, winner.number, by, now, artist.id, city],
  );
  const view = await bountyView(artist, city, null);
  const metro = metroById(city);
  const w = view.drawn?.winner;
  if (w) {
    await log(artist.id, {
      kind: 'bounty',
      city,
      title: `Picked the fan who meets you in ${metro?.name ?? city}: #${w.number}${w.neighborhood ? ` from ${w.neighborhood}` : ''}`,
      detail: 'A fair draw, locked before anyone signed.',
      source: by === 'gus' ? 'gus' : 'artist',
      level: 1,
    });
    await postInbox(artist.id, {
      kind: 'info',
      body: `${by === 'gus' ? 'The date’s locked in, so I picked your Bounty winner. ' : ''}Fan #${w.number}${w.neighborhood ? ` from ${w.neighborhood}` : ''} meets you at soundcheck in ${metro?.name ?? city}. I’ve asked the venue for their +1.${artist.isDemo ? ' (Demo data.)' : ''}`,
      action: { label: 'See the Bounty', kind: 'bounty', city },
      evidence: { city, winnerNumber: w.number, total: pick.total, signers: entries.length, commit: b.commit_hash },
      createdAt: now,
    });
  }
  return view;
}
