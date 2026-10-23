import type { DayKey } from '@/lib/types';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { pitchFor, requireArtist } from '@/server/service';

type In = { city: string; roomId?: string | null; date?: { date: string; day: DayKey } | null };

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'pitch', 20);
  const artist = await requireArtist(id);
  const input = await body<In>(req);
  if (!input.city) throw new HttpError(400, 'city is required.');
  return json(await pitchFor(artist, input.city, input.roomId ?? null, input.date ?? null));
});
