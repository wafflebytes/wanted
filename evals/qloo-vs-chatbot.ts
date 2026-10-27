/**
 * Qloo against a plain chatbot, over several cities. For each city the same question (where's my crowd,
 * which rooms) goes to a general model with no taste data, three samples with a majority vote, and every
 * claim is checked: does the room exist, is it in that city, is it open that night, does it put on shows,
 * does Qloo rank that neighborhood for the sound. Same route as the city sheet's "Ask a chatbot instead?".
 *
 *   BASE=http://localhost:3100 npx tsx evals/qloo-vs-chatbot.ts
 */
import { writeFileSync } from 'node:fs';
import type { WithoutQlooReport } from '../src/server/without-qloo';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const ACT = process.env.ACT ?? 'maya-ortiz';
const CITIES = (process.env.CITIES ?? 'burlington-vt,columbus-oh,portland-me,ithaca-ny,poughkeepsie-ny,santa-cruz-ca,asheville-nc,portland-or').split(',');

type Row = { city: string; rooms: number; roomsOk: number; roomsWrong: number; hoods: number; hoodsOk: number; cities: number; citiesInTop15: number; missedSleepers: string[]; misses: string[]; cachedAt?: number };

async function one(city: string): Promise<Row> {
  const res = await fetch(`${BASE}/api/artist/${ACT}/without-qloo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ focusCity: city }) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const r = (await res.json()) as WithoutQlooReport & { cachedAt?: number };
  const lvl = (xs: { mark: { level: string } }[], l: string) => xs.filter((x) => x.mark.level === l).length;
  return {
    city: r.inputs.focusCity,
    rooms: r.rooms.length,
    roomsOk: lvl(r.rooms, 'ok'),
    roomsWrong: lvl(r.rooms, 'wrong'),
    hoods: r.neighborhoods.length,
    hoodsOk: lvl(r.neighborhoods, 'ok'),
    cities: r.cities.length,
    citiesInTop15: r.overlapTop15,
    missedSleepers: r.missedSleepers.map((s) => s.name),
    misses: r.rooms.filter((x) => x.mark.level !== 'ok').map((x) => `${x.name}: ${x.mark.reason}`),
    cachedAt: r.cachedAt,
  };
}

const sum = (rows: Row[], k: keyof Row) => rows.reduce((s, r) => s + (r[k] as number), 0);
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : 'n/a');

async function main() {
  const rows: Row[] = [];
  for (const c of CITIES) {
    try {
      const r = await one(c);
      rows.push(r);
      console.log(`${r.city}: rooms ${r.roomsOk}/${r.rooms} hold up (${r.roomsWrong} wrong), neighborhoods ${r.hoodsOk}/${r.hoods}, cities ${r.citiesInTop15}/${r.cities} in top 15`);
    } catch (e) {
      console.log(`ERR ${c}: ${e}`);
    }
  }
  const at = new Date().toISOString();
  writeFileSync('.data/qloo-vs-chatbot-latest.json', JSON.stringify({ at, rows }, null, 2));
  const rooms = sum(rows, 'rooms'), roomsOk = sum(rows, 'roomsOk'), roomsWrong = sum(rows, 'roomsWrong');
  const hoods = sum(rows, 'hoods'), hoodsOk = sum(rows, 'hoodsOk');
  const cities = sum(rows, 'cities'), top = sum(rows, 'citiesInTop15');
  const sleepers = [...new Set(rows.flatMap((r) => r.missedSleepers))];
  const examples = rows.flatMap((r) => r.misses.slice(0, 2).map((m) => `- ${r.city}: ${m}`)).slice(0, 10);
  const md = `# A plain chatbot against Qloo: ${pct(roomsOk, rooms)} of its rooms hold up

Recorded ${at.slice(0, 10)}, demo act (Maya Ortiz, indie folk), ${rows.length} cities. Run it with \`npm run eval:chatbot\`.

The question an artist would ask: where's my crowd in this city, and which rooms should I play on a Tuesday. A general model with no taste data answers it three times and the majority answer is kept. Then each claim is checked against Qloo: does the room exist, is it in that city, is it still open, is it open that night, does it put on shows, and does Qloo rank that neighborhood for this sound. The same check runs in the app behind "Ask a chatbot instead?" on every city sheet. Answers are kept for a day per city.

| | Chatbot |
|---|---|
| Rooms that hold up | ${roomsOk} of ${rooms} (${pct(roomsOk, rooms)}) |
| Rooms that are wrong (closed, dark that night, another city) | ${roomsWrong} of ${rooms} (${pct(roomsWrong, rooms)}) |
| Neighborhoods Qloo ranks in the top 10 for this sound | ${hoodsOk} of ${hoods} (${pct(hoodsOk, hoods)}) |
| Cities it picked that are in Wanted's top 15 | ${top} of ${cities} (${pct(top, cities)}) |
| Cities nobody plays yet that it never mentioned | ${sleepers.length}${sleepers.length ? `: ${sleepers.slice(0, 6).join('; ')}` : ''} |

| City | Rooms hold up | Wrong | Neighborhoods in Qloo's top 10 | Cities in top 15 |
|---|---|---|---|---|
${rows.map((r) => `| ${r.city} | ${r.roomsOk} of ${r.rooms} | ${r.roomsWrong} | ${r.hoodsOk} of ${r.hoods} | ${r.citiesInTop15} of ${r.cities} |`).join('\n')}

## What the misses look like

${examples.join('\n') || '- none this run'}

## How to read it

"Doesn't hold up" mostly means there's no evidence behind the claim, not that it's false. Some of those rooms are real and Qloo's place search just didn't find them, and a chatbot's neighborhoods are often real places that simply aren't where this sound's fans live. "Wrong" means Qloo contradicts it: closed for good, dark that night, or the only room by that name is in another state (that last one can also be a search miss). So read the numbers as how much of a chatbot's confident answer you could act on without checking it yourself. Wanted only names rooms and neighborhoods that came back from Qloo for this act, so the same check on Gus's answers holds by construction (\`src/server/gus/ask.ts\` drops any reply naming a room no lookup returned).

## Not measured

- Whether the chatbot's unchecked rooms would have worked out. Qloo's places data is the reference here, and it has gaps.
- Ticket sales. Neither side has them.
- Other acts. One act, ${rows.length} cities.
`;
  writeFileSync('evals/qloo-vs-chatbot.md', md);
  console.log(`\nrooms ${roomsOk}/${rooms}, wrong ${roomsWrong}, hoods ${hoodsOk}/${hoods}, cities ${top}/${cities} -> evals/qloo-vs-chatbot.md`);
}
main();
