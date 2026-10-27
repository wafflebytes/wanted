/**
 * Show day: the day sheet Gus keeps for a held date, and the one rule that makes it an agent
 * instead of a document: when the venue changes something, only what depends on it moves.
 *
 * Built from the real deal (room, date, split) and real Qloo picks for the city (where your
 * crowd hangs out, openers who fit). The advance thread, times, party and dinner options are
 * a labelled fixture until the advance desk is wired (docs/design/AGENT-UX.md, Show day).
 */
import type { Deal } from '@/lib/types';
import type { Crowd } from '@/ui/types';

export type Who = 'room' | 'gus' | 'road' | 'fans';
export type Row = {
  id: string;
  at: number; // minutes after midnight, local
  end?: number;
  title: string;
  sub: string;
  who: Who;
  /** set: the room confirmed it. asked: Gus asked and is waiting. pick: Gus chose it for you. */
  state: 'set' | 'asked' | 'pick';
  src?: string;
};
export type Person = { name: string; role: string; needs: string | null };
export type Meal = { id: string; name: string; walk: number; sit: number; note: string; fits: Record<string, boolean>; taste: string | null };
export type Letter = { from: string; when: string; text: string };
export type Change = { letter: Letter; soundcheck: number; reply: string };

export type Day = {
  room: string;
  city: string;
  date: string;
  split: number;
  price: number;
  cap: number;
  signers: number;
  party: Person[];
  rows: Row[];
  meals: Meal[];
  dinner: string;
  advance: { q: string; a: string | null; k?: string }[];
  thread: Letter[];
  costs: { label: string; n: number }[];
  hang: { name: string; sub: string } | null;
  openers: { name: string; why: string }[];
  road: { from: string; drive: string; leave: number; sleep: { name: string; sub: string }; couches: number };
  pending: Change | null;
};

export const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  return `${h % 12 || 12}:${mm}`;
};
export const ampm = (m: number) => (Math.floor(m / 60) % 24 < 12 ? 'am' : 'pm');

const PARTY: Person[] = [
  { name: 'Maya', role: 'you', needs: 'Vegetarian' },
  { name: 'Dev', role: 'drums', needs: null },
  { name: 'Ana', role: 'bass', needs: 'Gluten-free' },
];

const MEALS: Meal[] = [
  { id: 'verita', name: 'Pizzeria Verità', walk: 7, sit: 45, note: 'Sit-down, wood-fired', fits: { Maya: true, Dev: true, Ana: true }, taste: 'Your crowd loves it here' },
  { id: 'pho', name: 'Pho Hong', walk: 3, sit: 22, note: 'Quick, big bowls', fits: { Maya: true, Dev: true, Ana: true }, taste: null },
  { id: 'coop', name: 'City Market hot bar', walk: 5, sit: 10, note: 'Grab and go', fits: { Maya: true, Dev: true, Ana: true }, taste: null },
];

/** The first meal that fits the window for everyone, with the walk both ways. */
export function pickMeal(meals: Meal[], window: number) {
  return meals.find((m) => m.sit + m.walk * 2 <= window && Object.values(m.fits).every(Boolean)) ?? meals[meals.length - 1];
}

/** Rebuild the times that depend on soundcheck. Everything else stays where the room put it. */
export function plan(d: Day, soundcheck: number): { rows: Row[]; dinner: string; moved: Set<string> } {
  const by = Object.fromEntries(d.rows.map((r) => [r.id, r]));
  const doors = by.doors.at;
  const checkEnd = soundcheck + 45;
  const window = doors - 15 - checkEnd;
  const meal = pickMeal(d.meals, window);
  const moved = new Set<string>();
  const rows = d.rows.map((r) => {
    if (r.id === 'check' && r.at !== soundcheck) {
      moved.add('check');
      return { ...r, at: soundcheck, end: checkEnd };
    }
    if (r.id === 'dinner') {
      const next = { ...r, at: checkEnd, end: doors - 15, title: `Dinner at ${meal.name}`, sub: `${meal.walk} min walk · ${window} min, all three of you eat` };
      if (next.at !== r.at || next.title !== r.title) moved.add('dinner');
      return next;
    }
    return r;
  });
  return { rows, dinner: meal.id, moved };
}

export function dayFor(deal: Deal, crowd: Crowd | null, signers: number, prev: { city: string; hours: number } | null = null): Day {
  const room = deal.roomName;
  const city = deal.cityName;
  const t = deal.terms!;
  // Qloo's places for this crowd come with a description; prefer one that has live music.
  const spots = (crowd?.hang?.spots ?? []) as { name: string; description?: string }[];
  const hangSpot = spots.find((s) => /live.music/i.test(s.description ?? '')) ?? spots[0] ?? null;
  const contact = 'Sam';
  // Burlington's places are real names; elsewhere the fixture says what kind of place it is.
  const meals = deal.city === 'burlington-vt' ? MEALS : MEALS.map((m, i) => ({ ...m, name: ['Pizza on the corner', 'Pho, two doors down', 'Co-op hot bar'][i] }));
  const from = prev?.city ?? (deal.city === 'burlington-vt' ? 'Portland, ME' : 'home');
  const hrs = prev?.hours ?? (deal.city === 'burlington-vt' ? 3.8 : 2);
  const drive = `${Math.floor(hrs)} h${hrs % 1 >= 0.25 ? ` ${Math.round((hrs % 1) * 60)}` : ''}`;
  const leave = Math.max(6 * 60, Math.min(16 * 60 - Math.round(hrs * 60), 13 * 60));
  const base: Day = {
    room,
    city,
    date: t.date,
    split: t.split,
    price: 18,
    cap: t.capacity ?? 150,
    signers,
    party: PARTY,
    rows: [
      { id: 'leave', at: leave, title: `Leave ${from.split(',')[0]}`, sub: `${drive} to the room, with a stop`, who: 'road', state: 'pick' },
      { id: 'load', at: 16 * 60 + 30, title: 'Load in', sub: 'Alley door off Main St. Van can stay till 1', who: 'room', state: 'set', src: `${contact}, Oct 24` },
      { id: 'check', at: 17 * 60 + 30, end: 18 * 60 + 15, title: 'Soundcheck', sub: 'House engineer is Jo', who: 'room', state: 'set', src: `${contact}, Oct 24` },
      { id: 'dinner', at: 18 * 60 + 15, end: 19 * 60 + 15, title: 'Dinner', sub: '', who: 'gus', state: 'pick' },
      { id: 'doors', at: 19 * 60 + 30, title: 'Doors', sub: signers ? `${signers} signers got first dibs` : 'Tickets on sale', who: 'room', state: 'set', src: `${contact}, Oct 24` },
      { id: 'opener', at: 20 * 60, title: 'Opener', sub: 'Asked who the room would pair you with', who: 'room', state: 'asked' },
      { id: 'set', at: 21 * 60, end: 22 * 60 + 15, title: 'You play', sub: '75 minutes, no encore cap', who: 'room', state: 'set', src: `${contact}, Oct 24` },
      { id: 'settle', at: 22 * 60 + 45, title: 'Settle up', sub: `Gus checks the door count against your ${t.split}%`, who: 'gus', state: 'pick' },
      ...(hangSpot ? [{ id: 'hang', at: 23 * 60, title: `Meet the signers at ${hangSpot.name}`, sub: 'Where your crowd here already hangs out', who: 'fans' as const, state: 'pick' as const }] : []),
    ],
    meals,
    dinner: 'verita',
    advance: [
      { q: 'Load-in time and door', a: '4:30, alley off Main' },
      { q: 'Soundcheck', a: '5:30' },
      { q: 'Doors and set times', a: 'Doors 7:30, you at 9' },
      { q: 'Curfew', a: '11:30' },
      { q: 'House engineer', a: 'Jo' },
      { q: 'Merch cut', a: 'None, you keep it all' },
      { q: 'Parking for the van overnight', a: null, k: 'parking' },
      { q: 'Guest list (4 names)', a: null, k: 'the guest list' },
      { q: 'Hospitality: veggie and gluten-free', a: null, k: 'food for the band' },
    ],
    thread: [
      { from: 'Gus', when: 'Oct 23', text: `Hi ${contact}, advancing Maya Ortiz for Dec 10. Could you confirm load-in, soundcheck, set times, curfew, parking for a van overnight, and whether there’s a guest list?` },
      { from: contact, when: 'Oct 24', text: 'Load in 4:30 through the alley off Main, check 5:30, doors 7:30, Maya on at 9, hard out 11:30. Jo is on sound. No merch cut. Checking on parking.' },
    ],
    costs: [
      { label: 'Gas', n: 96 },
      { label: 'Room for the night', n: 139 },
      { label: 'Dinner for three', n: 64 },
    ],
    hang: hangSpot ? { name: hangSpot.name, sub: hangSpot.description?.split(/[,.]/)[0] ?? '' } : null,
    openers: (crowd?.openers ?? []).slice(0, 2).map((o) => ({ name: o.name, why: o.shared.length ? `Shares ${o.shared.slice(0, 2).map((s) => s.name.toLowerCase()).join(' and ')} with you` : 'Same crowd as you' })),
    road: { from, drive, leave, sleep: { name: 'Hotel Vermont', sub: '6 min from the room · $139' }, couches: 2 },
    pending: {
      letter: { from: contact, when: 'Just now', text: 'Hey! Small change, our house band needs to check at 5:30. Can you do 6:00 instead? Everything else stays.' },
      soundcheck: 18 * 60,
      reply: `Works for us, ${contact}. Soundcheck at 6, everything else as planned. Thanks!`,
    },
  };
  return { ...base, ...plan(base, 17 * 60 + 30) };
}
