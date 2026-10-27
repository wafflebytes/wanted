import { answerCall, checkIn } from '@/server/calls';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist } from '@/server/service';

/**
 * The artist's app checks in here (GET, with the local hour so quiet hours are theirs, not the
 * server's). Gus climbs the escalation ladder and returns the call ringing now, if any.
 * POST `{ call, action }` picks up, declines, or answers yes or no.
 */
export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const rawHour = new URL(req.url).searchParams.get('hour');
  const h = rawHour === null ? NaN : Number(rawHour);
  return json({ call: await checkIn(artist, Number.isInteger(h) && h >= 0 && h < 24 ? h : null) });
});

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'call', 30);
  const artist = await requireArtist(id);
  const input = await body<{ call?: string; action?: 'pickup' | 'decline' | 'yes' | 'no' }>(req);
  if (!input.call || !input.action || !['pickup', 'decline', 'yes', 'no'].includes(input.action)) throw new HttpError(400, 'call and action are required.');
  return json(await answerCall(artist, input.call, input.action));
});
