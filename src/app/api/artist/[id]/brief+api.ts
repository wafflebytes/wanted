/** Cookie-isolated, redacted preparation only. No effect/approval endpoint exists here. */
import { z } from 'zod';
import { briefExport, briefSchema } from '@/lib/operator-brief';
import { getCookie, handler, HttpError, json, limit, setCookie } from '@/server/http';
import { id as randomId } from '@/server/crypto';
import { requireArtist } from '@/server/service';
import { searchActs } from '@/server/qloo/api';
import { briefId, getBrief, saveBrief, startBriefTask, validateBriefEntities } from '@/server/operations/operator-brief';
import { pauseAgentTask } from '@/server/operations/task-store';
import { runAgentTask } from '@/server/operations/task-runner';
const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('search'), query: z.string().trim().min(2).max(120) }).strict(),
  z.object({ kind: z.literal('save'), version: z.number().int().min(0), brief: briefSchema }).strict(),
  z.object({ kind: z.literal('start'), version: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('pause') }).strict(),
  z.object({ kind: z.literal('export'), version: z.number().int().positive() }).strict(),
]);
const cookieName = (artistId: string) => `wanted_brief_${artistId}`;
const tokenFor = (req: Request, artistId: string) => {
  const token = getCookie(req, cookieName(artistId));
  return token && /^[a-zA-Z0-9_-]{12,40}$/.test(token) ? token : null;
};
export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const token = tokenFor(req, artist.id);
  return json(await getBrief(artist, token ? briefId(artist.id, token) : null));
});
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  if (!artist.isDemo) throw new HttpError(403, 'Real operator login is not connected. Use the isolated demo preparation sandbox.');
  if (Number(req.headers.get('content-length') ?? 0) > 30000) throw new HttpError(413, 'Keep the brief short and redacted.');
  const raw = await req.text();
  if (raw.length > 30000) throw new HttpError(413, 'Keep the brief short and redacted.');
  let parsedBody: unknown;
  try { parsedBody = JSON.parse(raw); } catch { throw new HttpError(400, 'Expected a JSON body.'); }
  const parsed = schema.safeParse(parsedBody);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid reviewed brief.');
  const input = parsed.data;
  await limit(req, input.kind === 'search' || input.kind === 'start' || input.kind === 'save' ? 'operator-brief-query' : 'operator-brief-state', input.kind === 'search' ? 30 : 20);
  if (input.kind === 'search') {
    if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){9,}/i.test(input.query)) throw new HttpError(400, 'Search a public act name, not private contact details.');
    const result = await searchActs(input.query, 'artist', `artist:${artist.id}`, 6);
    if (result.receipt.stale) throw new HttpError(409, 'Qloo search is stale. Try again before selecting a match.');
    return json({ matches: result.data.map(e => ({ id: e.id, name: e.name, description: e.description, disambiguation: e.disambiguation })), receipt: result.receipt });
  }
  let token = tokenFor(req, artist.id);
  const fresh = !token;
  if (!token && input.kind !== 'save') throw new HttpError(403, 'Save your own preparation brief first.');
  token ??= randomId('');
  const showId = briefId(artist.id, token);
  let saved;
  if (input.kind === 'save') {
    const validated = await validateBriefEntities(artist, input.brief);
    saved = await saveBrief(artist, showId, validated, input.version);
    // A committed revision wakes an existing job. The bounded worker is restart-safe.
    await runAgentTask(artist, showId);
  } else if (input.kind === 'start') {
    await startBriefTask(artist, showId, input.version);
    await runAgentTask(artist, showId);
  } else if (input.kind === 'pause') await pauseAgentTask(artist, showId);
  else if (input.kind === 'export') {
    const current = await getBrief(artist, showId);
    if (!current.desk || current.desk.opportunity.version !== input.version) throw new HttpError(409, 'Brief changed. Review the current revision before exporting.');
    return json({ version: input.version, markdown: briefExport(current.desk) });
  }
  return json({ ...await getBrief(artist, showId), ...(saved ? { saved } : {}) }, fresh ? { headers: { 'Set-Cookie': setCookie(cookieName(artist.id), token, 7) } } : {});
});
