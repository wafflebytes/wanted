/** An in-app call is a scarce attention channel, not a payment authority.
 * Scripts/scope are immutable, persisted and checked again when the answer arrives.
 * Calls are created transactionally: one active call, one per exact offer, weekly budget.
 * Without a known local hour no new ring is created. No real outbound phone connector. */
import type { Deal, GusCall } from '../lib/types';
import type { ArtistRow } from './artists';
import { id } from './crypto';
import { all, one, run, transaction } from './db';
import { decideDeal, dealsFor, holdExpiresAt } from './deals';
import { dealReview, assertDealReview, type DealReview } from './deal-scope';
import { HttpError } from './http';
import { log } from './logbook';
import { escalationLevel, inQuietHours, mandateFor } from './mandate';
const RING_MS = 90_000;
const spokenDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export function callScript(artist: ArtistRow, d: Deal, hoursLeft: number): string {
  const t = d.terms!;
  const left = hoursLeft < 1 ? 'less than an hour' : `about ${Math.ceil(hoursLeft)} hour${Math.ceil(hoursLeft) === 1 ? '' : 's'}`;
  return `${artist.name.split(' ')[0]}, it's Gus. This is a test booking, not a real one. ${d.roomName}, ${spokenDate(t.date)}. You keep ${t.split} percent of ticket sales. The deposit to lock in the date is ${t.deposit} dollars, test money only. This offer ends in ${left}. Check the venue, date and amount. Want me to pay that test deposit?`;
}
type Row = { id: string; deal_id: string; city: string; script: string; status: GusCall['status']; outcome: 'yes' | 'no' | null; created_at: number };
type Scope = { review: DealReview; expiresAt: number; decision?: 'yes' | 'no' };
const view = (r: Row): GusCall => ({ id: r.id, dealId: r.deal_id, city: r.city, script: r.script, status: r.status, outcome: r.outcome, createdAt: Number(r.created_at) });
export async function checkIn(artist: ArtistRow, localHour: number | null): Promise<GusCall | null> {
  const now = Date.now();
  await run("update gus_calls set status = 'missed', updated_at = ? where artist_id = ? and status = 'ringing' and created_at <= ?", [now, artist.id, now - RING_MS]);
  const m = await mandateFor(artist.id);
  const quiet = localHour === null || !Number.isInteger(localHour) || localHour < 0 || localHour > 23 || inQuietHours(localHour, m);
  const waiting = quiet ? [] : (await dealsFor(artist.id)).filter(d => d.status === 'waiting' && d.terms && d.terms.deposit > 0 && d.withinLimits);
  for (const candidate of waiting) {
    const created = await transaction(async tx => {
      const active = await tx.execute({ sql: "select id from gus_calls where artist_id = ? and status in ('ringing','answered') limit 1", args: [artist.id] });
      if (active.rows[0]) return false;
      const row = await tx.execute({ sql: 'select body from deals where id = ? and artist_id = ?', args: [candidate.id, artist.id] });
      const d = row.rows[0] ? JSON.parse(String(row.rows[0].body)) as Deal : null;
      if (!d?.terms || d.status !== 'waiting' || !d.withinLimits) return false;
      const review = dealReview(d);
      const history = await tx.execute({ sql: 'select s.body from gus_calls c join gus_call_scopes s on s.call_id = c.id and s.artist_id = c.artist_id where c.artist_id = ? and c.deal_id = ?', args: [artist.id, d.id] });
      if (history.rows.some(r => (JSON.parse(String(r.body)) as Scope).review.hash === review.hash)) return false;
      const count = await tx.execute({ sql: 'select count(*) as n from gus_calls where artist_id = ? and created_at > ?', args: [artist.id, now - 7 * 86_400_000] });
      const hoursLeft = (holdExpiresAt(d) - now) / 3_600_000;
      if (hoursLeft <= 0) return false;
      const esc = escalationLevel({ money: d.terms.deposit, hoursLeft, needsInput: false, worthKnowing: true }, m, { localHour, callsThisWeek: Number(count.rows[0].n) });
      if (esc.level !== 4) return false;
      const callId = id('k_');
      await tx.execute({ sql: "insert into gus_calls(id,artist_id,deal_id,city,script,status,created_at,updated_at) values(?,?,?,?,?,'ringing',?,?)", args: [callId, artist.id, d.id, d.city, callScript(artist, d, hoursLeft), now, now] });
      await tx.execute({ sql: 'insert into gus_call_scopes(call_id,artist_id,body) values(?,?,?)', args: [callId, artist.id, JSON.stringify({ review, expiresAt: holdExpiresAt(d) } satisfies Scope)] });
      await tx.execute({ sql: "insert into gus_log(id,artist_id,kind,city,title,detail,source,level,ref,created_at) values(?,?,'escalation',?,?,?,'gus',4,?,?)", args: [`call-log:${callId}`, artist.id, d.city, `Called you about ${d.roomName}`, esc.why, JSON.stringify({ dealId: d.id, callId }), now] });
      return true;
    });
    if (created) break;
  }
  const ringing = await one<Row>(`select * from gus_calls where artist_id = ? and status ${quiet ? "= 'answered'" : "in ('ringing','answered')"} order by created_at desc limit 1`, [artist.id]);
  return ringing ? view(ringing) : null;
}
/** Also used by the voice endpoint: the stored script is canonical, never client text. */
export async function currentCall(artist: ArtistRow, callId: string): Promise<{ row: Row; scope: Scope; deal: Deal }> {
  const r = await one<Row>('select * from gus_calls where artist_id = ? and id = ?', [artist.id, callId]);
  if (!r) throw new HttpError(404, 'No such call.');
  const s = await one<{ body: string }>('select body from gus_call_scopes where call_id = ? and artist_id = ?', [callId, artist.id]);
  if (!s) throw new HttpError(409, 'This old call has no exact offer snapshot. Review the current offer in Fan Mail.');
  const scope = JSON.parse(s.body) as Scope;
  const d = await one<{ body: string }>('select body from deals where artist_id = ? and id = ?', [artist.id, r.deal_id]);
  if (!d) throw new HttpError(404, 'The offer no longer exists.');
  const deal = JSON.parse(d.body) as Deal;
  assertDealReview(deal, scope.review);
  return { row: r, scope, deal };
}
export async function answerCall(artist: ArtistRow, callId: string, action: 'pickup' | 'decline' | 'yes' | 'no'): Promise<{ call: GusCall; deal: Deal | null }> {
  const { row: r, scope, deal: latest } = await currentCall(artist, callId);
  if (r.status === 'done') { if (action !== r.outcome) throw new HttpError(409, 'This call already has a different decision.'); return { call: view(r), deal: latest }; }
  if (!['ringing', 'answered'].includes(r.status)) throw new HttpError(409, 'This call is no longer active. The review card remains in Fan Mail.');
  const now = Date.now();
  if (now >= scope.expiresAt || (r.status === 'ringing' && now - Number(r.created_at) >= RING_MS)) throw new HttpError(410, 'The call or offer expired. Review the current terms before a decision.');
  let deal: Deal | null = null;
  if (action === 'pickup') await run("update gus_calls set status = 'answered', updated_at = ? where artist_id = ? and id = ? and status = 'ringing'", [now, artist.id, r.id]);
  else if (action === 'decline') {
    await transaction(async tx => {
      const snap=await tx.execute({sql:'select body from gus_call_scopes where call_id=? and artist_id=?',args:[r.id,artist.id]});
      const scopeNow=snap.rows[0]?JSON.parse(String(snap.rows[0].body)) as Scope:null;
      if(!scopeNow || scopeNow.decision) throw new HttpError(409,'This exact call decision is already recorded or executing. Reconcile its receipt; a late decline cannot cancel or hide it.');
      await tx.execute({sql:"update gus_calls set status='declined',updated_at=? where artist_id=? and id=? and status in ('ringing','answered')",args:[now,artist.id,r.id]});
    });
    await log(artist.id, { kind: 'escalation', city: r.city, title: 'The call ended. The offer is still in Fan Mail', source: 'artist', level: 3, ref: { dealId: r.deal_id, callId: r.id } });
  } else {
    if (r.status !== 'answered') throw new HttpError(409, 'Pick up and review the exact call before answering.');
    // Commit the human choice before provider work. A decline/cross-screen no cannot
    // race a pending yes into a misleading declined-but-paid call.
    await transaction(async tx => {
      const live=await tx.execute({sql:'select status from gus_calls where id=? and artist_id=?',args:[r.id,artist.id]});
      if(live.rows[0]?.status!=='answered') throw new HttpError(409,'This call is no longer awaiting an answer.');
      const snap=await tx.execute({sql:'select body from gus_call_scopes where call_id=? and artist_id=?',args:[r.id,artist.id]});
      const scopeNow=snap.rows[0]?JSON.parse(String(snap.rows[0].body)) as Scope:null;
      if(!scopeNow)throw new HttpError(409,'The exact call snapshot is missing.');
      if(scopeNow.decision && scopeNow.decision!==action)throw new HttpError(409,'This call already has a different decision.');
      scopeNow.decision=action;
      await tx.execute({sql:'update gus_call_scopes set body=? where call_id=? and artist_id=?',args:[JSON.stringify(scopeNow),r.id,artist.id]});
    });
    deal = await decideDeal(artist, r.deal_id, action === 'yes', scope.review);
    await run("update gus_calls set status = 'done', outcome = ?, updated_at = ? where artist_id = ? and id = ? and status = 'answered'", [action, now, artist.id, r.id]);
  }
  const out = (await one<Row>('select * from gus_calls where artist_id = ? and id = ?', [artist.id, r.id]))!;
  return { call: view(out), deal };
}
export async function recentCalls(artistId: string): Promise<GusCall[]> { return (await all<Row>('select * from gus_calls where artist_id = ? order by created_at desc limit 10', [artistId])).map(view); }
