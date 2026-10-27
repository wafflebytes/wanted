import assert from 'node:assert/strict';
import test from 'node:test';
import { displayRuns, isKarl } from '../src/lib/display-glyphs';

test('Karl keeps supported letters, numbers and common marks in its own face', () => {
  assert.deepEqual(displayRuns('Wanted 123, A-Z.'), [{ text: 'Wanted 123, A-Z.', fallback: false }]);
});
test('all trial omissions, not just the question mark, use a rounded fallback run', () => {
  const text = 'Who’s on the bill? $175 → Montréal / Björk + 20%';
  const runs = displayRuns(text);
  assert.equal(runs.map(r => r.text).join(''), text);
  for (const char of ['’', '?', '$', '→', 'é', '/', 'ö', '+', '%']) {
    assert.ok(runs.some(r => r.fallback && r.text.includes(char)), char);
  }
});
test('fallback covers emoji and international scripts without splitting code points', () => {
  assert.deepEqual(displayRuns('A🎸東京B'), [{ text: 'A', fallback: false }, { text: '🎸東京', fallback: true }, { text: 'B', fallback: false }]);
});
test('system reading and poster faces are not rewritten', () => {
  assert.equal(isKarl('KarlSTTrial-Medium'), true);
  assert.equal(isKarl('Archivo-ExpandedBlack'), false);
  assert.equal(isKarl(undefined), false);
});
