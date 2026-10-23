import type { Region } from '@/lib/regions';
import type { DayKey } from '@/lib/types';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist, scoutFor } from '@/server/service';
import { withoutQloo } from '@/server/without-qloo';

type In = { focusCity: string; focusDay?: DayKey; regions?: Region[]; dates?: number; startDate?: string };

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'without-qloo', 10);
  const artist = await requireArtist(id);
  const input = await body<In>(req);
  if (!input.focusCity) throw new HttpError(400, 'focusCity is required.');
  const scout = await scoutFor(artist);
  return json(
    await withoutQloo({
      artist,
      scout,
      focusCity: input.focusCity,
      focusDay: input.focusDay ?? 'tuesday',
      regions: input.regions ?? [],
      dates: input.dates ?? 10,
      startDate: input.startDate ?? new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    }),
  );
});
