/** Public demo fixture only. No real inbox, artist authority or delivery is implied. */
import { z } from 'zod';
import { body, handler, HttpError, json, limit, getCookie, setCookie } from '@/server/http';
import { id as randomId } from '@/server/crypto';
import { requireArtist } from '@/server/service';
import { deskId, ensureFixture, reconfirmFixture, runPressure, resetFixture, setFixtureScene, checkSensitivity } from '@/server/operations/fixture';
import { approveAction, deskFor, executeAction, ingestReply, payloadHash, prepareAction } from '@/server/operations/store';

const inputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('init') }).strict(),
  z.object({ kind: z.literal('agent-start'), version: z.number().int().positive(), policy: z.enum(['balanced', 'strict']).optional() }).strict(),
  z.object({ kind: z.literal('agent-pause') }).strict(),
  z.object({ kind: z.literal('agent-resume'), version: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('reset') }).strict(),
  z.object({ kind: z.literal('scene'), version: z.number().int().positive(), context: z.enum(['left-field', 'indie']) }).strict(),
  z.object({ kind: z.literal('sensitivity') }).strict(),
  z.object({ kind: z.literal('rank'), policy: z.enum(['balanced', 'strict']).optional() }).strict(),
  z.object({ kind: z.literal('reconfirm'), version: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('prepare'), candidateId: z.string().min(1).max(100), version: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('approve'), actionId: z.string().min(1), version: z.number().int().positive(), payloadHash: z.string().min(1), yes: z.literal(true) }).strict(),
  z.object({ kind: z.literal('execute'), actionId: z.string().min(1), token: z.string().min(1), loseAcknowledgment: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal('reply'), sourceMessageId: z.string().min(1).max(150), contactId: z.string().min(1), version: z.number().int().positive(), patch: z.object({ date: z.string().optional(), maxFee: z.number().optional(), canceled: z.boolean().optional() }).strict() }).strict(),
]);
import { agentTaskFor, startAgentTask, pauseAgentTask } from '@/server/operations/task-store';
import { runAgentTask } from '@/server/operations/task-runner';
import { kvGet } from '@/server/db';
import type { SensitivityReport } from '@/lib/operations';
const cookieName = (artistId: string) => `wanted_desk_${artistId}`;
const instance = (req: Request, artistId: string) => {
  const token = getCookie(req, cookieName(artistId));
  return token && /^[a-zA-Z0-9_-]{12,40}$/.test(token) ? token : null;
};
const response = async (artistId: string, showId: string | null, cookie?: string, reply?: { duplicate: boolean; version: number; noChange?: boolean }) => {
  const desk = showId ? await deskFor(artistId, showId) : null;
  const sensitivity = showId ? await kvGet<SensitivityReport>(`sensitivity:${artistId}:${showId}`) : null;
  const task = showId ? await agentTaskFor(artistId, showId) : null;
  return json({ desk, task, reply: reply ?? null, sensitivity: sensitivity?.version === desk?.opportunity.version ? sensitivity : null, hashes: Object.fromEntries((desk?.actions ?? []).map((a) => [a.id, payloadHash(a)])) }, cookie ? { headers: { 'Set-Cookie': cookie } } : {});
};
export const GET = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  const token = instance(req, artist.id);
  return response(artist.id, token ? `${deskId(artist.id)}:${token}` : null);
});
export const POST = handler(async (req: Request, { id }: Record<string, string>) => {
  const artist = await requireArtist(id);
  if (!artist.isDemo) throw new HttpError(403, 'Fixture inbox only. Real operator authentication is not configured.');
  const parsed = inputSchema.safeParse(await body<unknown>(req));
  if (!parsed.success) throw new HttpError(400, 'Invalid action. Exact version, scope and typed terms are required.');
  const input = parsed.data;
  // Query budget is separate from local fixture approval/reply edits.
  const expensive = ['init', 'rank', 'scene', 'sensitivity', 'agent-start', 'agent-resume'].includes(input.kind);
  await limit(req, expensive ? 'desk-query' : 'desk-state', expensive ? 20 : 60);
  let token = instance(req, artist.id);
  if (!token && input.kind !== 'init') throw new HttpError(403, 'Open your own fixture case before acting.');
  const fresh = !token;
  token ??= randomId('');
  const showId = `${deskId(artist.id)}:${token}`;
  if ('actionId' in input) {
    const desk = await deskFor(artist.id, showId);
    if (!desk?.actions.some((a) => a.id === input.actionId)) throw new HttpError(403, 'Action is outside your fixture case.');
  }
  let replyResult: Awaited<ReturnType<typeof ingestReply>> | undefined;
  switch (input.kind) {
    case 'agent-start': await startAgentTask(artist, showId, input.version, input.policy); break;
    case 'agent-resume': { const task = await agentTaskFor(artist.id, showId); await startAgentTask(artist, showId, input.version, task?.policy); break; }
    case 'agent-pause': await pauseAgentTask(artist, showId); break;
    case 'scene': await setFixtureScene(artist, showId, input.version, input.context); break;
    case 'sensitivity': await checkSensitivity(artist, showId); break;
    case 'reset': await resetFixture(artist, showId); break;
    case 'init': await ensureFixture(artist, showId); break;
    case 'rank': await runPressure(artist, input.policy, showId); break;
    case 'reconfirm': await reconfirmFixture(artist, input.version, showId); break;
    case 'prepare': await prepareAction(artist, showId, input.candidateId, input.version); break;
    case 'approve': await approveAction(artist, input.actionId, input.version, input.payloadHash); break;
    case 'execute': await executeAction(artist, input.actionId, input.token, { loseAcknowledgment: input.loseAcknowledgment }); break;
    case 'reply': replyResult = await ingestReply(artist, showId, { sourceMessageId: input.sourceMessageId, contactId: input.contactId, expectedVersion: input.version, patch: input.patch }); break;
  }
  // The transaction queued the wake. This bounded attempt is an optimization; the
  // durable queue retains work if this process ends before finishing. No detached run.
  if (input.kind !== 'agent-pause' && input.kind !== 'reset') await runAgentTask(artist, showId);
  return response(artist.id, showId, fresh ? setCookie(cookieName(artist.id), token, 7) : undefined, replyResult);
});
