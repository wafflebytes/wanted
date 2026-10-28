import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLastingStatement, saidIt } from '../src/server/gus/ask';

test('a remembered fact must come from what the artist just said', () => {
  assert.equal(saidIt('Won’t play Mondays', 'Should I play Burlington or Albany first?'), false);
  assert.equal(saidIt('Won’t play Mondays', 'I can never do Monday nights'), true);
  assert.equal(saidIt('Tours in a Sprinter van', 'remember we tour in a sprinter'), true);
  assert.equal(saidIt('Skip Boston', 'skip boston please'), true);
});

test('requests are not lasting statements, how they tour is', () => {
  assert.equal(isLastingStatement('Find me a city nobody plays yet and a room there that is open on Friday'), false);
  assert.equal(isLastingStatement('How is my Burlington poster doing, and who are the people signing it?'), false);
  assert.equal(isLastingStatement('Should I play Burlington or Albany first?'), false);
  assert.equal(isLastingStatement('We never play Mondays by the way'), true);
  assert.equal(isLastingStatement('Remember that we tour in a Sprinter and skip Boston'), true);
});

import { referent } from '../src/server/gus/ask';
test('"there" means the city the last answer named, only when this turn names none', () => {
  const metros = [
    { id: 'columbus-oh', name: 'Columbus', state: 'OH', rank: 1, sleeper: false, score: 1, heatRank: 1, liftRank: 1 },
    { id: 'portland-me', name: 'Portland', state: 'ME', rank: 2, sleeper: false, score: 1, heatRank: 2, liftRank: 2 },
  ];
  const history = [{ heard: 'Which poster is pulling hardest?', reply: 'Columbus is pulling hardest.' }];
  assert.equal(referent('Book me a room there', history, metros)?.id, 'columbus-oh');
  assert.equal(referent('Book me a room in Portland', history, metros), null);
  assert.equal(referent('Book me a room', history, metros), null);
});

import { limitAsk } from '../src/server/gus/ask';
test('"Actually make it 250" amends the limit Gus just set, in either wording', () => {
  for (const last of ['Fine. I’ll put down up to 300 dollars to book a night. Check the slider.', 'Fine. I’ll put down up to 300 dollars to hold a night.']) {
    const a = limitAsk('Actually make it 250', [{ heard: 'Never put down more than 300', reply: last }]);
    assert.deepEqual(a?.action && 'key' in a.action && [a.action.key, a.action.value], ['maxDeposit', 250]);
  }
  const cut = limitAsk('Actually make it 60', [{ heard: 'I need at least 70 percent', reply: 'Fine. I won’t take less than 70 percent of ticket sales. Slide it if that’s right.' }]);
  assert.equal(cut?.action && 'key' in cut.action && cut.action.key, 'minSplit');
});
