import assert from 'node:assert/strict';
import { test } from 'node:test';
import { showEconomics, type ShowEconomicsInput } from '../src/lib/show-economics';
const input = (patch: Partial<ShowEconomicsInput> = {}): ShowEconomicsInput => ({ deal: 'guarantee', guaranteeCents: 50000, artistShareBps: 7000, netTicketCents: 1000, paidCapacity: 150, scenarioTickets: 100, agreedDeductionsCents: 10000, otherOrganizerCostsCents: 10000, artistCostsCents: 20000, depositPaidCents: 20000, ...patch });
test('guarantee: organizer and artist costs stay separate; deposit is not double charged', () => {
  const r = showEconomics(input()); assert.equal(r.valid, true);
  assert.equal(r.scenario!.artistPayCents, 50000); assert.equal(r.scenario!.artistContributionCents, 30000); assert.equal(r.scenario!.organizerContributionCents, 30000); assert.equal(r.scenario!.balanceCents, 30000); assert.equal(r.organizerBreakEvenTickets, 70); assert.equal(r.artistBreakEvenTickets, 0);
});
test('versus means greater of guarantee and net split, never their sum', () => {
  const r = showEconomics(input({ deal: 'versus' })); assert.equal(r.scenario!.artistPayCents, 63000); assert.equal(r.scenario!.organizerContributionCents, 17000);
});
test('door split below deductions yields no backend; impossible break-even is unknown, not beyond capacity', () => {
  const r = showEconomics(input({ deal: 'door-split', scenarioTickets: 5, artistCostsCents: 200000 })); assert.equal(r.scenario!.artistPayCents, 0); assert.equal(r.artistBreakEvenTickets, null);
});
test('zero/100% shares, overpaid deposits and capacity-edge tickets remain explicit', () => {
  const zero = showEconomics(input({ deal: 'door-split', artistShareBps: 0 })); assert.equal(zero.artistBreakEvenTickets, null); assert.ok(zero.warnings.some(w => w.includes('refund')));
  const all = showEconomics(input({ deal: 'door-split', artistShareBps: 10000 })); assert.equal(all.organizerBreakEvenTickets, null);
  assert.equal(showEconomics(input({ scenarioTickets: 150 })).valid, true);
});
test('bad cents, percentages, prices and attendance fail closed', () => {
  for (const patch of [{ netTicketCents: 0 }, { guaranteeCents: -1 }, { depositPaidCents: 1.2 }, { artistShareBps: 10001 }, { scenarioTickets: 151 }, { paidCapacity: NaN }]) {
    const r = showEconomics(input(patch)); assert.equal(r.valid, false); assert.equal(r.scenario, null);
  }
});
test('break-even solver matches brute-force across supported deals and capacities', () => {
  for (const deal of ['guarantee', 'door-split', 'versus'] as const) for (const share of [0, 3300, 7000, 10000]) for (const cost of [0, 19999, 60000]) {
    const data = input({ deal, artistShareBps: share, artistCostsCents: cost }); const r = showEconomics(data);
    for (const [field, expected] of [['organizerContributionCents', r.organizerBreakEvenTickets], ['artistContributionCents', r.artistBreakEvenTickets]] as const) {
      let first: number | null = null;
      for (let tickets = 0; tickets <= data.paidCapacity; tickets++) { const v = showEconomics({ ...data, scenarioTickets: tickets }).scenario![field]; if (v >= 0) { first = tickets; break; } }
      assert.equal(expected, first, `${deal} ${share} ${cost} ${field}`);
    }
  }
});
test('large cent/share multiplication uses integer arithmetic without floating-point rounding', () => {
  const data = input({ deal: 'door-split', netTicketCents: 999999999, paidCapacity: 999999, scenarioTickets: 999999, agreedDeductionsCents: 7, artistShareBps: 9999 });
  const r = showEconomics(data); const expected = Number((BigInt(data.netTicketCents) * BigInt(data.scenarioTickets) - 7n) * 9999n / 10000n);
  assert.equal(r.scenario!.artistPayCents, expected);
});
