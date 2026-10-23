import { config } from '@/server/config';
import { kvGet } from '@/server/db';
import { env } from '@/server/env';
import { handler, json } from '@/server/http';
import { qlooMonth } from '@/server/qloo/client';

export const GET = handler(async () => {
  const [month, members] = await Promise.all([qlooMonth(), kvGet<{ name: string; cells: number }[]>('baseline.members')]);
  return json({
    qlooMonth: month,
    baselinePanel: members ?? [],
    models: config.llm.models,
    voice: { models: config.voice.models, voice: 'Verity (Fish Audio)' },
    offline: env.offline,
    knobs: { score: config.score, proof: config.proof, tour: config.tour },
  });
});
