/**
 * The mandate and the escalation ladder (PRD 9.3d, 9.3e).
 *
 * The mandate is what the artist lets Gus do unasked. The ladder decides how loudly he asks
 * when he needs them: 0 log, 1 notify, 2 ask, 3 review, 4 call. The level comes from three
 * things, in code, never from the model: what's at stake (money, a date), how soon it runs out,
 * and whether it can be undone. Quiet hours and a weekly call budget cap it, so a call stays rare
 * enough to mean something; a call always ends in the same choice as the review card, so missing
 * one loses nothing.
 */
import type { EscalationLevel, Mandate } from '../lib/types';
import { kvGet, kvSet, one } from './db';
import { limitsFor, setLimits } from './deals';

const DEFAULTS: Omit<Mandate, 'maxDeposit' | 'minSplit'> = {
  autoAsk: true,
  roomsAtOnce: 3,
  quietStart: 22,
  quietEnd: 9,
  callsPerWeek: 1,
  callBeforeExpiryHours: 6,
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function mandateFor(artistId: string): Promise<Mandate> {
  const rest = { ...DEFAULTS, ...((await kvGet<Partial<Mandate>>(`mandate:${artistId}`)) ?? {}) };
  return { ...rest, ...(await limitsFor(artistId)) };
}

const clamp = (n: unknown, lo: number, hi: number, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d);

export async function setMandate(artistId: string, next: Partial<Mandate>): Promise<Mandate> {
  const cur = await mandateFor(artistId);
  if (next.maxDeposit !== undefined || next.minSplit !== undefined) await setLimits(artistId, { maxDeposit: next.maxDeposit, minSplit: next.minSplit });
  await kvSet(`mandate:${artistId}`, {
    autoAsk: typeof next.autoAsk === 'boolean' ? next.autoAsk : cur.autoAsk,
    roomsAtOnce: clamp(next.roomsAtOnce, 1, 3, cur.roomsAtOnce),
    quietStart: clamp(next.quietStart, 0, 23, cur.quietStart),
    quietEnd: clamp(next.quietEnd, 0, 23, cur.quietEnd),
    callsPerWeek: clamp(next.callsPerWeek, 0, 7, cur.callsPerWeek),
    callBeforeExpiryHours: clamp(next.callBeforeExpiryHours, 1, 47, cur.callBeforeExpiryHours),
  });
  return mandateFor(artistId);
}

export function inQuietHours(hour: number | null, m: Pick<Mandate, 'quietStart' | 'quietEnd'>): boolean {
  if (hour === null) return false;
  return m.quietStart <= m.quietEnd ? hour >= m.quietStart && hour < m.quietEnd : hour >= m.quietStart || hour < m.quietEnd;
}

export type Situation = {
  /** Money that moves if the artist says yes. */
  money: number;
  /** Hours until the chance is gone (a hold expiring), if it can run out. */
  hoursLeft: number | null;
  /** Gus is blocked without an answer from the artist. */
  needsInput: boolean;
  /** Worth telling them about at all (a city proved it, a milestone). */
  worthKnowing: boolean;
};

/** The ladder, as a pure function so the evals can label situations and check every rung. */
export function escalationLevel(s: Situation, m: Mandate, ctx: { localHour: number | null; callsThisWeek: number }): { level: EscalationLevel; why: string } {
  const urgent = s.money > 0 && s.hoursLeft !== null && s.hoursLeft <= m.callBeforeExpiryHours;
  if (urgent) {
    if (m.callsPerWeek === 0) return { level: 3, why: 'Calls are off, so it’s waiting in Fan Mail' };
    if (inQuietHours(ctx.localHour, m)) return { level: 3, why: 'It’s late, so it’s waiting in Fan Mail' };
    if (ctx.callsThisWeek >= m.callsPerWeek) return { level: 3, why: 'You already got a call this week, so it’s waiting in Fan Mail' };
    return { level: 4, why: `$${s.money} on the line and the date goes back in under ${Math.max(1, Math.ceil(s.hoursLeft!))} hours` };
  }
  if (s.money > 0) return { level: 3, why: `Needs your OK before I pay $${s.money}` };
  if (s.needsInput) return { level: 2, why: 'I need an answer from you' };
  if (s.worthKnowing) return { level: 1, why: 'Nothing to decide yet' };
  return { level: 0, why: 'Routine' };
}

export async function callsThisWeek(artistId: string): Promise<number> {
  const r = await one<{ n: number }>("select count(*) as n from gus_calls where artist_id = ? and created_at > ?", [artistId, Date.now() - WEEK_MS]);
  return Number(r?.n ?? 0);
}
