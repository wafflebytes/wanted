/** Hypothetical USD show arithmetic, not a contract interpreter or demand forecast.
 * All money is integer cents; deposits are credited against pay, never an extra cost.
 * Net ticket receipts already exclude taxes/ticketing fees. Costs must not overlap. */
export type ShowEconomicsInput = {
  deal: 'guarantee' | 'door-split' | 'versus';
  guaranteeCents: number;
  artistShareBps: number; // 0..10000 of receipts AFTER the listed agreed deductions
  netTicketCents: number;
  paidCapacity: number;
  scenarioTickets: number;
  agreedDeductionsCents: number;
  otherOrganizerCostsCents: number;
  artistCostsCents: number;
  depositPaidCents: number; // prior organizer->artist payment, credited against total artist pay
};
export type EconomicsResult = {
  valid: boolean; errors: string[];
  scenario: { receiptsCents: number; backendPoolCents: number; artistPayCents: number; artistContributionCents: number; organizerContributionCents: number; balanceCents: number } | null;
  organizerBreakEvenTickets: number | null;
  artistBreakEvenTickets: number | null;
  warnings: string[];
};
const moneyFields = ['guaranteeCents', 'netTicketCents', 'agreedDeductionsCents', 'otherOrganizerCostsCents', 'artistCostsCents', 'depositPaidCents'] as const;
export function showEconomics(input: ShowEconomicsInput): EconomicsResult {
  const errors: string[] = [];
  for (const key of moneyFields) if (!Number.isSafeInteger(input[key]) || input[key] < 0 || input[key] > 1_000_000_000) errors.push(`${key} must be nonnegative integer cents within the scenario limit.`);
  if (!['guarantee', 'door-split', 'versus'].includes(input.deal)) errors.push('Unsupported deal type. Review the actual contract separately.');
  if (!Number.isInteger(input.artistShareBps) || input.artistShareBps < 0 || input.artistShareBps > 10000) errors.push('Artist share must be between 0 and 100%.');
  if (!Number.isInteger(input.paidCapacity) || input.paidCapacity < 1 || input.paidCapacity > 1_000_000) errors.push('Paid capacity must be an integer from 1 to 1,000,000.');
  if (!Number.isInteger(input.scenarioTickets) || input.scenarioTickets < 0 || input.scenarioTickets > input.paidCapacity) errors.push('Scenario paid tickets must be within paid capacity.');
  if (input.netTicketCents <= 0) errors.push('Net ticket receipt must be positive.');
  if (errors.length) return { valid: false, errors, scenario: null, organizerBreakEvenTickets: null, artistBreakEvenTickets: null, warnings: [] };
  const at = (tickets: number) => {
    const receiptsCents = tickets * input.netTicketCents;
    const backendPoolCents = Math.max(0, receiptsCents - input.agreedDeductionsCents);
    const split = Number(BigInt(backendPoolCents) * BigInt(input.artistShareBps) / 10000n);
    const artistPayCents = input.deal === 'guarantee' ? input.guaranteeCents : input.deal === 'door-split' ? split : Math.max(input.guaranteeCents, split);
    return { receiptsCents, backendPoolCents, artistPayCents, artistContributionCents: artistPayCents - input.artistCostsCents, organizerContributionCents: receiptsCents - input.agreedDeductionsCents - input.otherOrganizerCostsCents - artistPayCents, balanceCents: artistPayCents - input.depositPaidCents };
  };
  // Both contribution curves are nondecreasing for the supported 0..100% split.
  const threshold = (field: 'artistContributionCents' | 'organizerContributionCents') => {
    if (at(0)[field] >= 0) return 0;
    if (at(input.paidCapacity)[field] < 0) return null;
    let lo = 0, hi = input.paidCapacity;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (at(mid)[field] >= 0) hi = mid; else lo = mid + 1; }
    return lo;
  };
  const scenario = at(input.scenarioTickets);
  const warnings = ['Hypothetical receipts, not predicted ticket demand.', 'Listed deductions and other costs must not overlap. The actual written deal controls what may be deducted.', 'Deposit is a credited prepayment. Cancellation, refund, tax, rider and settlement obligations are not modeled.'];
  if (scenario.balanceCents < 0) warnings.push('Deposit exceeds scenario artist pay. A refund or credit needs contract review; no automatic refund is authorized.');
  return { valid: true, errors, scenario, organizerBreakEvenTickets: threshold('organizerContributionCents'), artistBreakEvenTickets: threshold('artistContributionCents'), warnings };
}
/** Blank/ambiguous money is missing, not zero. No floating-point dollars enter the engine. */
export function parseUsdInput(text: string): number | null {
  const clean = text.trim().replace(/^\$/, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ''] = clean.split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) && value <= 1_000_000_000 ? value : null;
}
export function parsePercentInput(text: string): number | null {
  const clean = text.trim().replace(/%$/, '');
  const value = parseUsdInput(clean); // the same two-decimal fixed point, now basis points
  return value !== null && value <= 10000 ? value : null;
}
