/** Operator assertions are inputs, not verified counterparty identity or sending authority. */
import { z } from 'zod';
import type { AgentTask } from './agent-task';
import type { BookingAction, Desk, Evidence, Opportunity } from './operations';
import { currentEvidence, qualify, validDate } from './operations';
import type { SoundEntity } from './types';

const safeText = (max: number) => z.string().trim().min(1).max(max).refine(s => !/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){9,}/i.test(s), 'Keep private email addresses and phone numbers out of this brief.');
const entity = z.object({ id: z.string().min(1).max(100), name: safeText(120) }).strict();
export const briefSchema = z.object({
  city: safeText(80), date: z.string().refine(validDate, 'Use a real date in YYYY-MM-DD format.'),
  format: z.enum(['music', 'comedy']), roomCapacity: z.number().int().min(1).max(100000), maxFee: z.number().finite().min(0).max(1000000).multipleOf(0.01),
  act: z.array(entity).min(1).max(5), scene: z.array(entity).min(1).max(5), sceneSource: safeText(200),
  roster: z.array(z.object({
    key: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/), name: safeText(120), entity: entity.nullable(),
    format: z.enum(['music', 'comedy']), inCircuit: z.boolean().nullable(), liveSuitable: z.boolean().nullable(),
    scale: z.number().int().min(1).max(100000).nullable(), fee: z.number().finite().min(0).max(1000000).multipleOf(0.01).nullable(),
    availability: z.enum(['available', 'unavailable', 'unknown']), routeHeld: z.boolean(), source: safeText(200),
  }).strict()).min(1).max(8),
  consent: z.literal(true),
}).strict().superRefine((b, ctx) => {
  if (!circuitKey(b.city)) ctx.addIssue({ code: 'custom', path: ['city'], message: 'Name a city or circuit, not punctuation only.' });
  if (b.format !== 'music' || b.roster.some(c => c.format !== 'music')) ctx.addIssue({ code: 'custom', path: ['format'], message: 'The supplied-roster path currently supports music acts only.' });
  if (new Set(b.roster.map(c => c.key)).size !== b.roster.length) ctx.addIssue({ code: 'custom', path: ['roster'], message: 'Candidate keys must be unique.' });
  const ids = b.roster.flatMap(c => c.entity ? [c.entity.id] : []);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['roster'], message: 'The same Qloo act cannot appear twice in the roster.' });
  for (const key of ['act', 'scene'] as const) if (new Set(b[key].map(e => e.id)).size !== b[key].length) ctx.addIssue({ code: 'custom', path: [key], message: 'Use each reference only once.' });
});
export type OperatorBrief = z.infer<typeof briefSchema>;
export type BriefResponse = { desk: Desk | null; task: AgentTask | null; brief: OperatorBrief | null; saved?: 'created' | 'changed' | 'unchanged' };
export const circuitKey = (city: string) => city.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
export function briefOpportunity(artistId: string, showId: string, version: number, brief: OperatorBrief, now: number): Opportunity {
  const city = circuitKey(brief.city);
  const ev = <T>(value: T, source: string): Evidence<T> => ({ value, source: 'operator', label: `Operator assertion: ${source}. Not independently verified.`, observedAt: now, expiresAt: now + 7 * 86400000 });
  return {
    id: showId, artistId, mode: 'operator', version, city, date: brief.date, format: brief.format,
    roomCapacity: brief.roomCapacity, maxFee: brief.maxFee, status: 'planning', act: brief.act, scene: brief.scene,
    sceneEvidence: ev(brief.sceneSource, brief.sceneSource), updatedAt: now,
    roster: brief.roster.map(c => ({
      id: `brief-${c.key}`, name: c.entity?.name ?? c.name,
      mapping: { status: c.entity ? 'verified' : 'unresolved', entityId: c.entity?.id ?? null }, format: c.format,
      locality: c.inCircuit === null ? null : ev(c.inCircuit ? city : 'outside-this-circuit', c.source),
      live: c.liveSuitable === null ? null : ev(c.liveSuitable, c.source),
      capacity: c.scale === null ? null : ev(c.scale, c.source), fee: c.fee === null ? null : ev(c.fee, c.source),
      availability: c.availability === 'unknown' ? null : ev({ date: brief.date, status: c.availability }, c.source),
      intake: c.routeHeld ? ev('Operator holds the route privately; no contact shared or send permission granted', c.source) : null,
      genres: [],
    })),
  };
}
export function currentBriefRequest(desk: Desk, now = Date.now()): BookingAction | null {
  const p = desk.pressure, show = desk.opportunity;
  if (show.mode !== 'operator' || show.status !== 'planning' || !currentEvidence(show.sceneEvidence, now, show.mode) || !p || p.version !== show.version || p.observedAt > now || now - p.observedAt >= 86400000 || p.views.act.error || p.views.scene.error || !p.selectedId) return null;
  return desk.actions.find(a => a.mode === 'operator' && a.version === desk.opportunity.version && a.state === 'prepared' && a.candidateId === p.selectedId &&
    a.payload.date === desk.opportunity.date && desk.opportunity.roster.some(c => c.id === a.candidateId && c.name === a.payload.payee && c.fee?.value === a.payload.amount && qualify(c, desk.opportunity, now).status === 'eligible')) ?? null;
}
export function briefExport(desk: Desk, now = Date.now()): string {
  const show = desk.opportunity;
  const request = currentBriefRequest(desk, now);
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '');
  const lines = ['# Wanted: reviewed show preparation', '', '**Preparation only. Not sent, booked, approved or paid.**',
    'Operating facts are operator assertions, not independently verified. Qloo taste is not ticket demand, availability or authority.', '',
    `Show revision: ${show.version}`, `Circuit: ${clean(show.city)}`, `Date: ${show.date}`, `Room ceiling: ${show.roomCapacity}`, `Support budget: $${show.maxFee.toFixed(2)} USD`,
    `Sound references: ${show.act.map(e => clean(e.name)).join(', ')}`, `Scene references: ${show.scene.map(e => clean(e.name)).join(', ')}`, `Scene basis: ${clean(show.sceneEvidence.value)}`, '',
    '## Roster checks', ...show.roster.map(c => { const q = qualify(c, show, now); return `- ${clean(c.name)}: ${q.status}${q.reasons.length ? ` (${q.reasons.join('; ')})` : ''}`; }), '',
    '## Next request',
    ...(request ? [`Candidate: ${clean(request.payload.payee)}`, `Performance date: ${request.payload.date}`, `Support fee: $${request.payload.amount.toFixed(2)} USD`,
      'Proposed message:', `Would you be interested in joining the bill on ${request.payload.date} for a $${request.payload.amount.toFixed(2)} USD support fee? Please confirm availability and terms. This is a request, not a confirmed booking.`]
      : ['No current eligible request. Resolve the missing facts or cultural tie before making a proposal.']), '',
    '## Cultural decision', desk.pressure ? clean(desk.pressure.explanation) : 'Not yet compared.',
    desk.pressure ? clean(desk.pressure.policy) : 'No cultural result claimed.', '',
    'Before delivery: verify the recipient and authority, written availability and fee, deal terms, rider, expiry and your own sending permission.',
  ];
  return lines.join('\n');
}
export function entityIds(brief: OperatorBrief): string[] {
  return [...new Set([...brief.act, ...brief.scene, ...brief.roster.flatMap(c => c.entity ? [c.entity] : [])].map(e => e.id))];
}
export function canonicalBrief(brief: OperatorBrief, entities: SoundEntity[]): OperatorBrief {
  const byId = new Map(entities.map(e => [e.id, e]));
  const map = (e: SoundEntity) => { const found = byId.get(e.id); if (!found) throw new Error('Selected Qloo entity is missing. Resolve it again; no invented match.'); return { id: found.id, name: found.name }; };
  return { ...brief, act: brief.act.map(map), scene: brief.scene.map(map), roster: brief.roster.map(c => ({ ...c, entity: c.entity ? map(c.entity) : null })) };
}

/** A changed performance date never inherits the old date's availability answers. */
export function briefWithDate(brief: OperatorBrief, date: string): OperatorBrief {
  return date === brief.date ? brief : { ...brief, date, roster: brief.roster.map(c => ({ ...c, availability: 'unknown' })) };
}
