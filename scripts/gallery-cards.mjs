/**
 * Devpost gallery cards (3:2) from the phone screenshots that gallery-shots.mjs takes.
 *
 *   node scripts/gallery-cards.mjs <shotsDir> docs/gallery
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const shots = resolve(process.argv[2] ?? '.data/gallery');
const out = process.argv[3] ?? 'docs/gallery';
const fonts = resolve('web/public/fonts');

const cards = [
  { name: '0-cover', kicker: 'Wanted', title: 'Gus finds the cities that want your band.', body: 'An AI tour manager for independent musicians, running on Qloo’s taste graph. Fans sign the poster, then he books the room.', phones: ['home', 'fan', 'deal'] },
  { name: '1-already-working', kicker: 'Open the app', title: 'He’s already working.', body: 'A call to a room is underway and an offer is waiting for your OK. You didn’t start any of it.', phones: ['home'] },
  { name: '2-sleeper-cities', kicker: 'Where you’re wanted', title: 'He finds the cities nobody plays yet.', body: 'Every US city and neighborhood is scored for your sound. Ithaca has more fans than its size predicts, and South Hill is where they live.', phones: ['city'] },
  { name: '3-wanted-poster', kicker: 'Proof', title: 'Fans sign the WANTED poster.', body: '51 signed in Burlington. At fifty, Gus writes to the rooms that fit you and skips the ones dark that night.', phones: ['fan'] },
  { name: '4-one-decision', kicker: 'The deal', title: 'You make one decision.', body: 'He haggled inside your limits. Slide to pay the $80 deposit against that exact offer. Test mode, no real money.', phones: ['deal'] },
  { name: '5-ask-gus', kicker: 'Ask anything', title: 'He checks before he answers.', body: 'Every room Gus names came back from a lookup. If it didn’t, the answer is thrown out.', phones: ['gus'] },
  { name: '6-chatbot', kicker: 'Why taste data', title: 'A plain chatbot gets most rooms wrong.', body: 'Over 8 cities, 46% of its rooms held up. In Ithaca it was 1 of 8, and one room was in Illinois.', phones: ['chatbot'] },
  { name: '7-booked', kicker: 'Booked', title: 'Everyone who signed hears first.', body: 'The date is set at The Flynn. Gus tells the signers, puts posters up where the crowd hangs out and finds an opener.', phones: ['posters'] },
];

const css = `
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-600.woff2); font-weight: 600; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-800.woff2); font-weight: 800; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-900.woff2); font-weight: 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1500px; height: 1000px; background: #F6F4EF; font-family: WR, system-ui; color: #15130F; overflow: hidden; }
.card { position: relative; width: 100%; height: 100%; display: flex; align-items: center; padding: 0 96px; gap: 72px; }
.card::before { content: ''; position: absolute; right: -180px; bottom: -260px; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(242,84,27,.22), rgba(242,84,27,0) 65%); }
.text { flex: 1; position: relative; }
.kicker { font-weight: 800; font-size: 26px; letter-spacing: .14em; text-transform: uppercase; color: #E2531F; margin-bottom: 26px; }
h1 { font-weight: 900; font-size: 84px; line-height: 1.02; letter-spacing: -.02em; }
p { margin-top: 30px; font-weight: 600; font-size: 31px; line-height: 1.38; color: #6B675F; max-width: 640px; }
.phones { flex-shrink: 0; position: relative; display: flex; gap: 28px; align-items: center; }
.phone { width: 400px; height: 866px; border-radius: 56px; overflow: hidden; border: 10px solid #15130F; background: #15130F; box-shadow: 0 40px 80px rgba(21,19,15,.22), 0 8px 20px rgba(21,19,15,.12); }
.phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 46px; display: block; }
.cover h1 { font-size: 76px; }
.cover p { font-size: 28px; }
.cover .phones { gap: 22px; }
.cover .phone { width: 236px; height: 511px; border-width: 7px; border-radius: 38px; }
.cover .phone img { border-radius: 31px; }
.cover .phone:nth-child(2) { transform: translateY(-40px); }
`;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
for (const c of cards) {
  const phones = c.phones.map((n) => `<div class="phone"><img src="file://${shots}/${n}.png"></div>`).join('');
  writeFileSync(`${shots}/card.html`, `<meta charset="utf-8"><style>${css}</style><div class="card ${c.name === '0-cover' ? 'cover' : ''}"><div class="text"><div class="kicker">${c.kicker}</div><h1>${c.title}</h1><p>${c.body}</p></div><div class="phones">${phones}</div></div>`);
  await p.goto(`file://${shots}/card.html`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${c.name}.png` });
  console.log('ok', c.name);
}
await b.close();
