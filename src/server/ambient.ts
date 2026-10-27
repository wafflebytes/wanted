/**
 * Gus works when nobody is looking. The world moves on read: any visit (and the scheduler)
 * calls `tick`, which plays the turns a call would have taken since it was last touched, so a
 * conversation keeps going with every tab closed and lands as an offer waiting on you.
 *
 * Demo acts also keep their stage stocked, so whoever opens one finds Gus mid-work: one date
 * held (show day, settle up), one offer waiting on the artist, one room on the line. Judges
 * who say yes or no use them up; the next visit has Gus start the next one, and the Logbook
 * says so. Every deal stays a labeled simulation (see deals.ts).
 */
import type { Deal } from '../lib/types';
import type { ArtistRow } from './artists';
import { openedCities } from './artists';
import { cityCount } from './claims';
import { kvGet, kvSet } from './db';
import { advanceDeal, dealsFor, decideDeal, holdExpiresAt, passDeal, runToEnd, startDeal } from './deals';
import { redact } from './env';
import { log } from './logbook';

/** How long one letter takes when nobody is watching. */
export const TURN_MS = 25_000;
const THROTTLE_MS = 15_000;
const MAX_TURNS = 6;

export type TickReport = { advanced: number; started: string[]; held: string[]; skipped?: string };

export async function tick(artist: ArtistRow, now = Date.now(), opts: { force?: boolean } = {}): Promise<TickReport> {
  const key = `tick:${artist.id}`;
  const last = await kvGet<{ at: number }>(key);
  if (!opts.force && last && now - last.at < THROTTLE_MS) return { advanced: 0, started: [], held: [], skipped: 'throttled' };
  await kvSet(key, { at: now });
  const report: TickReport = { advanced: 0, started: [], held: [] };
  try {
    let deals = await dealsFor(artist.id);
    for (const d of deals.filter((x) => x.status === 'talking')) report.advanced += await catchUp(artist, d, now);
    if (artist.isDemo) {
      deals = await dealsFor(artist.id);
      await stock(artist, deals, now, report);
    }
  } catch (e) {
    report.skipped = redact(String(e)).slice(0, 160);
  }
  return report;
}

/** Plays the turns this call would have taken since it was last touched. */
async function catchUp(artist: ArtistRow, d: Deal, now: number): Promise<number> {
  let turns = Math.min(MAX_TURNS, Math.floor((now - d.updatedAt) / TURN_MS));
  let deal = d;
  let n = 0;
  while (turns-- > 0 && deal.status === 'talking') {
    deal = await advanceDeal(artist, deal.id, deal.thread.length);
    n++;
  }
  return n;
}

async function stock(artist: ArtistRow, deals: Deal[], now: number, report: TickReport) {
  // A demo offer nobody answered in time is let go, so a fresh one can take its place.
  for (const d of deals.filter((x) => x.status === 'waiting' && now >= holdExpiresAt(x) - 60 * 60_000)) await passDeal(artist, d.id);
  deals = await dealsFor(artist.id);

  const opened = await openedCities(artist.id);
  const counts = await Promise.all(opened.map(async (c) => ({ city: c.city, n: await cityCount(artist.id, c.city) })));
  const ranked = counts.filter((c) => c.n > 0).sort((a, b) => b.n - a.n).map((c) => c.city);
  const busy = (city: string) => deals.some((d) => d.city === city && (d.status === 'talking' || d.status === 'waiting'));
  const booked = (city: string) => deals.some((d) => d.city === city && d.status === 'held');
  const pick = () => ranked.find((c) => !busy(c) && !booked(c)) ?? ranked.find((c) => !busy(c)) ?? null;

  const has = (s: Deal['status']) => deals.some((d) => d.status === s);
  const remember = async (d: Deal) => {
    deals = [d, ...deals.filter((x) => x.id !== d.id)];
  };

  // One date held: what Show day and Settle up stand on.
  if (!has('held')) {
    const city = ranked.find((c) => !busy(c)) ?? null;
    if (city) {
      const d = await runToEnd(artist, (await startDeal(artist, city, null, { quiet: true })).id);
      if (d.status === 'waiting' && d.review) {
        const held = await decideDeal(artist, d.id, true, d.review, { followup: true }).catch(() => null);
        if (held) {
          await remember(held);
          report.held.push(city);
        }
      }
    }
  }
  // One offer waiting on you: the thing a visitor gets to decide.
  if (!has('waiting')) {
    const city = pick();
    if (city) {
      const d = await runToEnd(artist, (await startDeal(artist, city, null)).id);
      await remember(d);
      report.started.push(city);
      await log(artist.id, { kind: 'letter', source: 'gus', city, title: `Asked ${d.roomName} for ${d.cityName} while you were away. They came back with an offer.` });
    }
  }
  // One room on the line: the call the island carries when you arrive.
  if (!has('talking')) {
    const city = pick();
    if (city) {
      const d = await startDeal(artist, city, null, { quiet: false });
      await remember(d);
      report.started.push(city);
      await log(artist.id, { kind: 'letter', source: 'gus', city, title: `Started talking to ${d.roomName} about ${d.cityName}.` });
    }
  }
}
