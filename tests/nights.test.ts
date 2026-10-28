import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruledOut } from '../src/server/nights';

test('nights the artist ruled out are read from what Gus remembers', () => {
  assert.deepEqual([...ruledOut(["Won't play Mondays"])], ['monday']);
  assert.deepEqual([...ruledOut(['No Sundays or Tuesdays'])].sort(), ['sunday', 'tuesday']);
  assert.deepEqual([...ruledOut(['Never plays on a Wednesday'])], ['wednesday']);
});

test('a day mentioned without a no is not ruled out', () => {
  assert.equal(ruledOut(['Loves Friday shows', 'Tours in a Sprinter']).size, 0);
});
