import type { Mandate } from '@/lib/types';
import { body, handler, json, limit } from '@/server/http';
import { logbook } from '@/server/logbook';
import { mandateFor, setMandate } from '@/server/mandate';
import { requireArtist } from '@/server/service';

/** Gus's Logbook and the mandate he works under (what he may do without asking). */
export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const [entries, mandate] = await Promise.all([logbook(artist.id), mandateFor(artist.id)]);
  return json({ entries, mandate });
});

/** `{ mandate }` changes what Gus may do unasked. */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'mandate', 30);
  const artist = await requireArtist(id);
  const input = await body<{ mandate?: Partial<Mandate> }>(req);
  return json({ mandate: await setMandate(artist.id, input.mandate ?? {}) });
});
