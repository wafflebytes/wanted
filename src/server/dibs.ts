/**
 * First dibs: once a city has a date, the people who signed for it get tickets before anyone
 * else. A signer holds one or two (four if they brought two friends); the link opens for signers
 * two days before the public sale. No ticket seller is connected, so nothing is charged here:
 * a hold is a place in line, paid for when the link opens. Wanted's fee comes out of the venue's
 * side, never the fan's.
 */
import { addDays } from '../lib/tour';
import { claimByDevice } from './claims';
import { kvGet, kvSet } from './db';
import { HttpError } from './http';

/** Wanted's cut, per ticket, paid by the venue. */
export const DIBS_FEE = 1;

type Hold = { tickets: number; at: number };
export type Dibs = {
  room: string;
  date: string;
  /** When the ticket link opens for signers, and two days later for everyone. */
  signersOn: string;
  publicOn: string;
  holders: number;
  tickets: number;
  /** Wanted's cut per ticket, paid by the venue. */
  fee: number;
  /** Your hold, when this device signed here. */
  mine: { number: number; tickets: number; max: number } | null;
};

const key = (artistId: string, city: string) => `dibs:${artistId}:${city}`;
const today = () => new Date().toISOString().slice(0, 10);

function saleWindow(date: string) {
  let signersOn = addDays(date, -21);
  const soonest = addDays(today(), 1);
  if (signersOn < soonest) signersOn = soonest;
  return { signersOn, publicOn: addDays(signersOn, 2) };
}

export async function dibsFor(artistId: string, city: string, show: { room: string; date: string } | null, mine: { number: number; earlyAccess: boolean } | null): Promise<Dibs | null> {
  if (!show) return null;
  const holds = (await kvGet<Record<string, Hold>>(key(artistId, city))) ?? {};
  const all = Object.values(holds);
  return {
    room: show.room,
    date: show.date,
    ...saleWindow(show.date),
    holders: all.length,
    tickets: all.reduce((n, h) => n + h.tickets, 0),
    fee: DIBS_FEE,
    mine: mine ? { number: mine.number, tickets: holds[mine.number]?.tickets ?? 0, max: mine.earlyAccess ? 4 : 2 } : null,
  };
}

/** A signer holds (or, with 0, lets go of) their first-dibs tickets. Only this device's signature can. */
export async function holdDibs(artistId: string, city: string, deviceToken: string | null, tickets: number) {
  const claim = deviceToken ? await claimByDevice(artistId, city, deviceToken) : null;
  if (!claim) throw new HttpError(403, 'Sign the poster first. First dibs are for the people who asked.');
  const max = claim.earlyAccess ? 4 : 2;
  const n = Math.max(0, Math.min(max, Math.round(Number(tickets) || 0)));
  const holds = (await kvGet<Record<string, Hold>>(key(artistId, city))) ?? {};
  if (n) holds[claim.number] = { tickets: n, at: Date.now() };
  else delete holds[claim.number];
  await kvSet(key(artistId, city), holds);
  return n;
}
