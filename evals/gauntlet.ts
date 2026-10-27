/** Reproducible gates. No fabricated backtest, customer preference or ticket uplift. */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { stableHash } from '../src/server/crypto';
import { config } from '../src/server/config';
const started = Date.now();
const integration = process.argv.includes('--integration');
const realLlm = process.argv.includes('--llm');
const checks: { name: string; args: string[]; scope: string }[] = [
  { name: 'typecheck', args: ['run', 'typecheck'], scope: 'TypeScript' },
  { name: 'unit-state-and-contracts', args: ['test'], scope: 'Synthetic records, real SQLite, independent restart/concurrency cases' },
  { name: 'production-web-export', args: ['run', 'build:web'], scope: 'Local export only, not hosted deployment parity' },
];
if (integration) checks.push(
  { name: 'booking-desk-api', args: ['run', 'desk:smoke'], scope: 'Local API, real/cached Qloo, fictional operating facts' },
  { name: 'durable-agent-api', args: ['run', 'agent:smoke'], scope: 'Local API, exact approvals, changed facts, waits and receipt recovery' },
  { name: 'qloo-signal-sensitivity', args: ['run', 'qloo:smoke'], scope: 'Same-pool API mechanism; not recommendation quality or ticket demand' },
);
if (realLlm) checks.push({ name: 'uncached-llm-tool-outcomes', args: ['run', 'eval:llm'], scope: 'Real configured models, uncached tool decisions and checked business outcomes; rules fallback fails this gate' });
const results = checks.map(({ name, args, scope }) => {
  const r = spawnSync('npm', args, { encoding: 'utf8', cwd: process.cwd(), env: process.env });
  const output = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const count = output.match(/ℹ tests (\d+)/)?.[1];
  console.log(`${name}: ${r.status === 0 ? 'PASS' : 'FAIL'}${count ? ` (${count} tests)` : ''}`);
  if (r.status !== 0) console.log(output);
  return { name, scope, passed: r.status === 0, tests: count ? Number(count) : null };
});
const report = { at: new Date().toISOString(), configHash: stableHash(config), elapsedMs: Date.now() - started, conditions: 'Synthetic business records, real SQLite; optional local API/provider mechanism gates. No customer holdout or demand benchmark.', gates: results, notRun: [...(integration ? [] : ['booking-desk-api', 'durable-agent-api', 'qloo-signal-sensitivity']), ...(realLlm ? [] : ['uncached-llm-tool-outcomes'])], unmeasured: ['Operator preference', 'Real local-roster coverage', 'Actual booking outcomes', 'Ticket uplift', 'Hosted/public-repo parity', 'Native iPhone/Safari engine behavior', 'Standalone Playwright browser suite (Chrome launch blocked)'] };
mkdirSync('.data', { recursive: true }); writeFileSync('.data/gauntlet-latest.json', JSON.stringify(report, null, 2));
console.log('Report: .data/gauntlet-latest.json. Unmeasured outcomes stay unmeasured.');
process.exit(results.every(r => r.passed) ? 0 : 1);
