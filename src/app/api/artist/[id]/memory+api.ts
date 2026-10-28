import { forget, recall } from '@/server/gus/memory';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist } from '@/server/service';

/** What Gus remembers about this act. POST `{ forget: id }` strikes one. */
export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  return json({ memories: await recall(artist.id) });
});

export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'memory', 30);
  const artist = await requireArtist(id);
  const input = await body<{ forget?: string }>(req);
  if (!input.forget) throw new HttpError(400, 'forget is required.');
  return json({ memories: await forget(artist.id, input.forget) });
});
