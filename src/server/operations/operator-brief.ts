/** Isolated, operator-asserted preparation sandbox. No real login, delivery or payment. */
import type { ArtistRow } from '../artists';
import type { AgentTask } from '../../lib/agent-task';
import { briefOpportunity, canonicalBrief, entityIds, type BriefResponse, type OperatorBrief } from '../../lib/operator-brief';
import type { BookingAction, OperationEvent, PressureTest } from '../../lib/operations';
import { id, stableHash } from '../crypto';
import { kvGet, transaction } from '../db';
import { HttpError } from '../http';
import { entitiesByIds } from '../qloo/api';
import { deskFor } from './store';
import { agentTaskFor, agentTaskId, wakeAgentTask } from './task-store';
import { cancelTaskAttention } from './attention';

export const briefId = (artistId: string, token: string) => `brief:${artistId}:${token}`;
const metadataKey = (artistId: string, showId: string) => `operator-brief:${artistId}:${showId}`;
function authority(artist: ArtistRow, showId?: string) {
  if (!artist.isDemo) throw new HttpError(403, 'This is a preparation sandbox under the demo act. Real operator login is not connected.');
  if (showId && (!showId.startsWith(`brief:${artist.id}:`) || !/^[a-zA-Z0-9_-]{1,40}$/.test(showId.slice(`brief:${artist.id}:`.length)))) throw new HttpError(403, 'Brief is outside this preparation scope.');
}
export async function validateBriefEntities(artist: ArtistRow, brief: OperatorBrief): Promise<OperatorBrief> {
  authority(artist);
  if (brief.format !== 'music' || brief.roster.some(c => c.format !== 'music')) throw new HttpError(400, 'This supplied-roster comparison currently supports music acts only. Comedy needs a separately verified person-ranking path.');
  const result = await entitiesByIds(entityIds(brief), `artist:${artist.id}`);
  if (result.receipt.stale) throw new HttpError(409, 'Qloo identity evidence is stale. Resolve the names again before saving.');
  if (result.data.some(e => e.type !== 'artist')) throw new HttpError(400, 'Select music-artist matches for this brief.');
  try { return canonicalBrief(brief, result.data); }
  catch { throw new HttpError(400, 'A selected Qloo entity could not be confirmed. Search and select its match again.'); }
}
export async function getBrief(artist: ArtistRow, showId: string | null): Promise<BriefResponse> {
  authority(artist, showId ?? undefined);
  if (!showId) return { desk: null, task: null, brief: null };
  const [desk, task, meta] = await Promise.all([deskFor(artist.id, showId), agentTaskFor(artist.id, showId), kvGet<{ brief: OperatorBrief; hash: string }>(metadataKey(artist.id, showId))]);
  if (desk && desk.opportunity.mode !== 'operator') throw new HttpError(403, 'This case is not an operator preparation brief.');
  return { desk, task, brief: meta?.brief ?? null };
}
/** Exact revisions and atomic invalidation/wake. Repeated identical saves are no-ops. */
export async function saveBrief(artist: ArtistRow, showId: string, brief: OperatorBrief, expectedVersion: number, now = Date.now()): Promise<BriefResponse['saved']> {
  authority(artist, showId);
  const hash = stableHash(brief);
  return transaction(async tx => {
    const r = await tx.execute({ sql: 'select body from ops_opportunities where id = ? and artist_id = ?', args: [showId, artist.id] });
    const existing = r.rows[0] ? JSON.parse(String(r.rows[0].body)) : null;
    if (existing && existing.mode !== 'operator') throw new HttpError(403, 'Preparation scope mismatch.');
    const m = await tx.execute({ sql: 'select value from kv where key = ?', args: [metadataKey(artist.id, showId)] });
    const meta = m.rows[0] ? JSON.parse(String(m.rows[0].value)) : null;
    // A lost save acknowledgment may retry the exact preceding revision, not overwrite newer work.
    if (existing && meta?.hash === hash && (expectedVersion === existing.version || expectedVersion === existing.version - 1)) return 'unchanged';
    if ((existing?.version ?? 0) !== expectedVersion) throw new HttpError(409, 'Brief changed. Reload it before saving another revision.');
    const show = briefOpportunity(artist.id, showId, expectedVersion + 1, brief, now);
    await tx.execute({ sql: 'insert into ops_opportunities(id, artist_id, version, body, updated_at) values(?, ?, ?, ?, ?) on conflict(id) do update set version=excluded.version, body=excluded.body, updated_at=excluded.updated_at', args: [show.id, artist.id, show.version, JSON.stringify(show), now] });
    if (existing) {
      const actions = await tx.execute({ sql: 'select body from ops_actions where artist_id=? and opportunity_id=?', args: [artist.id, showId] });
      for (const row of actions.rows) {
        const action = JSON.parse(String(row.body)) as BookingAction;
        if (action.state === 'invalidated') continue;
        if (action.mode !== 'operator' || action.receipt || action.approval) throw new HttpError(409, 'Unexpected authority or delivery record. Stop for review; do not overwrite it.');
        action.state = 'invalidated'; action.updatedAt = now; action.reason = 'Operator brief changed. Earlier preparation cannot be exported as current.';
        await tx.execute({ sql: 'update ops_actions set body=?, updated_at=? where id=? and artist_id=?', args: [JSON.stringify(action), now, action.id, artist.id] });
      }
      await tx.execute({ sql: 'delete from kv where key in (?,?)', args: [`pressure:${artist.id}:${showId}`, `sensitivity:${artist.id}:${showId}`] });
      await wakeAgentTask(tx, show, 'Operator reviewed a new brief revision. Recheck missing facts and prepare only current terms.', now);
    }
    await tx.execute({ sql: 'insert into kv(key,value,updated_at) values(?,?,?) on conflict(key) do update set value=excluded.value, updated_at=excluded.updated_at', args: [metadataKey(artist.id, showId), JSON.stringify({ brief, hash }), now] });
    const event: OperationEvent = { id: id('oe_'), opportunityId: show.id, version: show.version, kind: 'operator-brief', detail: 'Redacted operator assertions saved for preparation only. No real identity, authority, availability or artist agreement independently verified.', createdAt: now };
    await tx.execute({ sql: 'insert into ops_events(id,opportunity_id,artist_id,source_key,body,created_at) values(?,?,?,?,?,?)', args: [event.id, show.id, artist.id, event.id, JSON.stringify(event), now] });
    return existing ? 'changed' : 'created';
  });
}
/** Explicitly grants preparation only. Existing effect executors reject operator mode. */
export async function startBriefTask(artist: ArtistRow, showId: string, expectedVersion: number, now = Date.now()): Promise<void> {
  authority(artist, showId);
  await transaction(async tx => {
    const r = await tx.execute({ sql: 'select body from ops_opportunities where id=? and artist_id=?', args: [showId, artist.id] });
    if (!r.rows[0]) throw new HttpError(404, 'Save your reviewed brief first.');
    const show = JSON.parse(String(r.rows[0].body));
    if (show.mode !== 'operator' || show.version !== expectedVersion || show.status !== 'planning') throw new HttpError(409, 'Review the current preparation brief before starting Gus.');
    const prior = await tx.execute({ sql: 'select body from ops_agent_tasks where artist_id=? and opportunity_id=?', args: [artist.id, showId] });
    const task = prior.rows[0] ? JSON.parse(String(prior.rows[0].body)) as AgentTask : null;
    if (task?.state === 'running' || task?.state === 'queued') return;
    const p = await tx.execute({ sql: 'select value from kv where key=?', args: [`pressure:${artist.id}:${showId}`] });
    const pressure = p.rows[0] ? JSON.parse(String(p.rows[0].value)) as PressureTest : null;
    if (!pressure || pressure.version !== show.version || pressure.observedAt > now || now - pressure.observedAt >= 86400000 || pressure.views.act.error || pressure.views.scene.error) {
      // Rechecking stale culture cannot retain a previously selected draft indefinitely.
      const actions = await tx.execute({ sql: 'select body from ops_actions where artist_id=? and opportunity_id=?', args: [artist.id, showId] });
      let invalidated = false;
      for (const row of actions.rows) {
        const action = JSON.parse(String(row.body)) as BookingAction;
        if (action.mode !== 'operator' || action.state !== 'prepared') continue;
        invalidated = true;
        action.state = 'invalidated'; action.updatedAt = now; action.reason = 'Cultural comparison needs a fresh check before current export.';
        await tx.execute({ sql: 'update ops_actions set body=?,updated_at=? where id=? and artist_id=?', args: [JSON.stringify(action),now,action.id,artist.id] });
      }
      await tx.execute({ sql: 'delete from kv where key=?', args: [`pressure:${artist.id}:${showId}`] });
      if (invalidated) {
        // A new revision gives fresh preparation a new business key. Old evidence dates stay intact.
        show.version++; show.updatedAt = now;
        await tx.execute({ sql: 'update ops_opportunities set version=?,body=?,updated_at=? where id=? and artist_id=?', args: [show.version,JSON.stringify(show),now,showId,artist.id] });
        const event: OperationEvent = { id: id('oe_'), opportunityId: showId, version: show.version, kind: 'cultural-refresh', detail: 'Operator requested a new cultural check. Prior preparation invalidated; operational assertion timestamps were not renewed.', createdAt: now };
        await tx.execute({ sql: 'insert into ops_events(id,opportunity_id,artist_id,source_key,body,created_at) values(?,?,?,?,?,?)', args: [event.id,showId,artist.id,event.id,JSON.stringify(event),now] });
      }
      if (task) task.actionId = null;
    }
    if (task) {
      task.version = show.version; task.state = 'queued'; task.generation++; task.attempts = 0; task.updatedAt = now; task.waitingFor = null; task.nextCheckAt = null;
      task.reason = 'Operator resumed preparation only. No approve, send or pay authority.';
      await cancelTaskAttention(tx, task.id, artist.id, now);
      await tx.execute({ sql: 'update ops_agent_tasks set state=?,generation=?,run_token=null,lease_until=null,body=?,updated_at=? where id=? and artist_id=?', args: [task.state, task.generation, JSON.stringify(task), now, task.id, artist.id] });
      return;
    }
    const created: AgentTask = { id: agentTaskId(showId), artistId: artist.id, opportunityId: showId, goal: 'find-support', version: show.version, generation: 1, state: 'queued', waitingFor: null, actionId: null, policy: 'balanced', attempts: 0, nextCheckAt: null, reason: 'Qualify operator assertions, compare the supplied roster and prepare an export. No approval, send or payment authority.', createdAt: now, updatedAt: now };
    await tx.execute({ sql: 'insert into ops_agent_tasks(id,artist_id,opportunity_id,state,generation,body,updated_at) values(?,?,?,?,?,?,?)', args: [created.id, artist.id, showId, created.state, created.generation, JSON.stringify(created), now] });
  });
}
