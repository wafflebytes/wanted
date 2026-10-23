import { handler, json } from '@/server/http';
import { traceFor } from '@/server/qloo/client';
import { requireArtist } from '@/server/service';

/** "How Gus used Qloo" (FR-27): every call for this artist, params without the key. */
export const GET = handler(async (_req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const [mine, scout] = await Promise.all([traceFor(`artist:${artist.id}`, 300), traceFor('scout', 100)]);
  const calls = [...mine, ...scout].sort((a, b) => b.at - a.at);
  return json({ calls });
});
