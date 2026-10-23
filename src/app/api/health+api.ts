import { env } from '@/server/env';
import { json } from '@/server/http';
import { qlooMonth } from '@/server/qloo/client';
import { loadBaseline } from '@/server/sound';

export async function GET() {
  const [month, baseline] = await Promise.all([qlooMonth().catch(() => null), loadBaseline().catch(() => new Map())]);
  return json({
    ok: true,
    qloo: !!env.qlooKey,
    llm: !!env.openrouterKey,
    voice: !!env.fishKey,
    offline: env.offline,
    baselineMetros: baseline.size,
    qlooMonth: month,
  });
}
