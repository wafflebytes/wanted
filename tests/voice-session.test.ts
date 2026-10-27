import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VoiceSessionGate } from '../src/lib/voice-session';
test('cancel fences a request even if its late download ignores abort', async () => {
  const gate = new VoiceSessionGate(); const first = gate.begin(); let play = 0, end = 0;
  const late = Promise.resolve().then(() => { if (first.active()) { play++; end++; } });
  gate.cancel(); await late; assert.equal(first.signal.aborted, true); assert.equal(play, 0); assert.equal(end, 0);
});
test('a newer voice request wins; an older playback completion cannot unlock a decision', () => {
  const gate = new VoiceSessionGate(); const old = gate.begin(); const next = gate.begin();
  assert.equal(old.active(), false); assert.equal(old.signal.aborted, true); assert.equal(next.active(), true);
  let unlocked = false; if (old.active()) unlocked = true; assert.equal(unlocked, false);
});
test('rapid repeat/cancel sequence leaves exactly the latest generation capable of playback', () => {
  const gate = new VoiceSessionGate(); const pending = Array.from({ length: 20 }, () => gate.begin());
  assert.equal(pending.filter(p => p.active()).length, 1); gate.cancel(); assert.equal(pending.filter(p => p.active()).length, 0);
});
