import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artist, NOW } from './fixtures';
import { briefSchema, briefWithDate, briefOpportunity, briefExport, currentBriefRequest, canonicalBrief, type OperatorBrief } from '../src/lib/operator-brief';
import { pressureResult, qualify } from '../src/lib/operations';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-operator-brief-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
import { all, kvSet } from '../src/server/db';
import { briefId, getBrief, saveBrief, startBriefTask } from '../src/server/operations/operator-brief';
import { deskFor, approveAction, executeAction, payloadHash } from '../src/server/operations/store';
import { pauseAgentTask } from '../src/server/operations/task-store';
import { runAgentTask } from '../src/server/operations/task-runner';
const input = (): OperatorBrief => ({ city: 'Burlington, VT', date: '2026-11-21', format: 'music', roomCapacity: 150, maxFee: 200,
  act: [{ id: 'sound', name: 'Sound reference' }], scene: [{ id: 'scene', name: 'Scene reference' }], sceneSource: 'Illustrative operator test context, not local-scene validation', consent: true,
  roster: ['a','b','c'].map((key, i) => ({ key, name: `Test act ${key}`, entity: { id: key, name: `Test act ${key}` }, format: 'music', inCircuit: true, liveSuitable: true, scale: 100, fee: 100 + i * 20, availability: 'available', routeHeld: true, source: 'Illustrative assertions, not actual artist quote or availability' })),
});
const status = (code: number) => (e: unknown) => !!e && typeof e === 'object' && 'status' in e && e.status === code;
let n = 0;
async function setup(b = input()) { const showId = briefId(artist().id, `case${++n}`); await saveBrief(artist(), showId, b, 0, NOW); return showId; }
const rank = async (_artist: unknown, policy: 'balanced' | 'strict' = 'balanced', showId = '') => {
  const show = (await deskFor(artist().id, showId))!.opportunity;
  const view = { scores: show.roster.map((c,i) => ({ entityId: c.mapping.entityId!, affinity: 1-i*.1, rank: i+1 })), error: null, receipt: null };
  const p = pressureResult(show, { act: view, scene: view, joint: view }, Math.max(NOW, show.updatedAt), policy);
  await kvSet(`pressure:${artist().id}:${showId}`, p); return p;
};
async function ready() { const showId = await setup(); await startBriefTask(artist(), showId, 1, NOW); await runAgentTask(artist(), showId, { now: NOW, rank }); return { showId, data: await getBrief(artist(), showId) }; }

test('brief requires explicit consent and rejects unknown extra authority fields', () => {
  assert.equal(briefSchema.safeParse({ ...input(), consent: false }).success, false);
  assert.equal(briefSchema.safeParse({ ...input(), send: true }).success, false);
  assert.equal(briefSchema.safeParse(input()).success, true);
});
test('dates, nonfinite fees, duplicate roster IDs and private contact data fail validation', () => {
  assert.equal(briefSchema.safeParse({ ...input(), date: '2026-02-30' }).success, false);
  assert.equal(briefSchema.safeParse({ ...input(), maxFee: NaN }).success, false);
  const b = input(); b.roster[1].entity = b.roster[0].entity;
  assert.equal(briefSchema.safeParse(b).success, false);
  assert.equal(briefSchema.safeParse({ ...input(), sceneSource: 'Contact secret@example.com' }).success, false);
  assert.equal(briefSchema.safeParse({ ...input(), sceneSource: 'Call +1 555 123 4567' }).success, false);
});
test('Qloo canonical identity replaces supplied names and missing matches fail closed', () => {
  const b = input(); const found = [...b.act,...b.scene,...b.roster.map(c => c.entity!)].map(e => ({ ...e, name: `Canonical ${e.id}` }));
  const result = canonicalBrief(b, found); assert.equal(result.roster[0].entity?.name, 'Canonical a');
  assert.throws(() => canonicalBrief(b, []), /missing/);
});
test('null evidence stays unknown, never becomes eligibility or a free quote', () => {
  const b = input(); b.roster[0].fee = null; b.roster[0].inCircuit = null; b.roster[0].availability = 'unknown'; b.roster[0].routeHeld = false;
  const show = briefOpportunity(artist().id, 'brief', 1, b, NOW); const c = show.roster[0];
  assert.equal(show.mode, 'operator'); assert.equal(c.fee, null); assert.equal(c.locality, null); assert.equal(c.intake, null);
  const q = qualify(c, show, NOW); assert.equal(q.status, 'unverified'); assert(q.reasons.includes('Fee missing or stale')); assert(q.reasons.includes('Performance availability not confirmed for this date'));
});
test('evidence is operator-asserted, expires, and does not expose private contact routes', () => {
  const show = briefOpportunity(artist().id, 'brief', 1, input(), NOW);
  assert.equal(show.roster[0].fee?.source, 'operator'); assert.match(show.roster[0].intake!.value, /privately/);
  assert.equal(qualify(show.roster[0], show, NOW + 8*86400000).status, 'unverified');
});
test('operator brief uses the existing worker to prepare an exact export, not an effect', async () => {
  const { data } = await ready(); const action = currentBriefRequest(data.desk!, NOW)!;
  assert(action); assert.equal(data.task?.waitingFor, 'approval'); assert.equal(action.mode, 'operator');
  assert.equal(action.payload.date, '2026-11-21'); assert.equal(action.payload.amount, 100);
  assert.equal(action.approval, null); assert.equal(action.receipt, null); assert.equal(data.desk?.metrics.fixtureEffects, 0);
  const text = briefExport(data.desk!, NOW); assert.match(text, /Not sent, booked, approved or paid/); assert.match(text, /Support fee: \$100.00 USD/);
});
test('operator preparation cannot approve, execute, contact or pay through the existing executor', async () => {
  const { data } = await ready(); const action = currentBriefRequest(data.desk!, NOW)!;
  await assert.rejects(approveAction(artist(), action.id, action.version, payloadHash(action), NOW), status(403));
  await assert.rejects(executeAction(artist(), action.id, 'invented-token', { now: NOW }), status(403));
  const effects = await all<{ n: number }>('select count(*) n from ops_effects where artist_id=? and business_key=?', [artist().id, action.businessKey]);
  assert.equal(Number(effects[0].n), 0);
});
test('missing date availability establishes an honest durable wait', async () => {
  const b = input(); b.roster.forEach(c => c.availability = 'unknown'); const showId = await setup(b);
  await startBriefTask(artist(), showId, 1, NOW); const task = await runAgentTask(artist(), showId, { now: NOW, rank });
  assert.equal(task?.waitingFor, 'availability'); assert.equal((await deskFor(artist().id, showId))!.actions.length, 0);
});
test('changed brief atomically invalidates old preparation and replans current exact terms', async () => {
  const { showId, data } = await ready(); const old = data.desk!.actions[0]; const b = input(); b.date = '2026-11-22'; b.roster[0].fee = 130;
  assert.equal(await saveBrief(artist(), showId, b, 1, NOW+1000), 'changed');
  const changed = await getBrief(artist(), showId); assert.equal(changed.desk?.opportunity.version, 2); assert.equal(changed.desk?.pressure, null); assert.equal(changed.desk?.actions.find(a => a.id === old.id)?.state, 'invalidated');
  assert.equal(changed.task?.state, 'queued'); assert.equal(currentBriefRequest(changed.desk!, NOW+1000), null);
  await runAgentTask(artist(), showId, { now: NOW+1000, rank }); const latest = await getBrief(artist(), showId);
  const request = currentBriefRequest(latest.desk!, NOW+1000)!; assert.equal(request.payload.date, '2026-11-22'); assert.equal(request.payload.amount, 130);
});
test('same save and lost-acknowledgment retry preserve the exact revision and task generation', async () => {
  const { showId, data } = await ready(); const generation = data.task!.generation;
  assert.equal(await saveBrief(artist(), showId, input(), 1, NOW+1000), 'unchanged');
  assert.equal(await saveBrief(artist(), showId, input(), 0, NOW+1000), 'unchanged');
  const again = await getBrief(artist(), showId); assert.equal(again.desk?.opportunity.version, 1); assert.equal(again.task?.generation, generation); assert.equal(again.desk?.actions.length, 1);
});
test('stale changed saves and cross-artist use are rejected', async () => {
  const showId = await setup(); const b = input(); b.maxFee = 150;
  await assert.rejects(saveBrief(artist(), showId, b, 0, NOW), status(409));
  await assert.rejects(saveBrief(artist('real-act', false), showId, b, 1, NOW), status(403));
  await assert.rejects(saveBrief(artist('other-demo'), showId, b, 0, NOW), status(403));
  await assert.rejects(getBrief(artist('other-demo'), showId), status(403));
});
test('editing a paused brief never unpauses it', async () => {
  const { showId } = await ready(); await pauseAgentTask(artist(), showId, NOW+1000);
  const b = input(); b.maxFee = 190; await saveBrief(artist(), showId, b, 1, NOW+2000);
  assert.equal((await getBrief(artist(), showId)).task?.state, 'paused');
});
test('expired preparation cannot be exported as a current request', async () => {
  const { data } = await ready(); assert.equal(currentBriefRequest(data.desk!, NOW + 8*86400000), null);
  assert.match(briefExport(data.desk!, NOW + 8*86400000), /No current eligible request/);
});

test('stale cultural comparison blocks current export and explicit recheck invalidates the old choice', async () => {
  const { showId, data } = await ready(); const actionId = data.desk!.actions[0].id;
  assert.equal(currentBriefRequest(data.desk!, NOW + 86400000), null);
  await startBriefTask(artist(), showId, 1, NOW + 86400000);
  const current = await getBrief(artist(), showId);
  assert.equal(current.desk?.actions.find(a => a.id === actionId)?.state, 'invalidated');
  assert.equal(current.desk?.pressure, null); assert.equal(current.task?.actionId, null);
  assert.equal(current.desk?.opportunity.version, 2);
  assert.equal(current.desk?.opportunity.roster[0].fee?.observedAt, NOW);
  await runAgentTask(artist(), showId, { now: NOW + 86400000, rank });
  const fresh = await getBrief(artist(), showId);
  assert(currentBriefRequest(fresh.desk!, NOW + 86400000));
  assert.equal(fresh.desk?.actions.length, 2);
});

test('currency input cannot hide fractional cents behind formatted rounding', () => {
  assert.equal(briefSchema.safeParse({ ...input(), maxFee: 100.005 }).success, false);
  const b = input(); b.roster[0].fee = 100.001; assert.equal(briefSchema.safeParse(b).success, false);
  assert.equal(briefSchema.safeParse({ ...input(), maxFee: 100.01 }).success, true);
});

test('editing the performance date clears every old availability answer without erasing other evidence', () => {
  const b = input(); assert.equal(briefWithDate(b, b.date), b);
  const changed = briefWithDate(b, '2026-11-22');
  assert(changed.roster.every(c => c.availability === 'unknown'));
  assert.equal(changed.roster[0].fee, b.roster[0].fee); assert.equal(changed.sceneSource, b.sceneSource);
  assert.equal(b.roster[0].availability, 'available');
});
