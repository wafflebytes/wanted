import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { artist, NOW, opportunity, views } from './fixtures';
import { pressureResult } from '../src/lib/operations';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-attention-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
import { all } from '../src/server/db';
import { insertOpportunity, deskFor, ingestReply } from '../src/server/operations/store';
import { startAgentTask, pauseAgentTask } from '../src/server/operations/task-store';
import { runAgentTask } from '../src/server/operations/task-runner';
import { drainTaskAttention } from '../src/server/operations/attention';
let n = 0;
async function ready() {
  const show = opportunity(`attention-${++n}`); await insertOpportunity(artist(), show); await startAgentTask(artist(), show.id, 1, 'balanced', NOW);
  await runAgentTask(artist(), show.id, { now: NOW, rank: async (_a, policy) => pressureResult(show, views(), NOW, policy) }); return show;
}
test('a committed human wait has an attention intent and concurrent drains save one internal notice', async () => {
  const s = await ready(); const pending = await all<{ state: string }>('select state from ops_attention where opportunity_id = ?', [s.id]); assert.equal(pending.length, 1); assert.equal(pending[0].state, 'queued');
  const results = await Promise.all([drainTaskAttention(100, NOW), drainTaskAttention(100, NOW)]);
  assert.equal(results.reduce((n, r) => n + r.delivered, 0), 1);
  const inbox = await all<{ evidence: string }>('select evidence from gus_inbox where artist_id = ?', [artist().id]); assert.equal(inbox.length, 1); assert.equal(JSON.parse(inbox[0].evidence).delivery, 'internal-inbox-only');
  assert.equal((await drainTaskAttention(100, NOW)).delivered, 0);
});
test('pause cancels pending attention; a changed generation never delivers stale approval notices', async () => {
  const paused = await ready(); await pauseAgentTask(artist(), paused.id, NOW); assert.equal((await drainTaskAttention(100, NOW)).delivered, 0);
  const changed = await ready(); await ingestReply(artist(), changed.id, { sourceMessageId: 'changed-attention', contactId: `fixture-booker:${changed.id}`, expectedVersion: 1, patch: { date: '2026-11-21' } }, NOW);
  assert.equal((await drainTaskAttention(100, NOW)).delivered, 0);
  await runAgentTask(artist(), changed.id, { now: NOW, rank: async () => { throw new Error('must not rank'); } });
  assert.equal((await drainTaskAttention(100, NOW)).delivered, 1);
});
test('independent restart drains saved work once without models or network', async () => {
  const s = await ready(); const script = `import { drainTaskAttention } from './src/server/operations/attention.ts';console.log(JSON.stringify(await drainTaskAttention(100,${NOW})));process.exit(0);`;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { env: process.env, cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr); assert.equal(JSON.parse(child.stdout).delivered, 1);
  assert.equal((await drainTaskAttention(100, NOW)).delivered, 0);
  assert.equal((await deskFor(artist().id, s.id))!.metrics.fixtureEffects, 0);
});
test('attention contains no approval token, monetary payload, contact or raw candidate text', async () => {
  const s = await ready(); const rows = await all<{ body: string }>('select body from ops_attention where opportunity_id = ?', [s.id]);
  assert.ok(!rows[0].body.includes('token')); assert.ok(!rows[0].body.includes('Candidate c')); assert.ok(!rows[0].body.includes('payload')); assert.ok(!rows[0].body.includes('contact'));
});
test('retry exhaustion emits one notice, and reading it is not approval or a resumed job', async () => {
  const s = opportunity(`attention-failed-${++n}`); await insertOpportunity(artist(),s); await startAgentTask(artist(),s.id,1,'balanced',NOW);
  for(let i=0;i<3;i++) await runAgentTask(artist(),s.id,{now:NOW,rank:async()=>{throw new Error('synthetic transient failure');}});
  await drainTaskAttention(100,NOW);
  const rows=await all<{id:string;state:string;body:string}>('select id,state,body from ops_attention where opportunity_id=?',[s.id]);assert.equal(rows.length,1);assert.equal(JSON.parse(rows[0].body).need,'retry');
  const {markRead}=await import('../src/server/inbox');await markRead(artist().id,`attention-inbox:${rows[0].id}`);
  assert.equal((await all<{state:string}>('select state from ops_attention where id=?',[rows[0].id]))[0].state,'acknowledged');
  assert.equal((await deskFor(artist().id,s.id))!.metrics.fixtureEffects,0);assert.equal((await drainTaskAttention(100,NOW)).delivered,0);
});
