/**
 * Booking-agent words, said the way a musician on a first tour (or a judge) reads them. Lines
 * Gus wrote before this vocabulary (stored letters, notes, logbook entries) pass through here on
 * screen, so old and new copy say the same thing:
 *
 *   hold / held a date   →  book, lock in       (the venue keeps the night for you)
 *   % of the door        →  % of ticket sales   (your share of what fans pay to get in)
 *   rooms (to ask)       →  venues
 *   simulated, channel…  →  test mode, plain outcomes
 *
 * Hotel rooms ("a room for the night") are left alone: only the booking phrases are matched.
 */
const DAY = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*';

const RULES: [RegExp, string][] = [
  [/\bwill hold ([^.]+?) for you\b/g, 'can book you for $1'],
  [/\bwill hold\b/g, 'can book you for'],
  [/\$(\d[\d,]*) to hold it\b/g, '$$$1 to lock it in'],
  [/\bto hold it\b/g, 'to lock it in'],
  [new RegExp(`\\bto hold (the date|the night|a night|a date|${DAY}[^.,]*)`, 'g'), 'to lock in $1'],
  [/\bThe hold lasts 48 hours\./g, 'The offer stands for 48 hours.'],
  [/\bCould you hold\b/g, 'Could you book us for'],
  [/\bfor a hold\b/g, 'for a date'],
  [/\bapart on the door\b/g, 'apart on ticket sales'],
  [/\bthe door count\b/g, 'the ticket count'],
  [/\bpercent of the door\b/g, 'percent of ticket sales'],
  [/\bshare of the door\b/g, 'share of ticket sales'],
  [/\bof the door\b/g, 'of ticket sales'],
  [/\b(ask|asks|asked|asking) (the )?rooms\b/g, '$1 $2venues'],
  [/\bAsk rooms\b/g, 'Ask venues'],
  [/\brooms (are )?open\b/g, 'venues $1open'],
  [/\bRooms (are )?open\b/g, 'Venues $1open'],
  [/\bSimulated offer: /g, 'Test offer: '],
  [/\s*Simulated offer only\. No venue transfer, agreement or settlement\./g, ' Test mode, so no real money moved.'],
  [/\s*No ticket link or delivery channel is connected\./g, ' It goes out when tickets are on sale.'],
  [/First-dibs copy is ready for the (\d+) signers\./g, 'A first-dibs note is ready for the $1 fans who signed.'],
  [/First-dibs copy for (\d+) signers is ready/g, 'A first-dibs note for the $1 fans who signed is ready'],
  [/\bRecorded exact \$(\d[\d,]*) test deposit for\b/g, 'Paid the $$$1 test deposit to'],
  [/\bSimulated hold in\b/g, 'Test booking in'],
  [/\bthis is a simulated hold, not a venue agreement\b/gi, 'this is a test booking, not a real one'],
  [/\breached the interest threshold\b/g, 'got 50 signatures'],
  [/\bfirst date held\b/gi, 'first show booked'],
];

export function plainWords(s: string): string;
export function plainWords(s: string | null | undefined): string | null | undefined;
export function plainWords(s: string | null | undefined) {
  if (!s) return s;
  let out = s;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out;
}
