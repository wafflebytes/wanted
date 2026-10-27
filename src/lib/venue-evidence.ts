/** Public source summaries from the supplied research, not live availability or offers. */
import type { Room } from './types';
export type VenueFacts = {
  status: 'review';
  checkedAt: number;
  expiresAt: number;
  capacity: null;
  availability: 'unknown';
  warning: string;
  sources: { label: string; url: string; detail: string }[];
};
const CHECKED = Date.UTC(2026, 9, 25);
const records: Record<string, VenueFacts> = {
  newportmusichall: { status: 'review', checkedAt: CHECKED, expiresAt: CHECKED + 30 * 86_400_000, capacity: null, availability: 'unknown', warning: 'Capacity conflict: 1,400 on the concert page, 1,700 on the rental page. Confirm the show configuration; do not average them.', sources: [
    { label: 'Concert page', url: 'https://promowestlive.com/our-venues/newport-music-hall', detail: 'Research observation: 1,400 capacity' },
    { label: 'Rental page', url: 'https://www.aegsev.com/newport-music-hall', detail: 'Research observation: 1,700 capacity' },
  ] },
  thebasement: { status: 'review', checkedAt: CHECKED, expiresAt: CHECKED + 30 * 86_400_000, capacity: null, availability: 'unknown', warning: 'The rental page’s 350-capacity figure covers a combined Basement/A&R context. Independent concert capacity is unverified.', sources: [
    { label: 'Rental source', url: 'https://www.aegsev.com/the-basement', detail: 'Combined rental configuration; not independent room capacity' },
  ] },
  wexnercenterforthearts: { status: 'review', checkedAt: CHECKED, expiresAt: CHECKED + 30 * 86_400_000, capacity: null, availability: 'unknown', warning: 'Performance configurations vary: 150–250 floor seats, up to 500 standing, 200 cabaret. Exact format, rental terms and show date need confirmation.', sources: [
    { label: 'Performance-space source', url: 'https://wexarts.org/rentals/performance-space', detail: 'Configuration-dependent capacity, no date availability' },
  ] },
};
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** A city and address check prevents a same-name venue from inheriting Columbus facts. */
export function venueFactsFor(room: Pick<Room, 'name' | 'address'>, metroId: string): VenueFacts | null {
  if (metroId !== 'columbus-oh' || !room.address || !/\bcolumbus\b/i.test(room.address)) return null;
  return records[normalize(room.name)] ?? null;
}
