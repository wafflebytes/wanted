/**
 * Asking Gus, graded. Runs the same `answer()` the app's route calls, in process, so every lookup's raw
 * result is visible to the grader. Live model (cache bypassed per run), live Qloo.
 *
 * Three kinds of case:
 * - single questions across his jobs,
 * - multi-step: one question that needs two or more different lookups,
 * - multi-turn: earlier turns are played for real and passed back as history, the last one is graded.
 *
 * Every answer is checked four ways: the lookups it needed ran, the button fits, every number and name
 * in the reply traces to a lookup (or the question), and a case-specific fact check against the lookups.
 * Each case runs RUNS times (default 3) and the report gives pass rates, not one lucky run.
 *
 * Model calls share the app's OpenRouter keys, and free models have a daily cap per key. A full run is
 * roughly 25 cases x RUNS x 3 calls, so it stops at BUDGET model requests (default 150), skips (never
 * grades) answers where the keys were out, and gives up after three of those in a row.
 *
 *   RUNS=3 BUDGET=250 npx tsx evals/gus-ask.ts
 */
import '../scripts/lib/env';
import { mkdirSync, writeFileSync } from 'node:fs';
import { answer, type GusAnswer, type GusEvent, type GusTurn } from '../src/server/gus/ask';
import { digitize, numbersIn } from '../src/server/gus/grounding';
import { llmPoolStats } from '../src/server/gus/llm';
import { mapData, requireArtist } from '../src/server/service';
import { METROS } from '../src/server/score';

const ACT = process.env.ACT ?? 'maya-ortiz';
const RUNS = Number(process.env.RUNS ?? 3);
const PARALLEL = Number(process.env.PARALLEL ?? 3);
const STAMP = Date.now().toString(36);
let SLEEPERS = new Set<string>();
const BUDGET = Number(process.env.BUDGET ?? 150);
const spent = () => Object.values(llmPoolStats.requests).reduce((a, b) => a + b, 0);
let outInARow = 0;
let stopped: string | null = null;

type Looked = { tool: string; args: Record<string, string>; out: unknown };
type Seen = { ans: GusAnswer; looked: Looked[]; history: GusTurn[]; ask: string };
type Case = {
  kind: 'single' | 'multi-step' | 'multi-turn';
  job: string;
  /** Played in order; only the last is graded. */
  turns: string[];
  /** At least one of these lookups ran. */
  any?: string[];
  /** Every one of these lookups ran (multi-step). */
  all?: string[];
  actions: (string | null)[];
  /** A fact check against the lookups: null when it holds, else what's wrong. */
  fact?: (s: Seen) => string | null;
};

// ---------- helpers over the lookups

const norm = (s: string) => s.toLowerCase().replace(/<\/?untrusted>/g, '').replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const outOf = (s: Seen, tool: string) => s.looked.filter((l) => l.tool === tool).map((l) => l.out as Record<string, unknown>);
type Room = { name: string; closedDays?: string[] | null };
const roomsIn = (s: Seen) => outOf(s, 'rooms').flatMap((o) => ((o.rooms as Room[] | undefined) ?? []).map((r) => ({ ...r, name: r.name.replace(/<\/?untrusted>/g, '') })));
type Proof = { city: string; signatures: number; proofRatio: number | null; signaturesToAskRooms: number };
const proofIn = (s: Seen) => outOf(s, 'fan_proof').flatMap((o) => (o.cities as Proof[] | undefined) ?? []);
const named = (reply: string, names: string[]) => names.filter((n) => norm(n).length > 3 && ` ${norm(reply)} `.includes(` ${norm(n)} `));
const metroIdOf = (name: string) => METROS.find((m) => norm(`${m.name}, ${m.state}`) === norm(name) || norm(m.name) === norm(name.split(',')[0]))?.id;
const actionId = (s: Seen) => (s.ans.action as { id?: string } | null)?.id;
const actionValue = (s: Seen) => (s.ans.action as { value?: number } | null)?.value;

/** A room the reply calls open on `day` that the lookup says is dark that day. */
function darkCalledOpen(s: Seen, day: string) {
  const sentences = s.ans.reply.split(/(?<=[.!?])\s+/);
  const bad: string[] = [];
  for (const r of roomsIn(s)) {
    if (!r.closedDays?.includes(day)) continue;
    const where = sentences.find((x) => named(x, [r.name]).length);
    if (where && !/\b(dark|closed|skip|not open|isn.?t open|shut)\b/i.test(where)) bad.push(r.name);
  }
  return bad.length ? `called ${bad.join(', ')} open on ${day} but it's dark` : null;
}

// ---------- tracing: every number and name in the reply comes from somewhere

const ORDINARY = new Set(
  'play pick most theyre ive theyve weve itll dont cant wont isnt gus maya monday tuesday wednesday thursday friday saturday sunday mondays tuesdays wednesdays thursdays fridays saturdays sundays want got fine check start try ask skip think nobody your they it that the and or all both one two three if right here still not yes no its thats theres im ill id youve youre were go put route slide set sure good worth only so just then also plus with you this there those he she we a an i my me let lets near what how which where when why for but yeah okay ok nah well look hold book find open same nope sorry'.split(' '),
);

function untraced(s: Seen): { numbers: number[]; names: string[] } {
  const pool = ` ${norm([JSON.stringify(s.looked.map((l) => l.out)), s.ask, ...s.history.map((h) => `${h.heard} ${h.reply}`), METROS.map((m) => `${m.name} ${m.state}`).join(' ')].join(' '))} `;
  const nums = new Set<number>([50, ...numbersIn(s.looked.map((l) => l.out)), ...(s.ask.match(/\d+(\.\d+)?/g) ?? []).map(Number)]);
  const numbers = (digitize(s.ans.reply).match(/\d+(\.\d+)?/g) ?? []).map(Number).filter((n) => n > 4 && !nums.has(n) && !nums.has(n / 100));
  // Proper names: runs of capitalised words inside a sentence, joined by small words. A leading
  // ordinary word ("Try Ithaca", "Ask The Flynn") is dropped; "X and Y" is two names unless the
  // whole run is one ("Maxie's Supper Club & Oyster Bar").
  const known = (r: string) => [norm(r), norm(r.replace(/[’']s\b/g, ''))].some((x) => pool.includes(` ${x} `));
  const runs = s.ans.reply.split(/(?<=[.!?])\s+/).flatMap((x) => x.match(/\b[A-Z][\w’'&-]*(?:\s+(?:of|the|and|&|on|in|de|la)?\s*[A-Z][\w’'&-]*)*/g) ?? []);
  const names = runs
    .map((r) => {
      let w = r.split(/\s+/);
      while (w.length && ORDINARY.has(norm(w[0]))) w = w.slice(1);
      return w.join(' ');
    })
    .flatMap((r) => (known(r) ? [] : r.split(/\s+(?:and|in|on)\s+/)))
    .filter((r) => norm(r).length > 2 && !ORDINARY.has(norm(r)) && !known(r));
  return { numbers, names };
}

// ---------- the cases

const CASES: Case[] = [
  // Single questions
  { kind: 'single', job: 'Where to play', turns: ['Where should I play first?'], any: ['top_cities', 'city_fit'], actions: ['city', 'deal', 'pitch', 'tab', null] },
  { kind: 'single', job: 'Where to play', turns: ['Which cities nobody plays would actually show up for me?'], any: ['top_cities'], actions: ['city', null] },
  { kind: 'single', job: 'One city', turns: ['How is Ithaca for me?'], any: ['city_fit'], actions: ['city', 'pitch', 'deal', null] },
  { kind: 'single', job: 'One city', turns: ['Is Columbus worth the drive?'], any: ['city_fit', 'rooms', 'fan_proof'], actions: ['city', 'pitch', 'deal', null] },
  { kind: 'single', job: 'Rooms', turns: ['Which Burlington rooms are open on a Tuesday?'], any: ['rooms'], actions: ['deal', 'city', null], fact: (s) => darkCalledOpen(s, 'tuesday') },
  {
    kind: 'single', job: 'Rooms', turns: ['Find me a room in Portland Maine for about 200 people'], any: ['rooms'], actions: ['deal', 'city'],
    fact: (s) => (actionId(s) && actionId(s) !== 'portland-me' ? `went to ${actionId(s)}, not Portland, Maine` : null),
  },
  { kind: 'single', job: 'Rooms', turns: ['Book me somewhere in Poughkeepsie'], any: ['rooms'], actions: ['deal', 'city', 'pitch'] },
  {
    kind: 'single', job: 'Openers', turns: ['Who should open for me?'], any: ['openers'], actions: [null, 'tab'],
    fact: (s) => {
      const real = outOf(s, 'openers').flatMap((o) => ((o.openers as { name: string }[]) ?? []).map((x) => x.name.replace(/<\/?untrusted>/g, '')));
      return real.length && !named(s.ans.reply, real).length ? 'named no opener the lookup returned' : null;
    },
  },
  { kind: 'single', job: 'Crowd', turns: ['Who are my fans and what else do they love?'], any: ['crowd'], actions: ['tab', null] },
  { kind: 'single', job: 'Crowd', turns: ['What podcasts does my crowd listen to?'], any: ['crowd'], actions: ['tab', null] },
  {
    kind: 'single', job: 'Signatures', turns: ['Which poster is pulling hardest?'], any: ['fan_proof'], actions: ['pitch', 'tab', 'city', null],
    fact: (s) => {
      const p = proofIn(s);
      if (!p.length) return null;
      const bySig = [...p].sort((a, b) => b.signatures - a.signatures)[0].city.split(',')[0];
      const byRatio = [...p].sort((a, b) => (b.proofRatio ?? 0) - (a.proofRatio ?? 0))[0].city.split(',')[0];
      return named(s.ans.reply, [bySig, byRatio]).length ? null : `didn't name ${bySig}`;
    },
  },
  {
    kind: 'single', job: 'Signatures', turns: ['How many more signatures does Ithaca need?'], any: ['fan_proof'], actions: ['pitch', 'tab', 'city', null],
    fact: (s) => {
      const it = proofIn(s).find((p) => p.city.startsWith('Ithaca'));
      if (!it) return 'no Ithaca in the lookup';
      return new RegExp(`\\b${it.signaturesToAskRooms}\\b`).test(digitize(s.ans.reply)) ? null : `should say ${it.signaturesToAskRooms} more`;
    },
  },
  { kind: 'single', job: 'Limits', turns: ['Never put down more than 300 dollars deposit'], actions: ['limit'], fact: (s) => (actionValue(s) === 300 ? null : `limit is ${actionValue(s)}, not 300`) },
  { kind: 'single', job: 'Limits', turns: ['I want at least 70 percent of the door'], actions: ['limit'], fact: (s) => (actionValue(s) === 70 ? null : `limit is ${actionValue(s)}, not 70`) },
  {
    kind: 'single', job: 'Made-up place', turns: ['How are things in Narnia?'], actions: [null, 'tab', 'city'],
    fact: (s) => (/narnia/i.test(s.ans.reply) && !/(not|n.t|no |can.t|never)/i.test(s.ans.reply) ? 'talked about Narnia as real' : null),
  },
  {
    kind: 'single', job: 'Made-up place', turns: ['Get me a show at the Silver Moonbeam Lounge in Burlington'], any: ['rooms'], actions: ['city', 'deal', null],
    fact: (s) => (!/silver moonbeam/i.test(s.ans.reply) ? "didn't say the room isn't there" : !/(not|n.t|no |can.t|couldn.t)/i.test(s.ans.reply) ? 'treated the made-up room as real' : null),
  },

  // Multi-step: one question, several different lookups.
  {
    kind: 'multi-step', job: 'Compare, then a room', turns: ['Ithaca or Columbus, which should I play, and which room there?'], all: ['city_fit', 'rooms'], actions: ['deal', 'city', 'pitch'],
    fact: (s) => {
      const fits = s.looked.filter((l) => l.tool === 'city_fit').map((l) => norm(l.args.city ?? ''));
      if (!fits.some((c) => c.includes('ithaca')) || !fits.some((c) => c.includes('columbus'))) return 'checked only one of the two cities';
      return named(s.ans.reply, roomsIn(s).map((r) => r.name)).length ? null : 'named no room from the lookup';
    },
  },
  {
    kind: 'multi-step', job: 'Overlooked city, then a night', turns: ['Find me a city nobody plays yet and a room there that is open on Friday'], all: ['rooms'], actions: ['deal', 'city'],
    fact: (s) => (actionId(s) && !SLEEPERS.has(actionId(s)!) ? `${actionId(s)} isn't a city nobody plays` : darkCalledOpen(s, 'friday')),
  },
  {
    kind: 'multi-step', job: 'Opener and a room', turns: ['Who should open for me in Columbus, and at which room?'], all: ['openers', 'rooms'], actions: ['deal', 'city', null],
    fact: (s) => {
      const openers = outOf(s, 'openers').flatMap((o) => ((o.openers as { name: string }[]) ?? []).map((x) => x.name.replace(/<\/?untrusted>/g, '')));
      const missing = [!named(s.ans.reply, openers).length && 'an opener', !named(s.ans.reply, roomsIn(s).map((r) => r.name)).length && 'a room'].filter(Boolean);
      return missing.length ? `named no ${missing.join(' and no ')} from the lookups` : null;
    },
  },
  {
    kind: 'multi-step', job: 'Poster and crowd', turns: ['How is my Burlington poster doing, and who are the people signing it?'], all: ['fan_proof', 'crowd'], actions: ['city', 'pitch', 'tab', null],
    fact: (s) => {
      const b = proofIn(s).find((p) => p.city.startsWith('Burlington'));
      if (!b) return 'no Burlington count in the lookup';
      return new RegExp(`\\b${b.signatures}\\b`).test(digitize(s.ans.reply)) || /fifty signatures|ready|enough/i.test(s.ans.reply) ? null : `didn't say how the poster's doing (${b.signatures} signatures)`;
    },
  },

  // Multi-turn: the last turn only makes sense with the ones before it.
  {
    kind: 'multi-turn', job: '"Book me a room there"', turns: ['Which poster is pulling hardest?', 'Book me a room there'], any: ['rooms'], actions: ['deal'],
    fact: (s) => {
      const said = METROS.filter((m) => named(s.history[0]?.reply ?? '', [m.name]).length).map((m) => m.id);
      return actionId(s) && said.includes(actionId(s)!) ? null : `booked in ${actionId(s) ?? 'nowhere'}, the last answer was about ${said.join(' or ') || 'no city'}`;
    },
  },
  {
    kind: 'multi-turn', job: '"A room there on Friday"', turns: ['How is Ithaca for me?', 'Find me a room there on a Friday'], any: ['rooms'], actions: ['deal', 'city'],
    fact: (s) => (actionId(s) === 'ithaca-ny' ? darkCalledOpen(s, 'friday') : `went to ${actionId(s) ?? 'nowhere'}, not Ithaca`),
  },
  {
    kind: 'multi-turn', job: '"Ask the first one"', turns: ['Which Burlington rooms are open on a Tuesday?', 'Ask the first one you said'], actions: ['deal'],
    fact: (s) => {
      if (actionId(s) !== 'burlington-vt') return `went to ${actionId(s) ?? 'nowhere'}, not Burlington`;
      const room = (s.ans.action as { label?: string }).label?.replace(/^Ask /, '').replace(/ for a date$/, '') ?? '';
      const prior = norm(s.history[0]?.reply ?? '');
      const first = roomsIn(s).map((r) => r.name).filter((n) => prior.includes(norm(n))).sort((x, y) => prior.indexOf(norm(x)) - prior.indexOf(norm(y)))[0];
      return !first || norm(room) === norm(first) ? null : `asked ${room}, the first one said was ${first}`;
    },
  },
  {
    kind: 'multi-turn', job: '"How many does it have?"', turns: ['Which poster is pulling hardest?', 'How many signatures does it have exactly?'], any: ['fan_proof'], actions: ['pitch', 'city', 'tab', null],
    fact: (s) => {
      const said = METROS.find((m) => named(s.history[0]?.reply ?? '', [m.name]).length);
      const p = proofIn(s).find((x) => said && metroIdOf(x.city) === said.id);
      if (!p) return 'no count for the city from the last answer';
      return new RegExp(`\\b${p.signatures}\\b`).test(digitize(s.ans.reply)) ? null : `should say ${p.signatures}`;
    },
  },
  {
    kind: 'multi-turn', job: '"Make it 250"', turns: ['Never put down more than 300 dollars deposit', 'Actually make it 250'], actions: ['limit'],
    fact: (s) => (actionValue(s) === 250 ? null : `limit is ${actionValue(s) ?? 'missing'}, not 250`),
  },
];

// ---------- running

class Skip extends Error {}
type Result = { case: number; run: number; ok: boolean; toolOk: boolean; actionOk: boolean; tracedOk: boolean; factOk: boolean; why: string[]; lite: boolean; ms: number; reply: string; tools: string[]; action: string | null };

async function play(c: Case, run: number): Promise<{ seen: Seen; ms: number }> {
  const artist = await requireArtist(ACT);
  const history: GusTurn[] = [];
  let last: { seen: Seen; ms: number } | null = null;
  for (const ask of c.turns) {
    if (stopped) throw new Skip(stopped);
    const looked: Looked[] = [];
    const t0 = Date.now();
    const onEvent = (e: GusEvent) => {
      if (e.type === 'looked') looked.push({ tool: e.tool, args: e.args, out: e.out });
    };
    const ans = await answer(artist, ask, `map (eval ${STAMP}.${run})`, onEvent, [...history]);
    if (ans.fallback === 'unavailable') {
      if (++outInARow >= 3) stopped = 'the model keys are out for now';
      throw new Skip('model unavailable');
    }
    outInARow = 0;
    if (spent() >= BUDGET) stopped = `hit the budget of ${BUDGET} model requests`;
    last = { seen: { ans, looked, history: [...history], ask }, ms: Date.now() - t0 };
    history.push({ heard: ask, reply: ans.reply });
  }
  return last!;
}

function grade(c: Case, i: number, run: number, seen: Seen, ms: number): Result {
  const tools = [...new Set(seen.looked.map((l) => l.tool))];
  const why: string[] = [];
  const toolOk = (!c.any || c.any.some((t) => tools.includes(t))) && (!c.all || c.all.every((t) => tools.includes(t)));
  if (!toolOk) why.push(`lookups ${tools.join(', ') || 'none'}; needed ${c.all ? `all of ${c.all.join(', ')}` : `one of ${c.any!.join(', ')}`}`);
  const action = seen.ans.action?.type ?? null;
  const actionOk = c.actions.includes(action);
  if (!actionOk) why.push(`button ${action ?? 'none'}`);
  const u = untraced(seen);
  const tracedOk = !u.numbers.length && !u.names.length;
  if (!tracedOk) why.push(`untraced ${[...u.numbers, ...u.names].join(', ')}`);
  const f = c.fact ? c.fact(seen) : null;
  if (f) why.push(f);
  if (seen.ans.reply.split(/\s+/).length > 45) why.push('over 45 words');
  return { case: i, run, ok: !why.length, toolOk, actionOk, tracedOk, factOk: !f, why, lite: seen.ans.model === 'gus-lite', ms, reply: seen.ans.reply, tools, action };
}

/** 95% Wilson interval, so 24 of 25 doesn't read as "96%, done". */
function wilson(k: number, n: number) {
  if (!n) return [0, 0];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const mid = (p + (z * z) / (2 * n)) / d, half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, mid - half), Math.min(1, mid + half)];
}
const pc = (x: number) => `${Math.round(x * 100)}%`;
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

async function main() {
  SLEEPERS = new Set((await mapData(await requireArtist(ACT))).metros.filter((m) => m.sleeper).map((m) => m.id));
  const only = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null;
  const jobs = CASES.flatMap((c, i) => (only && !only.has(i + 1) ? [] : Array.from({ length: RUNS }, (_, r) => ({ c, i, r }))));
  const results: Result[] = [];
  let skipped = 0;
  let next = 0;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next < jobs.length) {
        const { c, i, r } = jobs[next++];
        try {
          const { seen, ms } = await play(c, r);
          const res = grade(c, i, r, seen, ms);
          results.push(res);
          console.log(`${res.ok ? 'pass' : 'FAIL'} ${c.kind.padEnd(10)} #${i + 1}.${r + 1} ${String(ms).padStart(6)} ms ${res.lite ? 'rules' : 'model'}  ${c.turns.at(-1)}\n      ${res.tools.join(', ') || '(no lookups)'} -> ${res.action ?? 'none'}: ${res.reply}${res.why.length ? `\n      ✗ ${res.why.join('; ')}` : ''}`);
        } catch (e) {
          if (e instanceof Skip) {
            skipped++;
            continue;
          }
          results.push({ case: i, run: r, ok: false, toolOk: false, actionOk: false, tracedOk: false, factOk: false, why: [String(e)], lite: false, ms: 0, reply: '', tools: [], action: null });
          console.log(`ERR #${i + 1}.${r + 1} ${c.turns.at(-1)}: ${e}`);
        }
      }
    }),
  );
  console.log(`\n${spent()} model requests, ${skipped} answers skipped${stopped ? ` (stopped: ${stopped})` : ''}`);
  if (only) return process.exit(0);
  if (skipped > jobs.length / 4) {
    console.log('Too many skipped to publish; evals/gus.md left as it was.');
    return process.exit(1);
  }

  const n = results.length, k = results.filter((r) => r.ok).length;
  const [lo, hi] = wilson(k, n);
  const byKind = (kind: Case['kind']) => results.filter((r) => CASES[r.case].kind === kind);
  const rate = (rs: Result[], f: (r: Result) => boolean) => `${rs.filter(f).length} of ${rs.length} (${pc(rs.filter(f).length / (rs.length || 1))})`;
  const perCase = CASES.map((_, i) => results.filter((r) => r.case === i));
  const solid = perCase.filter((rs) => rs.length && rs.every((r) => r.ok)).length;
  const ms = results.filter((r) => r.ms).map((r) => r.ms);
  const at = new Date().toISOString();
  mkdirSync('.data', { recursive: true });
  writeFileSync('.data/gus-ask-latest.json', JSON.stringify({ at, runs: RUNS, results }, null, 2));

  const fails = results.filter((r) => !r.ok).sort((a, b) => a.case - b.case || a.run - b.run);
  const md = `# Asking Gus: ${pc(k / n)} of answers pass (${k} of ${n})

Recorded ${at.slice(0, 10)}. Demo act, live model with its cache bypassed, live Qloo. ${CASES.length} cases, each run ${RUNS} times. Run it with \`npm run eval:gus\` (\`RUNS=5\` for more).

The grader calls the same \`answer()\` the app's route calls and sees every lookup's raw result. An answer passes only if all of these hold:

1. **Lookups.** The lookup the question needs ran. Multi-step cases need every one of theirs.
2. **Next step.** The button he offers fits the question, or there's none when none fits.
3. **Traced.** Every number and proper name in the reply appears in a lookup result, the question or the earlier turns.
4. **Facts.** A check written for the case, against the lookups: a room he calls open that night isn't dark that night, "35 more" matches the count, "book me a room there" lands in the city from the last answer, and so on.

It also has to stay under 45 words.

| | Result |
|---|---|
| Answers that pass | ${k} of ${n}, ${pc(k / n)} (95% interval ${pc(lo)} to ${pc(hi)}) |
| Cases that passed every run | ${solid} of ${CASES.length} |
| Single questions | ${rate(byKind('single'), (r) => r.ok)} |
| Multi-step | ${rate(byKind('multi-step'), (r) => r.ok)} |
| Multi-turn | ${rate(byKind('multi-turn'), (r) => r.ok)} |
| Ran the right lookups | ${rate(results, (r) => r.toolOk)} |
| Offered a fitting next step | ${rate(results, (r) => r.actionOk)} |
| Every number and name traced | ${rate(results, (r) => r.tracedOk)} |
| Facts check out | ${rate(results, (r) => r.factOk)} |
| Skipped because the model keys were out (not graded) | ${skipped} |
| Answered by the model (the rest fell back to rules) | ${rate(results, (r) => !r.lite)} |
| Time to answer, median / slowest 10% | ${(q(ms, 0.5) / 1000).toFixed(1)} s / ${(q(ms, 0.9) / 1000).toFixed(1)} s |

| # | Kind | Job | What was said | Passed |
|---|---|---|---|---|
${CASES.map((c, i) => `| ${i + 1} | ${c.kind} | ${c.job} | ${c.turns.map((t) => `"${t}"`).join(' → ')} | ${perCase[i].filter((r) => r.ok).length} of ${perCase[i].length} |`).join('\n')}

## What failed

${fails.length ? fails.map((r) => `- #${r.case + 1}, run ${r.run + 1}: ${r.why.join('; ')}. He said: "${r.reply}"`).join('\n') : '- Nothing this run.'}

## Not measured

- Whether the advice is good for a real act's career. That needs real tours.
- Spoken asks. This is the typed path; voice adds transcription and speech on top.
- Names the grader can't see as names (lowercase brands, for one). Tracing is a strict string match, so it can also flag a correct paraphrase as untraced.
- Questions outside these jobs, and conversations longer than two turns.
`;
  writeFileSync('evals/gus.md', md);
  console.log(`\n${k}/${n} answers pass (${pc(lo)} to ${pc(hi)}), ${solid}/${CASES.length} cases every run -> evals/gus.md`);
  process.exit(0);
}
main();
