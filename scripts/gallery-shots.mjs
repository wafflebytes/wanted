/**
 * Phone screenshots of the real app for the Devpost gallery. Uses the installed Chrome.
 *
 *   BASE=http://localhost:3100 node scripts/gallery-shots.mjs <outDir>
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const out = process.argv[2] ?? '.data/gallery';
const only = process.env.ONLY?.split(',');
const scheme = process.env.SCHEME === 'dark' ? 'dark' : 'light';
const b = await chromium.launch({ channel: 'chrome' });
const page = async () => {
  // iPhone 16 points and safe areas, so the app leaves room for the status bar and home indicator the frame draws
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, colorScheme: scheme });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = ':root { --safe-t: 59px !important; --safe-b: 34px !important; }';
    document.head.append(s);
  }));
  return p;
};
const tap = (p, re) => p.evaluate((src) => {
  const re = new RegExp(src);
  const el = [...document.querySelectorAll('button,a,[role=button]')].find((e) => re.test((e.getAttribute('aria-label') ?? '') + ' ' + e.textContent.trim()) && e.getClientRects().length);
  if (!el) throw new Error('no ' + src);
  el.click();
}, re.source);
const home = async (p) => {
  await p.goto(`${BASE}/a/maya-ortiz`, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(3500);
};

const shots = {
  home: async (p) => home(p),
  city: async (p) => {
    await home(p);
    await tap(p, /^ *\d*Ithaca/);
    await p.waitForTimeout(5000);
  },
  chatbot: async (p) => {
    await home(p);
    await tap(p, /^ *\d*Ithaca/);
    await p.waitForTimeout(3000);
    await tap(p, /^ *Compare$/);
    await p.waitForSelector('.plain.is-done', { timeout: 90000 });
    await p.locator('.section-h', { hasText: 'chatbot instead' }).evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(800);
  },
  deal: async (p) => {
    await home(p);
    await tap(p, /^ *Review$/);
    await p.waitForTimeout(3500);
  },
  gus: async (p) => {
    await home(p);
    await p.locator('button.gus-btn').press('Enter');
    await p.waitForTimeout(1500);
    await tap(p, /Type instead/).catch(() => {});
    await p.waitForTimeout(500);
    const ask = p.locator('.vc.on input[aria-label="Ask Gus"]');
    await ask.fill('Which Burlington rooms are open on a Tuesday?');
    await ask.press('Enter');
    await p.waitForTimeout(20000);
  },
  fan: async (p) => {
    await p.goto(`${BASE}/w/maya-ortiz/burlington-vt`, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(2500);
  },
  posters: async (p) => {
    await p.goto(`${BASE}/a/maya-ortiz/posters`, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(2500);
  },
};

for (const [name, run] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  const p = await page();
  try {
    await run(p);
    await p.screenshot({ path: `${out}/${name}${scheme === 'dark' ? '-dark' : ''}.png` });
    console.log('ok', name);
  } catch (e) {
    console.log('ERR', name, String(e).split('\n')[0]);
  } finally {
    await p.close();
  }
}
await b.close();
