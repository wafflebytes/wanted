import type { ShowStep } from '@/lib/types';
import { body, handler, json, limit } from '@/server/http';
import { dealsFor } from '@/server/deals';
import { HttpError } from '@/server/http';
import { requireArtist } from '@/server/service';
import { decideStep, makeShowPlan, showPlanFor } from '@/server/showplan';

/** Gus's plan for filling a held date's room. `?deal=` picks the show; the plan is made on first look. */
export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const dealId = new URL(req.url).searchParams.get('deal') ?? '';
  const existing = await showPlanFor(artist.id, dealId);
  if (existing) return json({ plan: existing });
  const deal = (await dealsFor(artist.id)).find((d) => d.id === dealId);
  if (!deal) throw new HttpError(404, 'No such show.');
  return json({ plan: await makeShowPlan(artist, deal) });
});

/** `{ deal, step, yes }`: the artist's answer on one step. */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'show', 30);
  const artist = await requireArtist(id);
  const input = await body<{ deal: string; step: ShowStep['id']; yes: boolean }>(req);
  if (typeof input.yes !== 'boolean' || typeof input.deal !== 'string' || !['first-dibs', 'posters', 'podcast', 'opener', 'ads'].includes(input.step)) throw new HttpError(400, 'An exact deal, step and boolean decision are required.');
  return json({ plan: await decideStep(artist, input.deal, input.step, input.yes) });
});
