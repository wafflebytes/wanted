/** One durable reply -> revalidate -> approve -> effect -> reconcile chain.
 * The only connector implemented here is an explicitly fictional inbox. No email or money.
 */
import type { Transaction } from '@libsql/client';
import type { ArtistRow } from '../artists';
import type { BookingAction, Desk, Opportunity, OperationEvent, PressureTest, ReplyInput } from '../../lib/operations';
import { qualify, validDate } from '../../lib/operations';
import { id, stableHash } from '../crypto';
import { all, one, transaction } from '../db';
import { HttpError } from '../http';
import { wakeAgentTask } from './task-store';

export function payloadHash(action: Pick<BookingAction, 'payload' | 'version' | 'opportunityId' | 'candidateId'>): string {
  return stableHash({ payload: action.payload, version: action.version, opportunityId: action.opportunityId, candidateId: action.candidateId });
}
function fixtureAuthority(artist: ArtistRow) {
  if (!artist.isDemo) throw new HttpError(403, 'The fixture inbox is demo-only. A real operator login and connector are not configured.');
}
async function getShow(tx: Transaction, artistId: string, showId: string): Promise<Opportunity> {
  const r = await tx.execute({ sql: 'select body from ops_opportunities where id = ? and artist_id = ?', args: [showId, artistId] });
  if (!r.rows[0]) throw new HttpError(404, 'No such opportunity for this act.');
  return JSON.parse(String(r.rows[0].body));
}
async function getAction(tx: Transaction, artistId: string, actionId: string): Promise<BookingAction> {
  const r = await tx.execute({ sql: 'select body from ops_actions where id = ? and artist_id = ?', args: [actionId, artistId] });
  if (!r.rows[0]) throw new HttpError(404, 'No such action for this act.');
  return JSON.parse(String(r.rows[0].body));
}
async function saveAction(tx: Transaction, a: BookingAction) {
  await tx.execute({ sql: `insert into ops_actions(id, artist_id, opportunity_id, business_key, body, updated_at) values(?, ?, ?, ?, ?, ?) on conflict(id) do update set body = excluded.body, updated_at = excluded.updated_at`, args: [a.id, a.artistId, a.opportunityId, a.businessKey, JSON.stringify(a), a.updatedAt] });
}
async function event(tx: Transaction, show: Opportunity, sourceKey: string, kind: string, detail: string, now: number, change?: OperationEvent['change']) {
  const e: OperationEvent = { id: id('oe_'), opportunityId: show.id, version: show.version, kind, detail, createdAt: now, ...(change ? { change } : {}) };
  await tx.execute({ sql: 'insert into ops_events(id, opportunity_id, artist_id, source_key, body, created_at) values(?, ?, ?, ?, ?, ?)', args: [e.id, show.id, show.artistId, sourceKey, JSON.stringify(e), now] });
}
function actionable(show: Opportunity, a: BookingAction, now: number) {
  if (show.mode !== 'fixture' || a.mode !== 'fixture') throw new HttpError(403, 'No real delivery connector is configured.');
  if (show.status === 'canceled' || show.version !== a.version) throw new HttpError(409, 'Show changed. Prepare and approve a current-version action.');
  const c = show.roster.find((x) => x.id === a.candidateId);
  if (!c || qualify(c, show, now).status !== 'eligible') throw new HttpError(409, 'Candidate evidence is no longer current and eligible.');
  if (a.payload.amount !== c.fee!.value || a.payload.payee !== c.name || a.payload.date !== show.date || a.payload.currency !== 'usd' || a.payload.kind !== 'support-request') throw new HttpError(409, 'Amount, payee, date or currency does not match this show.');
}

export async function insertOpportunity(artist: ArtistRow, show: Opportunity): Promise<void> {
  fixtureAuthority(artist);
  if (show.artistId !== artist.id || show.mode !== 'fixture') throw new HttpError(403, 'Fixture scope mismatch.');
  await transaction(async (tx) => {
    const r = await tx.execute({ sql: 'insert or ignore into ops_opportunities(id, artist_id, version, body, updated_at) values(?, ?, ?, ?, ?)', args: [show.id, artist.id, show.version, JSON.stringify(show), show.updatedAt] });
    if (r.rowsAffected) await event(tx, show, `${show.id}:created`, 'prepared', 'Fictional opportunity created. No venue, availability, fee or local artist claim is verified.', show.updatedAt);
  });
}
export async function deskFor(artistId: string, showId: string): Promise<Desk | null> {
  const row = await one<{ body: string }>('select body from ops_opportunities where artist_id = ? and id = ?', [artistId, showId]);
  if (!row) return null;
  const [actions, events, pressure, effectCount] = await Promise.all([
    all<{ body: string }>('select body from ops_actions where artist_id = ? and opportunity_id = ? order by updated_at desc', [artistId, showId]),
    all<{ body: string }>('select body from ops_events where artist_id = ? and opportunity_id = ? order by created_at desc, rowid desc limit 50', [artistId, showId]),
    one<{ value: string }>('select value from kv where key = ?', [`pressure:${artistId}:${showId}`]),
    one<{ n: number }>('select count(*) as n from ops_effects e join ops_actions a on e.business_key = a.business_key and e.artist_id = a.artist_id where a.artist_id = ? and a.opportunity_id = ?', [artistId, showId]),
  ]);
  const show = JSON.parse(row.body) as Opportunity;
  const p = pressure ? JSON.parse(pressure.value) as PressureTest : null;
  const parsedActions = actions.map((x) => JSON.parse(x.body) as BookingAction);
  return { opportunity: show, pressure: p?.version === show.version ? p : null, actions: parsedActions, events: events.map((x) => JSON.parse(x.body)), metrics: { fixtureEffects: Number(effectCount?.n ?? 0), awaitingApproval: parsedActions.filter((a) => a.state === 'prepared' && a.version === show.version).length, invalidatedActions: parsedActions.filter((a) => a.state === 'invalidated').length } };
}

export async function prepareAction(artist: ArtistRow, showId: string, candidateId: string, expectedVersion: number, now = Date.now(), guard?: { taskId: string; generation: number; token: string }): Promise<BookingAction> {
  fixtureAuthority(artist);
  return transaction(async (tx) => {
    const show = await getShow(tx, artist.id, showId);
    if (guard) {
      const lease = await tx.execute({ sql: "select id from ops_agent_tasks where id = ? and artist_id = ? and opportunity_id = ? and generation = ? and run_token = ? and state = 'running' and lease_until > ?", args: [guard.taskId, artist.id, showId, guard.generation, guard.token, now] });
      if (!lease.rows.length) throw new HttpError(409, 'Gus job changed or paused. Old work cannot prepare a request.');
    }
    if (show.version !== expectedVersion) throw new HttpError(409, 'Offer changed while you were reviewing.');
    const c = show.roster.find((x) => x.id === candidateId);
    if (!c || qualify(c, show, now).status !== 'eligible') throw new HttpError(409, 'Not a qualified candidate for this date.');
    const businessKey = `${show.id}:v${show.version}:${c.id}:support-request`;
    const prior = await tx.execute({ sql: 'select body from ops_actions where business_key = ? and artist_id = ?', args: [businessKey, artist.id] });
    if (prior.rows[0]) {
      const existing = JSON.parse(String(prior.rows[0].body)) as BookingAction;
      if (!guard) await wakeAgentTask(tx, show, 'Operator selected this existing request. Preserve the exact choice.', now, existing.id);
      return existing;
    }
    const a: BookingAction = { id: id('oa_'), artistId: artist.id, opportunityId: show.id, version: show.version, candidateId: c.id, businessKey, mode: show.mode, state: 'prepared', payload: { date: show.date, payee: c.name, amount: c.fee!.value, currency: 'usd', kind: 'support-request' }, approval: null, receipt: null, reason: 'Prepared only. No message sent and no agreement made.', createdAt: now, updatedAt: now };
    await saveAction(tx, a);
    await event(tx, show, `${a.id}:prepared`, 'prepared', `Prepared a fixture support request to ${c.name}: ${show.date}, ${c.fee!.value} USD. No delivery.`, now);
    if (!guard) await wakeAgentTask(tx, show, 'Operator chose this eligible candidate. Respect the selected request.', now, a.id);
    return a;
  });
}

export async function approveAction(artist: ArtistRow, actionId: string, expectedVersion: number, expectedPayloadHash: string, now = Date.now()): Promise<BookingAction> {
  fixtureAuthority(artist);
  return transaction(async (tx) => {
    const a = await getAction(tx, artist.id, actionId);
    const show = await getShow(tx, artist.id, a.opportunityId);
    actionable(show, a, now);
    if (expectedVersion !== a.version || expectedPayloadHash !== payloadHash(a)) throw new HttpError(409, 'Approval does not match these exact terms.');
    if (a.state === 'approved' && a.approval && a.approval.expiresAt > now) return a;
    if (a.state !== 'prepared' && a.state !== 'approved') throw new HttpError(409, 'This action is not waiting for approval.');
    const c = show.roster.find((x) => x.id === a.candidateId)!;
    const expiresAt = Math.min(now + 24 * 3_600_000, c.availability!.expiresAt, c.fee!.expiresAt, c.intake!.expiresAt);
    a.approval = { token: id('approval_'), payloadHash: payloadHash(a), expiresAt, approvedAt: now };
    a.state = 'approved'; a.updatedAt = now; a.reason = 'Approved for this request only. Still not delivered.';
    await saveAction(tx, a);
    await event(tx, show, `${a.id}:approved:${a.approval.token}`, 'approved', `Exact v${a.version} request approved. No money authorization; no real outreach.`, now);
    await wakeAgentTask(tx, show, 'Exact request approved. Save is still a separate choice.', now);
    return a;
  });
}

/** Fixture replies are structured changes from ONE allowed fixture contact, not instructions. */
export async function ingestReply(artist: ArtistRow, showId: string, input: ReplyInput, now = Date.now()): Promise<{ duplicate: boolean; version: number; noChange?: boolean }> {
  fixtureAuthority(artist);
  if (input.contactId !== `fixture-booker:${showId}`) throw new HttpError(403, 'Reply contact is not authenticated for this fixture.');
  if (!input.sourceMessageId || input.sourceMessageId.length > 150) throw new HttpError(400, 'A stable source message ID is required.');
  const keys = Object.keys(input.patch);
  if (!keys.length || keys.some((k) => !['date', 'maxFee', 'canceled'].includes(k))) throw new HttpError(400, 'Only date, support budget and cancellation are accepted. No payment or secret instructions.');
  if (input.patch.date !== undefined && !validDate(input.patch.date)) throw new HttpError(400, 'Invalid calendar date.');
  if (input.patch.maxFee !== undefined && (!Number.isFinite(input.patch.maxFee) || input.patch.maxFee < 0 || input.patch.maxFee > 10000)) throw new HttpError(400, 'Invalid support budget.');
  if (input.patch.canceled !== undefined && typeof input.patch.canceled !== 'boolean') throw new HttpError(400, 'Invalid cancellation state.');
  return transaction(async (tx) => {
    const show = await getShow(tx, artist.id, showId);
    const sourceKey = `${artist.id}:${showId}:reply:${input.sourceMessageId}`;
    const duplicate = await tx.execute({ sql: 'select id from ops_events where source_key = ?', args: [sourceKey] });
    if (duplicate.rows.length) return { duplicate: true, version: show.version };
    if (show.version !== input.expectedVersion) throw new HttpError(409, 'Reply refers to an older offer. Review against the latest record.');
    const changesDate = input.patch.date !== undefined && input.patch.date !== show.date;
    const changesBudget = input.patch.maxFee !== undefined && input.patch.maxFee !== show.maxFee;
    const changesStatus = input.patch.canceled !== undefined && (input.patch.canceled ? 'canceled' : 'planning') !== show.status;
    if (!changesDate && !changesBudget && !changesStatus) {
      await event(tx, show, sourceKey, 'reply-no-change', 'Reply repeated the current tracked terms. No version change, approval invalidation, message or payment.', now);
      return { duplicate: false, version: show.version, noChange: true };
    }
    const before = { date: show.date, maxFee: show.maxFee, status: show.status };
    const oldDate = show.date;
    if (input.patch.date !== undefined) show.date = input.patch.date;
    if (input.patch.maxFee !== undefined) show.maxFee = input.patch.maxFee;
    if (input.patch.canceled !== undefined) show.status = input.patch.canceled ? 'canceled' : 'planning';
    show.version++; show.updatedAt = now;
    // A changed date does NOT magically reconfirm the roster's date-specific availability.
    await tx.execute({ sql: 'update ops_opportunities set version = ?, body = ?, updated_at = ? where id = ? and artist_id = ?', args: [show.version, JSON.stringify(show), now, show.id, artist.id] });
    const actions = await tx.execute({ sql: 'select body from ops_actions where opportunity_id = ? and artist_id = ?', args: [show.id, artist.id] });
    for (const row of actions.rows) {
      const a = JSON.parse(String(row.body)) as BookingAction;
      // Preserve historical provider receipts. An accepted request cannot be unsent.
      a.reason = a.receipt ? 'Show changed after fixture acceptance. Follow-up required; historical receipt preserved.' : 'Show changed. Old approval and queued work invalidated.';
      a.approval = null;
      if (!a.receipt && a.state !== 'uncertain') a.state = 'invalidated';
      a.updatedAt = now;
      await saveAction(tx, a);
    }
    await event(tx, show, sourceKey, 'reply', `${input.sourceMessageId.startsWith('reviewed:') ? 'Operator reviewed a local pasted excerpt (contact not verified).' : 'Fixture booker reply.'} Changed v${show.version - 1} → v${show.version}. ${oldDate !== show.date ? `${oldDate} → ${show.date}. Date-specific availability must be rechecked. ` : ''}${show.status === 'canceled' ? 'Canceled. ' : ''}Old approvals invalidated; accepted receipts remain historical.`, now, { before, after: { date: show.date, maxFee: show.maxFee, status: show.status } });
    await wakeAgentTask(tx, show, 'Reviewed show facts changed. Revalidate and replan before any new action.', now);
    return { duplicate: false, version: show.version };
  });
}

/** The fixture provider stores a durable idempotency receipt before acknowledging.
 * If the response is lost, reconcile the stored receipt, NEVER send blindly again.
 */
export async function executeAction(artist: ArtistRow, actionId: string, token: string, opts: { loseAcknowledgment?: boolean; now?: number } = {}): Promise<BookingAction> {
  fixtureAuthority(artist);
  const now = opts.now ?? Date.now();
  return transaction(async (tx) => {
    const a = await getAction(tx, artist.id, actionId);
    const show = await getShow(tx, artist.id, a.opportunityId);
    if (a.receipt && ['provider_accepted', 'acknowledged', 'completed'].includes(a.state)) return a;
    const prior = await tx.execute({ sql: 'select body from ops_effects where business_key = ? and artist_id = ?', args: [a.businessKey, artist.id] });
    if (prior.rows[0]) {
      a.receipt = JSON.parse(String(prior.rows[0].body)); a.state = 'provider_accepted'; a.updatedAt = now;
      a.reason = show.version === a.version ? 'Recovered the existing fixture-provider receipt. No second delivery. Recipient has not agreed.' : 'Recovered a historical fixture receipt after show changed. No resend; follow-up required.';
      await saveAction(tx, a);
      await event(tx, show, `${a.id}:reconciled`, 'reconciled', 'Lost acknowledgment reconciled against one durable provider receipt. No duplicate effect.', now);
      return a;
    }
    actionable(show, a, now);
    if (a.state !== 'approved' || !a.approval || token !== a.approval.token) throw new HttpError(403, 'Exact current approval required.');
    if (a.approval.expiresAt <= now || a.approval.payloadHash !== payloadHash(a)) throw new HttpError(409, 'Approval expired or terms changed. Approve again.');
    const receipt: NonNullable<BookingAction['receipt']> = { provider: 'fixture-inbox', ref: `fixture:${a.businessKey}`, acceptedAt: now, acknowledgment: null };
    await tx.execute({ sql: 'insert into ops_effects(business_key, artist_id, body, created_at) values(?, ?, ?, ?)', args: [a.businessKey, artist.id, JSON.stringify(receipt), now] });
    a.state = opts.loseAcknowledgment ? 'uncertain' : 'provider_accepted';
    a.receipt = opts.loseAcknowledgment ? null : receipt; a.updatedAt = now;
    a.reason = opts.loseAcknowledgment ? 'Fixture provider accepted, response was lost. Reconcile before any retry.' : 'Fixture inbox accepted the request. Not a real send, artist agreement or payment.';
    await saveAction(tx, a);
    await event(tx, show, `${a.id}:effect`, a.state, a.reason, now);
    await wakeAgentTask(tx, show, 'Save result changed. Recover any missing original receipt before moving on.', now);
    return a;
  });
}

/** Operator edits are new versions too, not instructions silently grafted onto old approval. */
export async function changeFixtureScene(artist: ArtistRow, showId: string, expectedVersion: number, scene: Opportunity['scene'], sceneEvidence: Opportunity['sceneEvidence'], now = Date.now()) {
  fixtureAuthority(artist);
  if (!scene.length || sceneEvidence.source !== 'fixture') throw new HttpError(400, 'Resolved illustrative context required.');
  await transaction(async (tx) => {
    const show = await getShow(tx, artist.id, showId);
    if (show.version !== expectedVersion || show.status === 'canceled') throw new HttpError(409, 'Show changed or canceled. Review the latest version.');
    show.scene = scene; show.sceneEvidence = sceneEvidence; show.version++; show.updatedAt = now;
    await tx.execute({ sql: 'update ops_opportunities set body = ?, version = ?, updated_at = ? where id = ? and artist_id = ?', args: [JSON.stringify(show), show.version, now, show.id, artist.id] });
    const rows = await tx.execute({ sql: 'select body from ops_actions where artist_id = ? and opportunity_id = ?', args: [artist.id, show.id] });
    for (const row of rows.rows) {
      const action = JSON.parse(String(row.body)) as BookingAction;
      action.approval = null; action.updatedAt = now;
      if (!action.receipt && action.state !== 'uncertain') action.state = 'invalidated';
      action.reason = action.receipt ? 'Scene changed after fixture acceptance. Historical receipt preserved; review follow-up.' : 'Scene evidence changed. Old bill choice and approval invalidated.';
      await saveAction(tx, action);
    }
    await wakeAgentTask(tx, show, 'Scene corrected. Compare the same qualified roster again.', now);
    await event(tx, show, `${show.id}:scene:v${show.version}`, 'scene-change', `Operator changed the illustrative scene to ${scene.map((s) => s.name).join(' + ')}. Same roster, date, capacity and budget. Taste conclusions and pending approvals must be reviewed again.`, now);
  });
}
