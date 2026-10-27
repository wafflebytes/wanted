/**
 * Devpost gallery cards (3:2) from the phone screenshots gallery-shots.mjs takes (light and SCHEME=dark).
 * Each card puts the real app in an iPhone frame and scatters our own art around it, alternating light and dark.
 *
 *   node scripts/gallery-cards.mjs <shotsDir> docs/gallery
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const shots = resolve(process.argv[2] ?? '.data/gallery');
const out = process.argv[3] ?? 'docs/gallery';
const fonts = resolve('web/public/fonts');
const art = (n) => `file://${resolve('web/public/art')}/${n}.webp`;

// Bits sit on the stage (the right 700px). x, y, w in px; r in degrees; back puts them behind the phone.
const cards = [
  {
    name: '0-cover', theme: 'light', kicker: 'Wanted', title: 'Gus finds the cities that want your band.',
    body: 'An AI tour manager for independent musicians, on Qloo’s taste graph. Fans sign the poster, then he books the room.',
    phones: [{ shot: 'home', x: 0, y: 150, z: 0.66, r: -7 }, { shot: 'fan-dark', x: 215, y: 95, z: 0.72, r: 0 }, { shot: 'deal', x: 450, y: 150, z: 0.66, r: 7 }],
    bits: [
      { img: 'gus-phone', x: 500, y: 600, w: 230, r: 4 },
      { img: 'pin-sleeper', x: 590, y: 40, w: 130, r: 14, back: true },
      { img: 'obj-pick', x: 600, y: 760, w: 110, r: -18 },
      { note: ['Gus', 'now', 'Spins Bowl said yes: 70% of the door and $80 to hold Dec 17. Your call.'], x: 40, y: 800, w: 390, r: -2 },
    ],
  },
  {
    name: '1-already-working', theme: 'dark', kicker: 'Open the app', title: 'He’s already working.',
    body: 'A call to a room is underway and an offer is waiting for your OK. You didn’t start any of it.',
    phones: [{ shot: 'home-dark' }],
    bits: [
      { img: 'act-phone', x: 470, y: 60, w: 210, r: 10, back: true },
      { note: ['Gus', '9:32', 'Calling Spins Bowl in Poughkeepsie about Thu, Dec 17.'], x: -200, y: 110, w: 380, r: -3 },
      { note: ['Gus', 'now', 'They agreed: 70% of the door and $80 to hold the night.'], x: 330, y: 470, w: 360, r: 2 },
      { img: 'gus-working', x: -40, y: 700, w: 220, r: 0 },
    ],
  },
  {
    name: '2-sleeper-cities', theme: 'light', kicker: 'Where you’re wanted', title: 'He finds the cities nobody plays yet.',
    body: 'Every US city and neighborhood is scored for your sound. Ithaca has more fans than its size predicts, and South Hill is where they live.',
    phones: [{ shot: 'city' }],
    bits: [
      { img: 'act-room', x: 430, y: 40, w: 260, r: 8, back: true },
      { img: 'pin-sleeper', x: 40, y: 120, w: 150, r: -12 },
      { chip: ['★', 'Sleeper city', 'Ithaca, NY'], x: 420, y: 330, r: 3 },
      { chip: ['1', 'South Hill', '8 signed'], x: 450, y: 410, r: -2 },
      { img: 'empty-search', x: -30, y: 720, w: 220, r: -6 },
    ],
  },
  {
    name: '3-wanted-poster', theme: 'dark', kicker: 'Proof', title: 'Fans sign the WANTED poster.',
    body: '51 signed in Burlington. At fifty, Gus writes to the rooms that fit you and skips the ones dark that night.',
    phones: [{ shot: 'fan-dark' }],
    bits: [
      { img: 'act-staple', x: 470, y: 30, w: 230, r: 8, back: true },
      { seal: ['51', 'signed'], x: 30, y: 180, r: -12 },
      { img: 'badge-fifty', x: 450, y: 560, w: 240, r: 6 },
      { chip: ['✎', 'C.D.', 'Old North End'], x: -30, y: 520, r: -4 },
      { chip: ['✎', 'E.V.', 'Downtown'], x: 0, y: 600, r: 3 },
    ],
  },
  {
    name: '4-one-decision', theme: 'light', kicker: 'The deal', title: 'You make one decision.',
    body: 'He haggled inside your limits. Slide to pay the $80 deposit against that exact offer. Test mode, no real money.',
    phones: [{ shot: 'deal' }],
    bits: [
      { img: 'act-deposit', x: 450, y: 60, w: 250, r: 9, back: true },
      { note: ['Gus', 'now', 'Pay $80 to hold Thu, Dec 17? Change the terms and this yes no longer counts.'], x: -190, y: 90, w: 370, r: -3 },
      { img: 'self-approved', x: 500, y: 640, w: 170, r: 12 },
      { chip: ['✓', 'Inside your limits', '70% of the door'], x: -170, y: 820, r: 3 },
    ],
  },
  {
    name: '5-ask-gus', theme: 'dark', kicker: 'Ask anything', title: 'He checks before he answers.',
    body: 'Every room Gus names came back from a lookup. If it didn’t, the answer is thrown out.',
    phones: [{ shot: 'gus-dark' }],
    bits: [
      { img: 'act-mics', x: 460, y: 40, w: 230, r: 6, back: true },
      { chip: ['✓', 'Checked hours', '5 rooms in Burlington'], x: -220, y: 130, r: -3 },
      { chip: ['✓', 'Monkey House', 'dark Tuesday'], x: -160, y: 210, r: 2 },
      { img: 'gus-thinking', x: -30, y: 660, w: 240, r: 0 },
    ],
  },
  {
    name: '6-chatbot', theme: 'light', kicker: 'Why taste data', title: 'A plain chatbot gets most rooms wrong.',
    body: 'Over 8 cities, 46% of its rooms held up. In Ithaca it was 1 of 8, and one room was in Illinois.',
    phones: [{ shot: 'chatbot' }],
    bits: [
      { receipt: [['The Haunt', 'It’s in Aurora, IL', 'x'], ['Castaways', 'No such room', 'q'], ['The Watershed', 'No such room', 'q'], ['State Theatre', 'Real, hosts shows', 'ok']], x: 380, y: 300, r: 4 },
      { seal: ['46%', 'held up'], x: -40, y: 70, r: -10 },
      { img: 'empty-search', x: 440, y: 720, w: 220, r: 8 },
    ],
  },
  {
    name: '7-booked', theme: 'dark', kicker: 'Booked', title: 'Everyone who signed hears first.',
    body: 'The date is set at The Flynn. Gus tells the signers, puts posters up where the crowd hangs out and finds an opener.',
    phones: [{ shot: 'posters-dark' }],
    bits: [
      { img: 'badge-booked', x: 480, y: 40, w: 200, r: 8, back: true },
      { ticket: ['Thu, Dec 10', 'The Flynn · Burlington'], x: -80, y: 210, r: -8 },
      { note: ['Gus', 'now', '51 people in Burlington just heard first.'], x: -340, y: 80, w: 340, r: -3 },
      { img: 'act-megaphone', x: -10, y: 690, w: 220, r: -8 },
    ],
  },
];

const battery = (c) => `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="${c}" stroke-opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="${c}"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="${c}" fill-opacity=".45"/></svg>`;
const signal = (c) => `<svg width="18" height="12" viewBox="0 0 18 12" fill="${c}"><rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
const wifi = (c) => `<svg width="16" height="12" viewBox="0 0 16 12" fill="${c}"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6C5.2.6 2.7 1.7.8 3.5L2 4.7a8.6 8.6 0 0 1 6-2.4zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.9 6.9 0 0 0 8 4c-1.900 0-3.6.7-4.8 1.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4zm0 3.4c-.5 0-1 .2-1.3.5L8 11.4l1.3-1.8c-.3-.3-.8-.5-1.3-.5z"/></svg>`;

function phone({ shot, z = 0.95, x, y, r = 0 }) {
  const dark = shot.endsWith('-dark');
  const c = dark ? '#fff' : '#000';
  const pos = x === undefined ? 'left: 50%; top: 50%; translate: -50% -50%;' : `left: ${x / z}px; top: ${y / z}px;`;
  return `<div class="iphone" style="${pos} zoom: ${z}; rotate: ${r}deg">
    <i class="btn a"></i><i class="btn v1"></i><i class="btn v2"></i><i class="btn p"></i>
    <div class="bezel"><div class="screen">
      <img src="file://${shots}/${shot}.png">
      <div class="sb" style="color:${c}"><span class="t">9:41</span><span class="ic">${signal(c)}${wifi(c)}${battery(c)}</span></div>
      <div class="island"></div>
      <div class="hi" style="background:${c}"></div>
    </div></div>
  </div>`;
}

function bit(b) {
  const at = `left:${b.x}px; top:${b.y}px; rotate:${b.r ?? 0}deg; ${b.back ? 'z-index:0' : 'z-index:3'}`;
  if (b.img) return `<img class="art" src="${art(b.img)}" style="${at}; width:${b.w}px">`;
  if (b.note) {
    const [who, when, text] = b.note;
    return `<div class="note" style="${at}; width:${b.w}px"><img src="${art('gus-glyph')}"><div><b>${who}<span>${when}</span></b><p>${text}</p></div></div>`;
  }
  if (b.chip) return `<div class="chip" style="${at}"><i>${b.chip[0]}</i><b>${b.chip[1]}</b><span>${b.chip[2]}</span></div>`;
  if (b.seal) return `<div class="seal" style="${at}"><b>${b.seal[0]}</b><span>${b.seal[1]}</span></div>`;
  if (b.ticket) return `<div class="ticket" style="${at}"><img src="${art('obj-ticket')}"><div><b>${b.ticket[0]}</b><span>${b.ticket[1]}</span></div></div>`;
  if (b.receipt) {
    const rows = b.receipt.map(([n, why, m]) => `<li class="${m}"><i>${m === 'ok' ? '✓' : m === 'x' ? '✕' : '?'}</i><div><b>${n}</b><span>${why}</span></div></li>`).join('');
    return `<div class="receipt" style="${at}"><h3>A chatbot’s rooms<br><span>Ithaca, checked against Qloo</span></h3><ul>${rows}</ul></div>`;
  }
  return '';
}

const css = `
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-600.woff2); font-weight: 600; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-700.woff2); font-weight: 700; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-800.woff2); font-weight: 800; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-900.woff2); font-weight: 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
.light { --bg: #F6F4EF; --ink: #15130F; --ink2: #6B675F; --card: rgba(255,255,255,.88); --line: rgba(21,19,15,.12); --glow: rgba(242,84,27,.20); }
.dark { --bg: #12110E; --ink: #F3EFE6; --ink2: #A8A397; --card: rgba(38,36,32,.9); --line: rgba(243,239,230,.12); --glow: rgba(242,84,27,.24); }
body { width: 1500px; height: 1000px; overflow: hidden; font-family: WR, system-ui; }
.card { position: relative; width: 1500px; height: 1000px; background: var(--bg); color: var(--ink); overflow: hidden; }
.card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(900px 700px at 78% 62%, var(--glow), transparent 70%); }
.grain { position: absolute; inset: 0; opacity: .5; mix-blend-mode: overlay; }
.route { position: absolute; inset: 0; }
.text { position: absolute; left: 96px; top: 0; bottom: 0; width: 600px; display: flex; flex-direction: column; justify-content: center; z-index: 2; }
.kicker { display: inline-flex; align-items: center; gap: 12px; font-weight: 800; font-size: 24px; letter-spacing: .14em; text-transform: uppercase; color: #F2541B; margin-bottom: 28px; }
.kicker img { width: 34px; }
h1 { font-weight: 900; font-size: 82px; line-height: 1.02; letter-spacing: -.025em; }
.text p { margin-top: 30px; font-weight: 600; font-size: 30px; line-height: 1.4; color: var(--ink2); max-width: 580px; }
.foot { position: absolute; left: 96px; bottom: 56px; font-weight: 700; font-size: 20px; color: var(--ink2); opacity: .8; z-index: 2; }
.stage { position: absolute; left: 720px; top: 0; width: 700px; height: 1000px; }
.cover .text { width: 560px; } .cover h1 { font-size: 80px; } .cover .stage { left: 700px; }
.iphone { position: absolute; z-index: 2; width: 409px; height: 868px; border-radius: 64px; padding: 2px;
  background: linear-gradient(135deg, #9A9AA0, #E4E4E8 18%, #6E6E74 45%, #C9C9CE 70%, #7A7A80);
  box-shadow: 0 50px 90px rgba(0,0,0,.28), 0 12px 24px rgba(0,0,0,.16); }
.dark .iphone { box-shadow: 0 50px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04); }
.bezel { width: 100%; height: 100%; border-radius: 62px; background: #050505; padding: 6px; }
.screen { position: relative; width: 393px; height: 852px; border-radius: 56px; overflow: hidden; background: #000; }
.screen > img { width: 393px; height: 852px; display: block; }
.island { position: absolute; top: 11px; left: 50%; translate: -50% 0; width: 125px; height: 37px; border-radius: 20px; background: #000; }
.sb { position: absolute; top: 0; left: 0; right: 0; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 4px 30px 0 52px;
  font-family: -apple-system, system-ui; font-weight: 600; font-size: 17px; letter-spacing: -.01em; }
.sb .ic { display: flex; gap: 6px; align-items: center; }
.hi { position: absolute; bottom: 8px; left: 50%; translate: -50% 0; width: 139px; height: 5px; border-radius: 3px; opacity: .9; }
.btn { position: absolute; width: 4px; border-radius: 2px; background: linear-gradient(90deg, #6E6E74, #C9C9CE); }
.btn.a { left: -3px; top: 150px; height: 34px; } .btn.v1 { left: -3px; top: 215px; height: 62px; } .btn.v2 { left: -3px; top: 290px; height: 62px; } .btn.p { right: -3px; top: 240px; height: 100px; }
.art { position: absolute; filter: drop-shadow(0 18px 28px rgba(0,0,0,.18)); }
.dark .art { filter: drop-shadow(0 18px 30px rgba(0,0,0,.5)); }
.note { position: absolute; display: flex; gap: 14px; padding: 16px 18px; border-radius: 26px; background: var(--card); backdrop-filter: blur(20px);
  box-shadow: 0 20px 40px rgba(0,0,0,.14), 0 0 0 1px var(--line); }
.note > img { width: 46px; height: 46px; border-radius: 12px; background: #F2541B; object-fit: cover; flex: none; }
.note > div { flex: 1; }
.note b { display: flex; justify-content: space-between; font-weight: 800; font-size: 19px; }
.note b span { font-weight: 600; font-size: 16px; color: var(--ink2); }
.note p { margin-top: 3px; font-weight: 600; font-size: 18px; line-height: 1.3; }
.chip { position: absolute; display: flex; align-items: center; gap: 10px; padding: 12px 20px 12px 12px; border-radius: 999px; background: var(--card);
  box-shadow: 0 14px 30px rgba(0,0,0,.14), 0 0 0 1px var(--line); white-space: nowrap; font-size: 20px; }
.chip i { width: 34px; height: 34px; border-radius: 50%; background: #F2541B; color: #fff; display: grid; place-items: center; font-style: normal; font-weight: 900; font-size: 17px; }
.chip b { font-weight: 800; } .chip span { font-weight: 600; color: var(--ink2); }
.seal { position: absolute; width: 168px; height: 168px; border-radius: 50%; background: #F2541B; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 0 0 6px #FFF8EE, 0 0 0 8px rgba(242,84,27,.35), 0 24px 40px rgba(0,0,0,.25); }
.seal b { font-weight: 900; font-size: 60px; line-height: 1; letter-spacing: -.03em; } .seal span { font-weight: 800; font-size: 18px; letter-spacing: .08em; text-transform: uppercase; }
.ticket { position: absolute; width: 380px; } .ticket img { width: 100%; filter: drop-shadow(0 20px 30px rgba(0,0,0,.4)); }
.ticket div { position: absolute; left: 70px; right: 120px; top: 50%; translate: 0 -55%; color: #15130F; }
.ticket b { display: block; font-weight: 900; font-size: 34px; letter-spacing: -.02em; } .ticket span { font-weight: 700; font-size: 16px; color: #6B675F; }
.receipt { position: absolute; width: 330px; padding: 26px 26px 30px; background: #FFFDF8; color: #15130F; border-radius: 6px;
  box-shadow: 0 26px 50px rgba(0,0,0,.16), 0 0 0 1px rgba(21,19,15,.06); }
.receipt h3 { font-weight: 900; font-size: 24px; line-height: 1.15; } .receipt h3 span { font-weight: 600; font-size: 16px; color: #6B675F; }
.receipt ul { list-style: none; margin-top: 16px; border-top: 2px dashed rgba(21,19,15,.15); }
.receipt li { display: flex; gap: 12px; padding: 12px 0; border-bottom: 2px dashed rgba(21,19,15,.1); }
.receipt li i { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-weight: 900; font-size: 14px; color: #fff; background: #A8A397; }
.receipt li.x i { background: #E5484D; } .receipt li.ok i { background: #2E9E5B; }
.receipt li b { display: block; font-weight: 800; font-size: 18px; } .receipt li span { font-weight: 600; font-size: 15px; color: #6B675F; }
.receipt li.x b, .receipt li.q b { text-decoration: line-through; text-decoration-color: rgba(229,72,77,.6); }
`;

// A dashed tour route with pins drawn behind the stage, our map language rather than a grid.
const route = (dark) => `<svg class="route" viewBox="0 0 1500 1000"><path d="M640 1040 C 760 820, 700 640, 860 560 S 1180 470, 1260 300 S 1420 120, 1560 90" fill="none" stroke="${dark ? 'rgba(243,239,230,.16)' : 'rgba(21,19,15,.14)'}" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>${[[860, 560], [1260, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#F2541B" opacity=".55"/>`).join('')}</svg>`;
const grain = `<svg class="grain" viewBox="0 0 1500 1000"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .35 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
for (const c of cards) {
  const html = `<meta charset="utf-8"><style>${css}</style>
  <div class="card ${c.theme} ${c.name === '0-cover' ? 'cover' : ''}">${route(c.theme === 'dark')}${grain}
    <div class="text"><div class="kicker"><img src="${art('pin-city')}">${c.kicker}</div><h1>${c.title}</h1><p>${c.body}</p></div>
    <div class="foot">wanted-qloo.vercel.app</div>
    <div class="stage">${c.bits.filter((x) => x.back).map(bit).join('')}${c.phones.map(phone).join('')}${c.bits.filter((x) => !x.back).map(bit).join('')}</div>
  </div>`;
  writeFileSync(`${shots}/card.html`, html);
  await p.goto(`file://${shots}/card.html`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${c.name}.jpg`, quality: 90 });
  console.log('ok', c.name);
}
await b.close();
