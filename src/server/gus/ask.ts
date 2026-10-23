/**
 * Talk to Gus: the voice agent behind the mic button. One spoken or typed turn becomes an
 * intent; Gus runs the matching tools against real data (fan proof, the Qloo-scored metros,
 * the saved plan, the crowd card, the demo simulator) and answers in one or two short lines,
 * with the steps he took and the app actions to perform (open a city, re-plan, draft a pitch).
 *
 * Routing is rules, not a model, so it answers in milliseconds and every number comes
 * straight from the evidence (the same rule the LLM lines live by: PRD 9.4). Gus roasts
 * routes, never people.
 */
import { regionsFromText } from '../../lib/regions';
import type { ArtistRow } from '../artists';
import { proofFor } from '../claims';
import { config } from '../config';
import { METROS, type Metro } from '../score';
import { crowdFor, loadPlan, scoutFor, simulateFans } from '../service';
import { inbox } from '../watcher';

export type AskMood = 'idle' | 'reading' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it' | 'wave';

export type AskAction =
  | { kind: 'open'; tab: 'map' | 'tour' | 'crowd' | 'posters' | 'inbox'; city?: string }
  | { kind: 'plan' }
  | { kind: 'pitch'; city: string; cityName: string }
  | { kind: 'post'; city: string; cityName: string }
  | { kind: 'withoutQloo'; on: boolean }
  | { kind: 'refresh' };

export type AskStep = { tool: string; label: string; detail: string };

export type AskReply = {
  reply: string;
  mood: AskMood;
  steps: AskStep[];
  actions: AskAction[];
  suggestions: string[];
  intent: string;
  model: 'gus-lite';
};

const has = (t: string, re: RegExp) => re.test(t);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const x = (r: number | null | undefined) => (r === null || r === undefined ? null : `${r.toFixed(1)}×`);
const pct = (s: number | null | undefined) => (s === null || s === undefined ? null : `${Math.round(s * 100)}%`);

/** Finds a metro named in the text, preferring cities with a poster up, then the act's best. */
function cityIn(text: string, prefer: string[], rank: Map<string, number>): Metro | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9 .'-]/g, ' ')} `;
  const hits = METROS.filter((m) => t.includes(` ${m.name.toLowerCase()} `) || t.includes(` ${m.name.toLowerCase()}'s `) || t.includes(` ${m.id.replace(/-[a-z]{2}$/, '').replace(/-/g, ' ')} `));
  if (!hits.length) return null;
  hits.sort((a, b) => {
    const pa = prefer.includes(a.id) ? 0 : 1;
    const pb = prefer.includes(b.id) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (b.name.length !== a.name.length) return b.name.length - a.name.length;
    return (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999);
  });
  return hits[0];
}

function numberIn(text: string): number | null {
  const m = text.match(/\b(\d{1,2})\b/);
  if (m) return Number(m[1]);
  const words: Record<string, number> = { five: 5, ten: 10, thirteen: 13, fifteen: 15, twenty: 20, dozen: 12 };
  for (const [w, n] of Object.entries(words)) if (text.includes(w)) return n;
  return null;
}

export async function askGus(artist: ArtistRow, raw: string): Promise<AskReply> {
  const text = raw.trim().toLowerCase();
  const steps: AskStep[] = [];
  const first = artist.name.split(' ')[0];

  const scout = await scoutFor(artist);
  const ranked = scout.metros.filter((m) => m.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const rank = new Map(ranked.map((m) => [m.id, m.rank!]));
  const proof = await proofFor(artist.id, { includeDemo: artist.isDemo });
  const opened = proof.map((p) => p.city);
  const nameOf = (id: string) => scout.metros.find((m) => m.id === id)?.name ?? METROS.find((m) => m.id === id)?.name ?? id;
  const byProof = [...proof].sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0) || b.signatures - a.signatures);
  const proven = proof.filter((p) => p.crossed);
  const totalSigs = proof.reduce((s, p) => s + p.signatures, 0);
  const sleepers = scout.metros.filter((m) => m.sleeper).sort((a, b) => (a.liftRank ?? 999) - (b.liftRank ?? 999));
  const city = cityIn(text, opened, rank);

  const suggest = (extra: string[] = []) => {
    const lead = byProof[0] ? nameOf(byProof[0].city) : ranked[0]?.name;
    const list = [
      ...extra,
      'Brief me',
      lead ? `How's ${lead} doing?` : null,
      'Roast my route',
      proven[0] ? `Pitch ${nameOf(proven[0].city)}` : lead ? `Pitch ${lead}` : null,
      'Where are my sleepers?',
      artist.isDemo && opened.includes('columbus-oh') ? 'Simulate 13 fans in Columbus' : null,
      'Who is my crowd?',
    ].filter((s): s is string => !!s);
    return [...new Set(list)].slice(0, 5);
  };
  const done = (r: Omit<AskReply, 'suggestions' | 'model' | 'steps'> & { suggestions?: string[] }): AskReply => ({
    ...r,
    reply: r.reply.charAt(0).toUpperCase() + r.reply.slice(1),
    steps,
    // Don't offer the question that was just answered.
    suggestions: (r.suggestions ?? suggest()).filter((q) => q.toLowerCase() !== raw.trim().toLowerCase()),
    model: 'gus-lite',
  });

  steps.push({ tool: 'cityProof', label: 'Checked the posters', detail: `${plural(proof.length, 'city', 'cities')} · ${plural(totalSigs, 'signature')}` });

  // ---- Without Qloo (the demo's dark-map moment)
  if (has(text, /without qloo|(turn|switch|shut|kill)\s*(it\s*)?(off|on)?\s*qloo|qloo (off|on)|no qloo|go dark/)) {
    const on = !has(text, /\bon\b.*qloo|qloo on|turn qloo on|bring (qloo|it) back/);
    return done({
      intent: 'without-qloo',
      mood: on ? 'unimpressed' : 'proud',
      reply: on ? 'Lights off. This is every fan-demand app on day one. Empty.' : 'Qloo’s back. There’s your crowd.',
      actions: [{ kind: 'withoutQloo', on }, { kind: 'open', tab: 'map' }],
    });
  }

  // ---- Demo: simulate fans signing
  if (artist.isDemo && has(text, /simulat|fake|pretend|demo fans|add \d+|(\d+|thirteen|ten|dozen) (more )?(fans|signatures)/)) {
    const target = city ?? (opened.includes('columbus-oh') ? METROS.find((m) => m.id === 'columbus-oh')! : null);
    if (target && opened.includes(target.id)) {
      const n = Math.max(1, Math.min(60, numberIn(text) ?? 13));
      const before = proof.find((p) => p.city === target.id);
      const r = await simulateFans(artist, target.id, n);
      steps.push({ tool: 'simulate', label: `Signed ${n} demo fans in ${target.name}`, detail: `${before?.signatures ?? 0} → ${r.count} signatures · labeled demo data` });
      if (r.watch.fired) steps.push({ tool: 'watcher', label: 'The watcher fired', detail: r.watch.reason });
      return done({
        intent: 'simulate',
        mood: r.watch.fired ? 'proud' : 'idle',
        reply: r.watch.fired
          ? `${target.name} has you on a WANTED poster. ${r.count} signatures. I'm drafting the pitch. Let's ride.`
          : `${n} more in ${target.name}. ${r.count} signatures now. ${r.count < config.proof.minSignatures ? `${config.proof.minSignatures - r.count} to go before I call it.` : 'Watching the ratio.'}`,
        actions: [{ kind: 'refresh' }, { kind: 'open', tab: 'map', city: target.id }],
      });
    }
  }

  // ---- Pitch a room
  if (has(text, /pitch|book (it|them|a show|the show)|booking|email the|write to|draft/)) {
    const target = city ?? (proven[0] ? METROS.find((m) => m.id === proven[0].city) : byProof[0] ? METROS.find((m) => m.id === byProof[0].city) : null);
    if (target) {
      const p = proof.find((q) => q.city === target.id);
      steps.push({ tool: 'cityProof', label: `Pulled ${target.name}'s proof`, detail: p ? `${p.signatures} signed${x(p.ratio) ? ` · ${x(p.ratio)} predicted` : ''}` : 'No poster up yet' });
      return done({
        intent: 'pitch',
        mood: p?.crossed ? 'proud' : 'reading',
        reply: p
          ? `Drafting ${target.name}. ${p.signatures} signatures${x(p.ratio) ? `, ${x(p.ratio)} what Qloo expected` : ''}. Every number goes in as evidence.`
          : `${target.name} has no poster up, so the pitch runs on Qloo alone. I'd post first.`,
        actions: [{ kind: 'pitch', city: target.id, cityName: target.name }],
      });
    }
  }

  // ---- Post a poster
  if (city && has(text, /post|put up|open (a |the )?poster|poster (in|for)|hang/)) {
    if (opened.includes(city.id)) {
      return done({ intent: 'post', mood: 'idle', reply: `${city.name}'s poster is already up. ${plural(proof.find((p) => p.city === city.id)?.signatures ?? 0, 'signature')} so far.`, actions: [{ kind: 'open', tab: 'posters', city: city.id }] });
    }
    return done({ intent: 'post', mood: 'proud', reply: `Nailing a WANTED poster up in ${city.name}. Share the link and let them sign.`, actions: [{ kind: 'post', city: city.id, cityName: city.name }] });
  }

  // ---- Roasts
  if (has(text, /roast|what'?s wrong|problem|fix (it|my|the)|bad (date|stop|routing)|is (my|the) (route|tour) (ok|good)/)) {
    const plan = await loadPlan(artist.id);
    if (!plan) return done({ intent: 'roast', mood: 'unimpressed', reply: "No route to roast yet. Say 'plan my tour' and I'll give you something to fix.", actions: [{ kind: 'open', tab: 'tour' }], suggestions: suggest(['Plan my tour']) });
    steps.push({ tool: 'roasts', label: 'Ran the roast rules', detail: `${plural(plan.roasts.length, 'roast')} · Tour Score ${Math.round(plan.total)}` });
    const r = plan.roasts[0];
    return done({
      intent: 'roast',
      mood: plan.roasts.length >= 2 ? 'losing-it' : plan.roasts.length ? 'unimpressed' : 'proud',
      reply: r ? `${r.line}${plan.roasts.length > 1 ? ` And that's 1 of ${plan.roasts.length}.` : ''}` : "No roasts. Load-in at six. Doors at eight. Don't be late.",
      actions: [{ kind: 'open', tab: 'tour' }],
    });
  }

  // ---- Plan / re-plan the tour
  if (has(text, /\b(re-?plan|plan|route|routing|build)\b.*\b(tour|route|run|van|it)\b|\bplan (my|the|a)\b|new tour|plan it/)) {
    const regions = regionsFromText(raw);
    steps.push({ tool: 'planner', label: 'Queued the router', detail: regions.length ? `Regions: ${regions.join(', ')}` : 'Same regions and dates as last time' });
    return done({ intent: 'plan', mood: 'reading', reply: 'Routing the van. Nearest neighbor, then 2-opt. Back in a sec with the roasts.', actions: [{ kind: 'plan' }] });
  }

  // ---- Sleepers
  if (has(text, /sleeper|underrated|hidden|nobody plays|surprise/)) {
    const s = sleepers.slice(0, 3);
    steps.push({ tool: 'crowdMap', label: 'Compared heat with lift', detail: `${plural(sleepers.length, 'sleeper')} vs a 20-act baseline` });
    return done({
      intent: 'sleepers',
      mood: 'proud',
      reply: s.length ? `Everyone skips ${s[0].name}. Your crowd doesn't.${s[1] ? ` Then ${s[1].name}${s[2] ? ` and ${s[2].name}` : ''}.` : ''}` : "No sleepers. Your crowd's where everyone's crowd is.",
      actions: [{ kind: 'open', tab: 'map' }],
    });
  }

  // ---- One city
  if (city && !has(text, /^(brief|what'?s new)/)) {
    const p = proof.find((q) => q.city === city.id);
    const m = scout.metros.find((q) => q.id === city.id);
    steps.push({ tool: 'crowdMap', label: `Read ${city.name}'s heat`, detail: m?.rank ? `#${m.rank} of ${ranked.length} · Wanted Score ${Math.round(m.score ?? 0)}` : 'Not scored for this Sound' });
    if (p) steps.push({ tool: 'cityProof', label: `Counted ${city.name}'s signatures`, detail: `${p.signatures} signed · ${pct(p.signatureShare) ?? '—'} of yours vs ${pct(p.heatShare) ?? '—'} predicted` });
    const hood = p?.neighborhoods[0]?.name;
    const reply = p
      ? p.crossed
        ? `${city.name}'s proven. ${p.signatures} signatures, ${x(p.ratio)} what Qloo predicted${hood ? `, loudest in ${hood}` : ''}. Pitch it.`
        : `${city.name}: ${p.signatures} signatures${x(p.ratio) ? `, ${x(p.ratio)} predicted` : ''}.${p.signatures < config.proof.minSignatures ? ` ${config.proof.minSignatures - p.signatures} more and I call it.` : ' Ratio’s not there yet.'}`
      : m?.rank
        ? `${city.name} ranks #${m.rank} for you${m.sleeper ? ', and it’s a sleeper' : ''}. No poster up yet.`
        : `The graph's quiet in ${city.name}. I won't make stuff up.`;
    return done({
      intent: 'city',
      mood: p?.crossed ? 'proud' : m?.rank && m.rank <= 20 ? 'idle' : 'unimpressed',
      reply,
      actions: [{ kind: 'open', tab: 'map', city: city.id }],
      suggestions: suggest(p ? [`Pitch ${city.name}`] : [`Post a poster in ${city.name}`]),
    });
  }

  // ---- Who the crowd is
  if (has(text, /who (is|are)|crowd|audience|fans like|demograph|what (do|else) (they|my fans)/)) {
    const card = await crowdFor(artist, null);
    const show = card.love.shows[0]?.name;
    const pod = card.love.podcasts[0]?.name;
    steps.push({ tool: 'readCrowd', label: 'Read the crowd card', detail: card.who?.line ?? 'Demographics thin' });
    return done({
      intent: 'crowd',
      mood: 'reading',
      reply: `${card.who?.line ? `${card.who.line}.` : 'Thin on demographics.'}${show ? ` They watch ${show}` : ''}${pod ? `${show ? ' and' : ' They'} listen to ${pod}` : ''}${show || pod ? '. Put that in the pitch.' : ''}`,
      actions: [{ kind: 'open', tab: 'crowd' }],
    });
  }

  // ---- Where am I most wanted
  if (has(text, /most wanted|where|best (city|cities)|top (city|cities)|hottest|crowd lives|which cit/)) {
    const top = ranked.slice(0, 3).map((m) => m.name);
    steps.push({ tool: 'crowdMap', label: 'Ranked the metros', detail: `${ranked.length} scored · 0.6 heat + 0.4 lift` });
    return done({
      intent: 'most-wanted',
      mood: 'proud',
      reply: `${top.join(', ')}.${sleepers[0] ? ` Your sleeper's ${sleepers[0].name}.` : ''}${byProof[0] && (byProof[0].ratio ?? 0) > 1 ? ` Fans say ${nameOf(byProof[0].city)}.` : ''}`,
      actions: [{ kind: 'open', tab: 'map' }],
    });
  }

  // ---- Briefing (default)
  const msgs = await inbox(artist.id, 20);
  const unread = msgs.filter((m) => !m.read).length;
  const plan = await loadPlan(artist.id);
  if (plan) steps.push({ tool: 'plan', label: 'Checked the route', detail: `Tour Score ${Math.round(plan.total)} · ${plural(plan.roasts.length, 'roast')}` });
  if (unread) steps.push({ tool: 'inbox', label: 'Read the inbox', detail: `${unread} unread` });
  const lead = byProof[0];
  const greeting = has(text, /^(hey|hi|hello|yo|sup|howdy|gus)\b/) && text.length < 16;
  const parts = [
    greeting ? `Hey ${first}.` : null,
    totalSigs ? `${plural(totalSigs, 'signature')} across ${plural(proof.length, 'city', 'cities')}.` : 'No posters up yet.',
    proven.length ? `${nameOf(proven[0].city)}'s proven. Pitch it.` : lead && lead.signatures ? `${nameOf(lead.city)} leads with ${lead.signatures}${x(lead.ratio) ? ` at ${x(lead.ratio)}` : ''}.` : null,
    plan ? (plan.roasts.length ? `${plural(plan.roasts.length, 'roast')} on the route.` : 'Route’s clean.') : null,
  ].filter(Boolean);
  return done({ intent: greeting ? 'hello' : 'brief', mood: proven.length ? 'proud' : 'idle', reply: parts.join(' '), actions: unread ? [{ kind: 'open', tab: 'inbox' }] : [] });
}
