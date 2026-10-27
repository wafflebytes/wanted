/** Full API workflow with independent cookie jars; no browser or screenshots required. */
import assert from 'node:assert/strict';
const origin = process.env.WANTED_TEST_ORIGIN ?? 'http://localhost:8082';
function session() {
  let cookie = '';
  return async (data?: unknown, expected = 200) => {
    const r = await fetch(`${origin}/api/artist/maya-ortiz/desk`, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
    const next = r.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
    const out = await r.json(); assert.equal(r.status, expected, out.error ?? 'Unexpected API response'); return out;
  };
}
async function main() {
  const a = session(), b = session(), unauthenticated = session();
  await unauthenticated({ kind: 'execute', actionId: 'outside', token: 'outside' }, 403);
  const initial = await a({ kind: 'init' });
  const other = await b({ kind: 'init' });
  assert.notEqual(initial.desk.opportunity.id, other.desk.opportunity.id);
  let d = await a({ kind: 'rank' });
  for (const v of Object.values(d.desk.pressure.views) as any[]) { assert.equal(v.error, null); assert.equal(v.scores.length, 4); }
  const ranked = d.desk.pressure.rows.map((r: any) => ({ name: r.name, act: r.actRank, scene: r.sceneRank, joint: r.jointRank }));
  const selected = d.desk.pressure.selectedId; assert.ok(selected);
  d = await a({ kind: 'prepare', candidateId: selected, version: 1 });
  let action = d.desk.actions[0];
  await b({ kind: 'approve', actionId: action.id, version: 1, payloadHash: d.hashes[action.id], yes: true }, 403);
  d = await a({ kind: 'approve', actionId: action.id, version: 1, payloadHash: d.hashes[action.id], yes: true }); action = d.desk.actions[0];
  const token = action.approval.token;
  d = await a({ kind: 'execute', actionId: action.id, token, loseAcknowledgment: true }); assert.equal(d.desk.actions[0].state, 'uncertain');
  d = await a({ kind: 'execute', actionId: action.id, token }); assert.equal(d.desk.actions[0].state, 'provider_accepted');
  const ref = d.desk.actions[0].receipt.ref;
  d = await a({ kind: 'execute', actionId: action.id, token }); assert.equal(d.desk.actions[0].receipt.ref, ref);
  assert.equal(d.desk.events.filter((e: any) => e.kind === 'uncertain').length, 1);
  const alternative = d.desk.opportunity.roster.find((c: any) => c.id !== selected);
  d = await a({ kind: 'prepare', candidateId: alternative.id, version: 1 });
  action = d.desk.actions.find((x: any) => x.candidateId === alternative.id);
  d = await a({ kind: 'approve', actionId: action.id, version: 1, payloadHash: d.hashes[action.id], yes: true });
  action = d.desk.actions.find((x: any) => x.id === action.id);
  const show = d.desk.opportunity;
  const date = new Date(`${show.date}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1);
  const reply = { kind: 'reply', sourceMessageId: 'recorded-fixture-reply', contactId: `fixture-booker:${show.id}`, version: 1, patch: { date: date.toISOString().slice(0, 10) } };
  d = await a(reply); assert.equal(d.desk.opportunity.version, 2);
  d = await a(reply); assert.equal(d.desk.opportunity.version, 2);
  assert.equal(d.desk.actions.find((x: any) => x.id === action.id).state, 'invalidated');
  await a({ kind: 'execute', actionId: action.id, token: action.approval.token }, 409);
  d = await a(); assert.equal(d.desk.opportunity.version, 2);
  d = await a({ kind: 'reconfirm', version: 2 }); assert.equal(d.desk.opportunity.version, 3);
  d = await a({ kind: 'rank', policy: 'strict' }); assert.equal(d.desk.pressure.selectedId, null);
  d = await a({ kind: 'reset' }); assert.equal((await b()).desk.opportunity.version, 1);
  d = await a({ kind: 'rank' });
  const firstSelection = d.desk.pressure.selectedId;
  const rosterBefore = d.desk.opportunity.roster;
  d = await a({ kind: 'sensitivity' });
  assert.equal(d.sensitivity.variants.length, 2); assert.equal(d.sensitivity.variants.some((v: any) => v.error), false);
  const sensitivity = { status: d.sensitivity.status, variants: d.sensitivity.variants.map((v: any) => ({ removed: v.removedReference, choice: d.desk.opportunity.roster.find((c: any) => c.id === v.selectedId)?.name ?? 'no bridge' })) };
  d = await a({ kind: 'prepare', candidateId: firstSelection, version: 1 });
  action = d.desk.actions[0];
  d = await a({ kind: 'approve', actionId: action.id, version: 1, payloadHash: d.hashes[action.id], yes: true });
  d = await a({ kind: 'scene', context: 'indie', version: 1 });
  assert.equal(d.desk.opportunity.version, 2); assert.deepEqual(d.desk.opportunity.roster, rosterBefore); assert.equal(d.sensitivity, null); assert.equal(d.desk.actions[0].state, 'invalidated');
  d = await a({ kind: 'rank' }); assert.equal(d.desk.pressure.views.act.scores.length, 4); assert.equal(d.desk.pressure.views.scene.scores.length, 4); assert.notEqual(d.desk.pressure.selectedId, firstSelection);
  const counterfactual = { sameRoster: true, leftFieldChoice: rosterBefore.find((c: any) => c.id === firstSelection)?.name, indieChoice: rosterBefore.find((c: any) => c.id === d.desk.pressure.selectedId)?.name };
  await a({ kind: 'reset' });
  d = await a();
  d = await a({ kind: 'prepare', candidateId: d.desk.opportunity.roster[0].id, version: 1 }); action = d.desk.actions[0];
  d = await a({ kind: 'approve', actionId: action.id, version: 1, payloadHash: d.hashes[action.id], yes: true });
  const currentApproval = d.desk.actions[0].approval.token;
  const currentDate = d.desk.opportunity.date;
  d = await a({ kind: 'reply', sourceMessageId: 'same-current-terms', contactId: `fixture-booker:${d.desk.opportunity.id}`, version: 1, patch: { date: currentDate, maxFee: 200 } });
  assert.equal(d.reply.noChange, true); assert.equal(d.desk.opportunity.version, 1); assert.equal(d.desk.actions[0].approval.token, currentApproval);
  const reviewedReply = { kind: 'reply', sourceMessageId: 'reviewed:opaque-local-fingerprint', contactId: `fixture-booker:${d.desk.opportunity.id}`, version: 1, patch: { maxFee: 150 } };
  d = await a(reviewedReply); assert.equal(d.desk.opportunity.maxFee, 150); assert.equal(d.desk.opportunity.date, currentDate); assert.equal(d.desk.actions[0].state, 'invalidated'); assert.equal(d.desk.opportunity.version, 2);
  d = await a(reviewedReply); assert.equal(d.reply.duplicate, true); assert.equal(d.desk.opportunity.version, 2);
  await a({ ...reviewedReply, text: 'This field is not accepted or persisted.' }, 400);
  await a({ kind: 'reset' });
  console.log(JSON.stringify({ result: 'passed', scope: 'actual local API with live/cached Qloo and fictional operations', checks: ['same-roster ranking', 'two cookie-isolated cases', 'unauthenticated and cross-case denial', 'exact approval', 'lost acknowledgment reconciliation', 'one effect event', 'duplicate reply dedupe', 'stale approval denied', 'state survives refetch', 'date reconfirmation', 'strict policy abstention', 'reset isolation', 'leave-one-reference-out check', 'scene counterfactual changes choice over same roster', 'scene correction invalidates approval', 'same-terms reply preserves approval', 'operator-reviewed fields only', 'reviewed-reply dedupe', 'raw-text API input rejected'], ranks: ranked, sensitivity, counterfactual }, null, 2));
}
main().then(() => process.exit(0), (e) => { console.error(String(e)); process.exit(1); });
