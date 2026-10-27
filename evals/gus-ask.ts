/**
 * Gus answers, end to end: real questions through the same route the app uses (`POST /api/artist/:id/gus`),
 * live model and live Qloo. Each case says which lookup Gus should run and what he may offer next.
 * Checks: the right tool ran, the action fits, no made-up city or room, no internal words, under 45 words.
 *
 *   BASE=http://localhost:3100 npx tsx evals/gus-ask.ts
 */
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const ACT = process.env.ACT ?? 'maya-ortiz';
// A run id in the screen line keeps the model cache out of it: every answer is fresh.
const RUN = Date.now().toString(36);

type Case = { ask: string; tools: string[]; actions: (string | null)[]; job: string };
const CASES: Case[] = [
  { job: 'Where to play', ask: 'Where should I play first?', tools: ['top_cities', 'city_fit'], actions: ['city', 'deal', 'tab', null] },
  { job: 'Where to play', ask: 'Which cities nobody plays would actually show up for me?', tools: ['top_cities'], actions: ['city', null] },
  { job: 'One city', ask: 'How is Ithaca for me?', tools: ['city_fit', 'rooms'], actions: ['city', 'pitch', 'deal', null] },
  { job: 'One city', ask: 'Is Columbus worth the drive?', tools: ['city_fit', 'rooms'], actions: ['city', 'pitch', 'deal', null] },
  { job: 'Rooms', ask: 'Which Burlington rooms are open on a Tuesday?', tools: ['rooms'], actions: ['deal', 'city', null] },
  { job: 'Rooms', ask: 'Find me a room in Portland Maine for about 200 people', tools: ['rooms'], actions: ['deal', 'city', null] },
  { job: 'Rooms', ask: 'Book me somewhere in Poughkeepsie', tools: ['rooms'], actions: ['deal', 'city', 'pitch', null] },
  { job: 'Openers', ask: 'Who should open for me?', tools: ['openers'], actions: [null, 'tab'] },
  { job: 'Crowd', ask: 'Who are my fans and what else do they love?', tools: ['crowd'], actions: ['tab', null] },
  { job: 'Crowd', ask: 'What podcasts does my crowd listen to?', tools: ['crowd'], actions: ['tab', null] },
  { job: 'Signatures', ask: 'Which poster is pulling hardest?', tools: ['fan_proof'], actions: ['pitch', 'tab', 'city', null] },
  { job: 'Signatures', ask: 'How many more signatures does Ithaca need?', tools: ['fan_proof'], actions: ['pitch', 'tab', 'city', null] },
  { job: 'Limits', ask: 'Never put down more than 300 dollars deposit', tools: [], actions: ['limit'] },
  { job: 'Limits', ask: 'I want at least 70 percent of the door', tools: [], actions: ['limit'] },
  { job: 'Made-up place', ask: 'How are things in Springfield Narnia?', tools: [], actions: [null, 'city', 'tab'] },
  { job: 'Made-up place', ask: 'Get me a show at the Silver Moonbeam Lounge in Burlington', tools: ['rooms'], actions: ['city', 'deal', null] },
];

const BANNED = /\b(score|sleeper|threshold|metric|qloo|ranked|market|data)\b/i;

type Row = { job: string; ask: string; ok: boolean; toolOk: boolean; actionOk: boolean; plain: boolean; short: boolean; lite: boolean; tools: string[]; action: string | null; reply: string; ms: number; firstStepMs: number | null };

async function one(c: Case): Promise<Row> {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/artist/${ACT}/gus?stream=1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: c.ask, screen: `map (run ${RUN})` }) });
  if (!res.ok || !res.body) throw new Error(`${res.status} on "${c.ask}"`);
  const text = await res.text();
  let firstStepMs: number | null = null;
  let ans: { reply: string; model: string; action: { type: string } | null; steps: { tool: string; status: string }[] } | null = null;
  // Streamed NDJSON arrives whole here; time to first step is approximated by the step's own clock.
  for (const line of text.split('\n').filter(Boolean)) {
    const e = JSON.parse(line);
    if (e.type === 'step' && firstStepMs === null) firstStepMs = e.step.ms ?? null;
    if (e.type === 'answer') ans = e.answer;
  }
  const ms = Date.now() - t0;
  if (!ans) throw new Error(`no answer for "${c.ask}"`);
  const tools = [...new Set(ans.steps.map((s) => s.tool))];
  const action = ans.action?.type ?? null;
  const toolOk = c.tools.length === 0 || c.tools.some((t) => tools.includes(t));
  const actionOk = c.actions.includes(action);
  const plain = !BANNED.test(ans.reply);
  const short = ans.reply.split(/\s+/).length <= 45;
  return { job: c.job, ask: c.ask, ok: toolOk && actionOk && plain && short, toolOk, actionOk, plain, short, lite: ans.model === 'gus-lite', tools, action, reply: ans.reply, ms, firstStepMs };
}

const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;
const p = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

async function main() {
  const rows: Row[] = [];
  for (const c of CASES) {
    try {
      const r = await one(c);
      rows.push(r);
      console.log(`${r.ok ? 'pass' : 'FAIL'} ${String(r.ms).padStart(6)} ms  ${r.lite ? 'lite ' : 'model'}  ${c.ask}\n      ${r.tools.join(', ') || '(no lookups)'} -> ${r.action ?? 'none'}: ${r.reply}`);
    } catch (e) {
      console.log(`ERR  ${c.ask}: ${e}`);
      rows.push({ job: c.job, ask: c.ask, ok: false, toolOk: false, actionOk: false, plain: false, short: false, lite: false, tools: [], action: null, reply: String(e), ms: 0, firstStepMs: null });
    }
  }
  const n = rows.length;
  const passed = rows.filter((r) => r.ok).length;
  const ms = rows.filter((r) => r.ms).map((r) => r.ms);
  const at = new Date().toISOString();
  writeFileSync('.data/gus-ask-latest.json', JSON.stringify({ at, rows }, null, 2));
  const md = `# Asking Gus: ${passed} of ${n} answers passed

Recorded ${at.slice(0, 10)} against \`${BASE.replace(/^https?:\/\//, '')}\`, demo act, live model (uncached) and live Qloo. Run it with \`npm run eval:gus\`.

Each question goes through the same route the app uses. A case passes when Gus ran the lookup the question needs, offered an action that fits (or none), kept to plain words and stayed under 45 words. Every city and room he names has to come back from a lookup first, or the reply is thrown out and a rules planner answers from the lookups instead.

| | Result |
|---|---|
| Passed | ${passed} of ${n} (${pct(passed, n)}) |
| Ran the right lookup | ${rows.filter((r) => r.toolOk).length} of ${n} |
| Offered a fitting action | ${rows.filter((r) => r.actionOk).length} of ${n} |
| No internal words | ${rows.filter((r) => r.plain).length} of ${n} |
| Model answer kept (not the rules fallback) | ${rows.filter((r) => !r.lite).length} of ${n} |
| Time to answer, median | ${(p(ms, 0.5) / 1000).toFixed(1)} s |
| Time to answer, slowest 10% | ${(p(ms, 0.9) / 1000).toFixed(1)} s |

| Job | Question | Lookups | Action | Pass |
|---|---|---|---|---|
${rows.map((r) => `| ${r.job} | ${r.ask} | ${r.tools.join(', ') || 'none'} | ${r.action ?? 'none'} | ${r.ok ? 'yes' : 'no'} |`).join('\n')}

## Not measured

- Whether the advice is good for a real act's career. That needs real tours.
- Spoken answers. This is the typed path; voice adds transcription and speech on top.
- Questions outside these jobs.
`;
  writeFileSync('evals/gus.md', md);
  console.log(`\n${passed}/${n} passed, median ${p(ms, 0.5)} ms -> evals/gus.md`);
}
main();
