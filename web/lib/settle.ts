/**
 * Settle up: the end of the night, when the room hands you a number. Gus checks it against two
 * other counts before you shake on it: the ticket scanner's log and your own guest list. If the
 * three agree it's one line. If they don't, he says how many people went missing, what that is
 * in your money, and drafts the note to the room with the scans attached.
 *
 * Real: the deal (room, date, your split). Fixture until wired: the room's door sheet, the
 * scanner log and the guest list (docs/design/AGENT-UX.md, Settle up).
 */
import type { Deal } from '@/lib/types';

export type Count = { id: 'room' | 'scan' | 'list'; label: string; who: string; n: number; sub: string };
export type Settle = {
  room: string;
  contact: string;
  date: string;
  price: number;
  split: number;
  counts: Count[];
  paid: number; // what the counts say paid: scans minus your guests
  roomPaid: number; // what the room's sheet says paid
  yours: number; // your split of what really paid
  roomSays: number; // your split by the room's sheet
  missing: number;
  late: string; // when the uncounted scans happened
  note: string;
  reply: string;
};

export function settleFor(deal: Deal): Settle {
  const t = deal.terms!;
  const price = 18;
  const roomPaid = 112;
  const scans = 127;
  const guests = 4;
  const paid = scans - guests;
  const cut = (n: number) => Math.round(n * price * (t.split / 100));
  const contact = 'Sam';
  const missing = paid - roomPaid;
  return {
    room: deal.roomName,
    contact,
    date: t.date,
    price,
    split: t.split,
    counts: [
      { id: 'room', label: 'The venue’s count', who: contact, n: roomPaid, sub: 'tickets sold at the door and online' },
      { id: 'scan', label: 'The ticket scanner', who: 'Scanner', n: scans, sub: 'tickets scanned in' },
      { id: 'list', label: 'Your guest list', who: 'You', n: guests, sub: 'names you put on the list' },
    ],
    paid,
    roomPaid,
    yours: cut(paid),
    roomSays: cut(roomPaid),
    missing,
    late: 'between 10:05 and 10:40',
    note: `Hi ${contact}, thanks for tonight! The scanner logged ${scans} tickets and ${guests} were my guest list, so ${paid} paid. The sheet says ${roomPaid}. Looks like the ${missing} who came in between 10:05 and 10:40 didn’t get added. Scan log attached. Could you take a look?`,
    reply: `Ah, you’re right. The late door never got added. Fixed it, sending $${cut(paid).toLocaleString()} tonight.`,
  };
}
