import { body, handler, HttpError, json, limit } from '@/server/http';
import { advanceDeal, decideDeal, dealsFor, limitsFor, setLimits, startDeal } from '@/server/deals';
import { requireArtist } from '@/server/service';
import { env } from '@/server/env';

/** Date holds Gus negotiated with rooms' booking agents, and the limits he works within. */
export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const [deals, limits] = await Promise.all([dealsFor(artist.id), limitsFor(artist.id)]);
  return json({ deals, limits, rail: env.stripeTestKey ? 'stripe-test' : 'sandbox' });
});

type In = { city?: string; roomId?: string | null; deal?: string; yes?: boolean; next?: number; limits?: { maxDeposit?: number; minSplit?: number } };

/** `{ city, roomId? }` sends Gus to ask; `{ deal, next }` takes the next turn; `{ deal, yes }` is the artist's call; `{ limits }` changes them. */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'deals', 30);
  const artist = await requireArtist(id);
  const input = await body<In>(req);
  if (input.limits) return json({ limits: await setLimits(artist.id, input.limits) });
  if (input.deal && typeof input.next === 'number') return json({ deal: await advanceDeal(artist, input.deal, input.next) });
  if (input.deal) return json({ deal: await decideDeal(artist, input.deal, !!input.yes) });
  if (!input.city) throw new HttpError(400, 'city is required.');
  return json({ deal: await startDeal(artist, input.city, input.roomId ?? null) });
});
