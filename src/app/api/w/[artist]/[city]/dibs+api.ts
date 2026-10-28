import { holdDibs } from '@/server/dibs';
import { body, getCookie, handler, json } from '@/server/http';
import { requireArtist } from '@/server/service';

/** A signer holds first-dibs tickets for their city's show (POST { tickets }). Their own signature only, by device cookie. */
export const POST = handler(async (req: Request, { artist, city }: Record<string, string>) => {
  const a = await requireArtist(artist);
  const { tickets } = await body<{ tickets?: number }>(req);
  return json({ tickets: await holdDibs(a.id, city, getCookie(req, 'wtd'), tickets ?? 0) });
});
