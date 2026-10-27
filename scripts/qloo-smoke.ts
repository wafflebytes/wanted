/** Read-only mechanism checks. No inventory/contact data, no invented local scene claims. */
import './lib/env';
import assert from 'node:assert/strict';
import { searchActs, rankCandidateRoster } from '../src/server/qloo/api';
import { validateRanking } from '../src/lib/operations';
import { redact } from '../src/server/env';
const names = ['Phoebe Bridgers', 'Flying Lotus', 'Lucy Dacus', 'Japanese Breakfast', 'Thundercat', 'Kamasi Washington'];
async function main() {
  const resolved = await Promise.all(names.map(async (name) => {
    const r = await searchActs(name, 'artist', 'smoke:roster');
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const e = r.data.find((x) => norm(x.name) === norm(name));
    if (!e) throw new Error(`Exact identity unresolved: ${name}`);
    return { id: e.id, name: e.name };
  }));
  const pool = resolved.slice(2).map((e) => e.id);
  const conditions: Record<string, ReturnType<typeof validateRanking>> = {};
  for (const [label, signal] of [['act', [resolved[0]]], ['scene', [resolved[1]]], ['joint', resolved.slice(0, 2)]] as const) {
    const r = await rankCandidateRoster([...signal], pool, 'smoke:roster');
    assert.equal(r.receipt.stale, false, 'Stale results are not a contract pass.');
    const scores = validateRanking(pool, r.data);
    conditions[label] = scores;
    console.log(JSON.stringify({ condition: label, status: r.receipt.status, cached: r.receipt.cached, stale: r.receipt.stale, mechanism: 'same supplied artist pool, illustrative contexts', order: scores.map((s) => ({ name: resolved.find((e) => e.id === s.entityId)?.name, rank: s.rank })), latencyMs: r.receipt.latencyMs }));
  }
  const changed = conditions.act.some(a => { const b = conditions.scene.find(x => x.entityId === a.entityId)!; return a.rank !== b.rank || Math.abs(a.affinity - b.affinity) > 1e-12; });
  assert.ok(changed, 'Changing the cultural signal must not silently return the same scores and order.');
  console.log(JSON.stringify({ gate: 'signal-sensitivity', passed: true, samePool: true, claim: 'API mechanism only, not recommendation quality or ticket lift' }));
}
main().then(() => process.exit(0), (e) => { console.error(redact(String(e))); process.exit(1); });
