/** Synthetic completions test guards only. These are NOT the real-model eval gate. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artist, opportunity, views } from './fixtures';
import { pressureResult } from '../src/lib/operations';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-task-agent-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
import { agentTaskFor, pauseAgentTask, startAgentTask } from '../src/server/operations/task-store';
import { runAgentTask } from '../src/server/operations/task-runner';
import { approveAction, deskFor, executeAction, ingestReply, insertOpportunity, payloadHash } from '../src/server/operations/store';
import { run } from '../src/server/db';
import type { ChatOptions, ChatResult } from '../src/server/gus/llm';
let n = 0;
async function setup() {
  const show = opportunity(`model-contract-${++n}`); const now = Date.now(); show.updatedAt = now;
  for (const c of show.roster) for (const e of [c.locality, c.live, c.capacity, c.fee, c.availability, c.intake]) { if (e) { e.observedAt = now - 1000; e.expiresAt = now + 2 * 86_400_000; } }
  show.sceneEvidence!.observedAt = now - 1000; show.sceneEvidence!.expiresAt = now + 2 * 86_400_000;
  await insertOpportunity(artist(), show); await startAgentTask(artist(), show.id, 1);
  return show;
}
const rank = async (_artist: unknown, policy: 'balanced' | 'strict' = 'balanced', showId = '') => pressureResult((await deskFor(artist().id, showId))!.opportunity, views(), Date.now(), policy);
function scripted(calls: { name: string; args?: unknown; before?: (options: ChatOptions) => void }[]) {
  let i = 0;
  return async (options: ChatOptions): Promise<ChatResult> => {
    const c = calls[i++]; assert.ok(c, 'Unexpected extra completion'); c.before?.(options);
    return { model: 'synthetic-contract-model-not-a-live-eval', cached: false, latencyMs: 0, content: null, toolCalls: [{ id: `call-${i}`, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) } }] };
  };
}
async function ready() {
  const show = await setup(); const task = (await runAgentTask(artist(), show.id, { now: Date.now(), rank }))!;
  const action = (await deskFor(artist().id, show.id))!.actions.find(a => a.id === task.actionId)!;
  return { show, task, action };
}
test('model tools prepare only the validated same-version choice, never an approval/effect', async () => {
  const show = await setup(); const selected = (await rank(artist(), 'balanced', show.id)).selectedId!;
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { rank, complete: scripted([{ name: 'inspect_show' }, { name: 'compare_bill' }, { name: 'prepare_request', args: { candidateId: selected } }]) } }))!;
  const desk = (await deskFor(artist().id, show.id))!;
  assert.equal(task.waitingFor, 'approval'); assert.equal(desk.actions[0].candidateId, selected); assert.equal(desk.actions[0].approval, null); assert.equal(desk.metrics.fixtureEffects, 0);
});
test('unknown side-effect tools, extra money arguments and unselected targets are rejected', async () => {
  const show = await setup(); const selected = (await rank(artist(), 'balanced', show.id)).selectedId!;
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { rank, complete: scripted([{ name: 'inspect_show' }, { name: 'send_request', args: { candidateId: selected } }, { name: 'compare_bill' }, { name: 'prepare_request', args: { candidateId: selected, amount: 1, approve: true } }, { name: 'prepare_request', args: { candidateId: 'not-the-selected-target' } }, { name: 'prepare_request', args: { candidateId: selected } }]) } }))!;
  const desk = (await deskFor(artist().id, show.id))!;
  assert.equal(task.waitingFor, 'approval'); assert.equal(task.execution!.steps.filter(s => !s.ok).length, 3); assert.equal(desk.actions.length, 1); assert.equal(desk.actions[0].payload.amount, 100); assert.equal(desk.metrics.fixtureEffects, 0);
});
test('model cannot compare or fabricate availability after a date change', async () => {
  const show = await setup(); await ingestReply(artist(), show.id, { sourceMessageId: 'model-date', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } });
  let ranks = 0;
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { rank: async (...args) => { ranks++; return rank(...args); }, complete: scripted([{ name: 'inspect_show' }, { name: 'compare_bill' }, { name: 'wait_for_input', args: { need: 'approval' } }, { name: 'wait_for_input', args: { need: 'availability' } }]) } }))!;
  assert.equal(task.waitingFor, 'availability'); assert.equal(ranks, 0); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('receipt recovery tool returns the justified reply wait without another effect', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action));
  await executeAction(artist(), a.id, a.approval!.token, { loseAcknowledgment: true });
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { complete: scripted([{ name: 'inspect_show' }, { name: 'recover_receipt', args: { actionId: a.id } }, { name: 'wait_for_input', args: { need: 'reply' }, before: o => { const last = o.messages.at(-1)!; assert.equal(last.role, 'tool'); assert.equal(JSON.parse(last.content!).justifiedWait, 'reply'); } }]) } }))!;
  assert.equal(task.waitingFor, 'reply'); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 1);
});
test('canceled show recovers its historical receipt then stops without a second effect', async () => {
  const { show, action } = await ready(); const a = await approveAction(artist(), action.id, 1, payloadHash(action)); await executeAction(artist(), a.id, a.approval!.token, { loseAcknowledgment: true });
  await ingestReply(artist(), show.id, { sourceMessageId: 'model-cancel', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { canceled: true } });
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { complete: scripted([{ name: 'inspect_show' }, { name: 'stop_canceled' }, { name: 'recover_receipt', args: { actionId: a.id } }, { name: 'stop_canceled' }]) } }))!;
  assert.equal(task.state, 'canceled'); assert.equal((await deskFor(artist().id, show.id))!.metrics.fixtureEffects, 1); assert.ok((await deskFor(artist().id, show.id))!.actions[0].receipt);
});
test('pause while a completion is pending stops old model tools and preserves the pause', async () => {
  const show = await setup(); let entered!: () => void, release!: () => void;
  const started = new Promise<void>(r => { entered = r; }); const gate = new Promise<void>(r => { release = r; }); let completions = 0;
  const running = runAgentTask(artist(), show.id, { requireLlm: true, model: { complete: async o => { completions++; entered(); await gate; return scripted([{ name: 'inspect_show' }])(o); } } });
  await started; await pauseAgentTask(artist(), show.id); release(); await running;
  assert.equal(completions, 1); assert.equal((await agentTaskFor(artist().id, show.id))!.state, 'paused'); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('a changed show while model comparison waits fences old results and retains the new wake', async () => {
  const show = await setup(); let entered!: () => void, release!: () => void;
  const started = new Promise<void>(r => { entered = r; }); const gate = new Promise<void>(r => { release = r; }); const old = pressureResult(show, views(), Date.now());
  const running = runAgentTask(artist(), show.id, { requireLlm: true, model: { rank: async () => { entered(); await gate; return old; }, complete: scripted([{ name: 'inspect_show' }, { name: 'compare_bill' }]) } });
  await started; await ingestReply(artist(), show.id, { sourceMessageId: 'model-new-version', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { maxFee: 150 } }); release(); await running;
  const task = (await agentTaskFor(artist().id, show.id))!; assert.equal(task.version, 2); assert.equal(task.state, 'queued'); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('strict real-model gate never accepts a rules fallback as LLM success', async () => {
  const show = await setup(); const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { complete: async () => { throw new Error('Provider unavailable'); } } }))!;
  assert.equal(task.state, 'failed'); assert.equal(task.execution!.engine, 'unavailable'); assert.equal(task.execution!.cached, false); assert.equal(task.execution!.models.length, 0); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('ordinary fallback is explicitly labeled and still fails closed on missing facts', async () => {
  const show = await setup(); await ingestReply(artist(), show.id, { sourceMessageId: 'model-fallback-date', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } });
  const task = (await runAgentTask(artist(), show.id, { model: { complete: async () => { throw new Error('Provider unavailable'); } } }))!;
  assert.equal(task.waitingFor, 'availability'); assert.equal(task.execution!.engine, 'rules'); assert.match(task.execution!.failure!, /Provider unavailable/); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('a model-only success narrative establishes no business outcome', async () => {
  const show = await setup(); const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { complete: async () => ({ model: 'synthetic', content: 'The request is approved and paid.', toolCalls: [], cached: false, latencyMs: 0 }) } }))!;
  assert.equal(task.state, 'failed'); assert.match(task.execution!.failure!, /narrated/); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('parent deadline aborts a slow model before its lease can expire', async () => {
  const show = await setup(); const started = Date.now();
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { budgetMs: 1000, complete: o => new Promise((_, reject) => { o.signal!.addEventListener('abort', () => reject(new Error('Planning aborted')), { once: true }); }) } }))!;
  assert.ok(Date.now() - started < 3000); assert.equal(task.state, 'failed'); assert.equal((await deskFor(artist().id, show.id))!.actions.length, 0);
});
test('tool capabilities are scoped to the current evidence and sequential mode is requested', async () => {
  const show = await setup(); await ingestReply(artist(), show.id, { sourceMessageId: 'capability-date', contactId: `fixture-booker:${show.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } });
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { complete: scripted([
    { name: 'inspect_show', before: o => { assert.equal(o.parallelToolCalls, false); assert.deepEqual(o.tools?.map(t => t.function.name), ['inspect_show']); } },
    { name: 'wait_for_input', args: { need: 'availability' }, before: o => { assert.deepEqual(o.tools?.map(t => t.function.name), ['inspect_show', 'wait_for_input']); } },
  ]) } }))!;
  assert.equal(task.waitingFor, 'availability'); assert.equal(task.execution!.steps.filter(s => !s.ok).length, 0);
});
test('parallel inspect/compare batch executes nothing and must be corrected sequentially', async () => {
  const show = await setup(); let completions = 0, ranks = 0;
  const selected = (await rank(artist(), 'balanced', show.id)).selectedId!;
  const serial = scripted([{ name: 'inspect_show' }, { name: 'compare_bill' }, { name: 'prepare_request', args: { candidateId: selected } }]);
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: {
    rank: async (...args) => { ranks++; return rank(...args); }, complete: async o => {
      if (completions++ === 0) return { model: 'synthetic', cached: false, latencyMs: 0, content: null, toolCalls: ['inspect_show', 'compare_bill'].map((name, i) => ({ id: `batch-${i}`, type: 'function' as const, function: { name, arguments: '{}' } })) };
      if (completions === 2) { assert.equal(ranks, 0); assert.deepEqual(o.tools?.map(t => t.function.name), ['inspect_show']); }
      return serial(o);
    },
  } }))!;
  assert.equal(task.waitingFor, 'approval'); assert.equal(ranks, 1); assert.equal(task.execution!.steps.filter(s => !s.ok).length, 2);
});
test('expired scene stops before cultural lookup and offers only an evidence wait', async () => {
  const show = await setup(); show.sceneEvidence.expiresAt = Date.now() - 1;
  await run('update ops_opportunities set body = ? where id = ? and artist_id = ?', [JSON.stringify(show), show.id, artist().id]);
  let ranks = 0;
  const task = (await runAgentTask(artist(), show.id, { requireLlm: true, model: { rank: async (...args) => { ranks++; return rank(...args); }, complete: scripted([
    { name: 'inspect_show' }, { name: 'wait_for_input', args: { need: 'evidence' }, before: o => { assert.equal(JSON.parse(o.messages.at(-1)!.content!).justifiedWait, 'evidence'); assert.ok(!o.tools?.some(t => t.function.name === 'compare_bill')); } },
  ]) } }))!;
  assert.equal(task.waitingFor, 'evidence'); assert.equal(ranks, 0); assert.equal(task.execution!.steps.filter(s => !s.ok).length, 0);
});
