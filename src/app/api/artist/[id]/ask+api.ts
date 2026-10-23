import { askGus } from '@/server/gus/ask';
import { body, handler, HttpError, json, limit } from '@/server/http';
import { requireArtist } from '@/server/service';

/** Talk to Gus: one spoken or typed turn in, his reply, the steps he took and the app actions out. */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'ask', 60);
  const artist = await requireArtist(id);
  const input = await body<{ text: string }>(req);
  const text = String(input.text ?? '').slice(0, 400);
  if (!text.trim()) throw new HttpError(400, 'Say something to Gus.');
  return json(await askGus(artist, text));
});
