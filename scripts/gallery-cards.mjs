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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

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
    body: 'Gus has been calling rooms on his own. The Basement in Columbus said yes to Nov 20, and the offer is waiting for your OK.',
    screens: ['home-dark'],
  },
  {
    name: '2-sleeper-cities', kicker: 'Where you’re wanted', title: 'He finds the cities nobody plays yet.',
    body: 'Every US city and neighborhood is scored for your sound. He flags sleepers like Ithaca and knows which streets your fans live on.',
    screens: ['city'],
  },
  {
    name: '3-wanted-poster', kicker: 'Proof', title: 'Fans sign the WANTED poster.',
    body: '26 signed in Burlington so far. At fifty, Gus writes to the rooms that fit you and skips the ones that are dark that night.',
    screens: ['fan-dark'],
  },
  {
    name: '4-one-decision', kicker: 'The deal', title: 'You make one decision.',
    body: 'He haggled inside your limits: 71% of the door and $110 to hold the night. Slide to pay against that exact offer. Test mode, so no real money moves.',
    screens: ['deal'],
  },
  {
    name: '5-posters', kicker: 'Posters', title: 'Every city gets its own wall.',
    body: 'In Burlington, The Flynn already said yes to Dec 10. Once you OK it, everyone who signed hears first.',
    screens: ['posters-dark'],
  },
  {
    name: '6-ask-gus', kicker: 'Ask anything', title: 'He checks before he answers.',
    body: 'Ask which Burlington rooms are open on a Tuesday. He names The Flynn, skips Monkey House because it’s dark that night, and offers to ask for the date.',
    screens: ['gus'],
  },
  {
    name: '7-logbook', kicker: 'Logbook', title: 'Everything he did, written down.',
    body: 'Every call, offer and yes is on the record. This week one thing needed you, and Gus handled the rest.',
    screens: ['logbook-dark'],
  },
  {
    name: '8-how-it-works', kicker: 'How Gus works', title: 'Taste data in, one yes out.',
    body: 'Qloo tells him where your crowd is. Fans prove it on the poster. Gus does the asking, and the money waits for you.',
    theme: 'light', visual: 'how',
  },
  {
    name: '9-with-qloo', kicker: 'Why taste data', title: 'A plain chatbot gets most rooms wrong.',
    body: 'We asked one for rooms in 8 cities and checked each. 46% held up. In Ithaca it was 1 of 8, and one was in Illinois.',
    theme: 'dark', visual: 'versus',
  },
  {
    name: '10-loop', kicker: 'Why build all this', title: 'Every show makes the next one easier.',
    body: 'Signers fill the room, the room pays the band, and the crowd that came signs the next poster. Venues get nights that sell, and fans get the show in their own town.',
    theme: 'light', visual: 'loop',
  },
  {
    name: '11-in-claude', kicker: 'Gus in Claude', title: 'Ask him from Claude too.',
    body: 'Add Gus as a connector and he answers as a card: 26 of 50 signed in Burlington, where your crowd lives, the rooms that fit. Paying always comes back to Wanted for your yes.',
    screens: ['claude'], optional: true,
  },
  {
    name: '12-try-gus', kicker: 'Try it', title: 'Meet Gus on your phone.',
    body: 'Scan for the live demo with Maya Ortiz’s tour. To ask him from Claude, add trywanted.vercel.app/api/mcp as a connector.',
    theme: 'dark', visual: 'qr',
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

// Drawn cards: paper tokens with our own art, on the welcome screen's colours.
const art = (n) => `file://${resolve('web/public/art')}/${n}.webp`;
const themes = { light: 'rgb(239 233 221)', dark: 'rgb(14 13 11)' };

const visuals = {
  how: () => {
    const steps = [
      ['obj-cassette', 'Your sound', 'Paste a Spotify, Apple Music or Bandcamp link.'],
      ['pin-sleeper', 'Qloo’s taste graph', 'Every US city and neighborhood scored for it.'],
      ['act-staple', 'The WANTED poster', 'Fans sign with their neighborhood. Fifty opens the city.'],
      ['act-phone', 'Gus asks the rooms', 'Only rooms a lookup returned, never past your limits.'],
      ['act-deposit', 'Your yes', 'The deposit is tied to that exact offer.'],
    ];
    return `<div class="how">${steps.map(([a, t, d], k) => `
      <div class="tok"><span class="num">${k + 1}</span><img src="${art(a)}"><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>`;
  },
  versus: () => {
    return `<div class="vs">
      <div class="rcpt"><div class="rh">A plain chatbot<span>Ithaca</span></div>
        <div class="big bad">1 <i>of</i> 8</div><div class="cap">rooms held up</div>
        <div class="dots"><b class="ok">✓</b>${'<b>✕</b>'.repeat(7)}</div>
        <p>Some were closed for good, some were dark that night, and one was in Illinois.</p></div>
      <div class="rcpt good"><div class="rh">Gus on Qloo<span>Ithaca</span></div>
        <div class="big">Every</div><div class="cap">room came from a lookup</div>
        <p>If Qloo didn’t return a place, Gus doesn’t say it. He checks the hours too, so he never pitches a room that’s dark that night.</p>
        <img class="stamp" src="${art('self-approved')}"></div>
    </div>`;
  },
  loop: () => {
    const nodes = [
      ['act-staple', 'Fans sign'],
      ['act-phone', 'Gus asks rooms'],
      ['obj-ticket', 'The show sells'],
      ['act-deposit', 'The band gets paid'],
      ['act-megaphone', 'The crowd spreads it'],
    ];
    const R = 290, C = 370;
    return `<div class="loop"><svg viewBox="0 0 740 740"><defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#F2541B"/></marker></defs>
      ${nodes.map((_, k) => {
        const a0 = (k / nodes.length) * 2 * Math.PI - Math.PI / 2 + 0.36, a1 = ((k + 1) / nodes.length) * 2 * Math.PI - Math.PI / 2 - 0.36;
        const p = (a) => `${C + R * Math.cos(a)} ${C + R * Math.sin(a)}`;
        return `<path d="M${p(a0)} A${R} ${R} 0 0 1 ${p(a1)}" fill="none" stroke="#F2541B" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" marker-end="url(#ah)"/>`;
      }).join('')}</svg>
      <div class="hub"><img src="${art('gus-proud')}"></div>
      ${nodes.map(([a, t], k) => {
        const ang = (k / nodes.length) * 2 * Math.PI - Math.PI / 2;
        return `<div class="node" style="left:${C + R * Math.cos(ang)}px; top:${C + R * Math.sin(ang)}px"><img src="${art(a)}"><b>${t}</b></div>`;
      }).join('')}</div>`;
  },
  qr: () => `<div class="try"><div class="qr">${readFileSync(`${shots}/qr.svg`, 'utf8')}</div>
    <div class="tryfoot"><img src="${art('gus-tour-manager')}"><div><b>trywanted.vercel.app</b><small>No sign-up. Maya’s tour is already running.</small></div></div></div>`,
};

const drawn = `
.tok, .rcpt, .node, .try { background: linear-gradient(180deg, var(--p1), var(--p2)); box-shadow: inset 0 1px 0 var(--hl), 0 0 0 1px var(--hair), 0 24px 40px -26px var(--drop), 0 6px 12px -8px var(--drop); }
.light { --p1: #FFFDF8; --p2: #F6F1E7; --hl: #fff; }
.dark { --p1: #25211C; --p2: #1B1814; --hl: rgba(255,255,255,.06); }
.how { width: 640px; display: flex; flex-direction: column; gap: 22px; position: relative; }
.how::before { content: ''; position: absolute; left: 62px; top: 60px; bottom: 60px; border-left: 4px dotted #F2541B; opacity: .7; }
.tok { position: relative; display: flex; align-items: center; gap: 22px; padding: 18px 28px 18px 18px; border-radius: 30px; }
.tok img { width: 88px; height: 88px; object-fit: contain; flex: none; filter: drop-shadow(0 8px 10px var(--drop)); }
.tok b { display: block; font-weight: 800; font-size: 30px; letter-spacing: -.01em; }
.tok small { display: block; margin-top: 4px; font-weight: 600; font-size: 21px; color: var(--ink2); }
.num { position: absolute; left: -14px; top: -10px; width: 36px; height: 36px; border-radius: 50%; background: #F2541B; color: #fff; font-weight: 900; font-size: 19px; display: grid; place-items: center; box-shadow: 0 4px 10px -4px rgba(242,84,27,.8); }
.dots { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
.dots b { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 17px; font-weight: 900; color: #F2541B; background: rgba(242,84,27,.12); }
.dots b.ok { color: #2E9E5B; background: rgba(46,158,91,.14); }
.vs { display: flex; gap: 24px; align-items: flex-start; }
.rcpt { position: relative; width: 300px; padding: 30px 30px 36px; border-radius: 26px; }
.rcpt.good { margin-top: 60px; }
.rh { display: flex; justify-content: space-between; font-weight: 800; font-size: 20px; text-transform: uppercase; letter-spacing: .1em; color: var(--ink2); padding-bottom: 18px; border-bottom: 2px dashed var(--hair); }
.rh span { color: #F2541B; }
.big { margin-top: 22px; font-weight: 900; font-size: 92px; line-height: 1; letter-spacing: -.03em; color: #2E9E5B; }
.big.bad { color: #F2541B; }
.big i { font-style: normal; font-size: 46px; color: var(--ink2); }
.cap { font-weight: 700; font-size: 23px; color: var(--ink2); margin-top: 6px; }
.rcpt p { margin-top: 24px; font-weight: 600; font-size: 22px; line-height: 1.42; color: var(--ink2); }
.stamp { position: absolute; right: -22px; bottom: -40px; width: 120px; transform: rotate(10deg); filter: drop-shadow(0 10px 14px var(--drop)); }
.loop { position: relative; width: 740px; height: 740px; }
.loop svg { position: absolute; inset: 0; }
.hub { position: absolute; left: 370px; top: 370px; transform: translate(-50%, -50%); width: 250px; height: 250px; display: grid; place-items: center; }
.hub img { width: 250px; filter: drop-shadow(0 18px 24px var(--drop)); }
.node { position: absolute; transform: translate(-50%, -50%); width: 196px; padding: 16px 12px 18px; border-radius: 28px; text-align: center; }
.node img { width: 92px; height: 92px; object-fit: contain; filter: drop-shadow(0 8px 10px var(--drop)); }
.node b { display: block; margin-top: 6px; font-weight: 800; font-size: 22px; line-height: 1.15; }
.try { width: 520px; padding: 46px; border-radius: 44px; --p1: #FFFDF8; --p2: #F3EDE1; --hl: #fff; color: #15130F; }
.qr { background: #fff; padding: 30px; border-radius: 26px; box-shadow: inset 0 0 0 1.5px rgba(21,19,15,.08); }
.qr svg { display: block; width: 100%; height: auto; }
.tryfoot { display: flex; align-items: center; gap: 18px; margin-top: 28px; }
.tryfoot img { width: 92px; flex: none; }
.tryfoot b { display: block; font-weight: 900; font-size: 30px; letter-spacing: -.01em; }
.tryfoot small { display: block; margin-top: 4px; font-weight: 600; font-size: 20px; color: rgba(21,19,15,.62); }
.drawn.card { gap: 70px; }
.drawn .text { width: 580px; }
.wide .text { width: 470px; }
.wide.card { gap: 64px; }
.win { position: relative; overflow: hidden; border-radius: 22px; box-shadow: 0 0 0 1.5px var(--hair), 0 50px 90px -40px var(--drop), 0 20px 40px -24px var(--drop); }
.win img { display: block; width: 100%; }
`;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
for (const c of cards) {
  if (c.optional && !existsSync(`${shots}/${c.screens[0]}.png`)) {
    console.log('skip', c.name, `(no ${c.screens[0]}.png)`);
    continue;
  }
  const bg = c.visual ? { css: themes[c.theme], dark: c.theme === 'dark' } : await edge(c.screens[0]);
  const two = !c.visual && c.screens.length > 1;
  let stage;
  if (c.visual) stage = visuals[c.visual]();
  else if (c.wide) {
    const { width, height } = await sharp(`${shots}/${c.screens[0]}.png`).metadata();
    const w = Math.min(860, (820 * width) / height);
    stage = `<div class="win" style="width:${w}px"><img src="file://${shots}/${c.screens[0]}.png"></div>`;
  } else stage = c.screens.map((s) => screen(s, two ? 740 : 880)).join('');
  const html = `<meta charset="utf-8"><style>${css}${drawn}</style>
  <div class="card ${bg.dark ? 'dark' : 'light'} ${two ? 'cover' : ''} ${c.wide ? 'wide' : ''} ${c.visual ? 'drawn' : ''}" style="--bg:${bg.css}">
    <div class="text"><div class="kicker">${c.kicker}</div><h1>${c.title}</h1><p>${c.body}</p><div class="foot">trywanted.vercel.app</div></div>
    <div class="stage ${two ? 'two' : ''}">${stage}</div>
  </div>`;
  writeFileSync(`${shots}/card.html`, html);
  await p.goto(`file://${shots}/card.html`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${c.name}.jpg`, quality: 90 });
  console.log('ok', c.name);
}
await b.close();
