import assert from 'node:assert/strict';
import test from 'node:test';
import { GET, schedulerAuthorized } from '../src/app/api/cron/gus+api';
test('scheduler refuses missing, weak, malformed and wrong authority', async () => {
  const secret = 'test-only-scheduler-credential-32-chars';
  assert.equal(schedulerAuthorized(new Request('http://local')), false);
  assert.equal(schedulerAuthorized(new Request('http://local', { headers: { authorization: 'Bearer short' } }), 'short'), false);
  assert.equal(schedulerAuthorized(new Request('http://local', { headers: { authorization: `Basic ${secret}` } }), secret), false);
  assert.equal(schedulerAuthorized(new Request('http://local', { headers: { authorization: 'Bearer wrong' } }), secret), false);
  assert.equal(schedulerAuthorized(new Request('http://local', { headers: { authorization: `Bearer ${secret}` } }), secret), true);
  assert.equal((await GET(new Request('http://local'))).status, 401);
});
