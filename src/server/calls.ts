/**
 * Gus calls (rung 4 of the ladder, PRD 9.3e). Checked whenever the artist's app checks in, so
 * no cron is needed: any hold waiting on a yes, with money attached, that runs out inside the
 * mandate's window becomes a call, unless it's quiet hours or this week's call is used up (then
 * it stays a review card). The script is built from the deal's own numbers, never by a model,
 * and ends in the same yes or no as the card.
 */
import type { Deal, GusCall } from '../lib/types';
import type { ArtistRow } from './artists';
import { id } from './crypto';
import { all, one, run } from './db';
import { decideDeal, dealsFor, holdExpiresAt } from './deals';
import { HttpError } from './http';
import { log } from './logbook';
import { callsThisWeek, escalationLevel, mandateFor } from './mandate';

/** A call rings this long before it counts as missed. */
const RING_MS = 90_000;

const spokenDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

export function callScript(artist: ArtistRow, d: Deal, hoursLeft: number): string {
  const t = d.terms!;
  const left = hoursLeft < 1 ? 'less than an hour' : `about ${Math.round(hoursLeft)} hour${Math.round(hoursLeft) === 1 ? '' : 's'}`;
  return `${artist.name.split(' ')[0]}, it’s Gus. ${d.roomName} is holding ${spokenDate(t.date)} for you. You keep ${t.split} percent of the door, and it’s ${t.deposit} dollars to hold it. That hold runs out in ${left}. Want me to pay it?`;
}

type Row = { id: string; deal_id: string; city: string; script: string; status: GusCall['status']; outcome: 'yes' | 'no' | null; created_at: number };
const view = (r: Row): GusCall => ({ id: r.id, dealId: r.deal_id, city: r.city, script: r.script, status: r.status, outcome: r.outcome, createdAt: Number(r.created_at) });

/** Climbs the ladder for every hold waiting on the artist, and returns the call ringing now, if any. */
export async function checkIn(artist: ArtistRow, localHour: number | null): Promise<GusCall | null> {
  const now = Date.now();
  await run("update gus_calls set status = 'missed', updated_at = ? where artist_id = ? and status = 'ringing' and created_at < ?", [now, artist.id, now - RING_MS]);
  const m = await mandateFor(artist.id);
  const waiting = (await dealsFor(artist.id)).filter((d) => d.status === 'waiting' && d.terms && d.terms.deposit > 0 && d.withinLimits);
  for (const d of waiting) {
    const hoursLeft = (holdExpiresAt(d) - now) / 3_600_000;
    if (hoursLeft <= 0) continue;
    const already = await one<{ id: string }>('select id from gus_calls where artist_id = ? and deal_id = ?', [artist.id, d.id]);
    if (already) continue;
    const esc = escalationLevel({ money: d.terms!.deposit, hoursLeft, needsInput: false, worthKnowing: true }, m, { localHour, callsThisWeek: await callsThisWeek(artist.id) });
    if (esc.level < 4) continue;
    const call: Row = { id: id('k_'), deal_id: d.id, city: d.city, script: callScript(artist, d, hoursLeft), status: 'ringing', outcome: null, created_at: now };
    await run('insert into gus_calls(id, artist_id, deal_id, city, script, status, created_at, updated_at) values(?, ?, ?, ?, ?, ?, ?, ?)', [call.id, artist.id, call.deal_id, call.city, call.script, call.status, now, now]);
    await log(artist.id, { kind: 'escalation', city: d.city, title: `Called you about ${d.roomName}`, detail: esc.why, source: 'gus', level: 4, ref: { dealId: d.id, callId: call.id } });
    break;
  }
  const ringing = await one<Row>("select * from gus_calls where artist_id = ? and status in ('ringing', 'answered') order by created_at desc limit 1", [artist.id]);
  return ringing ? view(ringing) : null;
}

/** pick up, decline, or answer yes/no once he's said his piece. */
export async function answerCall(artist: ArtistRow, callId: string, action: 'pickup' | 'decline' | 'yes' | 'no'): Promise<{ call: GusCall; deal: Deal | null }> {
  const r = await one<Row>('select * from gus_calls where artist_id = ? and id = ?', [artist.id, callId]);
  if (!r) throw new HttpError(404, 'No such call.');
  const now = Date.now();
  let deal: Deal | null = null;
  if (action === 'pickup') {
    await run("update gus_calls set status = 'answered', updated_at = ? where id = ? and status = 'ringing'", [now, r.id]);
  } else if (action === 'decline') {
    await run("update gus_calls set status = 'declined', updated_at = ? where id = ?", [now, r.id]);
    await log(artist.id, { kind: 'escalation', city: r.city, title: 'You missed my call. The offer’s still in Fan Mail', source: 'artist', level: 3, ref: { dealId: r.deal_id, callId: r.id } });
  } else {
    deal = await decideDeal(artist, r.deal_id, action === 'yes');
    await run("update gus_calls set status = 'done', outcome = ?, updated_at = ? where id = ?", [action, now, r.id]);
  }
  const out = (await one<Row>('select * from gus_calls where id = ?', [r.id]))!;
  return { call: view(out), deal };
}

export async function recentCalls(artistId: string): Promise<GusCall[]> {
  return (await all<Row>('select * from gus_calls where artist_id = ? order by created_at desc limit 10', [artistId])).map(view);
}
