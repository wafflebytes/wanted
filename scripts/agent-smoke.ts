/** Live local API test with isolated cookies; real/cached Qloo, local-only effects. */
import assert from 'node:assert/strict';
const origin = process.env.WANTED_TEST_ORIGIN ?? 'http://localhost:8082';
function session() {
  let cookie = '';
  return async (data?: unknown, expected = 200) => {
    const r = await fetch(`${origin}/api/artist/maya-ortiz/desk`, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
    const next = r.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
    const out = await r.json(); assert.equal(r.status, expected, out.error); return out;
  };
}
async function main() {
  const a = session(), b = session();
  await a({ kind: 'agent-start', version: 1 }, 403);
  let d = await a({ kind: 'init' }); await b({ kind: 'init' });
  d = await a({ kind: 'agent-start', version: 1 });
  assert.equal(d.task.waitingFor, 'approval'); assert.ok(d.task.actionId); assert.equal(d.desk.actions.length, 1); assert.equal(d.desk.metrics.fixtureEffects, 0);
  const original = d.desk.actions[0]; const taskId = d.task.id;
  await b({ kind: 'approve', actionId: original.id, version: 1, payloadHash: d.hashes[original.id], yes: true }, 403);
  d = await a(); assert.equal(d.task.id, taskId); assert.equal(d.task.actionId, original.id);
  d = await a({ kind: 'approve', actionId: original.id, version: 1, payloadHash: d.hashes[original.id], yes: true }); assert.equal(d.task.waitingFor, 'save'); assert.equal(d.desk.metrics.fixtureEffects, 0);
  const version = d.desk.opportunity.version;
  d = await a({ kind: 'reply', sourceMessageId: 'agent-budget-change', contactId: `fixture-booker:${d.desk.opportunity.id}`, version, patch: { maxFee: 150 } });
  assert.equal(d.desk.opportunity.version, 2); assert.equal(d.task.version, 2);
  // A smaller feasible pool can fail the two-context rule. Ask the operator, not
  // manufacture a winner. An explicit eligible choice resumes the same job.
  if (d.task.waitingFor === 'choice') { const candidate = d.desk.opportunity.roster.find((c: any) => c.fee.value <= 150); d = await a({ kind: 'prepare', candidateId: candidate.id, version: 2 }); }
  assert.equal(d.task.waitingFor, 'approval'); assert.notEqual(d.task.actionId, original.id);
  assert.equal(d.desk.actions.find((x: any) => x.id === original.id).state, 'invalidated');
  let action = d.desk.actions.find((x: any) => x.id === d.task.actionId);
  d = await a({ kind: 'approve', actionId: action.id, version: 2, payloadHash: d.hashes[action.id], yes: true }); action = d.desk.actions.find((x: any) => x.id === action.id);
  d = await a({ kind: 'execute', actionId: action.id, token: action.approval.token, loseAcknowledgment: true });
  assert.equal(d.task.waitingFor, 'reply'); assert.equal(d.desk.metrics.fixtureEffects, 1); assert.ok(d.desk.actions.find((x: any) => x.id === action.id).receipt);
  d = await a({ kind: 'reply', sourceMessageId: 'after-saved', contactId: `fixture-booker:${d.desk.opportunity.id}`, version: 2, patch: { maxFee: 175 } }); assert.equal(d.task.waitingFor, 'follow-up'); assert.equal(d.desk.metrics.fixtureEffects, 1);
  d = await a({ kind: 'agent-pause' }); assert.equal(d.task.state, 'paused');
  await a({ kind: 'reset' }); d = await a({ kind: 'agent-start', version: 1 });
  const show = d.desk.opportunity; const date = new Date(`${show.date}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1);
  d = await a({ kind: 'reply', sourceMessageId: 'agent-new-date', contactId: `fixture-booker:${show.id}`, version: 1, patch: { date: date.toISOString().slice(0, 10) } }); assert.equal(d.task.waitingFor, 'availability');
  d = await a({ kind: 'reconfirm', version: 2 }); assert.equal(d.task.version, 3); assert.equal(d.task.waitingFor, 'approval');
  await a({ kind: 'agent-pause' }); d = await a({ kind: 'reply', sourceMessageId: 'paused-change', contactId: `fixture-booker:${show.id}`, version: 3, patch: { maxFee: 190 } }); assert.equal(d.task.state, 'paused');
  d = await a({ kind: 'agent-resume', version: 4 }); assert.equal(d.task.waitingFor, 'approval'); assert.equal(d.task.version, 4);
  await a({ kind: 'reset' }); assert.equal((await a()).task, null); assert.equal((await b()).task, null);
  assert.equal((await fetch(`${origin}/api/cron/gus`)).status, 401);
  console.log(JSON.stringify({ result: 'passed', scope: 'local API, real/cached Qloo, fictional operating facts, no real sends', checks: ['autonomous qualify/rank/prepare', 'exact approval without send', 'automatic budget replan', 'lease-backed persistent task', 'cross-case action denial', 'lost receipt recovery without duplicate effect', 'follow-up wait after saved request changes', 'date-specific evidence wait', 'explicit evidence update resumes', 'pause persists across changes', 'resume revalidates', 'reset isolation', 'unauthorized scheduler denied'] }, null, 2));
}
main().then(() => process.exit(0), e => { console.error(e instanceof Error ? e.stack : String(e)); process.exit(1); });
