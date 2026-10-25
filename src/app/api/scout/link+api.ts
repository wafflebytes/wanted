import { body, handler, HttpError, json, limit } from '@/server/http';
import { matchToQloo, resolveLink, type LinkResult } from '@/server/link';

/**
 * Paste-your-link, in two passes. `{ text }` identifies the act (fast). `{ match }` pins it and
 * its sound-alikes to Qloo (slow; the app runs it while the artist checks their card).
 */
export const POST = handler(async (req: Request) => {
  await limit(req, 'link', 40);
  const input = await body<{ text?: string; match?: { name: string; spotifyId: string | null; similar: LinkResult['similar'] } }>(req);
  if (input.match) return json(await matchToQloo(input.match));
  const text = (input.text ?? '').trim().slice(0, 300);
  if (!text) throw new HttpError(400, 'Paste a link or type your name.');
  const r = await resolveLink(text);
  if (!r) throw new HttpError(404, "Gus couldn't read that link. Try your Spotify link, or just type your name.");
  return json(r);
});
