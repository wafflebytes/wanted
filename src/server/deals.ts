/**
 * Gus books a date, agent to agent. Gus (working for the artist) writes to the room's booking
 * agent, they trade a few letters over the door split and the deposit, and Gus brings the
 * result to the artist. Nothing is paid until the artist says yes in Fan Mail.
 *
 * Rooms don't run booking agents yet, so Wanted runs a stand-in for each one. It follows
 * ordinary small-venue terms (a share of the door plus a deposit to hold the night), priced
 * from what Qloo says about the room, and it bends when the city has proved demand. The app
 * says it's a stand-in wherever the deal shows.
 *
 * Paying: the artist's yes mints a one-time pass for exactly that amount, that room, for 48
 * hours (the shape of Stripe's scoped agent tokens), and Gus pays with it. With a Stripe test
 * key the payment is a real Stripe test-mode PaymentIntent; without one it goes on Wanted's
 * own sandbox ledger. A live key is never read (env.stripeTestKey), so no real money moves.
 */
import type { DayKey, Deal, DealLetter, DealLimits, DealPayment, DealTerms, RoomBand } from '../lib/types';
import { addDays, dayOf } from '../lib/tour';
import type { ArtistRow } from './artists';
import { drawBounty } from './bounty';
import { isOpenOn } from './city';
import { id } from './crypto';
import { log } from './logbook';
import { all, kvGet, kvSet, one, run, transaction } from './db';
import { env, redact } from './env';
import { HttpError } from './http';
import { recordOutbound } from './outbound';
import { dealReview, assertDealReview, type DealReview } from './deal-scope';
import { metroById } from './score';
import { cityData, loadPlan } from './service';
import { makeShowPlan } from './showplan';
import { postInbox } from './inbox';

import { limitsFor } from './deal-limits';
import { plainWords } from '../lib/plain';
export { DEFAULT_LIMITS, limitsFor, setLimits } from './deal-limits';
const HOLD_MS = 48 * 60 * 60 * 1000;

/** Rough room economics by size: how many fit, and what a night there usually costs to hold. */
const ROOM: Record<RoomBand, { capacity: number; fee: number }> = {
  small: { capacity: 150, fee: 400 },
  mid: { capacity: 450, fee: 1200 },
  big: { capacity: 1500, fee: 4000 },
};

const DAY_NAME: Record<DayKey, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
const nice = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const tens = (n: number) => Math.max(0, Math.round(n / 10) * 10);
const today = () => new Date().toISOString().slice(0, 10);

export async function dealsFor(artistId: string): Promise<Deal[]> {
  const rows = await all<{ body: string }>('select body from deals where artist_id = ? order by created_at desc limit 20', [artistId]);
  return rows.map((r) => pub(JSON.parse(r.body) as Stored));
}

async function save(artistId: string, d: Deal) {
  await run('insert into deals(id, artist_id, city, body, created_at, updated_at) values(?, ?, ?, ?, ?, ?) on conflict(id) do update set body = excluded.body, updated_at = excluded.updated_at', [
    d.id,
    artistId,
    d.city,
    JSON.stringify(d),
    d.createdAt,
    d.updatedAt,
  ]);
}

/**
 * The room's side. Opens around 65% of the door and a quarter of the night's fee to hold it;
 * with proved demand it'll go as far as 80% and a tenth. Weekends cost more. Each room bargains
 * from its own position: a room in the act's hottest neighborhood, or one Qloo rates highly, is
 * busier and gives less ground. Deterministic, so the same room always negotiates the same way.
 */
function housePolicy(band: RoomBand, day: DayKey, signatures: number, room: { id: string; neighborhoodRank: number | null; affinity: number | null }) {
  const r = ROOM[band];
  const fee = r.fee * (day === 'friday' || day === 'saturday' ? 1.3 : 1);
  // A quarter of the room signing up front is as strong as proof gets.
  const demand = Math.min(1, signatures / (r.capacity * 0.25));
  // How in-demand the room itself is (0 quiet, 1 busy): its neighborhood rank and Qloo affinity,
  // plus a small fixed per-room lean so two similar rooms don't answer identically.
  const hood = room.neighborhoodRank ? Math.max(0, 1 - (room.neighborhoodRank - 1) / 8) : 0.4;
  const lean = (parseInt(room.id.replace(/[^0-9a-f]/gi, '').slice(0, 6) || '0', 16) % 100) / 100;
  const busy = Math.min(1, 0.45 * hood + 0.35 * (room.affinity ?? 0.5) + 0.2 * lean);
  const openSplit = Math.round(68 - 6 * busy);
  return {
    capacity: r.capacity,
    open: { split: openSplit, deposit: tens(fee * (0.2 + 0.1 * busy)) },
    floor: { split: Math.round(openSplit + (17 - 7 * busy) * demand), deposit: tens(fee * (0.2 + 0.1 * busy) * (1 - 0.55 * demand)) },
  };
}

/** The first night on or after `from` that the room is open (or might be: unknown hours count). */
function openNight(room: Parameters<typeof isOpenOn>[0], from: string): string {
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    if (isOpenOn(room, dayOf(d)) !== false) return d;
  }
  return from;
}

/** A Friday three or more weeks out: enough time to sell tickets. */
export function defaultDate(): string {
  let d = addDays(today(), 21);
  while (dayOf(d) !== 'friday') d = addDays(d, 1);
  return d;
}

/** What the two agents remember between turns. Server-side state, stored with the deal. */
type Talk = {
  turn: number;
  gus: { split: number; deposit: number };
  offer: { split: number; deposit: number };
  open: { split: number; deposit: number };
  floor: { split: number; deposit: number };
  capacity: number;
  limits: DealLimits;
  signatures: number;
  first: string;
  asked: string;
  date: string;
  /** Asked as one of several rooms at once: the result goes to Gus, not straight to the artist. */
  quiet?: boolean;
};
type Stored = Deal & { talk?: Talk };

const tool = (name: string, text: string): DealLetter => ({ from: 'gus', kind: 'tool', tool: name, text: plainWords(text), terms: null });
const letter = (from: DealLetter['from'], text: string, terms: DealLetter['terms']): DealLetter => ({ from, kind: 'letter', text: plainWords(text), terms });
const pub = ({ talk, ...d }: Stored): Deal => ({ ...d, limits: d.limits ?? talk?.limits, review: dealReview(d) });

/** Gus looks things up, then sends his opening letter. The room answers on the next turn. */
export async function startDeal(artist: ArtistRow, metroId: string, roomId: string | null, opts: { quiet?: boolean } = {}): Promise<Deal> {
  const metro = metroById(metroId);
  if (!metro) throw new HttpError(404, 'Unknown city.');
  const open = (await dealsFor(artist.id)).find((d) => d.city === metroId && (d.status === 'talking' || d.status === 'waiting') && (!roomId || d.roomId === roomId));
  if (open) return open;

  const city = await cityData(artist, metroId, true);
  const room = roomId ? city.rooms.find((r) => r.id === roomId) : city.rooms[0];
  if (!room) throw new HttpError(404, "Gus couldn't find a room here to ask.");
  const signatures = city.proof ? (artist.isDemo ? city.proof.signatures : city.proof.realSignatures) : 0;
  const hoods = (city.proof?.neighborhoods ?? []).slice(0, 2).map((n) => n.name);
  const limits = await limitsFor(artist.id);

  // The night: the tour plan's date for this city if there is one, else a Friday a few weeks out.
  const plan = await loadPlan(artist.id);
  const asked = plan?.stops.find((s) => s.metroId === metroId)?.date ?? defaultDate();
  const date = openNight(room, asked);
  const band = room.sizeGuess ?? artist.roomBand ?? 'small';
  const house = housePolicy(band, dayOf(date), signatures, room);
  const first = artist.name.split(' ')[0];
  // Gus opens high but inside the artist's limits.
  const gus = { split: Math.max(limits.minSplit, 85), deposit: Math.min(limits.maxDeposit, tens(house.floor.deposit * 0.5)) };
  const crowd = signatures ? `${signatures} people in ${metro.name} signed to see ${first}${hoods.length ? `, most from ${hoods.join(' and ')}` : ''}.` : `${first} has a crowd building in ${metro.name}.`;

  const thread: DealLetter[] = [
    tool('read_signatures', signatures ? `${signatures} signed in ${metro.name}${hoods.length ? `, most from ${hoods.join(' and ')}` : ''}` : `No signatures in ${metro.name} yet`),
    tool('pick_room', `${room.name}${room.neighborhood ? `, ${room.neighborhood}` : ''}. Fits about ${house.capacity}, a guess until they confirm`),
    tool('check_calendar', date === asked ? `${nice(date)} looks open. They’ll confirm` : `Closed ${DAY_NAME[dayOf(asked)]}s. ${nice(date)} instead`),
    letter('gus', `Hi, Gus here. I book for ${artist.name}. ${crowd} Could you hold ${nice(asked)}? We'd ask ${gus.split}% of the door and a $${gus.deposit} deposit.`, gus),
  ];
  const now = Date.now();
  const deal: Stored = {
    id: id('d_'),
    city: metroId,
    cityName: metro.name,
    roomId: room.id,
    roomName: room.name,
    neighborhood: room.neighborhood,
    status: 'talking',
    mode: 'simulation',
    version: 1,
    terms: { date, day: dayOf(date), split: gus.split, deposit: gus.deposit, capacity: house.capacity },
    thread,
    withinLimits: true,
    payment: null,
    createdAt: now,
    updatedAt: now,
    talk: { turn: 0, gus, offer: house.open, open: house.open, floor: house.floor, capacity: house.capacity, limits, signatures, first, asked, date, quiet: opts.quiet },
  };
  await save(artist.id, deal);
  return pub(deal);
}

/**
 * One turn of the conversation: whoever didn't write last writes now. The room opens at its
 * usual terms and gives ground toward its floor; Gus checks every offer against the artist's
 * limits and meets halfway. Three letters each at most, then the room's last word stands.
 * `seen` is how many steps the caller has, so two open screens never take the same turn twice.
 */
export async function advanceDeal(artist: ArtistRow, dealId: string, seen: number): Promise<Deal> {
  const row = await one<{ body: string }>('select body from deals where artist_id = ? and id = ?', [artist.id, dealId]);
  if (!row) throw new HttpError(404, 'No such deal.');
  const deal = JSON.parse(row.body) as Stored;
  const t = deal.talk;
  if (deal.status !== 'talking' || !t || seen !== deal.thread.length) return pub(deal);
  const last = [...deal.thread].reverse().find((l) => l.kind === 'letter' && l.from !== 'you');

  if (last?.from === 'gus') {
    if (t.turn === 0) {
      t.offer = { ...t.open };
      const day = dayOf(t.date);
      const moved = t.date !== t.asked;
      deal.thread.push(letter('house', `${moved ? `We're closed ${DAY_NAME[dayOf(t.asked)]}s, but ${nice(t.date)} is open. ` : `Thanks, Gus. ${day === 'friday' || day === 'saturday' ? `${DAY_NAME[day]}s go fast here. ` : ''}`}We usually do ${t.offer.split}% of the door and $${t.offer.deposit} to hold the night.`, t.offer));
      t.turn = 1;
    } else {
      t.offer = { split: Math.min(t.floor.split, Math.round((t.offer.split + t.gus.split) / 2)), deposit: Math.max(t.floor.deposit, tens((t.offer.deposit + t.gus.deposit) / 2)) };
      const met = t.offer.split >= t.gus.split && t.offer.deposit <= t.gus.deposit;
      if (met || t.turn >= 2) return finish(artist, deal, t);
      deal.thread.push(letter('house', `We can come up to ${t.offer.split}%, and $${t.offer.deposit} to hold it.`, t.offer));
      t.turn += 1;
    }
  } else {
    const fits = t.offer.split >= t.limits.minSplit && t.offer.deposit <= t.limits.maxDeposit;
    deal.thread.push(tool('check_limits', fits ? `${t.offer.split}% and $${t.offer.deposit} works for you. Pushing for better` : `${t.offer.deposit > t.limits.maxDeposit ? `$${t.offer.deposit} is more than your $${t.limits.maxDeposit}` : `${t.offer.split}% is less than your ${t.limits.minSplit}%`}. Countering`));
    t.gus = {
      split: Math.max(t.limits.minSplit, Math.round((t.gus.split + t.offer.split) / 2 + 1)),
      deposit: Math.min(t.limits.maxDeposit, tens((t.gus.deposit + t.offer.deposit) / 2 - 10)),
    };
    deal.thread.push(letter('gus', t.turn === 1 ? `${t.signatures >= 50 ? `${t.first} has signatures expressing interest, not ticket commitments.` : 'Fair.'} Could we meet at ${t.gus.split}% and $${t.gus.deposit}?` : `Last try: ${t.gus.split}% and $${t.gus.deposit}, and we handle the promo.`, t.gus));
  }
  deal.terms = { ...deal.terms!, split: t.offer.split, deposit: t.offer.deposit };
  deal.updatedAt = Date.now();
  await save(artist.id, deal);
  return pub(deal);
}

/**
 * The artist steers mid-conversation ("hold out for 75%", "go up to $200"). It moves this
 * deal's limits only, not the saved ones, and lands in the thread as the artist's own note so
 * the next letter visibly follows it. Gus's standing ask moves inside the new line.
 */
export async function steerDeal(artist: ArtistRow, dealId: string, patch: Partial<DealLimits>): Promise<Deal> {
  const row = await one<{ body: string }>('select body from deals where artist_id = ? and id = ?', [artist.id, dealId]);
  if (!row) throw new HttpError(404, 'No such deal.');
  const deal = JSON.parse(row.body) as Stored;
  const t = deal.talk;
  if (deal.status !== 'talking' || !t) return pub(deal);
  const said: string[] = [];
  if (typeof patch.minSplit === 'number') {
    t.limits.minSplit = Math.max(40, Math.min(95, Math.round(patch.minSplit)));
    t.gus.split = Math.max(t.gus.split, t.limits.minSplit);
    said.push(`Don’t go under ${t.limits.minSplit}% of the door`);
  }
  if (typeof patch.maxDeposit === 'number') {
    t.limits.maxDeposit = Math.max(0, Math.min(2000, tens(patch.maxDeposit)));
    t.gus.deposit = Math.min(t.gus.deposit, t.limits.maxDeposit);
    said.push(`I’ll put down up to $${t.limits.maxDeposit}`);
  }
  if (!said.length) return pub(deal);
  deal.thread.push({ from: 'you', kind: 'letter', text: `${said.join('. ')}.`, terms: null });
  deal.updatedAt = Date.now();
  await save(artist.id, deal);
  return pub(deal);
}

async function finish(artist: ArtistRow, deal: Stored, t: Talk): Promise<Deal> {
  const terms: DealTerms = { dealType: 'door-split', moneyDirection: 'artist-to-venue', basis: 'simulation', date: t.date, day: dayOf(t.date), split: t.offer.split, deposit: t.offer.deposit, capacity: t.capacity };
  const withinLimits = terms.split >= t.limits.minSplit && terms.deposit <= t.limits.maxDeposit;
  deal.thread.push(letter('house', `${withinLimits ? 'Deal' : 'Best we can do'}: ${terms.split}% of the door and $${terms.deposit} to hold ${nice(t.date)}. The hold lasts 48 hours.`, { split: terms.split, deposit: terms.deposit }));
  deal.thread.push(tool('check_limits', withinLimits ? 'Fits what you said you’d take. Checking with you' : 'More than you said you’d go for. Checking with you'));
  Object.assign(deal, { terms, withinLimits, limits: t.limits, status: 'waiting', offerExpiresAt: Date.now() + HOLD_MS, version: (deal.version ?? 1) + 1, updatedAt: Date.now() });
  const quiet = t.quiet;
  delete deal.talk;
  await save(artist.id, deal);
  // One of several rooms Gus asked at once: he compares them and asks the artist once.
  if (quiet) return pub(deal);
  await postInbox(artist.id, {
    kind: 'deal',
    body: withinLimits
      ? `${deal.roomName} can book you for ${nice(t.date)}. You keep ${terms.split}% of ticket sales, and a $${terms.deposit} deposit locks it in. Want me to pay the deposit?`
      : `${deal.roomName} can book you for ${nice(t.date)}, but they want ${terms.deposit > t.limits.maxDeposit ? `$${terms.deposit} up front, over your $${t.limits.maxDeposit} limit` : `${100 - terms.split}% of ticket sales`}. Your call.`,
    action: { label: 'See the deal', kind: 'deal', city: deal.city, dealId: deal.id },
    evidence: { city: deal.city, dealId: deal.id },
    createdAt: Date.now(),
  });
  return pub(deal);
}

async function pay(artist: ArtistRow, deal: Deal, amount: number): Promise<DealPayment> {
  if (!Number.isSafeInteger(amount * 100) || amount < 0) throw new HttpError(400, 'Deposit must be exact nonnegative USD cents.');
  const pass = { amount, payee: deal.roomName, expiresAt: holdExpiresAt(deal) };
  // The pass is checked before anything moves: the exact amount, the room it was made for, in time.
  if (amount !== deal.terms?.deposit || pass.payee !== deal.roomName || Date.now() > pass.expiresAt) throw new HttpError(400, "That payment doesn't match the deal.");
  const key = env.stripeTestKey;
  if (!key || amount === 0) return { rail: 'sandbox', ref: `sbx_${deal.id.slice(2)}`, amount, at: Date.now(), pass };
  const form = new URLSearchParams({
    amount: String(Math.round(amount * 100)),
    currency: 'usd',
    payment_method: 'pm_card_visa',
    confirm: 'true',
    'automatic_payment_methods[enabled]': 'true',
    'automatic_payment_methods[allow_redirects]': 'never',
    description: `Hold deposit: ${deal.roomName}, ${deal.terms?.date}`,
    'metadata[deal]': deal.id,
    'metadata[artist]': artist.slug,
  });
  recordOutbound({ kind: 'web', url: 'https://api.stripe.com/v1/payment_intents', body: form.toString() });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `wanted-deposit:${deal.id}:${dealReview(deal).hash}` },
    body: form,
    signal: controller.signal,
  });
  const out = (await res.json()) as { id?: string; status?: string; livemode?: boolean; amount?: number; currency?: string; error?: { message?: string } };
  if (!res.ok || !out.id) throw new HttpError(502, `Stripe test payment failed: ${redact(out.error?.message ?? String(res.status))}`);
  if (out.status !== 'succeeded') throw new HttpError(502, 'Stripe test payment is not confirmed as succeeded.');
  if (out.livemode !== false || out.amount !== amount * 100 || out.currency !== 'usd') throw new HttpError(500, 'Test receipt does not establish the exact amount/currency and non-live mode. Review the provider record.');
  return { rail: 'stripe-test', ref: out.id, amount, at: Date.now(), pass };
  } finally { clearTimeout(timer); }
}

/** Exact review, one persisted decision, one provider idempotency key. A lost response
 * may be retried only for this same scope/choice while the original offer is current.
 * Stripe idempotency is a test charge, not transfer/recipient identity or real commerce. */
type DecisionOptions = { now?: number; pay?: typeof pay; followup?: boolean; loseAcknowledgment?: boolean };
export async function decideDeal(artist: ArtistRow, dealId: string, yes: boolean, review?: DealReview, options: DecisionOptions = {}): Promise<Deal> {
  const now = options.now ?? Date.now(), token = id('decision_');
  const claimed = await transaction(async tx => {
    const row = await tx.execute({ sql: 'select body from deals where artist_id = ? and id = ?', args: [artist.id, dealId] });
    if (!row.rows[0]) throw new HttpError(404, 'No such deal.');
    const deal = JSON.parse(String(row.rows[0].body)) as Deal; assertDealReview(deal, review);
    const prior = await tx.execute({ sql: 'select * from deal_decisions where artist_id = ? and deal_id = ?', args: [artist.id, dealId] });
    const existing = prior.rows[0];
    if (existing && (existing.scope_hash !== review!.hash || existing.outcome !== (yes ? 'yes' : 'no'))) throw new HttpError(409, 'The original decision has a different scope or choice. Review follow-up; no replacement payment.');
    if (existing?.state === 'completed') return { deal, completed: true, decisionId: String(existing.id) };
    if (deal.status !== 'waiting' || !deal.terms) throw new HttpError(409, 'The offer is not awaiting this exact decision.');
    if (now >= holdExpiresAt(deal)) throw new HttpError(410, 'That hold ran out. An uncertain earlier payment needs reconciliation, not a new charge.');
    if (existing && now - Number(JSON.parse(String(existing.body)).firstAttemptAt ?? now) >= 23 * 3_600_000) throw new HttpError(409, 'Provider idempotency retention may have elapsed. Reconcile the original provider record; no blind repost.');
    if (existing?.state === 'executing' && Number(existing.lease_until) > now) throw new HttpError(409, 'This exact decision is already executing. Refresh its record, do not make another choice.');
    const decisionId = existing ? String(existing.id) : `deposit:${artist.id}:${dealId}:${review!.hash}`;
    await tx.execute({ sql: "insert into deal_decisions(id,artist_id,deal_id,scope_hash,outcome,state,run_token,lease_until,body,updated_at) values(?,?,?,?,?,'executing',?,?,?,?) on conflict(id) do update set state='executing',run_token=excluded.run_token,lease_until=excluded.lease_until,updated_at=excluded.updated_at", args: [decisionId, artist.id, dealId, review!.hash, yes ? 'yes' : 'no', token, now + 60_000, JSON.stringify({ review, exactTerms: deal.terms, firstAttemptAt: now }), now] });
    return { deal, completed: false, decisionId };
  });
  if (claimed.completed) return pub(claimed.deal);
  const deal = claimed.deal;
  let paid: DealPayment | null;
  try { paid = yes ? await (options.pay ?? pay)(artist, deal, deal.terms!.deposit) : null; }
  catch (e) {
    await run("update deal_decisions set state='uncertain',run_token=null,lease_until=null,updated_at=? where id=? and run_token=?", [Date.now(), claimed.decisionId, token]);
    throw e;
  }
  const result = await transaction(async tx => {
    // Save the original receipt before inspecting a changed current offer. History cannot be unsent.
    if (paid) await tx.execute({ sql: 'insert into deal_payment_receipts(id,artist_id,deal_id,scope_hash,body,created_at) values(?,?,?,?,?,?) on conflict(id) do nothing', args: [claimed.decisionId, artist.id, dealId, review!.hash, JSON.stringify(paid), Date.now()] });
    const finished = await tx.execute({ sql: "update deal_decisions set state='completed',run_token=null,lease_until=null,body=?,updated_at=? where id=? and run_token=?", args: [JSON.stringify({ review, exactTerms: deal.terms, receipt: paid }), Date.now(), claimed.decisionId, token] });
    if (!finished.rowsAffected) return null; // Lost ownership: keep receipt, but never stamp current deal state.
    const row = await tx.execute({ sql: 'select body from deals where artist_id=? and id=?', args: [artist.id, dealId] });
    const current = row.rows[0] ? JSON.parse(String(row.rows[0].body)) as Deal : null;
    if (!current || dealReview(current).hash !== review!.hash) return null;
    const next: Deal = paid ? { ...current, status: 'held', payment: paid, thread: [...current.thread, tool('pay', 'Exact test deposit recorded. No real venue agreement or settlement.')] } : { ...current, status: 'passed', thread: [...current.thread, letter('gus', 'We will pass on this simulated offer.', null)] };
    next.updatedAt = Date.now();
    await tx.execute({ sql: 'update deals set body=?,updated_at=? where artist_id=? and id=?', args: [JSON.stringify(next), next.updatedAt, artist.id, dealId] });
    await tx.execute({ sql: "update gus_inbox set read=1 where artist_id=? and kind='deal' and evidence like ?", args: [artist.id, `%${dealId}%`] });
    await tx.execute({ sql: "insert into gus_log(id,artist_id,kind,city,title,detail,source,level,ref,created_at) values(?,?,'payment',?,?,?,'artist',3,?,?) on conflict(id) do nothing", args: [`decision-log:${claimed.decisionId}`, artist.id, deal.city, paid ? `Paid the $${paid.amount} test deposit to ${deal.roomName}` : `Passed on ${deal.roomName}`, 'Test mode, so no real money moved.', JSON.stringify({ dealId }), next.updatedAt] });
    if (paid) await tx.execute({ sql: "insert into deal_followups(id,artist_id,deal_id,scope_hash,state,updated_at) values(?,?,?,?,'queued',?) on conflict(id) do nothing", args: [`followup:${claimed.decisionId}`, artist.id, dealId, review!.hash, next.updatedAt] });
    return next;
  });
  if (!result) throw new HttpError(409, 'Original test payment receipt retained, but the offer changed during execution. Review follow-up; no current booking is inferred.');
  if (options.loseAcknowledgment) throw new HttpError(503, 'Test acknowledgment lost. Refresh the original scoped decision; do not replace it.');
  if (paid && options.followup !== false) await runDepositFollowup(artist, `followup:${claimed.decisionId}`);
  return pub(result);
}

/** The payment receipt and its continuation are committed together. A failed promo/
 * Bounty follow-up cannot lose a receipt, repeat a charge or keep an HTTP request alive. */
export async function runDepositFollowup(artist: ArtistRow, jobId: string, execute?: (deal: Deal) => Promise<void>) {
  const now = Date.now(), token = id('followup_');
  const claimed = await run("update deal_followups set state='running',attempts=attempts+1,run_token=?,lease_until=?,updated_at=? where id=? and artist_id=? and attempts<3 and (state in ('queued','failed') or (state='running' and lease_until<=?))", [token, now + 180_000, now, jobId, artist.id, now]);
  if (!claimed.rowsAffected) return false;
  try {
    const j = (await one<{ deal_id: string; scope_hash: string }>('select deal_id,scope_hash from deal_followups where id=? and artist_id=?', [jobId, artist.id]))!;
    const r = await one<{ body: string }>('select body from deals where id=? and artist_id=?', [j.deal_id, artist.id]);
    const d = r ? JSON.parse(r.body) as Deal : null;
    if (!d || d.status !== 'held' || !d.payment || dealReview(d).hash !== j.scope_hash) throw new Error('Held offer changed. Follow-up needs operator review; no stale promotion.');
    if (execute) await execute(d);
    else { await drawBounty(artist, d.city, 'gus'); await makeShowPlan(artist, d); }
    await run("update deal_followups set state='completed',run_token=null,lease_until=null,error=null,updated_at=? where id=? and run_token=?", [Date.now(), jobId, token]);
    return true;
  } catch(e) {
    await run("update deal_followups set state='failed',run_token=null,lease_until=null,error=?,updated_at=? where id=? and run_token=?", [redact(String(e)).slice(0,240), Date.now(), jobId, token]); return false;
  }
}
export async function drainDepositFollowups(limit = 3) {
  const rows = await all<{ id: string; artist_id: string }>("select id,artist_id from deal_followups where attempts<3 and (state in ('queued','failed') or (state='running' and lease_until<=?)) order by updated_at limit ?", [Date.now(), Math.max(1,Math.min(10,limit))]);
  let completed = 0;
  for (const row of rows) { const { getArtist } = await import('./artists'); const artist = await getArtist(row.artist_id); if (artist && await runDepositFollowup(artist,row.id)) completed++; }
  return { attempted: rows.length, completed };
}

/** When a hold's deposit offer runs out. */
export const holdExpiresAt = (d: Pick<Deal, 'createdAt' | 'offerExpiresAt'>) => d.offerExpiresAt ?? d.createdAt + HOLD_MS;

/** Plays the agents' turns on the server until they land (no screen needed). */
export async function runToEnd(artist: ArtistRow, dealId: string): Promise<Deal> {
  let deal = (await dealsFor(artist.id)).find((d) => d.id === dealId);
  for (let i = 0; deal && deal.status === 'talking' && i < 12; i++) deal = await advanceDeal(artist, dealId, deal.thread.length);
  if (!deal) throw new HttpError(404, 'No such deal.');
  return deal;
}

/** A room Gus asked but didn't pick: a polite no, and never another room's terms. */
export async function passDeal(artist: ArtistRow, dealId: string): Promise<void> {
  const row = await one<{ body: string }>('select body from deals where artist_id = ? and id = ?', [artist.id, dealId]);
  if (!row) return;
  const deal = JSON.parse(row.body) as Stored;
  if (deal.status !== 'waiting' && deal.status !== 'talking') return;
  delete deal.talk;
  deal.status = 'passed';
  deal.thread.push(letter('gus', 'Thanks for the quick answer. We went with another room this time, and we’d love to come back.', null));
  deal.updatedAt = Date.now();
  await save(artist.id, deal);
}

/** Demo only: moves a waiting hold's clock so it runs out in `hoursLeft` (the video's "expires tonight" beat). */
export async function ageHold(artist: ArtistRow, hoursLeft: number): Promise<Deal | null> {
  if (!artist.isDemo) throw new HttpError(403, 'Only for demo artists.');
  const deal = (await dealsFor(artist.id)).find((d) => d.status === 'waiting');
  if (!deal) return null;
  const row = await one<{ body: string }>('select body from deals where artist_id = ? and id = ?', [artist.id, deal.id]);
  const stored = JSON.parse(row!.body) as Stored;
  stored.offerExpiresAt = Date.now() + hoursLeft * 3_600_000;
  stored.createdAt = stored.offerExpiresAt - HOLD_MS;
  await save(artist.id, stored);
  return pub(stored);
}
