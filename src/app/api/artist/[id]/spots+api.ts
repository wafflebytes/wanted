import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist } from '@/server/service';
import { pinnedSpots, pinSpots, type Spot } from '@/server/spots';

/** Where each city's posters go up: GET every pinned spot, POST `{ city, spots }` to replace a city's (empty clears). */
export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  return json({ spots: await pinnedSpots(artist.id) });
});

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'spots', 30);
  const artist = await requireArtist(id);
  const input = await body<{ city?: string; spots?: Spot[] }>(req);
  if (!input.city) throw new HttpError(400, 'city is required.');
  const was = await pinSpots(artist.id, input.city, Array.isArray(input.spots) ? input.spots : []);
  return json({ ok: true, was });
});
