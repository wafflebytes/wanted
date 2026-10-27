/**
 * Gus, the agent (PRD 9). Four modes:
 *  1. Scout: a real tool-calling loop. Gus must call resolveSound before crowdMap and can
 *     only use ids that earlier tool results returned. Returns picks with reasons.
 *  2. Route: code sequences the route; Gus writes stop blurbs and roast lines from facts.
 *  3. Watch: on a threshold crossing, Gus writes one inbox message with one action.
 *  4. Pitch: a fixed-structure booking email filled from the evidence object.
 * Every LLM output is checked for grounding; anything that fails falls back to Gus (lite).
 */
import type { ActKind, MetroScore, Roast, SoundEntity, TourStop } from '../../lib/types';
import { cityDetail } from '../city';
import { crowdCard } from '../crowd';
import { METROS } from '../score';
import { scout, type ScoutResult } from '../sound';
import { checkGrounded, digitize, numbersIn, wordCount, type Evidence } from './grounding';
import { GUS_SYSTEM, litePlanLine, liteRoastLine, liteScoutLine, liteStopBlurb, liteThresholdLine } from './lines';
import { chat, LlmUnavailable, parseJson, type ChatMessage, type ToolDef } from './llm';

export type AgentStep = { tool: string; args: unknown; ok: boolean; ms: number; note?: string };
export type Emit = (event: { type: 'progress' | 'tool' | 'line'; text: string; tool?: string }) => void;

const METRO_NAMES = METROS.map((m) => m.name);
const untrusted = (s: string) => `<untrusted>${s.replace(/<\/?untrusted>/g, '')}</untrusted>`;

// ---------- Scout ----------

const SCOUT_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'resolveSound',
      description: 'Resolve the act names the artist confirmed to Qloo entity ids. Must be called first.',
      parameters: {
        type: 'object',
        properties: { names: { type: 'array', items: { type: 'string' }, description: 'Act names exactly as confirmed' } },
        required: ['names'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crowdMap',
      description:
        'Qloo heat for the resolved Sound. scope "country" returns the top US metros by Wanted Score (heat + lift over a 20-artist baseline) and the sleeper cities. scope "city" returns the top neighborhoods for one metro id from a country result.',
      parameters: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['country', 'city'] },
          city: { type: 'string', description: 'Metro id from a previous crowdMap result (city scope only)' },
        },
        required: ['scope'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'findRooms',
      description: "Qloo's taste-matched rooms in one metro (ids from crowdMap), with open days from Qloo hours.",
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' }, sizeBand: { type: 'string', enum: ['small', 'mid', 'big'] } },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'readCrowd',
      description: 'Who this crowd is (age skews), what else they love, vibe words. About the act, not a city.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export type ScoutPick = { metroId: string; name: string; state: string; reason: string; sleeper: boolean };

export type ScoutAgentResult = {
  result: ScoutResult;
  line: string;
  picks: ScoutPick[];
  steps: AgentStep[];
  model: string;
  violations: string[];
};

function countrySummary(r: ScoutResult) {
  const row = (m: MetroScore) => ({
    id: m.id,
    city: `${m.name}, ${m.state}`,
    wantedScore: m.score,
    heatRank: m.heatRank,
    liftRank: m.liftRank,
    sleeper: m.sleeper,
    collegeTown: m.kind === 'college',
  });
  return {
    metrosScored: r.ranked.length,
    top: r.ranked.slice(0, 15).map(row),
    sleepers: r.sleepers.slice(0, 8).map(row),
    biggestMetros: [...r.metros]
      .sort((a, b) => b.pop - a.pop)
      .slice(0, 5)
      .map(row),
    notices: r.notices,
    thinData: r.sound.thin,
  };
}

/**
 * Runs Scout. The confirmed entities come from the confirm sheet (FR-1); resolveSound only
 * hands them back, so Gus can't swap in an act the artist didn't confirm.
 */
export async function scoutAgent(input: {
  self: SoundEntity | null;
  refs: SoundEntity[];
  kind: ActKind;
  constraintsText: string;
  roomBand: 'small' | 'mid' | 'big';
  scope: string;
  emit?: Emit;
}): Promise<ScoutAgentResult> {
  const emit = input.emit ?? (() => {});
  const steps: AgentStep[] = [];
  const violations: string[] = [];
  const confirmed = [...(input.self ? [input.self] : []), ...input.refs];
  let resolved = false;
  let result: ScoutResult | null = null;
  const knownIds = new Set<string>();
  const evidenceNumbers: number[] = [];
  const evidenceNames: string[] = [...confirmed.map((c) => c.name)];

  const runCountry = async () => {
    if (!result) {
      emit({ type: 'progress', text: 'Finding where your people are' });
      result = await scout(input.self, input.refs, input.kind, input.scope);
      emit({ type: 'progress', text: 'Comparing with 20 other acts' });
      emit({ type: 'progress', text: 'Finding sleeper cities' });
    }
    return result;
  };

  const exec = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const started = Date.now();
    const done = (ok: boolean, out: unknown, note?: string) => {
      steps.push({ tool: name, args, ok, ms: Date.now() - started, note });
      return out;
    };
    try {
      if (name === 'resolveSound') {
        const names = (args.names as string[] | undefined) ?? [];
        const lower = confirmed.map((c) => c.name.toLowerCase());
        const unknown = names.filter((n) => !lower.includes(String(n).toLowerCase()));
        resolved = true;
        emit({ type: 'tool', tool: name, text: `Resolving ${confirmed.map((c) => c.name).join(' + ')}` });
        return done(true, {
          entities: confirmed.map((c) => ({ id: c.id, name: c.name, role: c.role ?? 'reference' })),
          note: unknown.length ? `Not confirmed by the artist, ignored: ${unknown.join(', ')}` : undefined,
        });
      }
      if (!resolved) {
        violations.push(`${name} called before resolveSound`);
        return done(false, { error: 'Call resolveSound first.' });
      }
      if (name === 'crowdMap') {
        const r = await runCountry();
        r.ranked.forEach((m) => knownIds.add(m.id));
        if (args.scope === 'city') {
          const city = String(args.city ?? '');
          if (!knownIds.has(city)) {
            violations.push(`crowdMap(city) with unknown id ${city}`);
            return done(false, { error: `Unknown metro id ${city}. Use an id from the country result.` });
          }
          emit({ type: 'tool', tool: name, text: `Diving into ${city}` });
          const d = await cityDetail(r.sound, city, { kind: input.kind, scope: input.scope });
          const out = {
            city,
            topNeighborhoods: d.neighborhoods?.slice(0, 5).map((n) => n.name) ?? 'still loading',
            streetCells: d.cellCount,
          };
          evidenceNames.push(...(d.neighborhoods?.slice(0, 5).map((n) => n.name) ?? []));
          return done(true, out);
        }
        emit({ type: 'tool', tool: name, text: 'Reading the country heat map' });
        const summary = countrySummary(r);
        numbersIn(summary, evidenceNumbers);
        evidenceNames.push(...summary.top.map((t) => t.city.split(',')[0]), ...summary.sleepers.map((t) => t.city.split(',')[0]), ...summary.biggestMetros.map((t) => t.city.split(',')[0]));
        return done(true, summary);
      }
      if (name === 'findRooms') {
        const r = await runCountry();
        const city = String(args.city ?? '');
        if (!knownIds.has(city)) {
          violations.push(`findRooms with unknown id ${city}`);
          return done(false, { error: `Unknown metro id ${city}.` });
        }
        emit({ type: 'tool', tool: name, text: `Checking venues in ${city}` });
        const d = await cityDetail(r.sound, city, { kind: input.kind, band: (args.sizeBand as 'small') ?? input.roomBand, scope: input.scope });
        const rooms = d.rooms.map((x) => ({
          name: untrusted(x.name),
          neighborhood: x.neighborhood,
          closedDays: x.closedDays,
          sizeGuess: x.sizeGuess,
        }));
        evidenceNames.push(...d.rooms.map((x) => x.name), ...d.rooms.map((x) => x.neighborhood ?? '').filter(Boolean));
        return done(true, { city, rooms, droppedClosed: d.droppedClosed.length });
      }
      if (name === 'readCrowd') {
        const r = await runCountry();
        emit({ type: 'tool', tool: name, text: 'Reading who your crowd is' });
        const c = await crowdCard(r.sound, { scope: input.scope });
        const out = {
          skews: c.who?.line ?? 'no demographic data',
          vibe: c.vibe.map((v) => v.name),
          alsoLoves: [...c.love.shows, ...c.love.brands].map((x) => untrusted(x.name)),
        };
        evidenceNames.push(...c.vibe.map((v) => v.name), ...c.love.shows.map((x) => x.name), ...c.love.brands.map((x) => x.name));
        return done(true, out);
      }
      violations.push(`unknown tool ${name}`);
      return done(false, { error: `Unknown tool ${name}` });
    } catch (err) {
      return done(false, { error: String(err instanceof Error ? err.message : err).slice(0, 200) });
    }
  };

  const messages: ChatMessage[] = [
    { role: 'system', content: GUS_SYSTEM },
    {
      role: 'user',
      content: `The artist confirmed this Sound: ${confirmed.map((c) => untrusted(c.name)).join(' + ')}${input.self ? ` (the act itself is ${untrusted(input.self.name)})` : ''}.
Their tour ask: ${untrusted(input.constraintsText || 'a short run of small rooms')}.

Use the tools: resolveSound, then crowdMap with scope "country". You may then call crowdMap(city), findRooms or readCrowd for up to two cities.
When done, reply with ONLY a JSON object:
{"line": "<one Gus line, under 25 words, mentioning the top city and one sleeper city by name>", "picks": [{"metroId": "<id from crowdMap>", "reason": "<under 18 words, only numbers from tool results>"}]}
Give 4 to 6 picks. Lead with where the crowd is, not the biggest cities.`,
    },
  ];

  let model = 'gus-lite';
  let finalText: string | null = null;
  const deadline = Date.now() + 40_000;
  try {
    for (let turn = 0; turn < 6 && Date.now() < deadline; turn++) {
      const res = await chat({ messages, tools: SCOUT_TOOLS, temperature: 0.4, maxTokens: 700 });
      model = res.model;
      if (!res.toolCalls.length) {
        finalText = res.content;
        break;
      }
      messages.push({ role: 'assistant', content: res.content, tool_calls: res.toolCalls });
      for (const call of res.toolCalls) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(call.function.arguments || '{}');
        } catch {
          violations.push(`unparseable arguments for ${call.function.name}`);
        }
        const out = await exec(call.function.name, parsed);
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out).slice(0, 6000) });
      }
    }
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    model = 'gus-lite';
  }

  // Whatever the model did, the map needs the country result.
  const r = await runCountry();
  if (!steps.some((s) => s.tool === 'crowdMap' && s.ok)) {
    if (model !== 'gus-lite') violations.push('finished without calling crowdMap(country)');
  }
  const evidence: Evidence = { numbers: evidenceNumbers.length ? evidenceNumbers : numbersIn(countrySummary(r)), names: [...evidenceNames, ...r.ranked.slice(0, 15).map((m) => m.name), ...r.sleepers.map((m) => m.name)] };

  const parsed = parseJson<{ line?: string; picks?: { metroId: string; reason: string }[] }>(finalText);
  let line = digitize(parsed?.line?.trim() ?? '');
  const lineCheck = line ? checkGrounded(line, evidence, METRO_NAMES) : null;
  if (!line || !lineCheck?.ok || wordCount(line) > 30) {
    if (line && lineCheck && !lineCheck.ok) violations.push(`ungrounded line: ${[...lineCheck.unknownNumbers, ...lineCheck.unknownNames].join(', ')}`);
    line = liteScoutLine(r.ranked, r.sleepers, r.sound.thin);
  }

  const byId = new Map(r.metros.map((m) => [m.id, m]));
  let picks: ScoutPick[] = (parsed?.picks ?? [])
    .filter((p) => {
      const ok = byId.has(p.metroId) && byId.get(p.metroId)!.score !== null;
      if (!ok) violations.push(`pick with unknown metro ${p.metroId}`);
      return ok;
    })
    .map((p) => {
      const m = byId.get(p.metroId)!;
      const check = checkGrounded(p.reason ?? '', evidence, METRO_NAMES);
      const reason = check.ok && p.reason && wordCount(p.reason) <= 24 ? p.reason.trim() : defaultReason(m);
      if (!check.ok) violations.push(`ungrounded reason for ${m.name}`);
      return { metroId: m.id, name: m.name, state: m.state, reason, sleeper: m.sleeper };
    });
  // Deduplicate and top up with code picks so the list is always complete.
  const seen = new Set<string>();
  picks = picks.filter((p) => (seen.has(p.metroId) ? false : (seen.add(p.metroId), true)));
  for (const m of [...r.ranked.slice(0, 4), ...r.sleepers.slice(0, 2)]) {
    if (picks.length >= 6) break;
    if (!seen.has(m.id)) {
      seen.add(m.id);
      picks.push({ metroId: m.id, name: m.name, state: m.state, reason: defaultReason(m), sleeper: m.sleeper });
    }
  }
  emit({ type: 'line', text: line });
  return { result: r, line, picks: picks.slice(0, 6), steps, model, violations };
}

function defaultReason(m: MetroScore) {
  if (m.sleeper) return `Sleeper: lift rank #${m.liftRank}, heat rank #${m.heatRank}. More yours than a typical act's.`;
  return `Wanted Score ${m.score}: heat rank #${m.heatRank}, lift rank #${m.liftRank}.`;
}

// ---------- Route ----------

export async function routeLines(input: {
  stops: TourStop[];
  roasts: Roast[];
  total: number;
  artistName: string;
}): Promise<{ planLine: string; blurbs: string[]; roasts: Roast[]; model: string }> {
  const facts = {
    tourScore: input.total,
    stopCount: input.stops.length,
    stops: input.stops.map((s, i) => ({
      i,
      city: s.city,
      day: s.day,
      date: s.date,
      room: s.room?.name ?? null,
      neighborhood: s.room?.neighborhood ?? null,
      driveHours: s.driveHoursFromPrev,
      stopScore: s.score.total,
    })),
    roasts: input.roasts.map((r) => ({ id: r.id, rule: r.rule, stop: r.stopIndex, why: r.why })),
  };
  const evidence: Evidence = {
    numbers: numbersIn(facts),
    names: [
      ...input.stops.map((s) => s.city),
      ...input.stops.map((s) => s.room?.name ?? '').filter(Boolean),
      ...input.stops.map((s) => s.room?.neighborhood ?? '').filter(Boolean),
      ...input.roasts.flatMap((r) => r.why.match(/[A-Z][\w.'-]+(?: [A-Z][\w.'-]+)*/g) ?? []),
    ],
  };
  const lite = () => ({
    planLine: litePlanLine(input.total, input.roasts.length),
    blurbs: input.stops.map(liteStopBlurb),
    roasts: input.roasts.map((r) => ({ ...r, line: liteRoastLine(r, input.stops) })),
    model: 'gus-lite',
  });

  try {
    const res = await chat({
      messages: [
        { role: 'system', content: GUS_SYSTEM },
        {
          role: 'user',
          content: `EVIDENCE (the computed route; the only facts you may use):
${JSON.stringify(facts)}

Write:
- "planLine": one line on the whole route, under 22 words: your verdict as the tour manager, with an opinion. Never recite the dates, the stop count or the Tour Score; the app shows those. Good: "Strong Northeast swing. Fix the Tuesday in Burlington and I'll stop grumbling." Bad: "Ten stops across the Northeast, December 10th to 19th, tour score 51."
- "blurbs": one line per stop in order, under 16 words: what to know about that night (the drive in, the night of the week, the room's neighborhood). The app already shows the date, city and room name, so don't just restate them.
- "roasts": for each roast id, one funny line under 18 words about the route problem in "why" (a roast of the routing, never of people).
Talk like a tour manager in the van, not a dashboard: never say data, score, metrics, signal, gaps or empty. "No room picked yet in Ithaca" is fine; "empty neighborhood data" is not.
Reply with only JSON: {"planLine": "...", "blurbs": ["..."], "roasts": [{"id": "...", "line": "..."}]}`,
        },
      ],
      temperature: 0.8,
      maxTokens: 1200,
      schema: {
        name: 'route_lines',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['planLine', 'blurbs', 'roasts'],
          properties: {
            planLine: { type: 'string' },
            blurbs: { type: 'array', items: { type: 'string' } },
            roasts: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'line'],
                properties: { id: { type: 'string' }, line: { type: 'string' } },
              },
            },
          },
        },
      },
    });
    const parsed = parseJson<{ planLine: string; blurbs: string[]; roasts: { id: string; line: string }[] }>(res.content);
    if (!parsed) return lite();
    parsed.planLine = digitize(parsed.planLine ?? '');
    parsed.blurbs = (parsed.blurbs ?? []).map((b) => digitize(b ?? ''));
    parsed.roasts = (parsed.roasts ?? []).map((r) => ({ ...r, line: digitize(r.line ?? '') }));
    const fallback = lite();
    // Musicians read these: anything that sounds like a dashboard falls back to the plain line.
    const jargon = /\b(data|dataset|metrics?|signals?|scores?|null|empty|gaps?)\b/i;
    // A lowercase weekday is the tell of a list read back ("tuesday night, Boston Center for the Arts").
    const listy = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;
    const ok = (t: string | undefined, max: number) => !!t && wordCount(t) <= max && !jargon.test(t) && !listy.test(t) && checkGrounded(t, evidence, METRO_NAMES).ok;
    // A verdict, not a readout: lines that recite the score or the calendar fall back.
    const recites = /tour score|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(parsed.planLine);
    return {
      planLine: ok(parsed.planLine, 26) && !recites ? parsed.planLine : fallback.planLine,
      blurbs: input.stops.map((s, i) => (ok(parsed.blurbs?.[i], 20) ? parsed.blurbs[i] : fallback.blurbs[i])),
      roasts: input.roasts.map((r, i) => {
        const l = parsed.roasts?.find((x) => x.id === r.id)?.line;
        return { ...r, line: ok(l, 22) ? l! : fallback.roasts[i].line };
      }),
      model: res.model,
    };
  } catch (err) {
    if (err instanceof LlmUnavailable) return lite();
    throw err;
  }
}

// ---------- Watch ----------

export type ThresholdFacts = {
  artistName: string;
  city: string;
  signatures: number;
  signatureShare: number;
  heatShare: number;
  ratio: number;
  topRoom: string | null;
  topNeighborhoods: string[];
};

/** Aggregate facts only: no fan neighborhoods-per-person, contacts or device data (PRD 4.2). */
export async function thresholdMessage(f: ThresholdFacts): Promise<{ body: string; model: string }> {
  const evidence: Evidence = {
    numbers: numbersIn({ s: f.signatures, ss: f.signatureShare, hs: f.heatShare, r: f.ratio }),
    names: [f.artistName, f.city, ...(f.topRoom ? [f.topRoom] : []), ...f.topNeighborhoods],
  };
  const lite = liteThresholdLine(f.city, f.signatures, f.topRoom);
  try {
    const res = await chat({
      messages: [
        { role: 'system', content: GUS_SYSTEM },
        {
          role: 'user',
          content: `EVIDENCE: ${JSON.stringify({ city: f.city, signatures: f.signatures, shareOfAllSignatures: f.signatureShare, shareQlooExpected: f.heatShare, proofRatio: f.ratio, bestRoom: f.topRoom })}
A city just crossed an interest-over-index research threshold on ${untrusted(f.artistName)}'s WANTED poster. Write one inbox message to the artist, under 30 words, in plain words a musician would text: say the city and signature count, state that signatures are interest not ticket commitments, and recommend researching the best room (no attendance predictions or calibrated demand claims). End with "Let's ride." Reply with only the message.`,
        },
      ],
      temperature: 0.7,
      maxTokens: 120,
    });
    const body = digitize((res.content ?? '').trim().replace(/^"|"$/g, ''));
    if (body && wordCount(body) <= 40 && checkGrounded(body, evidence, METRO_NAMES).ok) return { body, model: res.model };
    return { body: lite, model: 'gus-lite' };
  } catch {
    return { body: lite, model: 'gus-lite' };
  }
}

// ---------- Pitch ----------

export type PitchEvidence = {
  artist: { name: string; kind: ActKind; soundsLike: string[] };
  room: { name: string; neighborhood: string | null; website: string | null };
  city: { name: string; state: string };
  date: { date: string; day: string } | null;
  roomBand: 'small' | 'mid' | 'big';
  qloo: {
    wantedScore: number | null;
    cityRank: number | null;
    citiesScored: number;
    heatRank: number | null;
    liftRank: number | null;
    sleeper: boolean;
    topNeighborhoods: string[];
    roomInTopNeighborhood: boolean;
    pulledBy: { name: string; share: number }[] | null;
    vibe: string[];
  };
  fans: {
    signatures: number;
    deputies: number;
    neighborhoods: { name: string; count: number }[];
    signatureShare: number | null;
    heatShare: number | null;
    proofRatio: number | null;
    isDemoData: boolean;
  };
  opener: { name: string; shared: string[] } | null;
};

export type PitchCheck = { ok: boolean; words: number; problems: string[] };

const FORBIDDEN_PITCH = /\b(capacity of|cap of|will sell|sell(?:s)? out guaranteed|guarantee[sd]?|ticket forecast|expected attendance|projected (?:sales|attendance))\b/i;

export function checkPitch(text: string, ev: PitchEvidence): PitchCheck {
  const problems: string[] = [];
  const words = wordCount(text);
  if (words < 120 || words > 180) problems.push(`length ${words} words (needs 120 to 180)`);
  const evidence: Evidence = {
    numbers: numbersIn(ev),
    names: [
      ev.artist.name,
      ev.room.name,
      ev.city.name,
      ...ev.artist.soundsLike,
      ...ev.qloo.topNeighborhoods,
      ...ev.fans.neighborhoods.map((n) => n.name),
      ...(ev.room.neighborhood ? [ev.room.neighborhood] : []),
      ...(ev.opener ? [ev.opener.name] : []),
    ],
  };
  const g = checkGrounded(text, evidence, METRO_NAMES);
  if (g.unknownNumbers.length) problems.push(`numbers not in evidence: ${g.unknownNumbers.join(', ')}`);
  if (g.unknownNames.length) problems.push(`names not in evidence: ${g.unknownNames.join(', ')}`);
  if (!/qloo/i.test(text)) problems.push('missing the Qloo evidence');
  if (ev.fans.signatures > 0 && !/(signature|signed|fans)/i.test(text)) problems.push('missing the fan evidence');
  if (FORBIDDEN_PITCH.test(text)) problems.push('mentions capacity or a ticket forecast');
  return { ok: !problems.length, words, problems };
}

function pct(x: number | null) {
  return x === null ? null : Math.round(x * 100);
}

/** Deterministic pitch: always 120 to 180 words, every number from the evidence. */
export function litePitch(ev: PitchEvidence): { subject: string; body: string } {
  const when = ev.date ? `${cap(ev.date.day)} ${ev.date.date}` : 'a date that suits the room';
  const hoods = ev.qloo.topNeighborhoods.slice(0, 3).join(', ');
  const parts: string[] = [];
  parts.push(`Hi ${ev.room.name} team,`);
  parts.push(
    `I'm writing on behalf of ${ev.artist.name}, ${ev.artist.kind === 'comedy' ? 'a stand-up comedian' : 'an independent act'} in the lane of ${ev.artist.soundsLike.join(' and ')}, about a ${ev.roomBand} headline show at ${ev.room.name} on ${when}.`,
  );
  // Fans first: a booker trusts people who asked over any model. Then the taste data, in plain words.
  if (ev.fans.signatures > 0) {
    const fh = ev.fans.neighborhoods.slice(0, 2).map((n) => `${n.count} in ${n.name}`).join(' and ');
    const beat =
      ev.fans.proofRatio && ev.fans.proofRatio >= 1.2 && ev.fans.signatureShare !== null && ev.fans.heatShare !== null
        ? ` That is ${pct(ev.fans.signatureShare)}% of all signatures across the cities we opened, more than the ${pct(ev.fans.heatShare)}% the listening data predicted.`
        : '';
    parts.push(`${ev.fans.signatures} people in ${ev.city.name} have signed a poster asking ${ev.artist.name} to play${fh ? `, including ${fh}` : ''}.${beat}${ev.fans.isDemoData ? ' (Demo data.)' : ''}`);
  }
  const q: string[] = [];
  // A rank only helps when it's a strong one.
  if (ev.qloo.cityRank && ev.qloo.cityRank <= 25) q.push(`${ev.city.name} is #${ev.qloo.cityRank} of ${ev.qloo.citiesScored} US cities for this sound`);
  if (hoods) q.push(`its strongest neighborhoods are ${hoods}${ev.qloo.roomInTopNeighborhood ? ', which is your side of town' : ''}`);
  if (ev.qloo.vibe.length) q.push(`the crowd reads as ${ev.qloo.vibe.slice(0, 3).join(', ').toLowerCase()}`);
  if (q.length) parts.push(`Taste data from Qloo backs it up: ${q.join('; ')}.`);
  if (ev.opener) parts.push(`For support, ${ev.opener.name} shares this crowd (${ev.opener.shared.slice(0, 2).join(', ').toLowerCase() || 'overlapping taste'}).`);
  parts.push(`Every signer gets first access when tickets go up, so the announcement lands with people who already asked for it.`);
  parts.push(`Happy to send the full evidence sheet and work around your calendar. Thanks for reading.`);
  let body = parts.join('\n\n');
  // Pad or trim to the 120 to 180 word window with fixed, number-free sentences.
  const pads = [
    'We would handle our own promotion to the signers and keep the room informed at every step.',
    'The ask is simple: a hold on that night, or the closest date you have open.',
    'We are flexible on the door split and set times.',
  ];
  for (const p of pads) if (wordCount(body) < 125) body = body.replace('\n\nHappy to send', `\n\n${p} Happy to send`);
  if (wordCount(body) > 180) body = body.replace(/\n\nEvery signer gets first access[^\n]*/, '');
  return { subject: `Hold request: ${ev.artist.name} at ${ev.room.name}${ev.date ? `, ${cap(ev.date.day)} ${ev.date.date}` : ''}`, body };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function pitchEmail(ev: PitchEvidence): Promise<{ subject: string; body: string; model: string; check: PitchCheck }> {
  const lite = litePitch(ev);
  try {
    const res = await chat({
      messages: [
        { role: 'system', content: GUS_SYSTEM },
        {
          role: 'user',
          content: `EVIDENCE (the only facts you may use; numbers must match exactly, shares may be written as whole percents):
${JSON.stringify({ ...ev, artist: { ...ev.artist, name: untrusted(ev.artist.name) }, room: { ...ev.room, name: untrusted(ev.room.name) } })}

Write a booking email to the talent buyer at the room. Structure:
1. Greeting and the ask (artist, room, date, ${ev.roomBand} room headline).
2. ${ev.fans.signatures > 0 ? 'The fans, in plain words: how many people in the city signed a poster asking for the artist, and where.' + (ev.fans.isDemoData ? ' Add "(Demo data.)" at its end.' : '') : 'No fan paragraph (there are no signatures yet).'}
3. The taste evidence, in plain words, naming Qloo once as the source ("Taste data from Qloo..."). Only mention the city rank if it is in the top 25. No labels like "Qloo says:" or "Fans say:".
4. The suggested opener if there is one.
5. A short close.
120 to 180 words. Warm, specific, no hype. Never mention capacity, ticket forecasts or guarantees. Reply with only JSON: {"subject": "...", "body": "..."}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 700,
      schema: {
        name: 'pitch',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['subject', 'body'],
          properties: { subject: { type: 'string' }, body: { type: 'string' } },
        },
      },
    });
    const parsed = parseJson<{ subject: string; body: string }>(res.content);
    if (parsed?.body) {
      const check = checkPitch(parsed.body, ev);
      if (check.ok) return { subject: parsed.subject || lite.subject, body: parsed.body.trim(), model: res.model, check };
    }
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
  }
  return { ...lite, model: 'gus-lite', check: checkPitch(lite.body, ev) };
}
