import { handler, json } from '@/server/http';
import { cityData, requireArtist } from '@/server/service';

export const GET = handler(async (req: Request, { id, city }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const wait = new URL(req.url).searchParams.get('wait') === '1';
  return json(await cityData(artist, city, wait));
});
