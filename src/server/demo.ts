/**
 * The judges' replay (demo artists only, FR-29). Puts one city back to where its poster was
 * before this week (the seeded demo signatures stay, everything since goes), then plays fans
 * signing until the city proves itself, so anyone can watch Gus go to work on his own: rooms
 * asked, an offer back, his card in Fan Mail. Every signature it adds is labeled demo data.
 */
import type { ArtistRow } from './artists';
import { cityCount, sign } from './claims';
import { deviceHash } from './crypto';
import { all, run } from './db';
import { HttpError } from './http';
import { posterState } from './service';
import { onSignature, type WatchOutcome } from './watcher';

const INITIALS = ['J.R.', 'M.K.', 'A.L.', 'T.S.', 'R.B.', 'C.D.', 'N.O.', 'E.V.', 'P.Q.', 'S.W.', 'L.M.', 'K.T.'];
const MAX_SEEDED = 200;
const MAX_ADDED = 80;

/** Clears what happened in a demo city since the seed: added signatures, deals, plans, notes, the draw. */
export async function resetDemoCity(artist: ArtistRow, city: string) {
  if (!artist.isDemo) throw new HttpError(403, 'Only demo artists can be replayed.');
  const seeded = new Set(Array.from({ length: MAX_SEEDED }, (_, i) => deviceHash(`demo-seed-${city}-${i}`)));
  const added = await all<{ id: string; device_hash: string }>('select id, device_hash from claims where artist_id = ? and city = ? and is_demo = 1', [artist.id, city]);
  for (const c of added) if (!seeded.has(c.device_hash)) await run('delete from claims where id = ?', [c.id]);
  const deals = await all<{ id: string }>('select id from deals where artist_id = ? and city = ?', [artist.id, city]);
  for (const d of deals) await run('delete from kv where key = ?', [`show:${artist.id}:${d.id}`]);
  for (const d of deals) await run("update deal_followups set state='canceled',run_token=null,lease_until=null,error='Demo reset; original test receipts retained',updated_at=? where artist_id=? and deal_id=?", [Date.now(),artist.id,d.id]);
  await run('delete from deals where artist_id = ? and city = ?', [artist.id, city]);
  await run('delete from gus_calls where artist_id = ? and city = ?', [artist.id, city]);
  await run('delete from gus_log where artist_id = ? and city = ?', [artist.id, city]);
  await run('delete from gus_inbox where artist_id = ? and evidence like ?', [artist.id, `%"city":"${city}"%`]);
  await run('update watcher_state set crossed = 0, last_fired_at = null where artist_id = ? and city = ?', [artist.id, city]);
  await run('delete from bounties where artist_id = ? and city = ?', [artist.id, city]);
}

/** Resets the city, then signs in small batches until Gus's watcher fires (or a cap is hit). */
export async function replayDemo(artist: ArtistRow, city: string): Promise<{ count: number; added: number; watch: WatchOutcome | null }> {
  await resetDemoCity(artist, city);
  const state = await posterState(artist.slug, city, null);
  const hoods = state.neighborhoods.slice(0, 8);
  let watch: WatchOutcome | null = null;
  let added = 0;
  while (added < MAX_ADDED) {
    for (let i = 0; i < 4; i++, added++) {
      // Signatures cluster in the predicted neighborhoods, like the real thing would.
      const h = hoods[Math.min(hoods.length - 1, Math.floor(Math.random() ** 2 * hoods.length))];
      await sign({
        artist: artist.id,
        city,
        neighborhood: h?.name ?? null,
        initials: INITIALS[Math.floor(Math.random() * INITIALS.length)],
        contact: null,
        deviceToken: `demo-sim-${Date.now()}-${added}-${Math.random()}`,
        ref: null,
        ip: '0.0.0.0',
        isDemo: true,
      });
    }
    watch = await onSignature(artist.id, city, { awaitChain: true });
    if (watch.fired) break;
  }
  return { count: await cityCount(artist.id, city), added, watch };
}
