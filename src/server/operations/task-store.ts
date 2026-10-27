import type { Transaction } from '@libsql/client';
import type { AgentTask } from '../../lib/agent-task';
import type { Opportunity } from '../../lib/operations';
import type { ArtistRow } from '../artists';
import { id } from '../crypto';
import { one, transaction } from '../db';
import { HttpError } from '../http';
import { cancelTaskAttention } from './attention';

export const agentTaskId = (showId: string) => `support:${showId}`;
export async function agentTaskFor(artistId: string, showId: string): Promise<AgentTask | null> {
  const r = await one<{ body: string }>('select body from ops_agent_tasks where artist_id = ? and opportunity_id = ?', [artistId, showId]);
  return r ? JSON.parse(r.body) : null;
}
async function saveTask(tx: Transaction, task: AgentTask) {
  await cancelTaskAttention(tx, task.id, task.artistId, task.updatedAt);
  await tx.execute({ sql: 'update ops_agent_tasks set state = ?, generation = ?, run_token = null, lease_until = null, body = ?, updated_at = ? where id = ? and artist_id = ?', args: [task.state, task.generation, JSON.stringify(task), task.updatedAt, task.id, task.artistId] });
}
/** Called inside the business transaction. A committed change always carries its wake.
 * Revoking the lease fences an old worker from overwriting a newer generation. */
export async function wakeAgentTask(tx: Transaction, show: Opportunity, reason: string, now: number, actionId?: string) {
  const r = await tx.execute({ sql: 'select body from ops_agent_tasks where artist_id = ? and opportunity_id = ?', args: [show.artistId, show.id] });
  if (!r.rows[0]) return;
  const task = JSON.parse(String(r.rows[0].body)) as AgentTask;
  task.version = show.version; task.generation++; task.updatedAt = now; task.attempts = 0;
  task.reason = reason; task.waitingFor = null; task.nextCheckAt = null;
  if (actionId) task.actionId = actionId;
  // Changes never unpause a job. Canceling the show does stop it, with receipts retained.
  if (show.status === 'canceled' || task.state !== 'paused') task.state = 'queued';
  await saveTask(tx, task);
}
export async function startAgentTask(artist: ArtistRow, showId: string, expectedVersion: number, policy: AgentTask['policy'] = 'balanced', now = Date.now()): Promise<AgentTask> {
  if (!artist.isDemo) throw new HttpError(403, 'Real operator authority is not connected.');
  return transaction(async tx => {
    const r = await tx.execute({ sql: 'select body from ops_opportunities where id = ? and artist_id = ?', args: [showId, artist.id] });
    if (!r.rows[0]) throw new HttpError(404, 'No show for this act.');
    const show = JSON.parse(String(r.rows[0].body)) as Opportunity;
    if (show.mode !== 'fixture' || show.version !== expectedVersion || show.status === 'canceled') throw new HttpError(409, 'Review the current active show first.');
    const prior = await tx.execute({ sql: 'select body from ops_agent_tasks where artist_id = ? and opportunity_id = ?', args: [artist.id, show.id] });
    if (prior.rows[0]) {
      const existing = JSON.parse(String(prior.rows[0].body)) as AgentTask;
      // Duplicate starts do not invalidate a live lease or cause another provider call.
      if (existing.state === 'running' || (existing.state === 'queued' && existing.policy === policy)) return existing;
      if (existing.policy !== policy) existing.actionId = null;
      existing.policy = policy; existing.state = 'queued'; existing.waitingFor = null; existing.nextCheckAt = null; existing.generation++; existing.attempts = 0; existing.updatedAt = now; existing.version = show.version; existing.reason = 'Operator resumed the bill job.';
      await saveTask(tx, existing); return existing;
    }
    const task: AgentTask = { id: agentTaskId(show.id), artistId: artist.id, opportunityId: show.id, goal: 'find-support', version: show.version, generation: 1, state: 'queued', waitingFor: null, actionId: null, policy, attempts: 0, nextCheckAt: null, reason: 'Qualify, compare and prepare one request. No send or payment authority.', createdAt: now, updatedAt: now };
    await tx.execute({ sql: 'insert into ops_agent_tasks(id, artist_id, opportunity_id, state, generation, body, updated_at) values(?, ?, ?, ?, ?, ?, ?)', args: [task.id, task.artistId, show.id, task.state, task.generation, JSON.stringify(task), now] });
    return task;
  });
}
export async function pauseAgentTask(artist: ArtistRow, showId: string, now = Date.now()) {
  if (!artist.isDemo) throw new HttpError(403, 'Real operator authority is not connected.');
  await transaction(async tx => {
    const r = await tx.execute({ sql: 'select body from ops_agent_tasks where artist_id = ? and opportunity_id = ?', args: [artist.id, showId] });
    if (!r.rows[0]) throw new HttpError(404, 'No Gus job for this show.');
    const task = JSON.parse(String(r.rows[0].body)) as AgentTask;
    task.state = 'paused'; task.generation++; task.updatedAt = now; task.reason = 'Paused by the operator. Existing actions and receipts retained.';
    await saveTask(tx, task);
  });
}
export const newRunToken = () => id('run_');
