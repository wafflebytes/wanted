/** Local-only extraction aid. A pasted message is not authenticated evidence or authority. */
import { validDate } from './operations';
export type ReplySuggestion = { date: string | null; maxFee: number | null; notes: string[] };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function suggestReplyChanges(text: string, currentDate: string): ReplySuggestion {
  const notes: string[] = [];
  if (text.length > 4000) return { date: null, maxFee: null, notes: ['This reply is too long. Use a short, redacted excerpt.'] };
  // Quoted chains and alternatives need an operator, not a hidden "last mention wins" rule.
  const dates: string[] = [];
  let invalid = false;
  for (const m of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) { if (validDate(m[1])) dates.push(m[1]); else invalid = true; }
  let assumedYear = false;
  for (const m of text.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi)) {
    const month = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)) + 1;
    const date = `${m[3] ?? currentDate.slice(0, 4)}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (validDate(date)) { dates.push(date); if (!m[3]) assumedYear = true; } else invalid = true;
  }
  const uniqueDates = [...new Set(dates)];
  const uncertainDate = /\b(?:not|don['’]t|cannot|can['’]t|no longer|unavailable|instead of|rather than)\b[^.!?\n]{0,60}(?:\d{4}-|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i.test(text);
  const hasRelativeDate = /\b(?:tomorrow|next (?:week|mon|tue|wed|thu|fri|sat|sun)|this (?:mon|tue|wed|thu|fri|sat|sun)|\d{1,2}\/\d{1,2})/i.test(text);
  let date = uniqueDates.length === 1 && !invalid && !uncertainDate && !hasRelativeDate ? uniqueDates[0] : null;
  if (uniqueDates.length > 1) notes.push('There is more than one date. Pick the intended new date yourself.');
  if (invalid) notes.push('A date is not a valid calendar day. Enter the correct date.');
  if (uncertainDate) notes.push('The date may be a date they cannot do. Check the wording and choose manually.');
  if (hasRelativeDate) notes.push('Relative or slash-form dates need checking. Enter the full year-month-day.');
  if (date && assumedYear) notes.push(`The reply omitted a year. I used ${currentDate.slice(0, 4)} from this show; check it.`);
  if (date === currentDate) { date = null; notes.push('The date mentioned is already the current show date.'); }

  // Only an explicitly named support budget is eligible. Guarantees, fees and deposits
  // have different pay directions, so a generic dollar amount must never update this field.
  const budgets: number[] = [];
  const budgetPattern = /\bsupport\s+budget\b(?:\s+(?:is|now|to|of|at|can\s+be))*\s*[:=]?\s*(?:\$|USD\s*)(\d[\d,.]*)(?![\w,.])/gi;
  for (const m of text.matchAll(budgetPattern)) {
    const raw = m[1].replace(/\.$/, '');
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) { notes.push('The support budget amount needs checking.'); continue; }
    const n = Number(raw.replaceAll(',', ''));
    if (Number.isFinite(n) && n >= 0 && n <= 10000) budgets.push(n);
  }
  const uniqueBudgets = [...new Set(budgets)];
  const riskyBudget = /\b(?:not|don['’]t|cannot|can['’]t|if|unless|maybe|could|would|up to|no more than)\b[^.!?\n]{0,60}\bsupport\s+budget\b/i.test(text)
    || /\bsupport\s+budget\b[^.!?\n]{0,60}\b(?:if|unless|maybe|instead of|rather than)\b/i.test(text)
    || /\bsupport\s+budget\b[^.!?\n]{0,25}(?:€|£|EUR|GBP|CAD|AUD)/i.test(text);
  const maxFee = uniqueBudgets.length === 1 && !riskyBudget ? uniqueBudgets[0] : null;
  if (uniqueBudgets.length > 1) notes.push('There is more than one support budget. Choose the current amount yourself.');
  if (riskyBudget) notes.push('The budget may be conditional, negated or in another currency. Confirm the USD support budget yourself.');
  if (maxFee === null && /(?:\$|USD|EUR|GBP|€|£)\s*\d/i.test(text)) notes.push('Other money amounts are not treated as your support budget. Check who pays whom.');
  if (/\bcancel(?:led|ed|lation)?\b/i.test(text)) notes.push('Cancellation needs a separate manual decision. This review never cancels a show automatically.');
  if (!date && maxFee === null && !notes.length) notes.push('I couldn’t safely spot a new date or support budget. You can enter those changes yourself.');
  return { date, maxFee, notes: [...new Set(notes)] };
}
export function reviewReplyPatch(current: { date: string; maxFee: number }, input: { useDate: boolean; date: string; useBudget: boolean; budget: string }) {
  const patch: { date?: string; maxFee?: number } = {};
  const errors: string[] = [];
  if (input.useDate) {
    if (!validDate(input.date)) errors.push('Use a real date in YYYY-MM-DD format.');
    else if (input.date !== current.date) patch.date = input.date;
  }
  if (input.useBudget) {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(input.budget)) errors.push('Enter a USD support budget with no commas or currency symbol.');
    else { const value = Number(input.budget); if (value > 10000) errors.push('The practice support budget must be between $0 and $10,000.'); else if (value !== current.maxFee) patch.maxFee = value; }
  }
  if (!errors.length && !Object.keys(patch).length) errors.push('Choose at least one change that differs from the current show.');
  return { patch, errors };
}
