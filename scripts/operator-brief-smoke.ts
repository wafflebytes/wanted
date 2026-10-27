/** Live API regression. Real/cached Qloo, redacted illustrative assertions, no effects. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { briefSchema, type BriefResponse, type OperatorBrief } from '../src/lib/operator-brief';
import type { SoundEntity } from '../src/lib/types';
const origin = process.env.WANTED_TEST_ORIGIN ?? 'http://localhost:8083';
const withAgent = process.argv.includes('--agent');
function session() {
  let cookie = '';
  return async (input?: unknown, expected = 200): Promise<any> => {
    const r = await fetch(`${origin}/api/artist/maya-ortiz/brief`, { method: input ? 'POST' : 'GET', headers: { ...(input ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: input ? JSON.stringify(input) : undefined });
    const next = r.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
    const data = await r.json(); assert.equal(r.status, expected, data.error ?? `Unexpected HTTP ${r.status}`); return data;
  };
}
async function main() {
  const a = session(), b = session(); const checks: string[] = [];
  assert.equal((await a()).desk, null); await a({ kind: 'start', version: 1 }, 403); await a({ kind: 'search', query: 'private@example.com' }, 400);
  checks.push('no case, no start; private contacts never searched');
  const resolve = async (name: string): Promise<SoundEntity> => {
    const result = await a({ kind: 'search', query: name }); const e = result.matches.find((e: SoundEntity) => e.name.toLowerCase() === name.toLowerCase()); assert(e, `Exact Qloo match missing: ${name}`); return { id: e.id, name: e.name };
  };
  // Sequential calls use the same bounded rate-limited public search path as the UI.
  const act = await resolve('Phoebe Bridgers'), scene = await resolve('Bon Iver');
  const roster = [await resolve('Lucy Dacus'), await resolve('Thundercat')];
  const brief: OperatorBrief = { city: 'Burlington, VT', date: '2026-11-21', format: 'music', roomCapacity: 150, maxFee: 200, act: [act], scene: [scene], sceneSource: 'Illustrative smoke-test scene, not verified local history', consent: true,
    roster: roster.map((e,i) => ({ key: `c${i+1}`, name: e.name, entity: e, format: 'music', inCircuit: true, liveSuitable: true, scale: 100, fee: 120+i*20, availability: 'unknown', routeHeld: true, source: 'Illustrative test assertions, not actual quote or availability' })) };
  briefSchema.parse(brief);
  let data: BriefResponse = await a({ kind: 'save', version: 0, brief });
  assert.equal(data.desk?.opportunity.mode, 'operator'); assert.equal(data.desk?.opportunity.version, 1); assert.equal(data.desk?.metrics.fixtureEffects, 0);
  assert.equal((await b()).desk, null); await b({ kind: 'export', version: 1 }, 403);
  checks.push('operator provenance and cookie-isolated brief');
  data = await a({ kind: 'save', version: 0, brief }); assert.equal(data.saved, 'unchanged'); assert.equal(data.desk?.opportunity.version, 1);
  await a({ kind: 'save', version: 0, brief: { ...brief, maxFee: 180 } }, 409);
  await a({ kind: 'approve', version: 1 }, 400); await a({ kind: 'execute', version: 1 }, 400);
  const exported = await a({ kind: 'export', version: 1 }); assert.match(exported.markdown, /No current eligible request/); assert.match(exported.markdown, /Not sent, booked, approved or paid/);
  checks.push('exact retry no-op, stale write denial, no approval/effect API, honest missing-fact export');
  let execution;
  if (withAgent) {
    data = await a({ kind: 'start', version: 1 }); assert.equal(data.task?.waitingFor, 'availability'); assert.equal(data.desk?.actions.length, 0);
    checks.push('real API job stops on unknown availability');
    const ready = { ...brief, roster: brief.roster.map(c => ({ ...c, availability: 'available' as const })) };
    data = await a({ kind: 'save', version: 1, brief: ready }); assert.equal(data.task?.version, 2); assert.equal(data.task?.waitingFor, 'approval');
    const request = data.desk?.actions.find(a => a.id === data.task?.actionId); assert(request); assert.equal(request.mode, 'operator'); assert.equal(request.approval, null); assert.equal(request.receipt, null); assert.equal(data.desk?.metrics.fixtureEffects, 0);
    const prep = await a({ kind: 'export', version: 2 }); assert.match(prep.markdown, /Proposed message:/);
    execution = { engine: data.task?.execution?.engine, models: data.task?.execution?.models, cached: data.task?.execution?.cached, acceptedTools: data.task?.execution?.steps.filter(s => s.ok).map(s => s.tool) };
    checks.push('reviewed correction wakes the same job, exact current request, no effects');
    data = await a({ kind: 'pause' }); assert.equal(data.task?.state, 'paused');
    data = await a({ kind: 'save', version: 2, brief: { ...ready, maxFee: 190 } }); assert.equal(data.task?.state, 'paused'); assert.equal(data.desk?.actions[0].state, 'invalidated');
    checks.push('changed paused brief invalidates preparation without unpausing');
  }
  const report = { result: 'passed', scope: 'live local API; real/cached Qloo; illustrative operator assertions; preparation only; no real authority, sends or payments', checks, execution: execution ?? null };
  await writeFile('.data/operator-brief-smoke-latest.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().then(() => process.exit(0), e => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
