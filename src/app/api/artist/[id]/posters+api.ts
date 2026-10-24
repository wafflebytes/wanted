import { markPlayed } from '@/server/artists';
import { drawBounty } from '@/server/bounty';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { openPoster, requireArtist } from '@/server/service';

type In = { city: string; action?: 'open' | 'played' | 'draw'; venue?: string | null };

/** Open a city's WANTED poster, mark the show played (the CAUGHT LIVE stamp), or draw its Bounty. */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'posters', 30);
  const artist = await requireArtist(id);
  const input = await body<In>(req);
  if (!input.city) throw new HttpError(400, 'city is required.');
  if (input.action === 'draw') return json({ bounty: await drawBounty(artist, input.city, 'artist') });
  if (input.action === 'played') {
    await markPlayed(artist.id, input.city, input.venue?.slice(0, 120) ?? null);
    return json({ ok: true });
  }
  return json(await openPoster(artist, input.city));
});
