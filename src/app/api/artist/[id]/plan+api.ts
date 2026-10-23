import type { Region } from '@/lib/regions';
import type { TourConstraints } from '@/lib/types';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { loadPlan, planFor, requireArtist, type PlanAction } from '@/server/service';

type In = { constraints: TourConstraints & { regions: Region[]; excluded?: string[] }; action?: PlanAction };

export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  return json({ plan: await loadPlan(artist.id) });
});

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'plan', 40);
  const artist = await requireArtist(id);
  const input = await body<In>(req);
  const c = input.constraints;
  if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(c.startDate ?? '')) throw new HttpError(400, 'constraints.startDate must be yyyy-mm-dd.');
  const constraints = {
    ...c,
    dates: Math.max(5, Math.min(20, Number(c.dates) || 10)),
    roomBand: (['small', 'mid', 'big'] as const).includes(c.roomBand) ? c.roomBand : 'small',
    regions: (c.regions ?? []).filter((r): r is Region => ['midwest', 'east', 'northeast', 'south', 'west'].includes(r)),
  };
  return json({ plan: await planFor(artist, constraints, input.action ?? { kind: 'new' }) });
});
