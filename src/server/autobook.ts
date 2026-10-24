/**
 * The watcher chain (PRD 9.3c): when a city proves demand, Gus does the work before he says
 * anything. Rooms from Qloo, minus any dark that night; ranked by how close they sit to where
 * the crowd lives; an opener who shares the crowd; then he asks two or three rooms at once and
 * keeps the best terms (leverage comes from asking more than one, and no room ever hears
 * another's terms). The artist gets one card with one question. Nothing is paid without a yes.
 *
 * Every step goes in the Logbook with whose data it came from.
 */
import type { Deal } from '../lib/types';
import { dayOf } from '../lib/tour';
import type { ArtistRow } from './artists';
import { isOpenOn } from './city';
import { defaultDate, dealsFor, passDeal, runToEnd, startDeal } from './deals';
import { log } from './logbook';
import { callsThisWeek, escalationLevel, mandateFor } from './mandate';
import { metroById } from './score';
import { cityData, crowdFor, loadPlan } from './service';
import { postInbox } from './watcher';

const nice = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const listOf = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const DAY = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

/** Best terms for the artist: inside their limits first, then the bigger share of the door, then the smaller deposit. */
export function bestDeal(deals: Deal[]): Deal | null {
  const done = deals.filter((d) => d.status === 'waiting' && d.terms);
  done.sort((a, b) => Number(b.withinLimits) - Number(a.withinLimits) || b.terms!.split - a.terms!.split || a.terms!.deposit - b.terms!.deposit);
  return done[0] ?? null;
}

export async function autoBook(artist: ArtistRow, city: string): Promise<{ deal: Deal | null; asked: number }> {
  const metro = metroById(city);
  if (!metro) return { deal: null, asked: 0 };
  const m = await mandateFor(artist.id);
  if (!m.autoAsk) {
    await log(artist.id, { kind: 'decision', city, title: `${metro.name} filled its poster. You asked me not to contact venues on my own, so I’m just letting you know`, source: 'gus', level: 1 });
    return { deal: null, asked: 0 };
  }
  const live = (await dealsFor(artist.id)).find((d) => d.city === city && (d.status === 'talking' || d.status === 'waiting' || d.status === 'held'));
  if (live) {
    await log(artist.id, { kind: 'decision', city, title: `Already talking to ${live.roomName} in ${metro.name}, so I didn’t ask anyone else`, source: 'gus', ref: { dealId: live.id } });
    return { deal: live, asked: 0 };
  }

  // 1. Rooms from Qloo, and the night we'd ask for.
  const d = await cityData(artist, city, true);
  const plan = await loadPlan(artist.id);
  const night = plan?.stops.find((s) => s.metroId === city)?.date ?? defaultDate();
  const day = dayOf(night);
  await log(artist.id, {
    kind: 'lookup',
    city,
    title: `Found ${d.rooms.length} venue${d.rooms.length === 1 ? '' : 's'} in ${metro.name} that suit your crowd`,
    detail: d.droppedClosed.length ? `Left out ${d.droppedClosed.length} that closed for good.` : null,
    source: 'qloo',
  });

  // 2. Drop rooms dark that night; rank by how close they sit to the crowd.
  const dark = d.rooms.filter((r) => isOpenOn(r, day) === false);
  const open = d.rooms.filter((r) => isOpenOn(r, day) !== false);
  if (dark.length) await log(artist.id, { kind: 'decision', city, title: `Skipped ${dark.map((r) => r.name).join(', ')}: closed on ${DAY(day)}s`, source: 'qloo' });
  const ranked = [...open].sort((a, b) => (a.neighborhoodRank ?? 99) - (b.neighborhoodRank ?? 99) || a.rank - b.rank);
  const picks = ranked.slice(0, m.roomsAtOnce);
  if (!picks.length) {
    await log(artist.id, { kind: 'decision', city, title: `Every venue I know in ${metro.name} is closed on ${DAY(day)}s`, source: 'gus', level: 1 });
    await postInbox(artist.id, { kind: 'info', body: `${metro.name} filled its poster, but every venue I know there is closed on ${DAY(day)}s. Pick another night and I’ll ask.`, action: null, evidence: { city }, createdAt: Date.now() });
    return { deal: null, asked: 0 };
  }

  // 3. An opener who shares the crowd (Qloo artists + compare).
  const crowd = await crowdFor(artist, city).catch(() => null);
  const opener = crowd?.openers[0] ?? null;
  if (opener) {
    await log(artist.id, {
      kind: 'lookup',
      city,
      title: `${opener.name} would make a good opener`,
      detail: 'Your fans already like them.',
      source: 'qloo',
    });
  }

  // 4. Ask them all at once; play each negotiation out.
  await log(artist.id, {
    kind: 'letter',
    city,
    title: `Asked ${picks.length === 1 ? picks[0].name : `${picks.length} venues`} to hold ${nice(night)} for you`,
    detail: picks.length > 1 ? `${listOf(picks.map((r) => r.name))}.` : null,
    source: 'gus',
  });
  const started = await Promise.all(picks.map((r) => startDeal(artist, city, r.id, { quiet: true }).catch(() => null)));
  const finished = await Promise.all(started.filter((x): x is Deal => !!x).map((x) => runToEnd(artist, x.id).catch(() => null)));
  const deals = finished.filter((x): x is Deal => !!x);
  for (const x of deals) {
    if (x.terms) await log(artist.id, { kind: 'letter', city, title: `${x.roomName} offered ${x.terms.split}% of the door and $${x.terms.deposit} to hold the date`, detail: x.withinLimits ? null : 'More than you said you’d go for.', source: 'room', ref: { dealId: x.id } });
  }

  // 5. Keep the best, thank the rest, ask the artist once.
  const best = bestDeal(deals);
  for (const x of deals) if (x.id !== best?.id) await passDeal(artist, x.id);
  if (!best?.terms) {
    await log(artist.id, { kind: 'decision', city, title: `No venue in ${metro.name} came back with an offer`, source: 'gus', level: 1 });
    return { deal: null, asked: picks.length };
  }
  const first = artist.name.split(' ')[0];
  const esc = escalationLevel({ money: best.terms.deposit, hoursLeft: 48, needsInput: false, worthKnowing: true }, m, { localHour: null, callsThisWeek: await callsThisWeek(artist.id) });
  await log(artist.id, {
    kind: 'escalation',
    city,
    title: `Went with ${best.roomName}${deals.length > 1 ? `, the best of ${deals.length} offers` : ''}`,
    detail: esc.why,
    source: 'gus',
    level: esc.level,
    ref: { dealId: best.id },
  });
  await postInbox(artist.id, {
    kind: 'deal',
    body: `${metro.name} filled its poster, so I went to work. ${picks.length === 1 ? `I asked ${best.roomName}` : `I asked ${picks.length} venues and ${best.roomName} made the best offer`}: ${nice(best.terms.date)}, you keep ${best.terms.split}% of the door, $${best.terms.deposit} to hold the date.${opener ? ` ${opener.name} would open well.` : ''} ${best.withinLimits ? 'Want me to pay the deposit?' : 'It’s more than you said you’d go for, so it’s your call.'}`,
    action: { label: 'See the deal', kind: 'deal', city, dealId: best.id },
    evidence: { city, dealId: best.id, asked: picks.map((r) => r.name), opener: opener?.name ?? null, level: esc.level },
    createdAt: Date.now(),
  });
  return { deal: best, asked: picks.length };
}
