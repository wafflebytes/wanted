import assert from 'node:assert/strict';
import test from 'node:test';
import { billSummary, eventSummary, requestFocus, requestSummary, sensitivitySummary } from '../src/lib/desk-copy';
import { opportunity } from './fixtures';
import type { BookingAction, Desk, SensitivityReport } from '../src/lib/operations';
const show = () => opportunity();
const action = (state: BookingAction['state'], version = 1, updatedAt = 1): BookingAction => ({ id: `${state}-${version}`, artistId: 'a', opportunityId: 's', version, candidateId: 'c', businessKey: 'k', mode: 'fixture', state, payload: { date: '2026-11-20', payee: 'Support act', amount: 140, currency: 'usd', kind: 'support-request' }, approval: null, receipt: null, reason: null, createdAt: 1, updatedAt });
const desk = (actions: BookingAction[] = []): Desk => ({ opportunity: show(), pressure: null, actions, events: [], metrics: { fixtureEffects: 0, awaitingApproval: 0, invalidatedActions: 0 } });
test('artist view names the job, not a pressure-test mechanism', () => { assert.equal(billSummary(desk()).title, 'Who’s on the bill?'); });
test('artist view gives cancellation precedence over missing taste', () => { const d = desk(); d.opportunity.status = 'canceled'; assert.equal(billSummary(d).title, 'This show is off.'); });
test('prepared and approved never read as sent', () => {
  assert.match(requestSummary(action('prepared'), 1).body, /Nothing has been sent/);
  assert.match(requestSummary(action('approved'), 1).title, /expired/);
  const a = action('approved'); a.approval = { token: 't', payloadHash: 'h', expiresAt: 100, approvedAt: 1 };
  assert.match(requestSummary(a, 1, 2).title, /Not sent yet/);
  assert.match(requestSummary(a, 1, 101).title, /expired/);
});
test('inbox receipt never reads as artist agreement or a confirmed show', () => { assert.match(requestSummary(action('provider_accepted'), 1).body, /Nobody has agreed/); });
test('lost receipt is the next step even on an old show version', () => {
  const d = desk([action('approved', 2, 10), action('uncertain', 1, 1)]); d.opportunity.version = 2;
  assert.equal(requestFocus(d)?.state, 'uncertain'); assert.match(requestSummary(d.actions[1], 2).body, /not send a second/);
});
test('operator can focus the exact request they chose, without hiding a missing receipt', () => {
  const a = action('prepared', 1, 5), b = { ...action('prepared', 1, 10), id: 'another' }; const d = desk([a, b]);
  assert.equal(requestFocus(d, a.id)?.id, a.id); d.actions.push(action('uncertain', 1, 1)); assert.equal(requestFocus(d, a.id)?.state, 'uncertain');
});
test('historical acceptance needs follow-up, not a claim that it was unsent', () => {
  const a = action('provider_accepted'); a.receipt = { provider: 'fixture-inbox', ref: 'r', acceptedAt: 1, acknowledgment: null };
  assert.match(requestSummary(a, 2).title, /before the show changed/); assert.match(requestSummary(a, 2).body, /no longer current/);
});
test('reference sensitivity is uncertainty, not fabricated confidence', () => {
  const r = { status: 'sensitive' } as SensitivityReport; assert.match(sensitivitySummary(r).body, /not a sure bet/);
  r.status = 'inconclusive'; assert.match(sensitivitySummary(r).body, /can’t say/);
});
test('unknown event kinds remain generic, not fabricated outcomes', () => { assert.equal(eventSummary({ id: 'e', opportunityId: 's', version: 1, kind: 'something-new', detail: 'internal', createdAt: 1 }).title, 'Show record updated'); });
test('changed show keeps the exact reviewed request in focus, not an older receipt', () => {
  const current = { ...action('invalidated', 1, 100), id: 'just-reviewed', createdAt: 50 };
  const historical = { ...action('provider_accepted', 1, 100), id: 'old-receipt', createdAt: 1 };
  const d = desk([historical, current]); d.opportunity.version = 2;
  assert.equal(requestFocus(d, current.id)?.id, current.id);
  assert.equal(requestFocus(d)?.id, current.id);
});
