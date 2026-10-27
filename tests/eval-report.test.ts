import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_SCENARIOS, publicEvalReport, evalMarkdown, type PrivateEvalInput } from '../src/lib/eval-report';
const complete = (): PrivateEvalInput => ({ at: '2026-10-25T10:00:00Z', results: CORE_SCENARIOS.map(scenario => ({ scenario, passed: true, engine: 'llm', models: ['nvidia/nemotron-3.5-lightning:free'], checks: { actualLlm: true, uncached: true }, rejectedToolCalls: 0 })) });
test('report requires all named scenarios; an omitted or duplicated case never passes', () => {
  assert.equal(publicEvalReport(complete()).gate, 'passed');
  const missing = complete(); missing.results!.pop(); assert.equal(publicEvalReport(missing).gate, 'blocked');
  const duplicate = complete(); duplicate.results!.push(duplicate.results![0]); assert.equal(publicEvalReport(duplicate).gate, 'failed');
});
test('eventual guarded success is separate from no-rejection success', () => {
  const r = complete(); r.results![0].rejectedToolCalls = 2;
  const report = publicEvalReport(r); assert.equal(report.passed, 8); assert.equal(report.noRejectedCalls, 7); assert.equal(report.cases[0].rejectedCalls, 2);
});
test('rules fallback, cached execution, or no model cannot be published as a model pass', () => {
  for (const patch of [{ engine: 'rules' }, { models: [] }, { checks: { actualLlm: true, uncached: false } }]) {
    const r = complete(); Object.assign(r.results![0], patch); assert.equal(publicEvalReport(r).gate, 'failed');
  }
});
test('quota-blocked case is distinct from failed reasoning and extended cases cannot be omitted', () => {
  const r = complete(); Object.assign(r.results![0], { passed: false, engine: 'unavailable', failure: 'HTTP 429: limited' });
  assert.equal(publicEvalReport(r).cases[0].status, 'blocked');
  assert.equal(publicEvalReport({ ...complete(), suite: 'extended' }).gate, 'blocked');
});
test('public projection drops private text, arbitrary model strings, errors, and payloads', () => {
  const r = complete() as PrivateEvalInput & { secret: string }; r.secret = 'secret-account-token';
  Object.assign(r.results![0], { payload: { contact: 'private@example.com' }, models: ['private@example.com'], failure: 'secret-account-token', modelFallbacks: [{ error: 'secret-account-token' }] });
  const out = JSON.stringify(publicEvalReport(r)) + evalMarkdown(publicEvalReport(r));
  assert.ok(!out.includes('secret-account-token')); assert.ok(!out.includes('private@example.com')); assert.ok(!out.includes('payload'));
});
