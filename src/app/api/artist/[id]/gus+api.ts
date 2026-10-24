import { AsrError, answer, transcribe } from '@/server/gus/ask';
import { handler, HttpError, json, limit } from '@/server/http';
import { requireArtist } from '@/server/service';

/**
 * Ask Gus: multipart with an `audio` file (hold-to-talk) or JSON `{ text }` (typed), plus
 * the screen the artist is on. Returns what Gus heard, his reply and at most one action.
 */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'gus', 40);
  const artist = await requireArtist(id);
  let heard = '';
  let screen: string | null = null;
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('multipart/form-data')) {
    // React Native's FormData typing has no getter; the server runtime's does.
    const form = (await req.formData()) as unknown as { get(k: string): File | string | null };
    screen = (form.get('screen') as string | null) ?? null;
    const audio = form.get('audio');
    if (audio && typeof audio !== 'string') {
      if (audio.size > 4_000_000) throw new HttpError(413, 'That was a long one. Keep it under a minute.');
      try {
        heard = await transcribe(audio);
      } catch (e) {
        if (e instanceof AsrError) throw new HttpError(502, e.message);
        throw e;
      }
    } else heard = String(form.get('text') ?? '');
  } else {
    const b = (await req.json()) as { text?: string; screen?: string };
    heard = (b.text ?? '').slice(0, 400);
    screen = b.screen ?? null;
  }
  return json(await answer(artist, heard, screen));
});
