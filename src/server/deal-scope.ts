/** This digest identifies what was reviewed. It is not identity or payment authority. */
import type { Deal } from '../lib/types';
import { stableHash } from './crypto';
import { HttpError } from './http';
export type DealReview = { version: number; hash: string };
export function dealReview(d: Deal): DealReview {
  return { version: d.version ?? 1, hash: stableHash({ id: d.id, version: d.version ?? 1, mode: d.mode ?? 'simulation', currency: 'usd', purpose: 'artist-to-venue-test-deposit', roomId: d.roomId, roomName: d.roomName, city: d.city, terms: d.terms, expiresAt: d.offerExpiresAt ?? d.createdAt + 48 * 3_600_000 }) };
}
export function assertDealReview(d: Deal, review?: DealReview) {
  const expected = dealReview(d);
  if (!review || review.version !== expected.version || review.hash !== expected.hash) throw new HttpError(409, 'The reviewed offer changed or was not supplied. Review the exact room, date, amount and expiry again.');
}
