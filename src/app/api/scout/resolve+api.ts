import { body, handler, json, limit } from '@/server/http';
import { parseAsk } from '@/server/gus/parse';
import { resolveCandidates } from '@/server/sound';

type In = { text?: string; names?: string[]; self?: string | null; kind?: 'music' | 'comedy' };

/**
 * Step 1 of Scout: parse the ask, then fetch confirm-sheet candidates for every act name.
 * Never auto-picks: fuzzy search can choose the wrong act ("Tenci" matched "Ten City").
 */
export const POST = handler(async (req: Request) => {
  await limit(req, 'resolve', 30);
  const input = await body<In>(req);
  const ask = input.text ? await parseAsk(input.text) : null;
  const kind = input.kind ?? ask?.kind ?? 'music';
  const self = input.self !== undefined ? input.self : (ask?.self ?? null);
  const names = (input.names?.length ? input.names : ask?.references ?? []).slice(0, 3);
  const lookups = [...(self ? [{ role: 'self' as const, name: self }] : []), ...names.map((n) => ({ role: 'reference' as const, name: n }))];
  const results = await Promise.all(
    lookups.map(async (l) => {
      const r = await resolveCandidates(l.name, kind, 'resolve');
      return { ...l, candidates: r.candidates.slice(0, 5), receipts: r.receipts };
    }),
  );
  return json({ ask, kind, lookups: results });
});
