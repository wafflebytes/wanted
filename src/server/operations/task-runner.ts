/** One bounded attempt per wake. No request waits on a human and no detached promise
 * owns work. Business effects remain inside exact approved executor contracts. */
import type { AgentTask } from '../../lib/agent-task';
import { currentEvidence, qualify } from '../../lib/operations';
import type { ArtistRow } from '../artists';
import { getArtist } from '../artists';
import { id } from '../crypto';
import { all, transaction } from '../db';
import { HttpError } from '../http';
import { redact } from '../env';
import { runPressure } from './fixture';
import { deskFor, executeAction, prepareAction } from './store';
import { planTaskWithModel, TaskAgentFailure, type ModelOptions } from './task-agent';
import { agentTaskFor, newRunToken } from './task-store';
import { queueTaskAttention } from './attention';

const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 3;
type RunnerOptions = { now?: number; rank?: typeof runPressure; model?: ModelOptions; requireLlm?: boolean };
export async function runAgentTask(artist: ArtistRow, showId: string, opts: RunnerOptions = {}): Promise<AgentTask | null> {
  if (!artist.isDemo) throw new HttpError(403, 'Real operator authority is not connected.');
  const now = opts.now ?? Date.now();
  const token = newRunToken();
  const claimed = await transaction(async tx => {
    const r = await tx.execute({ sql: 'select body, lease_until from ops_agent_tasks where artist_id = ? and opportunity_id = ?', args: [artist.id, showId] });
    if (!r.rows[0]) return null;
    const task = JSON.parse(String(r.rows[0].body)) as AgentTask;
    const reclaim = task.state === 'running' && Number(r.rows[0].lease_until ?? 0) <= now;
    const waitDue = task.state === 'waiting' && typeof task.nextCheckAt === 'number' && task.nextCheckAt <= now;
    if (!(task.state === 'queued' || task.state === 'failed' || reclaim || waitDue)) return null;
    if (waitDue) { task.generation++; task.attempts = 0; }
    if (task.attempts >= MAX_ATTEMPTS) {
      task.state = 'failed'; task.waitingFor = null; task.reason = 'Retry budget exhausted. Explicit operator resume required.'; task.updatedAt = now;
      await tx.execute({ sql: 'update ops_agent_tasks set state = ?, run_token = null, lease_until = null, body = ?, updated_at = ? where id = ? and artist_id = ?', args: [task.state, JSON.stringify(task), now, task.id, artist.id] });
      return null;
    }
    task.state = 'running'; task.attempts++; task.nextCheckAt = null; task.updatedAt = now;
    await tx.execute({ sql: 'update ops_agent_tasks set state = ?, generation = ?, run_token = ?, lease_until = ?, body = ?, updated_at = ? where id = ? and artist_id = ?', args: [task.state, task.generation, token, now + LEASE_MS, JSON.stringify(task), now, task.id, artist.id] });
    return task;
  });
  if (!claimed) return agentTaskFor(artist.id, showId);
  const task = claimed;
  const finish = async (state: AgentTask['state'], waitingFor: AgentTask['waitingFor'], reason: string, actionId: string | null = null, nextCheckAt: number | null = null) => {
    task.state = state; task.waitingFor = waitingFor; task.nextCheckAt = nextCheckAt; task.reason = reason; task.actionId = actionId; task.updatedAt = opts.now ?? Date.now();
    await transaction(async tx => {
      const saved = await tx.execute({ sql: 'update ops_agent_tasks set state = ?, run_token = null, lease_until = null, body = ?, updated_at = ? where id = ? and artist_id = ? and generation = ? and run_token = ?', args: [state, JSON.stringify(task), task.updatedAt, task.id, artist.id, task.generation, token] });
      if (!saved.rowsAffected) return; // A newer event or pause owns the task now.
      await queueTaskAttention(tx, task, task.updatedAt);
      const eventId = id('oe_');
      const event = { id: eventId, opportunityId: showId, version: task.version, kind: 'agent-progress', detail: reason, createdAt: task.updatedAt, task: { id: task.id, state, waitingFor, actionId } };
      await tx.execute({ sql: 'insert into ops_events(id, artist_id, opportunity_id, source_key, body, created_at) values(?, ?, ?, ?, ?, ?)', args: [eventId, artist.id, showId, `${task.id}:g${task.generation}:attempt${task.attempts}`, JSON.stringify(event), task.updatedAt] });
    });
    return agentTaskFor(artist.id, showId);
  };
  if (!opts.rank && opts.now === undefined) {
    try {
      const planned = await planTaskWithModel(artist, task, { taskId: task.id, generation: task.generation, token }, opts.model);
      task.execution = planned.execution;
      const out = planned.outcome; return finish(out.state, out.waitingFor, out.reason, out.actionId, out.nextCheckAt);
    } catch (error) {
      const attempt = error instanceof TaskAgentFailure ? error.execution : null;
      task.execution = { engine: opts.requireLlm ? (attempt?.models.length ? 'llm' : 'unavailable') : 'rules', modelFallbacks: attempt?.modelFallbacks ?? [], models: attempt?.models ?? [], providerModels: attempt?.providerModels ?? [], cached: attempt?.cached ?? false, latencyMs: attempt?.latencyMs ?? 0, steps: attempt?.steps ?? [], failure: attempt?.failure ?? redact(String(error)).slice(0, 300) };
      if (opts.requireLlm) return finish('failed', null, 'Real model-directed execution failed its evidence/tool gate. Rules fallback is not a passing LLM evaluation.');
    }
  } else task.execution = { engine: 'rules', models: [], cached: false, latencyMs: 0, steps: [], failure: 'Explicit deterministic test clock or injected ranking.' };
  try {
    let desk = await deskFor(artist.id, showId);
    if (!desk) return finish('canceled', null, 'Show removed. No new action.');
    task.version = desk.opportunity.version;
    // Recovery precedes cancellation/version checks: a historical receipt cannot be unsent.
    for (const action of desk.actions.filter(a => a.state === 'uncertain')) {
      await executeAction(artist, action.id, 'reconcile', { now });
    }
    desk = (await deskFor(artist.id, showId))!;
    const show = desk.opportunity;
    if (show.status === 'canceled') return finish('canceled', null, 'Show canceled. Pending work stopped; any original receipts recovered and kept.');
    const currentReceipt = desk.actions.find(a => a.version === show.version && a.receipt);
    if (currentReceipt) return finish('waiting', 'reply', 'One request saved in the test inbox. Waiting for a counterparty reply; no agreement inferred.', currentReceipt.id);
    const oldReceipt = desk.actions.find(a => a.version !== show.version && a.receipt);
    if (oldReceipt) return finish('waiting', 'follow-up', 'Show changed after a saved request. Historical receipt retained. Operator must choose a follow-up; no replacement sent.', oldReceipt.id);
    const chosen = desk.actions.find(a => a.id === task.actionId && a.version === show.version && ['prepared', 'approved'].includes(a.state));
    if (chosen) {
      const candidate = show.roster.find(c => c.id === chosen.candidateId);
      if (candidate && qualify(candidate, show, now).status === 'eligible') return finish('waiting', chosen.state === 'approved' && chosen.approval && chosen.approval.expiresAt > now ? 'save' : 'approval', 'Current chosen request retained. Review its exact terms; no automatic delivery.', chosen.id, Math.min(...[candidate.availability, candidate.fee, candidate.intake].map(e => e!.expiresAt), chosen.approval && chosen.approval.expiresAt > now ? chosen.approval.expiresAt : Infinity));
    }
    const qualifications = show.roster.map(c => qualify(c, show, now));
    if (!qualifications.some(q => q.status === 'eligible')) {
      const dateMissing = qualifications.some(q => q.reasons.includes('Performance availability not confirmed for this date'));
      return finish('waiting', dateMissing ? 'availability' : 'evidence', dateMissing ? 'Date-specific availability is missing. No automatic reconfirmation, recommendation or request.' : 'No qualified candidate. Missing facts or hard constraints need an operator; taste cannot override them.');
    }
    if (!currentEvidence(show.sceneEvidence, now, show.mode) || !show.scene.length || !show.act.length) return finish('waiting', 'evidence', 'Required cultural context is missing or expired. Ask the operator before any new taste lookup; no automatic source reconfirmation.');
    let pressure = desk.pressure;
    if (!pressure || pressure.policyName !== task.policy || now - pressure.observedAt >= 86_400_000 || !currentEvidence(show.sceneEvidence, now, show.mode)) pressure = await (opts.rank ?? runPressure)(artist, task.policy, showId);
    if (pressure.version !== show.version) throw new HttpError(409, 'Show changed during ranking.');
    if (pressure.views.act.error || pressure.views.scene.error) return finish('waiting', 'evidence', 'Required cultural evidence is unavailable. No invented winner or zero score.');
    if (!pressure.selectedId) return finish('waiting', 'choice', 'No unique defensible choice under the bill rule. An operator can choose an eligible option or change context.');
    const selected = show.roster.find(c => c.id === pressure.selectedId);
    if (!selected || qualify(selected, show, now).status !== 'eligible') throw new HttpError(409, 'Selected candidate is not currently qualified.');
    const action = await prepareAction(artist, showId, selected.id, show.version, opts.now ?? Date.now(), { taskId: task.id, generation: task.generation, token });
    return finish('waiting', action.state === 'approved' && action.approval && action.approval.expiresAt > now ? 'save' : 'approval', `${selected.name}: compared against your sound and scene; exact ${action.payload.date}, $${action.payload.amount} USD request prepared. Approval does not deliver or authorize payment.`, action.id, Math.min(selected.availability!.expiresAt, selected.fee!.expiresAt, selected.intake!.expiresAt, action.approval && action.approval.expiresAt > now ? action.approval.expiresAt : Infinity));
  } catch (error) {
    // Safe redacted error, no raw reply/provider payloads or secrets in user task state.
    return finish('failed', null, `Check did not finish: ${redact(String(error)).slice(0, 240)}. No success claimed; resume revalidates current records.`);
  }
}
export async function drainAgentTasks(limit = 10, options: { budgetMs?: number } = {}) {
  const deadline = Date.now() + Math.max(1000, Math.min(240_000, options.budgetMs ?? 210_000));
  const rows = await all<{ artist_id: string; opportunity_id: string }>("select artist_id, opportunity_id from ops_agent_tasks where state = 'queued' or (state = 'failed' and json_extract(body, '$.attempts') < 3) or (state = 'running' and lease_until <= ?) or (state = 'waiting' and json_extract(body, '$.nextCheckAt') <= ?) order by updated_at limit ?", [Date.now(), Date.now(), Math.max(1, Math.min(50, limit))]);
  let progressed = 0, attempted = 0;
  for (const row of rows) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    const artist = await getArtist(row.artist_id);
    if (!artist?.isDemo) continue;
    attempted++;
    const task = await runAgentTask(artist, row.opportunity_id, { model: { budgetMs: Math.min(90_000, remaining) } });
    if (task && task.state !== 'failed' && task.state !== 'running' && task.state !== 'queued') progressed++;
  }
  return { attempted, progressed, remainingQueued: rows.length - attempted };
}
