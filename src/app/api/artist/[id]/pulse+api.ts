import { handler, json, limit } from '@/server/http';
import { pulseFor } from '@/server/pulse';
import { requireArtist } from '@/server/service';

/** Pulse: live signatures, public chatter and the Wanted Meter. */
export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'pulse', 120);
  const artist = await requireArtist(id);
  return json(await pulseFor(artist));
});
