/**
 * Real iPhone Safari screenshots of the app for the Devpost gallery, from a booted iOS Simulator.
 * Each screen is taken in light and dark.
 *
 *   DEVICE=<udid> BASE=https://trywanted.vercel.app node scripts/gallery-shots.mjs <outDir>
 *
 * Nothing needs a tap: the deal opens from the offer that's waiting (?deal=) and Gus from a
 * question in the link (?ask=). Only claude.png is by hand (a Claude chat with Gus as a connector).
 * scripts/gallery-refresh.mjs runs this and the cards in one go after a deploy.
 */
import { execFileSync } from 'node:child_process';

const out = process.argv[2] ?? '.data/gallery';
const BASE = process.env.BASE ?? 'https://trywanted.vercel.app';
const dev = process.env.DEVICE ?? 'booted';
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { stdio: 'ignore' });
const wait = (s) => execFileSync('sleep', [String(s)]);

// The offer waiting on Maya's OK (the demo keeps one in stock); ids change between deployments.
const { deals } = await (await fetch(`${BASE}/api/artist/maya-ortiz/deals`)).json();
const waiting = deals.find((d) => d.status === 'waiting') ?? deals[0];
const screens = {
  home: '/a/maya-ortiz',
  city: '/a/maya-ortiz?city=ithaca-ny',
  deal: `/a/maya-ortiz?deal=${waiting.id}`,
  gus: `/a/maya-ortiz?ask=${encodeURIComponent('Which Burlington venues are open on a Tuesday?')}`,
  fan: '/w/maya-ortiz/burlington-vt',
  posters: '/a/maya-ortiz/posters',
  logbook: '/a/maya-ortiz/logbook',
  mail: '/a/maya-ortiz/pulse',
};
// ONLY=mail,city retakes just those screens
const only = process.env.ONLY?.split(',');

// 9:41, full bars, no charging bolt
sim('status_bar', dev, 'override', '--time', '9:41', '--batteryState', 'discharging', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3', '--dataNetwork', 'wifi');
for (const mode of ['light', 'dark']) {
  sim('ui', dev, 'appearance', mode);
  for (const [name, path] of Object.entries(screens)) {
    if (only && !only.includes(name)) continue;
    // A fresh query each time so Safari loads the page instead of restoring it
    sim('openurl', dev, `${BASE}${path}${path.includes('?') ? '&' : '?'}r=${mode}-${Date.now()}`);
    wait(name === 'gus' ? 40 : 13); // the map and the city sheet take a while; Gus looks things up before he answers
    const file = `${out}/${name}${mode === 'dark' ? '-dark' : ''}.png`;
    sim('io', dev, 'screenshot', file);
    console.log('ok', file);
  }
}
