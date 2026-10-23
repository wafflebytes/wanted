import { getCookie, handler, json } from '@/server/http';
import { posterState } from '@/server/service';

export const GET = handler(async (req: Request, { artist, city }: Record<string, string>) => {
  const token = getCookie(req, 'wtd');
  return json(await posterState(artist, city, token));
});
