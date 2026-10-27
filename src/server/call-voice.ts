import type { ArtistRow } from './artists';
import { currentCall } from './calls';
import { stableHash } from './crypto';
import { HttpError } from './http';
import { speak } from './voice';
/** Validate before AND after a potentially long synthesis. Changing/canceling an
 * offer during transport cannot result in successful stale decision speech. */
export async function canonicalCallSpeech(artist: ArtistRow, callId: string, options: { signal?: AbortSignal; synthesize?: typeof speak } = {}) {
  const live = async () => {
    const current = await currentCall(artist, callId);
    if (current.scope.decision || !['ringing', 'answered'].includes(current.row.status) || Date.now() >= current.scope.expiresAt) throw new HttpError(409, 'This call is no longer current. Use its review card.');
    return current;
  };
  const before = await live(); const scriptHash = stableHash({ script: before.row.script });
  const out = await (options.synthesize ?? speak)(before.row.script, 'idle', { maxChars: 1500, requireExactText: true, signal: options.signal });
  if (options.signal?.aborted) throw new HttpError(409, 'Call speech was canceled.');
  const after = await live();
  if (stableHash({ script: after.row.script }) !== scriptHash || after.scope.review.hash !== before.scope.review.hash) throw new HttpError(409, 'The call changed while speech was prepared. Review the current exact offer.');
  return { ...out, review: after.scope.review };
}
