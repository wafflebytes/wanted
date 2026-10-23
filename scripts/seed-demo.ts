/**
 * Demo mode (FR-31, FR-29): Maya Ortiz, a composite persona, plus two preset Sounds
 * (hip-hop, stand-up). Seeded signatures are flagged is_demo and labeled "demo data"
 * everywhere they appear; they never count as real proof for a real artist.
 *
 * Stage choreography for the 90-second demo (PRD section 2):
 *   Columbus starts with 36 demo signatures, so the fan who signs live is #37 (a Deputy).
 *   "Simulate 13 fans" then takes Columbus to 50 and crosses the proof threshold, and Gus's
 *   alert fires. The other opened cities hold the rest of Maya's signatures.
 */
import '../scripts/lib/env';
import { openCity, upsertArtist } from '../src/server/artists';
import { cityDetail } from '../src/server/city';
import { sign } from '../src/server/claims';
import { crowdCard } from '../src/server/crowd';
import { run } from '../src/server/db';
import { cityNeighborhoods, countryHeat } from '../src/server/qloo/api';
import { inRegions } from '../src/lib/regions';
import { resolveByName } from '../src/server/resolve';
import { metroById } from '../src/server/score';
import { planFor } from '../src/server/service';
import { scout } from '../src/server/sound';
import { postInbox } from '../src/server/watcher';

export const MAYA_ID = 'a_demo_maya';
const INITIALS = ['J.R.', 'M.K.', 'A.L.', 'T.S.', 'R.B.', 'C.D.', 'N.O.', 'E.V.', 'P.Q.', 'S.W.', 'L.M.', 'K.T.', 'D.H.', 'F.G.', 'B.Y.', 'I.Z.'];

async function resolveSound(names: string[]) {
  const out = [];
  for (const n of names) {
    const e = await resolveByName(n, 'any', 'seed');
    if (!e) throw new Error(`Could not resolve ${n}`);
    console.log(`  ${n} -> ${e.name} (${e.id}, popularity ${e.popularity.toFixed(3)})`);
    out.push({ id: e.id, name: e.name });
  }
  return out;
}

/** Spreads n demo signatures over Qloo's top neighborhoods, most in the hottest ones. */
async function seedSignatures(artistId: string, city: string, n: number, hoods: string[]) {
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const h = hoods.length ? hoods[Math.min(hoods.length - 1, Math.floor(Math.random() ** 1.8 * Math.min(hoods.length, 9)))] : null;
    await sign({
      artist: artistId,
      city,
      neighborhood: h,
      initials: INITIALS[(i * 7 + city.length) % INITIALS.length],
      contact: null,
      deviceToken: `demo-seed-${city}-${i}`,
      ref: null,
      ip: '0.0.0.0',
      isDemo: true,
      // Spread over the last ten days, oldest first.
      createdAt: now - (n - i) * Math.floor((10 * 86400000) / Math.max(1, n)),
    });
  }
}

export async function seedDemo() {
  console.log('Demo: Maya Ortiz (indie folk-pop; sounds like Phoebe Bridgers + Japanese Breakfast)');
  const refs = await resolveSound(['Phoebe Bridgers', 'Japanese Breakfast']);
  const r = await scout(null, refs, 'music', 'seed');
  const maya = await upsertArtist({
    id: MAYA_ID,
    slug: 'maya-ortiz',
    name: 'Maya Ortiz',
    kind: 'music',
    sound: r.sound,
    portrait: 'maya-engraving',
    imageUrl: null,
    homeBase: null,
    roomBand: 'small',
    isDemo: true,
  });

  // Reset demo state so the seed is repeatable.
  await run('delete from claims where artist_id = ?', [MAYA_ID]);
  await run('delete from opened_cities where artist_id = ?', [MAYA_ID]);
  await run('delete from gus_inbox where artist_id = ?', [MAYA_ID]);
  await run('delete from watcher_state where artist_id = ?', [MAYA_ID]);
  await run('delete from plans where artist_id = ?', [MAYA_ID]);

  // Columbus plus the four best-scoring Midwest/East Coast cities by the Wanted Score.
  const regional = r.ranked.filter((m) => inRegions(m.state, ['midwest', 'east']) && m.id !== 'columbus-oh');
  const cities = ['columbus-oh', ...regional.slice(0, 4).map((m) => m.id)];
  const seedCounts: Record<string, number> = { 'columbus-oh': 36 };
  [26, 21, 15, 10].forEach((n, i) => (seedCounts[cities[i + 1]] = n));

  for (const city of cities) {
    const metro = metroById(city)!;
    const loc = await cityNeighborhoods(r.sound.entities, metro.query, metro.name, `artist:${MAYA_ID}`);
    const hoods = loc.data.neighborhoods.map((n) => n.name);
    const heat = r.metros.find((m) => m.id === city)?.heat ?? null;
    await openCity(maya, city, heat, hoods.slice(0, 3));
    await seedSignatures(MAYA_ID, city, seedCounts[city], hoods);
    // Warm the city view (grid heat and rooms).
    const d = await cityDetail(r.sound, city, { kind: 'music', band: 'small', scope: `artist:${MAYA_ID}`, waitForNeighborhoods: true });
    console.log(
      `  ${metro.name.padEnd(14)} rank #${r.metros.find((m) => m.id === city)?.rank} · ${seedCounts[city]} demo signatures · top: ${hoods.slice(0, 3).join(', ')} · rooms: ${d.rooms
        .map((x) => x.name)
        .slice(0, 3)
        .join(', ')}`,
    );
  }

  await postInbox(MAYA_ID, {
    kind: 'welcome',
    body: "Gus here. I put Maya's WANTED posters up in five cities. Columbus is warming up. I'll ping you when a city proves itself. Gus roasts routes, not people.",
    action: null,
    evidence: { demo: true },
    createdAt: Date.now() - 3 * 86400000,
  });

  await crowdCard(r.sound, { scope: `artist:${MAYA_ID}`, topNeighborhood: null, cityQuery: null });
  const start = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const plan = await planFor(maya, { region: 'all', regions: ['midwest', 'east'], startDate: start, dates: 10, roomBand: 'small', homeBase: null }, { kind: 'new' });
  console.log(`  Plan: ${plan.stops.map((s) => `${s.city} (${s.day.slice(0, 3)})`).join(' -> ')} · Tour Score ${plan.total} · ${plan.roasts.length} roasts · ${plan.gusModel}`);

  console.log('Demo presets: hip-hop and stand-up comedy Sounds');
  for (const [label, names, kind] of [
    ['hip-hop', ['Little Simz', 'JID'], 'music'],
    ['stand-up', ['John Mulaney', 'Taylor Tomlinson'], 'comedy'],
  ] as const) {
    const s = await resolveSound([...names]);
    const res = await scout(null, s, kind, 'seed');
    console.log(`  ${label}: ${res.sound.cellCount} cells · top ${res.ranked.slice(0, 3).map((m) => m.name).join(', ')} · sleepers ${res.sleepers.slice(0, 3).map((m) => m.name).join(', ')}`);
  }
}

/** "Name any act": pre-warm the judges' plausible picks (PRD 4.4 move 4). */
export async function warmJudgePicks() {
  const picks: [string, 'artist' | 'person' | 'any'][] = [
    ['Cedric the Entertainer', 'person'],
    ['Taylor Swift', 'artist'],
    ['Beyoncé', 'artist'],
    ['Bad Bunny', 'artist'],
    ['Chappell Roan', 'artist'],
    ['Noah Kahan', 'artist'],
    ['Zach Bryan', 'artist'],
    ['Sabrina Carpenter', 'artist'],
    ['Matt Rife', 'person'],
    ['Nate Bargatze', 'person'],
    ['Taylor Tomlinson', 'person'],
    ['Sour Widows', 'artist'],
    ['Kid Sistr', 'artist'],
    ['Wednesday', 'artist'],
    ['MJ Lenderman', 'artist'],
  ];
  console.log('Warming judge picks');
  for (const [name, kind] of picks) {
    const e = await resolveByName(name, kind, 'warm');
    if (!e) {
      console.log(`  ! ${name} not found`);
      continue;
    }
    const h = await countryHeat([{ id: e.id, name: e.name }], 'warm');
    console.log(`  ${name.padEnd(24)} -> ${e.name} (${e.type}) ${h.data.length} cells`);
  }
}
