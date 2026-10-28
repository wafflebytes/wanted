/**
 * Devpost gallery cards (3:2). Real iPhone Safari screenshots (the iOS Simulator, 1179x2556) sit
 * in a slim phone, and the surfaces Gus talks through (the Dynamic Island, an offer, Tap to talk)
 * are drawn here in code from the app's own styles, filled with the live demo's real numbers.
 * Each screen appears once. Gus's art floats around them like stickers, after App Store sets
 * such as Mealy and Pool, and he's on the cover because that's the thumbnail.
 *
 *   node scripts/gallery-cards.mjs <shotsDir> docs/gallery
 *
 * Art comes from new-assets-gus/ (the 1200px sources, not committed) when it's there, else from
 * web/public/art.
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const shots = resolve(process.argv[2] ?? '.data/gallery');
const out = process.argv[3] ?? 'docs/gallery';
const fonts = resolve('web/public/fonts');

const hi = resolve('new-assets-gus');
const art = (n) => {
  const src = `${hi}/${n === 'obj-cassette' ? 'obj-casette' : n}.png`;
  return `file://${existsSync(src) ? src : `${resolve('web/public/art')}/${n}.webp`}`;
};
const shot = (n) => `file://${shots}/${n}.png`;

const icon = {
  check: '<path d="M5 12.5l4.2 4.2L19 7" />',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  keys: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  forward: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>',
};
const svg = (n, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icon[n]}</svg>`;

// ── Pieces ────────────────────────────────────────────────────────────────────

/** A slim iPhone around a real screenshot. x, y are the phone's top-left in the card. */
const phone = (name, { h = 860, x, y, rot = 0, tilt = '', blur = 0, z = 2 }) => {
  const k = h / 2556, w = Math.round(1179 * k), b = Math.round(h * 0.016), r = Math.round(165 * k);
  return `<div class="ph" style="left:${x}px; top:${y}px; width:${w + 2 * b}px; height:${h + 2 * b}px; padding:${b}px; border-radius:${r + b}px; transform:${tilt || `rotate(${rot}deg)`}; z-index:${z}">
    <div class="scr" style="border-radius:${r}px"><img src="${shot(name)}" style="${blur ? `filter: blur(${blur}px) brightness(.62) saturate(1.1); transform: scale(1.06)` : ''}">
    <i class="isl" style="left:${402 * k}px; top:${34 * k}px; width:${373 * k}px; height:${109 * k}px"></i></div></div>`;
};

/** A piece of art, floating. */
const sticker = (n, { x, y, s, rot = 0, z = 3, flip = false }) =>
  `<img class="stk" src="${art(n)}" style="left:${x}px; top:${y}px; width:${s}px; transform:rotate(${rot}deg)${flip ? ' scaleX(-1)' : ''}; z-index:${z}">`;

/** A small glass chip pulled out of the UI. */
const chip = (html, { x, y, rot = 0, z = 4, tone = '' }) => `<div class="chip ${tone}" style="left:${x}px; top:${y}px; transform:rotate(${rot}deg); z-index:${z}">${html}</div>`;

// zoom scales left/top too, so positions are divided by it to stay in card pixels.
const at = (html, { x, y, z = 4, rot = 0, zoom = 1, tilt = '', center = false }) =>
  center
    ? `<div class="at" style="left:0; right:0; top:${y}px; z-index:${z}; display:flex; justify-content:center">${html}</div>`
    : `<div class="at" style="left:${x / zoom}px; top:${y / zoom}px; z-index:${z}; transform:${tilt || `rotate(${rot}deg)`}; transform-origin: 0 0; zoom:${zoom}">${html}</div>`;

// The Dynamic Island, as the app draws it (web/app/shell.css), at 2x.
const island = (words, { dot = 'live', trail = '' } = {}) =>
  `<div class="island"><span class="ig"></span><b>${words}</b>${trail ? `<span class="itrail">${trail}</span>` : ''}${dot ? `<i class="idot ${dot}"></i>` : ''}</div>`;
const bump = (big, small) => `<div class="island bump"><span class="ig"></span><span><b>${big}</b><em>${small}</em></span></div>`;

// ── Cards ─────────────────────────────────────────────────────────────────────

const cards = [
  {
    name: '0-cover', theme: 'hot', cover: true,
    title: 'Meet Gus, your AI tour manager.',
    body: 'He finds the cities that want your band, gets the fans there to sign, and books the venue.',
    stage: () => `
      <div class="halo" style="left:640px; top:20px; width:1000px; height:1000px"></div>
      ${phone('home', { h: 860, x: 930, y: 70, tilt: 'perspective(2600px) rotateY(-18deg) rotateX(6deg) rotateZ(4deg)', z: 2 })}
      ${sticker('gus-tour-manager', { x: 640, y: 450, s: 520, z: 3 })}`,
  },
  {
    name: '1-island', theme: 'dark', layout: 'top', kicker: 'Always on',
    title: 'He works while you’re away.',
    body: 'He calls venues and counts signatures on his own. The Dynamic Island tells you what he’s doing, and grows when something needs you.',
    stage: () => `
      <img class="bd" src="${shot('home-dark')}">
      ${at(island('Calling SPACE Gallery', { trail: '2:14' }), { x: 0, y: 340, z: 5, center: true })}
      ${at(bump('Offer in', 'The Nocturnal Café, Ithaca'), { x: 0, y: 442, z: 5, center: true })}
      ${at(`<div class="lact">
          <div class="lact-top"><span class="ig big"></span><div><span class="kick ok">Booked</span><b>The Basement</b><em>Columbus · Fri, Nov 20</em></div></div>
          <div class="steps"><i class="on"></i><i class="on"></i><i class="on"></i></div>
          <div class="steps-l"><span>Asked</span><span>Offer</span><span>Booked</span></div>
          <p>Everyone who signed in Columbus hears first.</p>
        </div>`, { x: 0, y: 596, z: 5, center: true })}`,
  },
  {
    name: '2-sleeper-cities', theme: 'cream', kicker: 'Where you’re wanted',
    title: 'He finds the cities nobody plays yet.',
    body: 'Every US city and neighborhood is scored for your sound on Qloo’s taste graph. Sleepers like Ithaca have far more fans than their size predicts.',
    stage: () => `
      <div class="halo" style="left:700px; top:60px; width:900px; height:900px"></div>
      ${phone('city', { h: 900, x: 920, y: 50, tilt: 'perspective(2600px) rotateY(-24deg) rotateX(8deg) rotateZ(5deg)' })}`,
  },
  {
    name: '3-wanted-poster', theme: 'dark', layout: 'top', kicker: 'Proof',
    title: 'Fans sign the WANTED poster.',
    body: 'Each signature is a fan saying “come play here.” At fifty, Gus asks the venues that fit you.',
    stage: () => `
      <div class="halo" style="left:300px; top:300px; width:900px; height:900px"></div>
      ${phone('fan-dark', { h: 1120, x: 472, y: 340 })}`,
  },
  {
    name: '4-one-decision', theme: 'cream', kicker: 'The deal',
    title: 'You make one decision.',
    body: 'Gus haggles inside your limits and brings back one offer. A deposit locks in that exact date, and if the terms change, your yes is void. Test mode, so no real money moves.',
    stage: () => `
      <div class="halo" style="left:700px; top:60px; width:900px; height:900px"></div>
      ${at(`<div class="approve">
          <div class="ap-top"><img src="${art('act-deposit')}"><div><span class="kick">Needs your OK</span><b class="amt">$80</b><em>deposit to lock in the date at SPACE Gallery</em></div></div>
          <dl><div><dt>Pay</dt><dd>SPACE Gallery</dd></div><div><dt>Date</dt><dd>Thu, Dec 10</dd></div><div><dt>Your cut</dt><dd>71% of ticket sales</dd></div><div><dt>Venue size</dt><dd>About 150 people</dd></div></dl>
          <p class="ap-next">Then the date is yours, and everyone who signed in Portland hears first.</p>
          <div class="slide"><span class="slide-fill"></span><span class="slide-l">Slide to pay $80</span><span class="knob">${svg('forward', 26)}</span></div>
          <div class="ap-no">Not this one</div>
        </div>`, { x: 800, y: 110, z: 3, zoom: 1.08, tilt: 'perspective(2400px) rotateY(-16deg) rotateX(6deg) rotateZ(-3deg)' })}`,
  },
  {
    name: '5-fan-mail', theme: 'dark', layout: 'right', kicker: 'Fan Mail',
    title: 'Your week, as a letter.',
    body: 'Open it with your coffee: how the week felt, one big number, and the mail that needs you. Then the cities that are almost there and the newest signatures.',
    stage: () => `
      <div class="halo" style="left:-60px; top:60px; width:900px; height:900px"></div>
      ${phone('mail-dark', { h: 1240, x: 150, y: 110, tilt: 'perspective(2600px) rotateY(24deg) rotateX(8deg) rotateZ(-5deg)' })}`,
  },
  {
    name: '6-ask-gus', theme: 'cream', layout: 'right', kicker: 'Ask anything',
    title: 'He checks before he answers.',
    body: 'Tap to talk and ask which Burlington venues are open on a Tuesday. He looks it up first, names The Flynn, and skips Monkey House because it’s closed that night.',
    stage: () => {
      const reply = 'The Flynn fits you best and it’s open Tuesdays. Monkey House is closed that night, so I skipped it. Want me to ask The Flynn for a date?';
      const words = reply.split(' ');
      const lit = 17;
      return `
      <div class="halo" style="left:-60px; top:60px; width:900px; height:900px"></div>
      ${at(`<div class="voice">
          <div class="q">Which Burlington venues are open on a Tuesday?</div>
          <ul class="look"><li><span class="ck ok sm">${svg('check', 14)}</span>Venues that fit you<em>Burlington</em></li><li><span class="ck ok sm">${svg('check', 14)}</span>Hours on a Tuesday<em>Monkey House closed</em></li></ul>
          <p class="cap">${words.map((w, i) => `<span class="${i < lit ? 'lit' : ''}">${w}</span>`).join(' ')}</p>
          <div class="prop">Ask The Flynn for a date ${svg('forward', 20)}</div>
          <div class="vbar"><span class="side">${svg('keys', 22)}</span><span class="tk"><span class="ring"></span><img src="${art('gus-glyph')}"></span><span class="side">${svg('close', 22)}</span></div>
          <div class="tcap">Tap to talk</div>
        </div>`, { x: 140, y: 110, z: 3, zoom: 1.0, tilt: 'perspective(2400px) rotateY(14deg) rotateX(5deg) rotateZ(2deg)' })}`;
    },
  },
  {
    name: '7-logbook', theme: 'dark', kicker: 'Logbook',
    title: 'Everything he did, written down.',
    body: 'Every call, offer and yes, in plain words, with a dot for who made the call. Milestones collect on the shelf as the tour comes together.',
    stage: () => `
      <div class="halo" style="left:700px; top:60px; width:900px; height:900px"></div>
      ${phone('logbook-dark', { h: 1300, x: 800, y: 70 })}`,
  },
  {
    name: '8-how-it-works', theme: 'cream', kicker: 'How Gus works',
    title: 'Taste data in, one yes out.',
    body: 'Qloo tells him where your crowd is. Fans prove it on the poster. Gus does the asking, and the money waits for you.',
    stage: () => {
      const steps = [
        ['obj-cassette', 'Your sound', 'Paste a Spotify, Apple Music or Bandcamp link.'],
        ['pin-sleeper', 'Qloo’s taste graph', 'Every US city and neighborhood scored for it.'],
        ['act-staple', 'The WANTED poster', 'Fans sign with their neighborhood. Fifty opens the city.'],
        ['act-phone', 'Gus asks the venues', 'Only venues a lookup returned, never past your limits.'],
        ['act-deposit', 'Your yes', 'The deposit is tied to that exact offer.'],
      ];
      return `<div class="halo" style="left:760px; top:100px; width:800px; height:800px"></div>
        <div class="how">${steps.map(([a, t, d], k) => `<div class="tok" ><span class="num">${k + 1}</span><img src="${art(a)}"><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>`;
    },
  },
  {
    name: '9-with-qloo', theme: 'dark', kicker: 'Why taste data',
    title: 'A plain chatbot gets most venues wrong.',
    body: 'We asked one for venues in 8 cities and checked each. 46% held up. In Ithaca it was 1 of 8, and one was in Illinois.',
    stage: () => `<div class="halo" style="left:760px; top:100px; width:800px; height:800px"></div>
      <div class="vs">
        <div class="rcpt"><div class="rh">A plain chatbot<span>Ithaca</span></div>
          <div class="big bad">1 <i>of</i> 8</div><div class="cap2">venues checked out</div>
          <div class="dots"><b class="ok">✓</b>${'<b>✕</b>'.repeat(7)}</div>
          <p>Some were closed for good, some were dark that night, and one was in Illinois.</p></div>
        <div class="rcpt good"><div class="rh">Gus on Qloo<span>Ithaca</span></div>
          <div class="big">Every</div><div class="cap2">venue came from a lookup</div>
          <p>If Qloo didn’t return a place, Gus doesn’t say it. He checks the hours too.</p>
          <img class="stamp" src="${art('self-approved')}"></div>
      </div>`,
  },
  {
    name: '10-loop', theme: 'hot', kicker: 'Why build all this',
    title: 'Every show makes the next one easier.',
    body: 'Signers fill the venue, the venue pays the band, and the crowd that came signs the next poster. Venues get nights that sell, and fans get the show in their own town.',
    stage: () => {
      const nodes = [['act-staple', 'Fans sign'], ['act-phone', 'Gus asks venues'], ['obj-ticket', 'The show sells'], ['act-deposit', 'The band gets paid'], ['act-megaphone', 'The crowd spreads it']];
      const R = 300, C = 380, ox = 740, oy = 120;
      return `<div class="loop" style="left:${ox}px; top:${oy - 10}px"><svg viewBox="0 0 760 760" width="760" height="760"><defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#FFF4E8"/></marker></defs>
        ${nodes.map((_, k) => {
          const a0 = (k / nodes.length) * 2 * Math.PI - Math.PI / 2 + 0.36, a1 = ((k + 1) / nodes.length) * 2 * Math.PI - Math.PI / 2 - 0.36;
          const p = (a) => `${C + R * Math.cos(a)} ${C + R * Math.sin(a)}`;
          return `<path d="M${p(a0)} A${R} ${R} 0 0 1 ${p(a1)}" fill="none" stroke="#FFF4E8" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" marker-end="url(#ah)"/>`;
        }).join('')}</svg>
        <img class="hub" src="${art('gus-proud')}">
        ${nodes.map(([a, t], k) => {
          const ang = (k / nodes.length) * 2 * Math.PI - Math.PI / 2;
          return `<div class="node" style="left:${C + R * Math.cos(ang)}px; top:${C + R * Math.sin(ang)}px"><img src="${art(a)}"><b>${t}</b></div>`;
        }).join('')}</div>`;
    },
  },
  {
    name: '11-in-claude', theme: 'cream', layout: 'right', kicker: 'Gus in Claude',
    title: 'Ask him from Claude too.',
    body: 'Add Gus as a connector and he answers as a card in the chat. Paying always comes back to Wanted for your yes.',
    optional: 'claude',
    stage: () => `
      <div class="halo" style="left:-60px; top:60px; width:900px; height:900px"></div>
      ${phone('claude', { h: 1400, x: 160, y: -330 })}`,
  },
  {
    name: '12-try-gus', theme: 'hot', kicker: 'Try it',
    title: 'Meet Gus on your phone.',
    body: 'Scan for the live demo with Maya Ortiz’s tour already running. No sign-up. To ask him from Claude, add trywanted.vercel.app/api/mcp as a connector.',
    stage: () => `
      <div class="try"><div class="qr">${readFileSync(`${shots}/qr.svg`, 'utf8')}</div><b>trywanted.vercel.app</b></div>`,
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const grain = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;

const css = `
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-600.woff2); font-weight: 600; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-700.woff2); font-weight: 700; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-800.woff2); font-weight: 800; }
@font-face { font-family: WR; src: url(file://${fonts}/WantedRounded-900.woff2); font-weight: 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1500px; height: 1000px; overflow: hidden; font-family: WR, system-ui; }
.card { position: relative; width: 1500px; height: 1000px; overflow: hidden; background: var(--bg); color: var(--ink); }
.card::after { content: ''; position: absolute; inset: 0; background: ${grain}; opacity: var(--grain); mix-blend-mode: overlay; pointer-events: none; z-index: 20; }
.cream { --bg: radial-gradient(120% 90% at 20% 10%, #F8F3EA, #EDE5D6); --ink: #15130F; --ink2: rgba(21,19,15,.6); --acc: #E8490F; --hair: rgba(21,19,15,.09); --drop: rgba(70,40,10,.22); --halo: rgba(255,120,60,.30); --grain: .5;
  --p1: #FFFDF8; --p2: #F6F1E7; --hl: #fff; }
.dark { --bg: radial-gradient(120% 90% at 20% 10%, #1D1A16, #0D0C0A); --ink: #F5F0E6; --ink2: rgba(245,240,230,.6); --acc: #FF6A2B; --hair: rgba(245,240,230,.1); --drop: rgba(0,0,0,.6); --halo: rgba(255,90,31,.24); --grain: .35;
  --p1: #27231E; --p2: #1C1915; --hl: rgba(255,255,255,.07); }
.hot { --bg: radial-gradient(90% 90% at 72% 42%, #FF9A5C 0%, #FF5A1F 48%, #E2430C 100%); --ink: #FFF7EE; --ink2: rgba(255,247,238,.84); --acc: #FFF7EE; --hair: rgba(80,20,0,.16); --drop: rgba(110,30,0,.42); --halo: rgba(255,214,170,.42); --grain: .45;
  --p1: #FFFDF8; --p2: #F6F1E7; --hl: #fff; }

.text { position: absolute; left: 104px; top: 0; bottom: 0; width: 590px; display: flex; flex-direction: column; justify-content: center; z-index: 10; }
.kicker { align-self: flex-start; font-weight: 800; font-size: 21px; letter-spacing: .13em; text-transform: uppercase; color: var(--acc); margin-bottom: 26px; }
h1 { font-weight: 900; font-size: 78px; line-height: 1.02; letter-spacing: -.03em; text-wrap: balance; }
.text p { margin-top: 28px; font-weight: 600; font-size: 27px; line-height: 1.42; color: var(--ink2); text-wrap: pretty; }
.foot { position: absolute; left: 104px; bottom: 50px; font-weight: 700; font-size: 19px; color: var(--ink2); opacity: .8; z-index: 10; display: flex; align-items: center; gap: 12px; }
.foot img { width: 34px; height: 34px; border-radius: 50%; }

.ph { position: absolute; background: linear-gradient(145deg, #3B3935, #0B0B0A 30%, #161514 70%, #3a3834); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.14), 0 0 0 1px rgba(0,0,0,.35), 0 60px 100px -40px var(--drop), 0 24px 40px -20px var(--drop); }
.scr { position: relative; width: 100%; height: 100%; overflow: hidden; background: #000; }
.scr img { display: block; width: 100%; height: 100%; }
.isl { position: absolute; border-radius: 999px; background: #000; }
.stk { position: absolute; filter: drop-shadow(0 22px 26px var(--drop)) drop-shadow(0 6px 8px var(--drop)); }
.halo { position: absolute; border-radius: 50%; background: radial-gradient(circle, var(--halo), transparent 64%); z-index: 0; }
.at { position: absolute; }

.chip { position: absolute; display: flex; align-items: center; gap: 16px; padding: 16px 28px 16px 16px; border-radius: 999px; background: rgba(255,253,248,.94); color: #15130F; box-shadow: inset 0 1px 0 #fff, 0 0 0 1px rgba(21,19,15,.06), 0 28px 50px -22px rgba(40,20,0,.5), 0 8px 16px -10px rgba(40,20,0,.3); backdrop-filter: blur(20px); white-space: nowrap; }
.chip b { display: block; font-weight: 800; font-size: 25px; letter-spacing: -.01em; }
.chip em { display: block; font-style: normal; font-weight: 600; font-size: 19px; color: rgba(21,19,15,.58); margin-top: 2px; }
.ck { flex: none; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
.ck.ok { background: linear-gradient(180deg, #2FB673, #1F9D63); }
.ck.hot { background: linear-gradient(180deg, #FF7637, #F2510F); }
.ck.pen { background: #15130F; }
.ck.sm { width: 24px; height: 24px; }

/* Dynamic Island */
.island { display: inline-flex; align-items: center; gap: 14px; height: 76px; padding: 0 30px 0 12px; border-radius: 999px; background: #0A0908; color: #F6F4EF; white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), inset 0 2px 0 rgba(255,255,255,.08), 0 40px 70px -24px rgba(0,0,0,.7), 0 10px 20px -10px rgba(0,0,0,.5); }
.ig { flex: none; width: 54px; height: 54px; border-radius: 50%; background: #2A2622 url(${art('gus-glyph')}) center 30% / 118% no-repeat; }
.ig.big { width: 84px; height: 84px; }
.island b { font-weight: 700; font-size: 29px; letter-spacing: -.01em; }
.itrail { font-weight: 800; font-size: 26px; color: rgba(246,244,239,.62); font-variant-numeric: tabular-nums; }
.idot { width: 14px; height: 14px; border-radius: 50%; background: #FF5A1F; box-shadow: 0 0 0 7px rgba(255,90,31,.22); }
.island.bump { height: 128px; border-radius: 54px; padding: 0 44px 0 22px; gap: 20px; }
.bump .ig { width: 80px; height: 80px; }
.bump b { display: block; font-weight: 900; font-size: 44px; letter-spacing: -.02em; }
.bump em { display: block; font-style: normal; font-weight: 600; font-size: 23px; color: rgba(246,244,239,.62); margin-top: 6px; }
.lact { width: 560px; padding: 32px 34px 30px; border-radius: 58px; background: #0A0908; color: #F6F4EF; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), inset 0 2px 0 rgba(255,255,255,.08), 0 50px 90px -30px rgba(0,0,0,.8); }
.lact-top { display: flex; gap: 20px; align-items: center; }
.kick { display: block; font-weight: 800; font-size: 18px; letter-spacing: .12em; text-transform: uppercase; color: #FF8A4C; }
.kick.ok { color: #4CD38C; }
.lact b { display: block; font-weight: 900; font-size: 40px; letter-spacing: -.02em; margin-top: 4px; }
.lact em { display: block; font-style: normal; font-weight: 600; font-size: 22px; color: rgba(246,244,239,.62); margin-top: 4px; }
.steps { display: flex; gap: 10px; margin-top: 26px; }
.steps i { flex: 1; height: 10px; border-radius: 9px; background: rgba(246,244,239,.16); }
.steps i.on { background: linear-gradient(90deg, #2FB673, #4CD38C); }
.steps-l { display: flex; justify-content: space-between; margin-top: 10px; font-weight: 700; font-size: 18px; color: rgba(246,244,239,.5); }
.lact p { margin-top: 18px; font-weight: 600; font-size: 21px; color: rgba(246,244,239,.75); }

/* The offer (web/components/Approval.tsx) */
.approve { width: 590px; padding: 36px 38px 28px; border-radius: 44px; background: linear-gradient(180deg, #FFFFFF, #FBF8F2); color: #15130F; box-shadow: inset 0 1px 0 #fff, 0 0 0 1px rgba(21,19,15,.06), 0 60px 100px -40px rgba(70,40,10,.45), 0 20px 40px -20px rgba(70,40,10,.25); }
.ap-top { display: flex; gap: 22px; align-items: center; }
.ap-top img { width: 112px; height: 112px; object-fit: contain; filter: drop-shadow(0 12px 14px rgba(70,40,10,.3)); }
.approve .kick { color: #C2410C; }
.amt { display: block; font-weight: 900; font-size: 76px; line-height: 1; letter-spacing: -.035em; margin-top: 6px; }
.ap-top em { display: block; font-style: normal; font-weight: 600; font-size: 21px; color: #6B675F; margin-top: 6px; }
.approve dl { margin-top: 26px; border-radius: 26px; background: #F4F1EA; padding: 6px 24px; }
.approve dl div { display: flex; justify-content: space-between; padding: 15px 0; font-size: 23px; }
.approve dl div + div { border-top: 1.5px solid rgba(21,19,15,.07); }
.approve dt { font-weight: 600; color: #6B675F; }
.approve dd { font-weight: 800; }
.ap-next { margin-top: 20px; font-weight: 600; font-size: 21px; line-height: 1.4; color: #6B675F; }
.slide { position: relative; height: 92px; margin-top: 24px; border-radius: 999px; background: #ECE9E2; box-shadow: inset 0 2px 4px rgba(20,16,8,.1); overflow: hidden; }
.slide-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 92px; border-radius: 999px; background: linear-gradient(90deg, rgba(255,118,55,.15), rgba(255,118,55,.42)); }
.slide-l { position: absolute; inset: 0; display: grid; place-items: center; padding-left: 70px; font-weight: 800; font-size: 25px; color: #15130F; opacity: .55; }
.knob { position: absolute; left: 7px; top: 7px; width: 78px; height: 78px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: radial-gradient(120% 80% at 50% 0%, rgba(255,236,220,.28), transparent 60%), linear-gradient(180deg, #FF7637, #F2510F); box-shadow: inset 0 1px 0 rgba(255,224,200,.6), 0 10px 20px -8px rgba(200,60,0,.7); }
.ap-no { text-align: center; margin-top: 16px; font-weight: 700; font-size: 22px; color: #6B675F; }
.ap-fine { text-align: center; margin-top: 8px; font-weight: 600; font-size: 17px; color: #A29E95; }

/* Tap to talk (web/components/GusPanels.tsx) */
.voice { width: 560px; padding: 34px 34px 28px; border-radius: 48px; background: linear-gradient(180deg, #FFFFFF, #FAF7F1); color: #15130F; box-shadow: inset 0 1px 0 #fff, 0 0 0 1px rgba(21,19,15,.06), 0 60px 100px -40px rgba(70,40,10,.45), 0 20px 40px -20px rgba(70,40,10,.25); }
.q { margin-left: auto; width: fit-content; max-width: 420px; padding: 18px 24px; border-radius: 28px 28px 8px 28px; background: #15130F; color: #F6F4EF; font-weight: 700; font-size: 23px; line-height: 1.3; }
.look { list-style: none; margin-top: 24px; display: grid; gap: 12px; }
.look li { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 20px; color: #6B675F; }
.look em { margin-left: auto; font-style: normal; font-weight: 700; font-size: 18px; color: #A29E95; }
.cap { margin-top: 24px; font-weight: 800; font-size: 31px; line-height: 1.3; letter-spacing: -.01em; color: rgba(21,19,15,.24); }
.cap .lit { color: #15130F; }
.prop { display: inline-flex; align-items: center; gap: 10px; margin-top: 22px; padding: 16px 24px; border-radius: 999px; background: linear-gradient(180deg, #FF7637, #F2510F); color: #fff; font-weight: 800; font-size: 21px; box-shadow: inset 0 1px 0 rgba(255,224,200,.6), 0 12px 24px -12px rgba(200,60,0,.8); }
.vbar { display: flex; align-items: center; justify-content: space-between; margin-top: 30px; padding: 0 12px; }
.side { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; background: #F1EEE7; color: #6B675F; }
.tk { position: relative; width: 112px; height: 112px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.16), transparent 55%), linear-gradient(180deg, #2B2823, #121110); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 16px 30px -12px rgba(0,0,0,.5); }
.tk img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; }
.ring { position: absolute; inset: -12px; border-radius: 50%; border: 5px solid rgba(255,90,31,.55); box-shadow: 0 0 0 12px rgba(255,90,31,.14); }
.tcap { text-align: center; margin-top: 18px; font-weight: 700; font-size: 19px; color: #A29E95; }

/* Drawn cards */
.tok, .rcpt, .node { background: linear-gradient(180deg, var(--p1), var(--p2)); box-shadow: inset 0 1px 0 var(--hl), 0 0 0 1px var(--hair), 0 24px 40px -26px var(--drop), 0 6px 12px -8px var(--drop); }
.how { position: absolute; left: 860px; top: 130px; width: 600px; display: flex; flex-direction: column; gap: 20px; z-index: 3; }
.tok { position: relative; display: flex; align-items: center; gap: 22px; padding: 16px 28px 16px 16px; border-radius: 30px; width: 500px; }
.tok img { width: 92px; height: 92px; object-fit: contain; flex: none; filter: drop-shadow(0 8px 10px var(--drop)); }
.tok b { display: block; font-weight: 800; font-size: 29px; letter-spacing: -.01em; }
.tok small { display: block; margin-top: 4px; font-weight: 600; font-size: 20px; color: var(--ink2); }
.num { position: absolute; left: -14px; top: -10px; width: 36px; height: 36px; border-radius: 50%; background: #F2541B; color: #fff; font-weight: 900; font-size: 19px; display: grid; place-items: center; }
.vs { position: absolute; left: 790px; top: 150px; display: flex; gap: 24px; align-items: flex-start; z-index: 3; }
.rcpt { position: relative; width: 300px; padding: 30px 30px 36px; border-radius: 26px; }
.rcpt.good { margin-top: 60px; }
.rh { display: flex; justify-content: space-between; font-weight: 800; font-size: 19px; text-transform: uppercase; letter-spacing: .1em; color: var(--ink2); padding-bottom: 18px; border-bottom: 2px dashed var(--hair); }
.rh span { color: #FF6A2B; }
.big { margin-top: 22px; font-weight: 900; font-size: 92px; line-height: 1; letter-spacing: -.03em; color: #2FB673; }
.big.bad { color: #FF6A2B; }
.big i { font-style: normal; font-size: 46px; color: var(--ink2); }
.cap2 { font-weight: 700; font-size: 23px; color: var(--ink2); margin-top: 6px; }
.dots { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
.dots b { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 17px; font-weight: 900; color: #FF6A2B; background: rgba(255,106,43,.14); }
.dots b.ok { color: #2FB673; background: rgba(47,182,115,.16); }
.rcpt p { margin-top: 24px; font-weight: 600; font-size: 22px; line-height: 1.42; color: var(--ink2); }
.stamp { position: absolute; right: -22px; bottom: -40px; width: 120px; transform: rotate(10deg); filter: drop-shadow(0 10px 14px var(--drop)); }
.loop { position: absolute; width: 760px; height: 760px; z-index: 3; }
.loop svg { position: absolute; inset: 0; }
.hub { position: absolute; left: 380px; top: 380px; width: 280px; transform: translate(-50%, -50%); filter: drop-shadow(0 20px 26px var(--drop)); }
.node { position: absolute; transform: translate(-50%, -50%); width: 196px; padding: 14px 12px 18px; border-radius: 28px; text-align: center; color: #15130F; }
.node img { width: 92px; height: 92px; object-fit: contain; }
.node b { display: block; margin-top: 6px; font-weight: 800; font-size: 22px; line-height: 1.15; }
.try { position: absolute; left: 860px; top: 190px; width: 480px; padding: 40px 40px 34px; border-radius: 48px; background: linear-gradient(180deg, #FFFDF8, #F3EDE1); color: #15130F; text-align: center; z-index: 3; box-shadow: inset 0 1px 0 #fff, 0 60px 100px -40px rgba(110,30,0,.6); }
.qr { background: #fff; padding: 26px; border-radius: 26px; box-shadow: inset 0 0 0 1.5px rgba(21,19,15,.08); }
.qr svg { display: block; width: 100%; height: auto; }
.try b { display: block; margin-top: 24px; font-weight: 900; font-size: 32px; letter-spacing: -.01em; }

/* Layouts */
.text.right { left: 860px; width: 560px; }
.foot.right { left: 860px; }
.text.top { left: 150px; right: 150px; width: auto; top: 78px; bottom: auto; align-items: center; text-align: center; }
.text.top .kicker { align-self: center; margin-bottom: 18px; }
.text.top h1 { font-size: 74px; }
.text.top p { margin-top: 18px; max-width: 900px; font-size: 26px; }
.bd { position: absolute; inset: -120px; width: calc(100% + 240px); height: calc(100% + 240px); object-fit: cover; filter: blur(46px) brightness(.42) saturate(1.2); z-index: 0; }
.cover h1 { font-size: 100px; }

/* Cover */
.wall { position: absolute; left: -30px; bottom: -70px; font-weight: 900; font-size: 380px; letter-spacing: -.04em; line-height: 1; color: rgba(255,247,238,.1); z-index: 0; white-space: nowrap; }
.cover .text { width: 560px; }
.cover h1 { font-size: 92px; line-height: .98; }
.cover .text p { font-size: 29px; }
.brand { display: flex; align-items: center; gap: 14px; margin-bottom: 34px; font-weight: 900; font-size: 34px; letter-spacing: -.02em; }
.brand i { width: 58px; height: 58px; border-radius: 18px; background: #15130F url(${art('gus-glyph')}) center 30% / 120% no-repeat; box-shadow: 0 12px 24px -10px rgba(80,20,0,.6); }
.pillq { align-self: flex-start; margin-top: 38px; padding: 14px 24px; border-radius: 999px; background: rgba(21,19,15,.9); color: #FFF7EE; font-weight: 800; font-size: 21px; }
`;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const only = process.env.ONLY?.split(',');
for (const c of cards) {
  if (only && !only.some((o) => c.name.startsWith(o))) continue;
  if (c.optional && !existsSync(`${shots}/${c.optional}.png`)) {
    console.log('skip', c.name, `(no ${c.optional}.png)`);
    continue;
  }
  const text = c.cover
    ? `<div class="text"><div class="brand"><i></i>Wanted</div><h1>${c.title}</h1><p>${c.body}</p><div class="pillq">Built on Qloo’s taste graph</div></div>`
    : `<div class="text ${c.layout ?? ''}"><div class="kicker">${c.kicker}</div><h1>${c.title}</h1><p>${c.body}</p></div>${c.layout === 'top' ? '' : `<div class="foot ${c.layout ?? ''}">trywanted.vercel.app</div>`}`;
  const html = `<meta charset="utf-8"><style>${css}</style><div class="card ${c.theme} ${c.cover ? 'cover' : ''}">${text}${c.stage()}</div>`;
  writeFileSync(`${shots}/card.html`, html);
  await p.goto(`file://${shots}/card.html`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${c.name}.jpg`, quality: 90 });
  console.log('ok', c.name);
}
await b.close();
