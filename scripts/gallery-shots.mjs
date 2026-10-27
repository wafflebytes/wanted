/**
 * Real iPhone Safari screenshots of the app for the Devpost gallery, from a booted iOS Simulator.
 * Each screen is taken in light and dark.
 *
 *   DEVICE=<udid> BASE=https://trywanted.vercel.app node scripts/gallery-shots.mjs <outDir>
 *
 * Three need taps, so take them by hand in light mode and save them to <outDir>:
 *   deal.png     /a/maya-ortiz, Review (deal ids differ between deployments)
 *   gus.png      Gus button, keyboard, "Which Burlington rooms are open on a Tuesday?"
 *   claude.png   optional: a Claude chat with Gus as a connector
 */
import { execFileSync } from 'node:child_process';

const out = process.argv[2] ?? '.data/gallery';
const BASE = process.env.BASE ?? 'https://trywanted.vercel.app';
const dev = process.env.DEVICE ?? 'booted';
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { stdio: 'ignore' });
const wait = (s) => execFileSync('sleep', [String(s)]);

const screens = {
  home: '/a/maya-ortiz',
  city: '/a/maya-ortiz?city=ithaca-ny',
  deal: '/a/maya-ortiz?deal=d_qIlCZb4xnJW6',
  fan: '/w/maya-ortiz/burlington-vt',
  posters: '/a/maya-ortiz/posters',
  logbook: '/a/maya-ortiz/logbook',
};

// 9:41, full bars, no charging bolt
sim('status_bar', dev, 'override', '--time', '9:41', '--batteryState', 'discharging', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3', '--dataNetwork', 'wifi');
for (const mode of ['light', 'dark']) {
  sim('ui', dev, 'appearance', mode);
  for (const [name, path] of Object.entries(screens)) {
    // A fresh query each time so Safari loads the page instead of restoring it
    sim('openurl', dev, `${BASE}${path}${path.includes('?') ? '&' : '?'}r=${mode}-${Date.now()}`);
    wait(13); // the map and the city sheet take a while in dev
    const file = `${out}/${name}${mode === 'dark' ? '-dark' : ''}.png`;
    sim('io', dev, 'screenshot', file);
    console.log('ok', file);
  }
}
