import { body, handler, json } from '@/server/http';
import { requireArtist } from '@/server/service';
import { inbox, markRead } from '@/server/inbox';

export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  return json({ messages: await inbox(artist.id) });
});

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const input = await body<{ read?: string | 'all' }>(req);
  await markRead(artist.id, input.read === 'all' ? undefined : input.read);
  return json({ ok: true });
});
