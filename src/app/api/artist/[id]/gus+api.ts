import { AsrError, answer, transcribe, type GusTurn } from '@/server/gus/ask';
import { handler, HttpError, json, limit, ndjson } from '@/server/http';
import { requireArtist } from '@/server/service';

/**
 * Ask Gus: multipart with an `audio` file (hold-to-talk) or JSON `{ text }` (typed), plus
 * the screen the artist is on. With `?stream=1` the answer streams as NDJSON: what Gus heard,
 * each tool step as it starts and finishes, then the answer. Without it, one JSON answer.
 */
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  await limit(req, 'gus', 40);
  const artist = await requireArtist(id);
  let audio: File | null = null;
  let heard = '';
  let screen: string | null = null;
  let history: GusTurn[] = [];
  const turns = (v: unknown) => (Array.isArray(v) ? v.slice(-3).filter((t) => t && typeof t === 'object') : []) as GusTurn[];
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('multipart/form-data')) {
    // React Native's FormData typing has no getter; the server runtime's does.
    const form = (await req.formData()) as unknown as { get(k: string): File | string | null };
    screen = (form.get('screen') as string | null) ?? null;
    try {
      history = turns(JSON.parse(String(form.get('history') ?? '[]')));
    } catch {}
    const a = form.get('audio');
    if (a && typeof a !== 'string') {
      if (a.size > 4_000_000) throw new HttpError(413, 'That was a long one. Keep it under a minute.');
      audio = a;
    } else heard = String(form.get('text') ?? '');
  } else {
    const b = (await req.json()) as { text?: string; screen?: string; history?: unknown };
    history = turns(b.history);
    heard = (b.text ?? '').slice(0, 400);
    screen = b.screen ?? null;
  }
  const hear = async () => {
    if (!audio) return heard;
    try {
      return await transcribe(audio);
    } catch (e) {
      if (e instanceof AsrError) throw new HttpError(502, e.message);
      throw e;
    }
  };
  if (new URL(req.url).searchParams.get('stream') === '1') {
    return ndjson(async (send) => {
      const text = await hear();
      send({ type: 'heard', text });
      // Raw lookup results stay on the server; the app gets each step's one-line summary.
      await answer(artist, text, screen, (e) => e.type !== 'looked' && send(e), history);
    });
  }
  return json(await answer(artist, await hear(), screen, undefined, history));
});
