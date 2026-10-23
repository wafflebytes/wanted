import { handler, json } from '@/server/http';
import { artistState, requireArtist } from '@/server/service';

export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  return json(await artistState(artist));
});
