/** Deterministic spoken facts, not a model's claim that it booked anything. */
import { currentBriefRequest } from './operator-brief';
import { currentEvidence, qualify, type Desk } from './operations';
export function spokenBriefText(desk: Desk, now = Date.now()): string {
  const show = desk.opportunity;
  if (show.mode !== 'operator') throw new Error('Only operator preparation briefs may use this voice envelope.');
  const date = new Date(`${show.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
  const request = currentBriefRequest(desk,now);
  const missing = show.roster.filter(c=>qualify(c,show,now).status!=='eligible').length;
  const cultureCurrent = currentEvidence(show.sceneEvidence,now,show.mode) && !!desk.pressure && desk.pressure.version===show.version && desk.pressure.observedAt<=now && now-desk.pressure.observedAt<86400000 && !desk.pressure.views.act.error && !desk.pressure.views.scene.error;
  const result = request ? `The supplied-roster comparison proposes ${request.payload.payee}, with a ${request.payload.amount.toFixed(2)} US dollar support fee.` : !cultureCurrent ? 'The cultural comparison is not current. Review or refresh it before choosing.' : 'There is no current eligible proposal. Review the unresolved choice.';
  return `This is preparation only, not a booking. ${date}, ${show.city}. ${result} ${missing ? `${missing} roster option${missing===1?' has':'s have'} missing facts or fails a constraint. `:''}Operational facts are your assertions, not independently verified. Qloo compares taste, not ticket demand. Nothing has been sent, approved or paid. Review the written preparation before any outside action.`;
}
