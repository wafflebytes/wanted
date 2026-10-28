import { body, handler, HttpError, json, limit } from '@/server/http';
import { pickedNights, setNight, suggestNights } from '@/server/nights';
import { metroById } from '@/server/score';
import { requireArtist } from '@/server/service';

/**
 * Which night each city's venues get asked for. GET returns the picked ones; `?city=` adds the
 * night he'd ask for now and three to pick from. POST `{ city, date }` picks one (null clears).
 */
export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const city = new URL(req.url).searchParams.get('city');
  const picked = await pickedNights(artist.id);
  if (!city || !metroById(city)) return json({ picked });
  return json({ picked, ...(await suggestNights(artist, city)) });
});

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'nights', 30);
  const artist = await requireArtist(id);
  const input = await body<{ city?: string; date?: string | null }>(req);
  if (!input.city || !metroById(input.city)) throw new HttpError(400, 'city is required.');
  const was = await setNight(artist.id, input.city, input.date ?? null);
  return json({ ok: true, was });
});
