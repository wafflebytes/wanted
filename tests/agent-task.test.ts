import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { artist, NOW, opportunity, views } from './fixtures';
import { pressureResult } from '../src/lib/operations';
import { taskSummary } from '../src/lib/agent-task';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-agent-task-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
import { all, run } from '../src/server/db';
import { agentTaskFor, pauseAgentTask, startAgentTask } from '../src/server/operations/task-store';
import { runAgentTask } from '../src/server/operations/task-runner';
import { approveAction, deskFor, executeAction, ingestReply, insertOpportunity, payloadHash, prepareAction } from '../src/server/operations/store';
let n = 0;
async function setup() { const show = opportunity(`agent-${++n}`); await insertOpportunity(artist(), show); await startAgentTask(artist(), show.id, 1, 'balanced', NOW); return show; }
const rank = async (_artist: unknown, policy: 'balanced' | 'strict' = 'balanced', showId = '') => pressureResult((await deskFor(artist().id, showId))!.opportunity, views(), NOW, policy);
async function ready() { const show = await setup(); const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; const action = (await deskFor(artist().id, show.id))!.actions.find(a => a.id === task.actionId)!; return { show, task, action }; }
const status = (code: number) => (e: unknown) => !!e && typeof e === 'object' && 'status' in e && e.status === code;

test('one durable goal compares and prepares then waits without approval or effect', async () => {
  const { show, task, action } = await ready(); assert.equal(task.waitingFor, 'approval'); assert.equal(task.state, 'waiting'); assert.equal(action.state, 'prepared'); assert.equal(action.approval, null); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 0);
});
test('duplicate starts keep one queued task and one generation', async () => {
  const show = await setup(); const prior = (await agentTaskFor(artist().id, show.id))!;
  const again = await startAgentTask(artist(), show.id, 1, 'balanced', NOW); assert.equal(again.id, prior.id); assert.equal(again.generation, prior.generation);
});
test('concurrent runners perform one cultural lookup and prepare one request', async () => {
  const show = await setup(); let calls = 0;
  const ranks = async (...args: Parameters<typeof rank>) => { calls++; return rank(...args); };
  await Promise.all([runAgentTask(artist(), show.id, { now: NOW, rank: ranks }), runAgentTask(artist(), show.id, { now: NOW, rank: ranks })]);
  assert.equal(calls, 1); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 1);
});
test('approval wakes the job but never creates a send effect', async () => {
  const { show, action } = await ready(); await approveAction(artist(), action.id, 1, payloadHash(action), NOW);
  assert.equal((await agentTaskFor(artist().id, show.id))!.state, 'queued');
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!;
  assert.equal(task.waitingFor, 'save'); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 0);
});
test('a save waits for the other side, not an invented agreement', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action), NOW);
  await executeAction(artist(), a.id, a.approval!.token, { now: NOW });
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!;
  assert.equal(task.waitingFor, 'reply'); assert.match(taskSummary(task).body, /No artist agreement/); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 1);
});
test('a lost receipt is recovered automatically without a second effect', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action), NOW);
  await executeAction(artist(), a.id, a.approval!.token, { now: NOW, loseAcknowledgment: true });
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; const desk = (await deskFor(artist().id, show.id))!;
  assert.equal(task.waitingFor, 'reply'); assert.equal(desk.actions[0].state, 'provider_accepted'); assert.equal(desk.metrics.fixtureEffects, 1);
});
test('a date change wakes the goal but cannot reconfirm availability', async () => {
  const { show } = await ready(); await ingestReply(artist(), show.id, { sourceMessageId: 'date', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } }, NOW);
  let called = false; const task = (await runAgentTask(artist(), show.id, { now: NOW, rank: async (...args) => { called = true; return rank(...args); } }))!;
  assert.equal(task.waitingFor, 'availability'); assert.equal(called, false); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 1);
});
test('an unsent budget change invalidates old approval and prepares current terms', async () => {
  const { show, action } = await ready(); await approveAction(artist(), action.id, 1, payloadHash(action), NOW);
  await ingestReply(artist(), show.id, { sourceMessageId: 'budget', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { maxFee: 150 } }, NOW);
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; const desk = (await deskFor(artist().id, show.id))!;
  assert.equal(task.version, 2); assert.equal(task.waitingFor, 'approval'); assert.equal(desk.actions.find(a => a.id === action.id)!.state, 'invalidated'); assert.equal(desk.actions.find(a => a.id === task.actionId)!.version, 2); assert.equal(desk.metrics.fixtureEffects, 0);
});
test('no-op and duplicate replies do not wake or invalidate waiting approval', async () => {
  const { show, task, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action), NOW); await runAgentTask(artist(), show.id, { now: NOW, rank });
  const before = (await agentTaskFor(artist().id, show.id))!;
  const input = { sourceMessageId: 'same', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { maxFee: show.maxFee } };
  await ingestReply(artist(), show.id, input, NOW); await ingestReply(artist(), show.id, input, NOW);
  const after = (await agentTaskFor(artist().id, show.id))!; assert.equal(after.generation, before.generation); assert.equal(after.waitingFor, 'save'); assert.equal((await deskFor(artist().id, show.id))!.actions.find(x => x.id === task.actionId)!.approval!.token, a.approval!.token);
});
test('pause during a lookup fences the stale worker from preparing anything', async () => {
  const show = await setup(); let release!: () => void, entered!: () => void;
  const started = new Promise<void>(r => { entered = r; }); const gate = new Promise<void>(r => { release = r; });
  const running = runAgentTask(artist(), show.id, { now: NOW, rank: async (...args) => { entered(); await gate; return rank(...args); } });
  await started; await pauseAgentTask(artist(), show.id, NOW); release(); await running;
  assert.equal((await agentTaskFor(artist().id, show.id))!.state, 'paused'); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('a show change during lookup retains the newer wake, not stale failure or request', async () => {
  const show = await setup(); let release!: () => void, entered!: () => void;
  const started = new Promise<void>(r => { entered = r; }); const gate = new Promise<void>(r => { release = r; }); const old = pressureResult(show, views(), NOW);
  const running = runAgentTask(artist(), show.id, { now: NOW, rank: async () => { entered(); await gate; return old; } });
  await started; await ingestReply(artist(), show.id, { sourceMessageId: 'while-ranking', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { maxFee: 150 } }, NOW); release(); await running;
  const task = (await agentTaskFor(artist().id, show.id))!; assert.equal(task.version, 2); assert.equal(task.state, 'queued'); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('a worker lease expires after a restart and a new worker resumes once', async () => {
  const show = await setup(); const task = (await agentTaskFor(artist().id, show.id))!; task.state = 'running'; task.attempts = 1;
  await run("update ops_agent_tasks set state = 'running', run_token = 'dead-worker', lease_until = ?, body = ? where id = ?", [NOW - 1, JSON.stringify(task), task.id]);
  const resumed = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; assert.equal(resumed.waitingFor, 'approval'); assert.equal(resumed.attempts, 2); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 1);
});
test('retry exhaustion needs explicit resume and does not spin provider calls', async () => {
  const show = await setup(); let calls = 0; const broken = async () => { calls++; throw new Error('Provider unavailable'); };
  for (let i = 0; i < 5; i++) await runAgentTask(artist(), show.id, { now: NOW, rank: broken });
  assert.equal(calls, 3); assert.equal((await agentTaskFor(artist().id, show.id))!.state, 'failed');
  await startAgentTask(artist(), show.id, 1, 'balanced', NOW); assert.equal((await runAgentTask(artist(), show.id, { now: NOW, rank }))!.waitingFor, 'approval');
});
test('a changed show after a saved request requires follow-up rather than a replacement', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action), NOW); await executeAction(artist(), a.id, a.approval!.token, { now: NOW });
  await ingestReply(artist(), show.id, { sourceMessageId: 'after-save', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { maxFee: 150 } }, NOW);
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; const desk = (await deskFor(artist().id, show.id))!; assert.equal(task.waitingFor, 'follow-up'); assert.equal(desk.actions.length, 1); assert.equal(desk.metrics.fixtureEffects, 1);
});
test('cancellation still recovers the historical receipt before stopping', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action), NOW); await executeAction(artist(), a.id, a.approval!.token, { now: NOW, loseAcknowledgment: true });
  await ingestReply(artist(), show.id, { sourceMessageId: 'cancel', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { canceled: true } }, NOW);
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; assert.equal(task.state, 'canceled'); assert.ok((await deskFor(artist().id, show.id))!.actions[0].receipt); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 1);
});
test('show changes never unpause the operator’s job', async () => {
  const { show } = await ready(); await pauseAgentTask(artist(), show.id, NOW); await ingestReply(artist(), show.id, { sourceMessageId: 'paused', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { maxFee: 150 } }, NOW);
  assert.equal((await runAgentTask(artist(), show.id, { now: NOW, rank }))!.state, 'paused');
});
test('an operator-chosen eligible request is respected instead of silently replacing it', async () => {
  const { show } = await ready(); const chosen = await prepareAction(artist(), show.id, 'c1', 1, NOW);
  const task = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!; assert.equal(task.actionId, chosen.id); assert.equal(task.waitingFor, 'approval');
});
test('task and exact waiting action survive a separate process', async () => {
  const { show, task } = await ready();
  const script = `import {agentTaskFor} from './src/server/operations/task-store.ts'; console.log(JSON.stringify(await agentTaskFor('test-act',${JSON.stringify(show.id)})));process.exit(0)`;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr); const persisted = JSON.parse(child.stdout); assert.equal(persisted.id, task.id); assert.equal(persisted.waitingFor, 'approval'); assert.equal(persisted.actionId, task.actionId);
});
test('real-account and cross-act task authority are denied', async () => {
  const show = await setup(); await assert.rejects(startAgentTask(artist('test-act', false), show.id, 1), status(403)); await assert.rejects(startAgentTask(artist('other'), show.id, 1), status(404));
});
test('a missing culture view never becomes a prepared request', async () => {
  const show = await setup(); const task = (await runAgentTask(artist(), show.id, { now: NOW, rank: async () => pressureResult(show, { ...views(), scene: { scores: [], receipt: null, error: 'missing affinity' } }, NOW) }))!;
  assert.equal(task.waitingFor, 'evidence'); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});

test('a due approval wait revalidates expiry instead of treating old OK as current', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action), NOW);
  const waiting = (await runAgentTask(artist(), show.id, { now: NOW, rank }))!;
  assert.equal(waiting.waitingFor, 'save'); assert.equal(waiting.nextCheckAt, a.approval!.expiresAt);
  const expired = (await runAgentTask(artist(), show.id, { now: a.approval!.expiresAt + 1, rank }))!;
  assert.equal(expired.waitingFor, 'approval'); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 0);
});
test('an idle wait before its deadline does not rerun Qloo or rewrite the generation', async () => {
  const { show, task } = await ready(); let calls = 0;
  const same = (await runAgentTask(artist(), show.id, { now: NOW + 100, rank: async (...args) => { calls++; return rank(...args); } }))!;
  assert.equal(calls, 0); assert.equal(same.generation, task.generation); assert.equal(same.waitingFor, 'approval');
});
test('canceling a paused show closes the job without new research or effects', async () => {
  const { show } = await ready(); await pauseAgentTask(artist(), show.id, NOW);
  await ingestReply(artist(), show.id, { sourceMessageId: 'paused-cancel', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { canceled: true } }, NOW);
  let called = false; const task = (await runAgentTask(artist(), show.id, { now: NOW, rank: async (...args) => { called = true; return rank(...args); } }))!;
  assert.equal(task.state, 'canceled'); assert.equal(called, false); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 0);
});
test('deterministic fallback stops expired scene before any taste request or preparation',async()=>{
 const show=await setup();show.sceneEvidence!.expiresAt=NOW-1;await run('update ops_opportunities set body=? where id=?',[JSON.stringify(show),show.id]);let lookups=0;
 const task=(await runAgentTask(artist(),show.id,{now:NOW,rank:async(...args)=>{lookups++;return rank(...args);}}))!;
 assert.equal(task.waitingFor,'evidence');assert.equal(lookups,0);assert.equal((await deskFor(artist().id,show.id))!.actions.length,0);
});
