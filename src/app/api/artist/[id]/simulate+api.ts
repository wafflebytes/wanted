import { sign } from '@/server/claims';
import { ageHold } from '@/server/deals';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist } from '@/server/service';
import { onSignature } from '@/server/watcher';
import { posterState } from '@/server/service';

const INITIALS = ['J.R.', 'M.K.', 'A.L.', 'T.S.', 'R.B.', 'C.D.', 'N.O.', 'E.V.', 'P.Q.', 'S.W.', 'L.M.', 'K.T.'];

/**
 * Demo artists only: simulate fans signing a poster, labeled demo data everywhere
 * (FR-29). Lets the 90-second demo run on one laptop.
 */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'simulate', 20);
  const artist = await requireArtist(id);
  if (!artist.isDemo) throw new HttpError(403, 'Simulation is only for demo artists.');
  const input = await body<{ city: string; n?: number; action?: 'hold-expiring' }>(req);
  // The video's "hold expires tonight" beat: the waiting hold now runs out in under 3 hours.
  if (input.action === 'hold-expiring') return json({ deal: await ageHold(artist, 2.8) });
  const state = await posterState(artist.slug, input.city, null);
  const hoods = state.neighborhoods.slice(0, 8);
  const n = Math.max(1, Math.min(60, input.n ?? 5));
  let last = null;
  for (let i = 0; i < n; i++) {
    // Signatures cluster in the predicted neighborhoods, like the real thing would.
    const h = hoods[Math.min(hoods.length - 1, Math.floor(Math.random() ** 2 * hoods.length))];
    last = await sign({
      artist: artist.id,
      city: input.city,
      neighborhood: h?.name ?? null,
      initials: INITIALS[Math.floor(Math.random() * INITIALS.length)],
      contact: null,
      deviceToken: `demo-sim-${Date.now()}-${i}-${Math.random()}`,
      ref: null,
      ip: '0.0.0.0',
      isDemo: true,
    });
  }
  // The demo waits for Gus's chain so the next beat (his card, his call) is already there.
  const watch = await onSignature(artist.id, input.city, { awaitChain: true });
  return json({ count: last?.count ?? state.count, watch });
});
