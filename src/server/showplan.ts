/** Promotion planning only. Cultural research, prepared notes and sandbox budgets
 * are separate from live delivery, permission, recipient agreement and campaign outcomes.
 * No live media, artist or ad connectors are configured.
 * Fan data stays local; only the act's taste and Qloo locality names go to Qloo.
 */
import type { Deal, ShowPlan, ShowStep } from '../lib/types';
import type { ArtistRow } from './artists';
import { openedCities } from './artists';
import { cityCount, proofFor } from './claims';
import { crowdCard } from './crowd';
import { id } from './crypto';
import { kvGet, kvSet } from './db';
import { HttpError } from './http';
import { log } from './logbook';
import { hangSpots } from './qloo/api';
import { metroById } from './score';
import { postInbox } from './inbox';

const AD_BUDGET = 75;
const key = (artistId: string, dealId: string) => `show:${artistId}:${dealId}`;

const nice = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const listOf = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export async function showPlanFor(artistId: string, dealId: string): Promise<ShowPlan | null> {
  const plan = await kvGet<ShowPlan>(key(artistId, dealId));
  if (!plan) return null;
  // Upgrade legacy receipts: old 'done' records never established real delivery.
  plan.mode = 'simulation';
  plan.version ??= 1;
  for (const step of plan.steps) {
    if ((step.status as string) === 'done') {
      step.status = step.id === 'ads' ? 'simulated' : 'prepared';
      if (step.id === 'first-dibs') step.title = 'Prepared first-dibs announcement';
      if (step.id === 'podcast') step.title = 'Prepared podcast note';
      if (step.id === 'opener') step.title = 'Prepared support request';
      step.detail = step.id === 'posters' ? 'Cultural spot research only. Poster permission and distribution are not verified.' : step.id === 'ads' ? 'Sandbox budget entry only. No ads were bought or shown.' : 'Prepared in Wanted only. No real message was sent or recipient agreement received.';
    }
    step.delivery ??= { channel: step.id === 'ads' ? 'sandbox' : 'manual', state: step.id === 'ads' && step.status === 'simulated' ? 'simulated' : 'not_sent', detail: 'No live delivery connector configured.' };
  }
  return plan;
}

/** Builds the plan for a held deal, once. Safe to call again: returns the existing plan. */
export async function makeShowPlan(artist: ArtistRow, deal: Deal): Promise<ShowPlan> {
  const existing = await showPlanFor(artist.id, deal.id);
  if (existing) return existing;
  if (deal.status !== 'held' || !deal.terms) throw new HttpError(409, 'The date isn’t held yet.');
  const metro = metroById(deal.city);
  const cityName = metro?.name ?? deal.cityName;
  const first = artist.name.split(' ')[0];
  const scope = `artist:${artist.id}`;
  const soft = artist.sound.entities;

  const opened = (await openedCities(artist.id)).find((c) => c.city === deal.city);
  const hoods = (opened?.topNeighborhoods ?? []).slice(0, 2);
  const [signers, proof, crowd, ...spotLists] = await Promise.all([
    cityCount(artist.id, deal.city),
    proofFor(artist.id, { includeDemo: artist.isDemo }),
    crowdCard(artist.sound, { scope }).catch(() => null),
    ...hoods.map((h) => (metro ? hangSpots(soft, h, metro.query, scope).then((r) => r.data).catch(() => []) : Promise.resolve([]))),
  ]);
  // Signer counts by neighborhood, matched locally against Qloo's names.
  const signedIn = new Map((proof.find((p) => p.city === deal.city)?.neighborhoods ?? []).map((n) => [n.name.toLowerCase(), n.count]));

  const seen = new Set<string>();
  const spots = spotLists
    .flatMap((list, i) =>
      list
        .filter((s) => !s.isClosed && s.name !== deal.roomName)
        .slice(0, 3)
        .map((s) => ({ s, hood: s.neighborhood ?? hoods[i] })),
    )
    .filter(({ s }) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .slice(0, 5)
    .map(({ s, hood }) => ({ name: s.name, sub: hood }));
  const fromThere = hoods.reduce((n, h) => n + (signedIn.get(h.toLowerCase()) ?? 0), 0);

  const steps: ShowStep[] = [];
  steps.push({
    id: 'first-dibs',
    title: 'Prepared first-dibs announcement',
    detail: `${deal.roomName}, ${nice(deal.terms.date)}. A first-dibs note is ready for the ${signers} fans who signed. It goes out when tickets are on sale.`,
    why: 'They asked for this show. They should hear first.',
    status: 'prepared',
    items: [],
    draft: null,
    cost: null,
  });
  if (spots.length)
    steps.push({
      id: 'posters',
      title: `Picked ${spots.length} spots for posters`,
      detail: `Spots where your fans hang out in ${listOf(hoods)}. Ask before you put posters up.${fromThere ? ` ${fromThere} of your signers live there.` : ''}`,
      why: `Qloo suggests culturally compatible places in ${cityName}. This does not verify local footfall or poster permission.`,
      status: 'prepared',
      items: spots,
      draft: null,
      cost: null,
    });
  const pod = crowd?.love.podcasts[0];
  if (pod)
    steps.push({
      id: 'podcast',
      title: `Pitch ${pod.name}?`,
      detail: 'A Qloo cultural suggestion. The note is ready; local reach, contact and submission rules need checking. No send connector is connected.',
      why: `People who like you are into ${pod.name}, says Qloo.`,
      status: 'needs_ok',
      items: [],
      draft: `Hi ${pod.name} team. ${artist.name} plays ${deal.roomName} in ${cityName} on ${nice(deal.terms.date)}. ${signers ? `${signers} people there signed a poster asking for the show. ` : ''}Qloo suggests a cultural connection between this act and your podcast, so we’d love to give you a pair of tickets, or have ${first} on if you’re ever up for it. Thanks, Gus (${first}’s tour manager)`,
      cost: null,
    });
  const op = crowd?.openers[0];
  if (op)
    steps.push({
      id: 'opener',
      title: `Ask ${op.name} to open?`,
      detail: `Cultural compatibility only, not a ticket forecast. Locality, availability, fee and live suitability need verification.${op.shared.length ? ` Your fans and theirs both love ${listOf(op.shared.slice(0, 2).map((s) => s.name.toLowerCase()))}.` : ''}`,
      why: 'Qloo compared taste signals. It did not verify local audience size or live suitability.',
      status: 'needs_ok',
      items: [],
      draft: null,
      cost: null,
    });
  if (hoods.length)
    steps.push({
      id: 'ads',
      title: `Spend $${AD_BUDGET} on local ads?`,
      detail: `A sandbox budget for ${listOf(hoods)}. No ads will run. Cultural and demographic skews are not verified buyable targeting audiences.`,
      why: 'An idea to try. Gus hasn’t set it up or checked the rules yet.',
      status: 'needs_ok',
      items: [],
      draft: null,
      cost: AD_BUDGET,
    });

  const plan: ShowPlan = { mode: 'simulation', version: deal.version ?? 1, dealId: deal.id, city: deal.city, cityName, roomName: deal.roomName, date: deal.terms.date, signers, steps, createdAt: Date.now() };
  await kvSet(key(artist.id, deal.id), plan);

  await log(artist.id, { kind: 'letter', city: deal.city, title: steps[0].title, detail: steps[0].detail, source: 'fans', ref: { dealId: deal.id } });
  if (spots.length) await log(artist.id, { kind: 'decision', city: deal.city, title: `Picked ${spots.length} spots for posters in ${listOf(hoods)}`, detail: spots.map((s) => s.name).join(', '), source: 'qloo', ref: { dealId: deal.id } });
  const asks = steps.filter((s) => s.status === 'needs_ok').length;
  await postInbox(artist.id, {
    kind: 'info',
    body: `Test booking in ${cityName}. I made a plan to spread the word; nothing has gone out yet. ${signers ? `A first-dibs note for the ${signers} fans who signed is ready, ` : ''}${spots.length ? `${signers ? 'and ' : ''}picked ${spots.length} spots for posters. ` : ''}${asks ? `${asks === 1 ? 'One thing needs' : `${asks} things need`} your OK.` : ''}${artist.isDemo ? ' (Demo data.)' : ''}`,
    action: { label: 'See the plan', kind: 'show', city: deal.city, dealId: deal.id },
    evidence: { city: deal.city, dealId: deal.id, spots: spots.length, signers },
    createdAt: Date.now(),
  });
  return plan;
}

/** The artist's yes or no on one step. Money is test mode only: the sandbox ledger. */
export async function decideStep(artist: ArtistRow, dealId: string, stepId: ShowStep['id'], yes: boolean): Promise<ShowPlan> {
  const plan = await showPlanFor(artist.id, dealId);
  if (!plan) throw new HttpError(404, 'No plan for that show yet.');
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) throw new HttpError(404, 'No such step.');
  if (step.status !== 'needs_ok') return plan;
  step.status = yes ? step.id === 'ads' ? 'simulated' : 'approved' : 'skipped';
  step.delivery = { channel: step.id === 'ads' ? 'sandbox' : 'manual', state: step.id === 'ads' && yes ? 'simulated' : 'not_sent', detail: 'No live connector, publication or payment.' };
  if (yes) {
    if (step.id === 'podcast') {
      step.title = step.title.replace(/^Pitch (.*)\?$/, 'Approved note for $1');
      step.detail = 'You approved the prepared note. It has not been sent. Verify the contact, local reach and submission rules before manual delivery.';
    }
    if (step.id === 'opener') {
      step.title = step.title.replace(/^Ask (.*) to open\?$/, 'Approved request to $1');
      step.detail = 'You approved a prepared request. Nobody has been contacted. Verify locality, live suitability, date and fee first.';
    }
    if (step.id === 'ads') {
      step.title = `Simulated ${step.cost} ad budget`;
      step.detail = 'Sandbox ledger only. No ads were bought or shown, and no money moved.';
      step.ref = `sbx_${id('ad_').slice(3)}`;
    }
  }
  await kvSet(key(artist.id, dealId), plan);
  await log(artist.id, {
    kind: step.id === 'ads' && yes ? 'payment' : 'decision',
    city: plan.city,
    title: yes ? `${step.title} for ${plan.cityName}` : `You skipped: ${step.title.replace(/\?$/, '')}`,
    detail: step.id === 'ads' && yes ? 'Test mode, no real money moved.' : yes ? 'Prepared or approved only. No message was delivered and no recipient agreed.' : null,
    source: 'artist',
    level: 2,
    ref: { dealId },
  });
  return plan;
}
