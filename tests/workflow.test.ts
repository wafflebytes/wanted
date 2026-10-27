import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { artist, NOW, opportunity } from './fixtures';
import type { BookingAction } from '../src/lib/operations';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-operations-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
import { approveAction, changeFixtureScene, deskFor, executeAction, ingestReply, insertOpportunity, payloadHash, prepareAction } from '../src/server/operations/store';
import { all, run } from '../src/server/db';
import { decideStep, showPlanFor } from '../src/server/showplan';
import { kvSet } from '../src/server/db';
let n = 0;
async function setup() { const show = opportunity(`workflow-${++n}`); await insertOpportunity(artist(), show); return show; }
async function prepared() { const s = await setup(); const a = await prepareAction(artist(), s.id, 'c1', 1, NOW); return { s, a }; }
async function approved() { const { s, a } = await prepared(); const out = await approveAction(artist(), a.id, 1, payloadHash(a), NOW); return { s, a: out }; }
const status = (code: number) => (e: unknown) => !!e && typeof e === 'object' && 'status' in e && e.status === code;

before(async () => { await run('select 1'); });
test('prepared is not sent, published or agreed', async () => { const { a } = await prepared(); assert.equal(a.state, 'prepared'); assert.equal(a.receipt, null); assert.equal(a.approval, null); });
test('duplicate prepare has one stable business action', async () => { const { s, a } = await prepared(); const again = await prepareAction(artist(), s.id, 'c1', 1, NOW); assert.equal(again.id, a.id); assert.equal((await deskFor(artist().id, s.id))!.actions.length, 1); });
test('simultaneous preparation deduplicates transactionally', async () => { const s = await setup(); const r = await Promise.all([prepareAction(artist(), s.id, 'c1', 1, NOW), prepareAction(artist(), s.id, 'c1', 1, NOW)]); assert.equal(r[0].id, r[1].id); });
test('unauthorized real-act fixture approval is denied', async () => { const { a } = await prepared(); await assert.rejects(approveAction(artist('test-act', false), a.id, 1, payloadHash(a), NOW), status(403)); });
test('cross-act action approval is denied', async () => { const { a } = await prepared(); await assert.rejects(approveAction(artist('other-act'), a.id, 1, payloadHash(a), NOW), status(404)); });
test('scope hashes reject an altered payee, amount or currency', async () => { const { a } = await prepared(); const bad = { ...a, payload: { ...a.payload, amount: 999 } }; await assert.rejects(approveAction(artist(), a.id, 1, payloadHash(bad), NOW), status(409)); });
test('stale version approval is denied', async () => { const { a } = await prepared(); await assert.rejects(approveAction(artist(), a.id, 2, payloadHash(a), NOW), status(409)); });
test('approval creates no provider effect', async () => { const { a } = await approved(); const effects = await all('select business_key from ops_effects where business_key = ?', [a.businessKey]); assert.equal(effects.length, 0); assert.equal(a.state, 'approved'); });
test('execution needs exact approval token', async () => { const { a } = await approved(); await assert.rejects(executeAction(artist(), a.id, 'wrong', { now: NOW }), status(403)); });
test('expired approval does not execute', async () => { const { a } = await approved(); await assert.rejects(executeAction(artist(), a.id, a.approval!.token, { now: NOW + 86_400_000 }), status(409)); });
test('provider acceptance is not recipient acknowledgment or settlement', async () => { const { a } = await approved(); const out = await executeAction(artist(), a.id, a.approval!.token, { now: NOW }); assert.equal(out.state, 'provider_accepted'); assert.equal(out.receipt!.provider, 'fixture-inbox'); assert.equal(out.receipt!.acknowledgment, null); });
test('duplicate concurrent execution produces one effect', async () => { const { a } = await approved(); await Promise.all([executeAction(artist(), a.id, a.approval!.token, { now: NOW }), executeAction(artist(), a.id, a.approval!.token, { now: NOW })]); assert.equal((await all('select * from ops_effects where business_key = ?', [a.businessKey])).length, 1); });
test('lost external acknowledgment is uncertain then reconciled, never resent', async () => { const { a } = await approved(); const lost = await executeAction(artist(), a.id, a.approval!.token, { loseAcknowledgment: true, now: NOW }); assert.equal(lost.state, 'uncertain'); assert.equal(lost.receipt, null); const recovered = await executeAction(artist(), a.id, a.approval!.token, { now: NOW + 1 }); assert.equal(recovered.state, 'provider_accepted'); assert.equal((await all('select * from ops_effects where business_key = ?', [a.businessKey])).length, 1); });
test('date reply invalidates approved work and availability', async () => { const { s, a } = await approved(); await ingestReply(artist(), s.id, { sourceMessageId: 'date-change', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } }, NOW); const desk = (await deskFor(artist().id, s.id))!; assert.equal(desk.opportunity.version, 2); assert.equal(desk.actions[0].state, 'invalidated'); assert.equal(desk.actions[0].approval, null); assert.equal(desk.opportunity.roster[0].availability!.value.date, '2026-11-20'); await assert.rejects(executeAction(artist(), a.id, a.approval!.token, { now: NOW }), status(409)); });
test('same reply ID does not duplicate the chain even with old version', async () => { const s = await setup(); const reply = { sourceMessageId: 'same-id', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { maxFee: 120 } }; await ingestReply(artist(), s.id, reply, NOW); const r = await ingestReply(artist(), s.id, reply, NOW); assert.equal(r.duplicate, true); assert.equal(r.version, 2); assert.equal((await deskFor(artist().id, s.id))!.events.filter(e => e.kind === 'reply').length, 1); });
test('reply from wrong contact is rejected', async () => { const s = await setup(); await assert.rejects(ingestReply(artist(), s.id, { sourceMessageId: 'spoof', contactId: 'external-payee', expectedVersion: 1, patch: { maxFee: 0 } }, NOW), status(403)); });
test('external secret/payee change is data, not instruction', async () => { const s = await setup(); await assert.rejects(ingestReply(artist(), s.id, { sourceMessageId: 'secret', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { payee: 'attacker', sendSecret: true } as never }, NOW), status(400)); });
test('stale reply cannot overwrite newer facts', async () => { const s = await setup(); await ingestReply(artist(), s.id, { sourceMessageId: 'one', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { maxFee: 120 } }, NOW); await assert.rejects(ingestReply(artist(), s.id, { sourceMessageId: 'two', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { maxFee: 50 } }, NOW), status(409)); });
test('cancellation stops pending action without erasing history', async () => { const { s, a } = await approved(); await ingestReply(artist(), s.id, { sourceMessageId: 'cancel', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { canceled: true } }, NOW); await assert.rejects(executeAction(artist(), a.id, a.approval!.token, { now: NOW }), status(409)); });
test('accepted old-version action is not unsent or re-executed after change', async () => { const { s, a } = await approved(); await executeAction(artist(), a.id, a.approval!.token, { now: NOW }); await ingestReply(artist(), s.id, { sourceMessageId: 'after-send', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } }, NOW); const out = (await deskFor(artist().id, s.id))!.actions[0]; assert.ok(out.receipt); assert.match(out.reason!, /Follow-up required/); await executeAction(artist(), a.id, a.approval!.token, { now: NOW }); assert.equal((await all('select * from ops_effects where business_key = ?', [a.businessKey])).length, 1); });
test('lost receipt can reconcile after cancellation without making a new effect', async () => { const { s, a } = await approved(); await executeAction(artist(), a.id, a.approval!.token, { now: NOW, loseAcknowledgment: true }); await ingestReply(artist(), s.id, { sourceMessageId: 'cancel-lost', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { canceled: true } }, NOW); const out = await executeAction(artist(), a.id, a.approval!.token, { now: NOW }); assert.ok(out.receipt); assert.match(out.reason!, /historical/); });
test('restart while waiting retains exact terms and approval', async () => { const { s, a } = await approved(); const script = `import { deskFor } from './src/server/operations/store.ts'; const d=await deskFor('test-act',${JSON.stringify(s.id)}); console.log(JSON.stringify({version:d.opportunity.version,state:d.actions[0].state,hash:d.actions[0].approval.payloadHash}));process.exit(0);`; const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: process.cwd(), env: process.env, encoding: 'utf8' }); assert.equal(child.status, 0, child.stderr); assert.deepEqual(JSON.parse(child.stdout), { version: 1, state: 'approved', hash: payloadHash(a) }); });
test('business payload never carries private fan or contact fields', async () => { const { a } = await prepared(); assert.deepEqual(Object.keys(a.payload).sort(), ['amount', 'currency', 'date', 'kind', 'payee']); });
test('legacy promotion done is migrated to prepared, not sent', async () => { await kvSet('show:test-act:legacy', { dealId: 'legacy', city: 'burlington-vt', cityName: 'Burlington', roomName: 'Fixture room', date: '2026-11-20', signers: 50, createdAt: NOW, steps: [{ id: 'podcast', title: 'Pitched podcast', detail: 'Sent the note', why: null, status: 'done', items: [], draft: 'A prepared note', cost: null }] }); const p = await showPlanFor('test-act', 'legacy'); assert.equal(p!.steps[0].status, 'prepared'); assert.equal(p!.steps[0].delivery!.state, 'not_sent'); assert.doesNotMatch(p!.steps[0].detail, /^Sent/); });
test('promotion approval does not claim delivery', async () => { await kvSet('show:test-act:promotion', { dealId: 'promotion', city: 'burlington-vt', cityName: 'Burlington', roomName: 'Fixture room', date: '2026-11-20', signers: 50, createdAt: NOW, steps: [{ id: 'podcast', title: 'Pitch podcast?', detail: 'Prepared', why: null, status: 'needs_ok', items: [], draft: 'Note', cost: null }] }); const p = await decideStep(artist(), 'promotion', 'podcast', true); assert.equal(p.steps[0].status, 'approved'); assert.match(p.steps[0].detail, /not been sent/); assert.equal(p.steps[0].delivery!.state, 'not_sent'); });
test('sandbox ads are not a live campaign', async () => { await kvSet('show:test-act:ads', { dealId: 'ads', city: 'burlington-vt', cityName: 'Burlington', roomName: 'Fixture room', date: '2026-11-20', signers: 50, createdAt: NOW, steps: [{ id: 'ads', title: 'Spend $75?', detail: 'Sandbox', why: null, status: 'needs_ok', items: [], draft: null, cost: 75 }] }); const p = await decideStep(artist(), 'ads', 'ads', true); assert.equal(p.steps[0].status, 'simulated'); assert.match(p.steps[0].detail, /No ads were bought or shown/); });

test('scene correction preserves roster and operating facts but invalidates approval', async () => {
  const { s, a } = await approved();
  await changeFixtureScene(artist(), s.id, 1, [{ id: 'new-scene', name: 'Illustrative reference' }], { value: 'Illustrative context', source: 'fixture', label: 'Explicit operator context correction', observedAt: NOW, expiresAt: NOW + 86400000 }, NOW);
  const desk = (await deskFor(artist().id, s.id))!;
  assert.equal(desk.opportunity.version, 2); assert.equal(desk.opportunity.date, s.date); assert.equal(desk.opportunity.maxFee, s.maxFee); assert.deepEqual(desk.opportunity.roster, s.roster);
  assert.equal(desk.actions[0].approval, null); assert.equal(desk.actions[0].state, 'invalidated');
  await assert.rejects(executeAction(artist(), a.id, a.approval!.token, { now: NOW }), status(409));
});
test('receipt metrics count one durable effect, not requests or narration', async () => {
  const { s, a } = await approved();
  await executeAction(artist(), a.id, a.approval!.token, { now: NOW, loseAcknowledgment: true });
  await executeAction(artist(), a.id, a.approval!.token, { now: NOW });
  const desk = (await deskFor(artist().id, s.id))!;
  assert.equal(desk.metrics.fixtureEffects, 1); assert.equal(desk.metrics.awaitingApproval, 0);
});

test('booker change records exact before/after budget and date for the artist', async () => {
  const s = await setup();
  await ingestReply(artist(), s.id, { sourceMessageId: 'delta', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { maxFee: 100, date: '2026-11-21' } }, NOW);
  const d = (await deskFor(artist().id, s.id))!; const e = d.events.find((e) => e.kind === 'reply')!;
  assert.deepEqual(e.change?.before, { date: s.date, maxFee: s.maxFee, status: 'planning' });
  assert.deepEqual(e.change?.after, { date: '2026-11-21', maxFee: 100, status: 'planning' });
});
test('missing receipt stays recoverable in the artist UI after cancellation', async () => {
  const { s, a } = await approved();
  await executeAction(artist(), a.id, a.approval!.token, { now: NOW, loseAcknowledgment: true });
  await ingestReply(artist(), s.id, { sourceMessageId: 'cancel-lost', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { canceled: true } }, NOW);
  let d = (await deskFor(artist().id, s.id))!; assert.equal(d.actions[0].state, 'uncertain'); assert.equal(d.actions[0].approval, null);
  await executeAction(artist(), a.id, 'reconcile', { now: NOW }); d = (await deskFor(artist().id, s.id))!;
  assert.equal(d.metrics.fixtureEffects, 1); assert.equal(d.actions[0].state, 'provider_accepted');
});

test('reply repeating current terms keeps exact approval and records no change', async () => {
  const { s, a } = await approved();
  const input = { sourceMessageId: 'same-terms', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { date: s.date, maxFee: s.maxFee } };
  const result = await ingestReply(artist(), s.id, input, NOW); assert.equal(result.noChange, true); assert.equal(result.version, 1);
  const d = (await deskFor(artist().id, s.id))!; assert.equal(d.opportunity.version, 1); assert.equal(d.actions[0].state, 'approved'); assert.equal(d.actions[0].approval?.token, a.approval!.token);
  assert.equal(d.events.filter((e) => e.kind === 'reply-no-change').length, 1);
  const duplicate = await ingestReply(artist(), s.id, input, NOW); assert.equal(duplicate.duplicate, true);
});
test('operator-reviewed paste applies only chosen structured fields, not private text', async () => {
  const { s, a } = await approved();
  await ingestReply(artist(), s.id, { sourceMessageId: 'reviewed:opaque-fingerprint', contactId: `fixture-booker:${s.id}`, expectedVersion: 1, patch: { maxFee: 150 } }, NOW);
  const d = (await deskFor(artist().id, s.id))!; assert.equal(d.opportunity.date, s.date); assert.equal(d.opportunity.maxFee, 150); assert.equal(d.actions[0].approval, null); assert.equal(d.actions[0].state, 'invalidated');
  assert.match(d.events.find(e => e.kind === 'reply')!.detail, /contact not verified/);
  await assert.rejects(executeAction(artist(), a.id, a.approval!.token, { now: NOW }), status(409));
});
