/**
 * Devpost gallery cards (3:2) from real iPhone Safari screenshots (the iOS Simulator, 1179x2556,
 * `xcrun simctl io <device> screenshot`). Frameless, after Josh Puckett's seamless mobile Safari:
 * no device chrome, just the screen with its own corner radius, sitting on its page's colour so
 * Safari's bars, the app and the card read as one surface. Cards alternate light and dark.
 *
 *   node scripts/gallery-cards.mjs <shotsDir> docs/gallery
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const shots = resolve(process.argv[2] ?? '.data/gallery');
const out = process.argv[3] ?? 'docs/gallery';
const fonts = resolve('web/public/fonts');

const cards = [
  {
    name: '0-cover', kicker: 'Wanted', title: 'Gus finds the cities that want your band.',
    body: 'An AI tour manager for independent musicians, on Qloo’s taste graph. Fans sign the poster, then he books the room.',
    screens: ['home', 'fan-dark'],
  },
  {
    name: '1-already-working', kicker: 'Open the app', title: 'He’s already working.',
    body: 'Gus has been calling rooms on his own. One said yes, and the offer is waiting for your OK.',
    screens: ['home-dark'],
  },
  {
    name: '2-sleeper-cities', kicker: 'Where you’re wanted', title: 'He finds the cities nobody plays yet.',
    body: 'Every US city and neighborhood is scored for your sound. Ithaca has more fans than its size predicts, and he knows which streets they live on.',
    screens: ['city'],
  },
  {
    name: '3-wanted-poster', kicker: 'Proof', title: 'Fans sign the WANTED poster.',
    body: '51 signed in Burlington. At fifty, Gus writes to the rooms that fit you and skips the ones that are dark that night.',
    screens: ['fan-dark'],
  },
  {
    name: '4-one-decision', kicker: 'The deal', title: 'You make one decision.',
    body: 'He haggled inside your limits. Slide to pay the $80 deposit against that exact offer. Test mode, so no real money moves.',
    screens: ['deal'],
  },
  {
    name: '5-booked', kicker: 'Booked', title: 'Everyone who signed hears first.',
    body: 'The date is set at The Flynn. Gus tells the signers, puts posters up where the crowd hangs out and finds an opener.',
    screens: ['posters-dark'],
  },
  {
    name: '6-ask-gus', kicker: 'Ask anything', title: 'He checks before he answers.',
    body: 'Every room Gus names came back from a lookup, and each answer comes with the one thing he can do next.',
    screens: ['gus'],
  },
  {
    name: '7-logbook', kicker: 'Logbook', title: 'Everything he did, written down.',
    body: '32 things this week. 10 needed you, and Gus handled the rest. Every call, offer and yes is on the record.',
    screens: ['logbook-dark'],
  },
  {
    name: '8-chatbot', kicker: 'Why taste data', title: 'A plain chatbot gets most rooms wrong.',
    body: 'Over 8 cities, 46% of its rooms held up. In Ithaca it was 1 of 8, and one room was in Illinois.',
    screens: ['chatbot'],
  },
];

// The page colour along the screen's edge (what Safari samples for its bars) becomes the card.
async function edge(shot) {
  const data = await sharp(`${shots}/${shot}.png`).extract({ left: 600, top: 8, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const [r, g, b] = data;
  return { css: `rgb(${r} ${g} ${b})`, dark: 0.299 * r + 0.587 * g + 0.114 * b < 128 };
}

// iPhone 15 screen: 1179x2556 px, 55pt corners at 393pt wide. The simulator leaves the Dynamic
// Island out of some captures, so every screen gets it drawn back in the same place.
const screen = (shot, h) => {
  const k = h / 2556;
  return `<div class="scr" style="width:${Math.round(1179 * k)}px; height:${h}px; border-radius:${Math.round(165 * k)}px">
    <img src="file://${shots}/${shot}.png"><i class="isl" style="left:${402 * k}px; top:${34 * k}px; width:${373 * k}px; height:${109 * k}px"></i></div>`;
};

const css = `
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-600.woff2); font-weight: 600; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-700.woff2); font-weight: 700; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-800.woff2); font-weight: 800; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-900.woff2); font-weight: 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1500px; height: 1000px; overflow: hidden; font-family: WR, system-ui; }
/* Text and screen sit together as one centred group. */
.card { position: relative; width: 1500px; height: 1000px; background: var(--bg); color: var(--ink); overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 120px; }
.light { --ink: #15130F; --ink2: rgba(21,19,15,.62); --hair: rgba(21,19,15,.09); --drop: rgba(60,40,20,.18); }
.dark { --ink: #F3EFE6; --ink2: rgba(243,239,230,.62); --hair: rgba(243,239,230,.1); --drop: rgba(0,0,0,.55); }
.text { flex: none; width: 640px; align-self: stretch; position: relative; display: flex; flex-direction: column; justify-content: center; }
.card.cover { gap: 72px; }
.cover .text { width: 520px; }
.cover h1 { font-size: 70px; }
.kicker { font-weight: 800; font-size: 22px; letter-spacing: .14em; text-transform: uppercase; color: #F2541B; margin-bottom: 26px; }
h1 { font-weight: 900; font-size: 76px; line-height: 1.03; letter-spacing: -.028em; text-wrap: balance; }
.text p { margin-top: 28px; font-weight: 600; font-size: 28px; line-height: 1.42; color: var(--ink2); max-width: 560px; text-wrap: pretty; }
.foot { position: absolute; left: 0; bottom: 54px; font-weight: 700; font-size: 19px; color: var(--ink2); opacity: .75; }
.stage { flex: none; display: flex; gap: 36px; align-items: center; }
.scr { position: relative; overflow: hidden; flex: none; box-shadow: 0 0 0 1.5px var(--hair), 0 50px 90px -40px var(--drop), 0 20px 40px -24px var(--drop); }
.scr img { display: block; width: 100%; height: 100%; }
.isl { position: absolute; border-radius: 999px; background: #000; }
.two .scr:last-child { margin-top: 90px; }
`;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
for (const c of cards) {
  const bg = await edge(c.screens[0]);
  const two = c.screens.length > 1;
  const html = `<meta charset="utf-8"><style>${css}</style>
  <div class="card ${bg.dark ? 'dark' : 'light'} ${two ? 'cover' : ''}" style="--bg:${bg.css}">
    <div class="text"><div class="kicker">${c.kicker}</div><h1>${c.title}</h1><p>${c.body}</p><div class="foot">wanted-qloo.vercel.app</div></div>
    <div class="stage ${two ? 'two' : ''}">${c.screens.map((s) => screen(s, two ? 740 : 880)).join('')}</div>
  </div>`;
  writeFileSync(`${shots}/card.html`, html);
  await p.goto(`file://${shots}/card.html`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${c.name}.jpg`, quality: 90 });
  console.log('ok', c.name);
}
await b.close();
