/**
 * The "Generic LLM" baseline (PRD 4.3, FR-30). It has to be fair, or a judge who tries it
 * will stop trusting everything else:
 *  - the same model as Gus, temperature 0, 3 samples, majority vote;
 *  - the same inputs Wanted gets (act, reference acts, region, dates, room size);
 *  - a strong prompt, kept in sync with evals/baselines/generic_llm.md;
 *  - the same outputs at three levels: 15 cities, 3 neighborhoods per city, 5 rooms per city.
 * Every claim it makes is then checked live against Qloo.
 */
import type { DayKey, Locality } from '../../lib/types';
import { config } from '../config';
import { chat, parseJson } from './llm';

export const BASELINE_PROMPT_VERSION = 'generic-llm-v2';

export const BASELINE_SYSTEM = `You are an experienced North American live-music and comedy booking agent and tour router. You know US cities, their neighborhoods, their independent venues and comedy clubs, college towns, and where different scenes are strong. You give specific, practical answers that a working agent would stand behind. Prefer independent rooms that fit the act's size. Do not pad with the biggest cities unless the act's crowd is really there; include smaller cities and college towns where this kind of act over-performs. Only name venues you believe currently operate and host live shows on the proposed night.`;

export function baselineUserPrompt(input: BaselineInput) {
  return `Act: ${input.actName}${input.references.length ? ` (sounds like ${input.references.join(', ')})` : ''}. Kind: ${input.kind === 'comedy' ? 'stand-up comedy' : 'music'}.
Region: ${input.regionLabel}. Tour: ${input.dates} dates starting ${input.startDate}. Room size: ${input.roomBand} (${input.roomBand === 'small' ? 'under 300 capacity' : input.roomBand === 'mid' ? '300 to 1,000' : 'over 1,000'}).
Focus city for detail: ${input.focusCity}. Proposed night there: ${input.focusDay}.

Return only JSON with:
- "cities": the 15 US cities (metro areas) where this act's crowd is strongest, best first, as "City, ST".
- "neighborhoods": the 3 neighborhoods in ${input.focusCity} where this act's crowd lives, best first.
- "rooms": 5 venues in ${input.focusCity} that fit this act and room size, best first.
{"cities": ["..."], "neighborhoods": ["..."], "rooms": ["..."]}`;
}

export type BaselineInput = {
  actName: string;
  references: string[];
  kind: 'music' | 'comedy';
  regionLabel: string;
  dates: number;
  startDate: string;
  roomBand: 'small' | 'mid' | 'big';
  focusCity: string;
  focusDay: DayKey;
};

export type BaselineAnswer = {
  cities: string[];
  neighborhoods: string[];
  rooms: string[];
  samples: { cities: string[]; neighborhoods: string[]; rooms: string[]; model: string }[];
  model: string;
  promptVersion: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Items in at least 2 of 3 samples, ordered by mean position; then the first sample's leftovers. */
export function majority(lists: string[][], take: number): string[] {
  const stats = new Map<string, { label: string; count: number; posSum: number }>();
  lists.forEach((list) =>
    list.forEach((item, pos) => {
      const k = norm(item);
      if (!k) return;
      const s = stats.get(k) ?? { label: item.trim(), count: 0, posSum: 0 };
      s.count++;
      s.posSum += pos;
      stats.set(k, s);
    }),
  );
  const need = Math.min(2, lists.length);
  const voted = [...stats.values()].filter((s) => s.count >= need).sort((a, b) => a.posSum / a.count - b.posSum / b.count);
  const out = voted.map((s) => s.label);
  for (const item of lists[0] ?? []) {
    if (out.length >= take) break;
    if (!out.some((o) => norm(o) === norm(item))) out.push(item.trim());
  }
  return out.slice(0, take);
}

export async function askGenericLlm(input: BaselineInput, samples = 3): Promise<BaselineAnswer> {
  const got: BaselineAnswer['samples'] = [];
  for (let i = 0; i < samples; i++) {
    try {
      const res = await chat({
        messages: [
          { role: 'system', content: BASELINE_SYSTEM },
          { role: 'user', content: baselineUserPrompt(input) },
        ],
        temperature: 0,
        maxTokens: 900,
        salt: `${BASELINE_PROMPT_VERSION}:${i}`,
        models: [config.llm.models[0], ...config.llm.models.slice(1)],
        schema: {
          name: 'baseline',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['cities', 'neighborhoods', 'rooms'],
            properties: {
              cities: { type: 'array', items: { type: 'string' } },
              neighborhoods: { type: 'array', items: { type: 'string' } },
              rooms: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      });
      const p = parseJson<{ cities: string[]; neighborhoods: string[]; rooms: string[] }>(res.content);
      if (p) got.push({ cities: p.cities ?? [], neighborhoods: p.neighborhoods ?? [], rooms: p.rooms ?? [], model: res.model });
    } catch {
      // A failed sample just doesn't vote.
    }
  }
  return {
    cities: majority(got.map((g) => g.cities), 15),
    neighborhoods: majority(got.map((g) => g.neighborhoods), 3),
    rooms: majority(got.map((g) => g.rooms), 5),
    samples: got,
    model: got[0]?.model ?? 'unavailable',
    promptVersion: BASELINE_PROMPT_VERSION,
  };
}

/** Matches an LLM neighborhood name to Qloo's ranked list for the same Sound and city. */
export function checkNeighborhood(name: string, list: Locality[]) {
  const k = norm(name);
  const hit = list.find((l) => norm(l.name) === k || norm(l.name).includes(k) || k.includes(norm(l.name)));
  return hit ? { inQloo: true, rank: hit.rank } : { inQloo: false, rank: null };
}
