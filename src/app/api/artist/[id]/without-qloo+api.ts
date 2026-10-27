import type { Region } from '@/lib/regions';
import type { DayKey } from '@/lib/types';
import { kvGet, kvSet } from '@/server/db';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist, scoutFor } from '@/server/service';
import { withoutQloo, type WithoutQlooReport } from '@/server/without-qloo';

const DAY = 86_400_000;

type In = { focusCity: string; focusDay?: DayKey; regions?: Region[]; dates?: number; startDate?: string };

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'without-qloo', 10);
  const artist = await requireArtist(id);
  const input = await body<In>(req);
  if (!input.focusCity) throw new HttpError(400, 'focusCity is required.');
  // Three model samples per answer: keep a city's comparison for a day so a busy demo stays in budget.
  const plain = !input.regions?.length && !input.focusDay && !input.dates && !input.startDate;
  const key = `wq:${artist.id}:${input.focusCity}`;
  const kept = plain ? await kvGet<{ at: number; report: WithoutQlooReport }>(key) : null;
  if (kept && Date.now() - kept.at < DAY) return json({ ...kept.report, cachedAt: kept.at });
  const scout = await scoutFor(artist);
  const report = await withoutQloo({
    artist,
    scout,
    focusCity: input.focusCity,
    focusDay: input.focusDay ?? 'tuesday',
    regions: input.regions ?? [],
    dates: input.dates ?? 10,
    startDate: input.startDate ?? new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
  });
  if (plain) await kvSet(key, { at: Date.now(), report });
  return json(report);
});
