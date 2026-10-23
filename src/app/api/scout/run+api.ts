import type { SoundEntity } from '@/lib/types';
import { upsertArtist } from '@/server/artists';
import { scoutAgent } from '@/server/gus/agent';
import { body, handler, HttpError, limit, ndjson } from '@/server/http';
import { mapData, rememberScout } from '@/server/service';

type In = {
  artistName: string;
  artistId?: string;
  self: SoundEntity | null;
  refs: SoundEntity[];
  kind: 'music' | 'comedy';
  text?: string;
  roomBand?: 'small' | 'mid' | 'big';
  homeBase?: string | null;
};

/**
 * Step 2 of Scout, streamed as NDJSON: Gus's tool calls and progress lines arrive as they
 * happen (the ~6 s country heat call plays as theater, never a bare spinner), then the result.
 */
export const POST = handler(async (req: Request) => {
  await limit(req, 'scout', 12);
  const input = await body<In>(req);
  if (!input.self && !input.refs?.length) throw new HttpError(400, 'Confirm at least one act.');
  const clean = (e: SoundEntity) => ({ id: String(e.id), name: String(e.name).slice(0, 80) });
  return ndjson(async (send) => {
    send({ type: 'progress', text: 'Gus is reading the taste graph...' });
    const run = await scoutAgent({
      self: input.self ? clean(input.self) : null,
      refs: (input.refs ?? []).slice(0, 3).map(clean),
      kind: input.kind === 'comedy' ? 'comedy' : 'music',
      constraintsText: input.text ?? '',
      roomBand: input.roomBand ?? 'small',
      scope: 'scout',
      emit: (e) => send(e),
    });
    rememberScout(run.result);
    const artist = await upsertArtist({
      id: input.artistId,
      name: (input.artistName || input.self?.name || 'New act').slice(0, 60),
      kind: input.kind === 'comedy' ? 'comedy' : 'music',
      sound: run.result.sound,
      imageUrl: null,
      homeBase: input.homeBase ?? null,
      roomBand: input.roomBand ?? 'small',
    });
    const map = await mapData(artist);
    send({
      type: 'result',
      artist: { id: artist.id, slug: artist.slug, name: artist.name, kind: artist.kind, isDemo: artist.isDemo },
      line: run.line,
      picks: run.picks,
      steps: run.steps,
      model: run.model,
      violations: run.violations,
      notices: run.result.notices,
      map,
    });
  });
});
