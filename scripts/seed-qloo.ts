/**
 * Precompute (PRD 4.1c). Run from the builder's laptop; results go to the private DB,
 * never into the repo.
 *
 *   npm run seed                 everything
 *   npm run seed -- --panel      baseline panel only
 *   npm run seed -- --demo       demo Sounds, cities and seeded demo signatures
 *   npm run seed -- --warm       pre-warm the judges' plausible "name any act" picks
 */
import './lib/env';
import { config } from '../src/server/config';
import { batch, run } from '../src/server/db';
import { countryHeat } from '../src/server/qloo/api';
import { resolveByName } from '../src/server/resolve';
import { metroHeat, panelBaseline, type MetroHeat } from '../src/server/score';

const args = new Set(process.argv.slice(2));
const everything = !['--panel', '--demo', '--warm'].some((a) => args.has(a));

async function seedPanel() {
  console.log(`Baseline panel: ${config.baselinePanel.length} artists`);
  const perArtist: MetroHeat[][] = [];
  const members: { name: string; id: string; cells: number }[] = [];
  const spares: string[] = [...config.baselineSpares];
  const addMember = async (name: string): Promise<void> => {
    const ent = await resolveByName(name, 'artist', 'seed');
    const heat = ent ? await countryHeat([{ id: ent.id, name: ent.name }], 'seed') : null;
    const cells = heat?.data.length ?? 0;
    if (!ent || !heat || cells < config.sound.thinCellThreshold) {
      const spare = spares.shift();
      console.warn(`  ! ${name}: ${ent ? `${cells} cells (thin)` : 'not found'}; ${spare ? `using spare ${spare}` : 'no spares left'}`);
      if (spare) await addMember(spare);
      return;
    }
    perArtist.push(metroHeat(heat.data));
    members.push({ name: ent.name, id: ent.id, cells });
    console.log(`  ${ent.name.padEnd(18)} ${String(cells).padStart(6)} cells ${heat.receipt.cached ? '(cached)' : `${heat.receipt.latencyMs} ms`}`);
  };
  await Promise.all(config.baselinePanel.map(addMember));
  const base = panelBaseline(perArtist);
  await run('delete from baseline_panel');
  await batch(
    [...base].map(([metroId, v]) => ({
      sql: 'insert into baseline_panel(metro_id, heat, n, updated_at) values(?, ?, ?, ?)',
      args: [metroId, v.heat, v.n, Date.now()],
    })),
  );
  await run(
    `insert into kv(key, value, updated_at) values('baseline.members', ?, ?)
     on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(members), Date.now()],
  );
  console.log(`Baseline written for ${base.size} metros from ${members.length} artists.`);
}

async function main() {
  if (everything || args.has('--panel')) await seedPanel();
  if (everything || args.has('--demo')) {
    const { seedDemo } = await import('./seed-demo');
    await seedDemo();
  }
  if (everything || args.has('--warm')) {
    const { warmJudgePicks } = await import('./seed-demo');
    await warmJudgePicks();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
