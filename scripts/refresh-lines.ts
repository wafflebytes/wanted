/**
 * Rewrites Gus's lines (plan verdict, stop blurbs, roast lines) on every saved tour without
 * touching the route, after a prompt change. Usage: npx tsx scripts/refresh-lines.ts
 */
import "../scripts/lib/env";
import { all, run } from "../src/server/db";
import { routeLines } from "../src/server/gus/agent";
import type { TourPlan } from "../src/lib/types";

async function main() {
  const rows = await all<{ id: string; body: string; name: string }>(
    "select p.id, p.body, a.name from plans p join artists a on a.id = p.artist_id",
  );
  for (const r of rows) {
    const plan = JSON.parse(r.body) as TourPlan;
    const lines = await routeLines({
      stops: plan.stops,
      roasts: plan.roasts,
      total: plan.total,
      artistName: r.name,
    });
    plan.stops.forEach((s, i) => (s.blurb = lines.blurbs[i]));
    plan.roasts = lines.roasts;
    plan.gusLine = lines.planLine;
    plan.gusModel = lines.model;
    await run("update plans set body = ? where id = ?", [
      JSON.stringify(plan),
      r.id,
    ]);
    console.log(`${r.name}: ${lines.planLine} (${lines.model})`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
