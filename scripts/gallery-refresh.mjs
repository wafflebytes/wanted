/**
 * Retakes the whole Devpost gallery after a deploy, hands off: waits until production serves the
 * new build, takes every screenshot in the iOS Simulator (light and dark), then rebuilds the cards.
 *
 *   node scripts/gallery-refresh.mjs [--wait <path> <text>] [shotsDir] [outDir]
 *
 * --wait polls BASE+path until its body contains text (something only the new build has), so it
 * can be started right after a push. Logs go to stdout; it exits non-zero if any step fails.
 */
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
let wait = null;
if (args[0] === '--wait') wait = { path: args[1], text: args[2] }, args.splice(0, 3);
const shots = args[0] ?? '.data/gallery';
const out = args[1] ?? 'docs/gallery';
const BASE = process.env.BASE ?? 'https://trywanted.vercel.app';
const say = (m) => console.log(`[${new Date().toLocaleTimeString()}] ${m}`);

if (wait) {
  say(`waiting for ${BASE}${wait.path} to say "${wait.text}"`);
  const until = Date.now() + 20 * 60_000;
  for (;;) {
    const body = await fetch(`${BASE}${wait.path}?r=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text()).catch(() => '');
    if (body.includes(wait.text)) break;
    if (Date.now() > until) throw new Error('the new build never showed up');
    await new Promise((r) => setTimeout(r, 15_000));
  }
  say('new build is live');
}

// Warm the server renders (posters, map) so the first screenshot isn't of a loading page.
for (const p of ['/a/maya-ortiz', '/a/maya-ortiz/posters', '/w/maya-ortiz/burlington-vt', '/img/poster/maya-ortiz/burlington-vt?w=640&v=0']) await fetch(`${BASE}${p}`).catch(() => {});

const run = (file, ...a) => execFileSync('node', [file, ...a], { stdio: 'inherit', env: { ...process.env, BASE } });
say('screenshots');
run('scripts/gallery-shots.mjs', shots);
say('cards');
run('scripts/gallery-cards.mjs', shots, out);
say(`done: ${out}`);
