import { handler, json } from '@/server/http';
import { artistState, requireArtist } from '@/server/service';

/** The act. Gus's background work catches up on the deals read (deals+api.ts), not here, so this stays fast. */
export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  return json(await artistState(artist));
});
