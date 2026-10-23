import { body, handler, HttpError, limit } from '@/server/http';
import { speak, VoiceError, type GusMood } from '@/server/voice';

/** Gus's voice: one of his own lines in, MP3 out (cached). */
export const POST = handler(async (req: Request) => {
  await limit(req, 'voice', 30);
  const input = await body<{ text: string; mood?: GusMood }>(req);
  if (!input.text || input.text.length > 300) throw new HttpError(400, 'text must be 1 to 300 characters.');
  try {
    const out = await speak(input.text, input.mood ?? 'idle');
    return new Response(new Uint8Array(out.audio), {
      headers: {
        'Content-Type': out.mime,
        'Cache-Control': 'private, max-age=86400',
        'X-Voice-Model': out.model,
        'X-Voice-Cached': String(out.cached),
      },
    });
  } catch (err) {
    if (err instanceof VoiceError) throw new HttpError(503, err.message);
    throw err;
  }
});
