import { handler, json } from '@/server/http';
import { crowdFor, requireArtist } from '@/server/service';

export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const city = new URL(req.url).searchParams.get('city');
  return json(await crowdFor(artist, city));
});
