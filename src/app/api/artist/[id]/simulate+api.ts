import { body, handler, json, limit } from '@/server/http';
import { requireArtist, simulateFans } from '@/server/service';

/**
 * Demo artists only: simulate fans signing a poster, labeled demo data everywhere
 * (FR-29). Lets the 90-second demo run on one laptop.
 */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'simulate', 20);
  const artist = await requireArtist(id);
  const input = await body<{ city: string; n?: number }>(req);
  return json(await simulateFans(artist, input.city, input.n ?? 5));
});
