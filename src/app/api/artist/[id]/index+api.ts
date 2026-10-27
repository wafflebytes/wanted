import { handler, json } from '@/server/http';
import { artistState, requireArtist } from '@/server/service';
import { tick } from '@/server/ambient';

export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  await tick(artist);
  return json(await artistState(artist));
});
