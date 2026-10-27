/** Artist-facing language derived from business records, not another model or invented facts. */
import type { BookingAction, Desk, OperationEvent, PressureTest, SensitivityReport } from './operations';

export const showDate = (date: string, full = false) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short', ...(full ? { year: 'numeric' as const } : {}), timeZone: 'UTC' });
export const money = (amount: number) => `$${amount.toLocaleString('en-US')} USD`;
export function requestFocus(desk: Desk, preferredId?: string | null): BookingAction | null {
  const sorted = [...desk.actions].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
  // A lost receipt still needs recovering after a date change or cancellation. It must not resend.
  return sorted.find((a) => a.state === 'uncertain')
    ?? sorted.find((a) => a.id === preferredId)
    ?? sorted.find((a) => a.version === desk.opportunity.version && ['prepared', 'approved'].includes(a.state))
    ?? sorted.find((a) => a.version === desk.opportunity.version)
    ?? sorted[0] ?? null;
}
export function billSummary(desk: Desk) {
  const { opportunity: show, pressure: p } = desk;
  const selected = p?.rows.find((r) => r.id === p.selectedId);
  if (show.status === 'canceled') return { title: 'This show is off.', body: 'Old approvals have stopped. Keep any earlier messages on record; they cannot be unsent.' };
  if (show.roster.some((c) => c.availability?.value.date !== show.date)) return { title: 'The date moved.', body: `Before choosing support for ${showDate(show.date)}, we need to check who can make it.` };
  if (!p) return { title: 'Who’s on the bill?', body: 'Find someone who fits your sound and the scene you’re playing.' };
  if (selected) {
    const closest = [...p.rows].filter((r) => r.actRank !== null).sort((a, b) => a.actRank! - b.actRank!)[0];
    return { title: `I’d ask ${selected.name}.`, body: closest && closest.id !== selected.id
      ? `${closest.name} is closer to your sound. ${selected.name} ranks better for this scene, so I’d start there.`
      : `${selected.name} is a closest match to your sound and clears the scene-fit check too.` };
  }
  if (p.rows.every((r) => r.reasons.includes('Outside support budget'))) return { title: 'Nothing fits this budget.', body: `The support fees are above your ${money(show.maxFee)} limit. Change the bill or budget, not the facts.` };
  if (!p.rows.some((r) => r.status === 'eligible')) return { title: 'A few things need checking.', body: 'Dates, fees or other show details are missing or don’t fit. A good musical match can’t fix those.' };
  if (p.views.act.error || p.views.scene.error) return { title: 'I couldn’t compare everyone.', body: 'Some taste information is missing. I won’t call that a bad match or make up a winner.' };
  return { title: 'No clear pick yet.', body: p.policyName === 'strict' ? 'Nobody makes the top half for both your sound and this scene. Try another scene, or allow more of a trade-off.' : 'No one clearly clears both sides. Review the options or change the scene.' };
}
export function requestSummary(action: BookingAction, currentVersion: number, now = Date.now()) {
  const historical = action.version !== currentVersion;
  if (action.state === 'uncertain') return { title: 'Did that go through?', body: 'The send result didn’t come back. I’ll check the saved receipt first, not send a second message.' };
  if (historical) return { title: action.receipt ? 'Sent before the show changed' : 'The show changed. Start fresh.', body: action.receipt ? 'Keep this old receipt. These terms are no longer current, and the other party has not agreed to the new show.' : 'Your earlier OK no longer applies. Review the new show before writing another request.' };
  switch (action.state) {
    case 'prepared': return { title: 'Ready for your OK', body: 'Check the artist, date and support fee below. Nothing has been sent.' };
    case 'approved': return action.approval && action.approval.expiresAt > now
      ? { title: 'You said OK. Not sent yet.', body: 'Only this artist, date and fee are approved. This does not authorize a payment.' }
      : { title: 'Your OK has expired.', body: 'Review these terms again before sending. Nothing new has been sent.' };
    case 'provider_accepted': return { title: 'Saved in the test inbox', body: 'The inbox has one message. Nobody has agreed to play, and this is not a confirmed show.' };
    case 'acknowledged': return { title: 'They acknowledged the request', body: 'Acknowledging a message is not accepting every term or confirming the show.' };
    case 'completed': return { title: 'Request completed', body: 'Check the receipt for what was actually completed. No extra agreement is implied.' };
    case 'invalidated': return { title: 'These terms are out of date.', body: 'Your old approval stopped. Review the current bill before starting again.' };
    case 'executing': return { title: 'Checking the send…', body: 'Wait for the result before trying again.' };
    default: return { title: 'The request didn’t finish.', body: 'Review what happened before trying again. No success is being claimed.' };
  }
}
export function sensitivitySummary(report: SensitivityReport) {
  return report.status === 'stable' ? { title: 'The pick holds up.', body: 'I tried each of your sound references on its own and kept the same choice. That still doesn’t tell us how many tickets will sell.' }
    : report.status === 'sensitive' ? { title: 'Your references change the pick.', body: 'Trying your sound references separately changes the result. Treat this as a starting point, not a sure bet.' }
    : { title: 'I couldn’t double-check the pick.', body: 'One comparison is missing. I can’t say the choice holds up yet.' };
}
export function eventSummary(event: OperationEvent) {
  const copy: Record<string, { title: string; body: string }> = {
    'agent-progress': { title: 'Gus updated the job', body: event.detail },
    prepared: { title: 'Prepared, not sent', body: 'Gus wrote up the next step. Nobody was contacted.' },
    approved: { title: 'You approved the terms', body: 'Your OK applies to this request only, not a payment.' },
    provider_accepted: { title: 'Test inbox received it', body: 'One saved message. No artist agreement or confirmed booking.' },
    uncertain: { title: 'Send result was missing', body: 'Gus paused to check the receipt instead of sending twice.' },
    reconciled: { title: 'Found the original receipt', body: 'The original message was recovered. Nothing was sent again.' },
    'reply-no-change': { title: 'The reply kept the same terms', body: 'No date or budget changed. Your existing approval stayed as it was.' },
    reply: { title: 'The booker changed the show', body: 'Old approvals stopped. Earlier receipts remain on record.' },
    'scene-change': { title: 'You changed the scene', body: 'Same show details and support list. The bill needs a fresh look.' },
    'fixture-reconfirmed': { title: 'Show dates checked again', body: 'The example list was updated for the new date. No real artist was contacted.' },
    'cultural-check': { title: 'Gus compared the bill', body: 'The same support list was checked against your sound and the scene.' },
  };
  return copy[event.kind] ?? { title: 'Show record updated', body: 'Open the details to see the stored update.' };
}
export function comparisonRule(p: PressureTest) {
  const n = p.rows.filter((r) => r.status === 'eligible').length;
  const cutoff = Math.max(1, p.policyName === 'strict' ? Math.ceil(n / 2) : n - 1);
  return `Each option must rank in the top ${cutoff} of ${n} for both your sound and the scene. Then I choose the best weaker-side rank. A tie is your call, not a hidden tiebreaker.`;
}
