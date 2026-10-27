import type { ArtistRow } from '../artists';
import { stableHash } from '../crypto';
import { HttpError } from '../http';
import { sanitizeLine, speak } from '../voice';
import { spokenBriefText } from '../../lib/spoken-brief';
import { getBrief } from './operator-brief';
export type SpokenBriefReview = { version: number; hash: string };
export async function spokenBriefPreview(artist: ArtistRow, showId: string, now = Date.now()) {
  const current = await getBrief(artist,showId);
  if (!current.desk || !current.brief?.consent) throw new HttpError(404,'Save your own consented preparation brief first.');
  if (current.desk.opportunity.status!=='planning') throw new HttpError(409,'This preparation brief is no longer active.');
  const text = spokenBriefText(current.desk,now);
  if (sanitizeLine(text)!==text || text.length>1500) throw new HttpError(409,'This brief is outside the exact spoken envelope. Use the written preparation; no facts are silently dropped.');
  const hash = stableHash({show:current.desk.opportunity,pressure:current.desk.pressure,actions:current.desk.actions, text});
  return { mode:'operator' as const,authority:'preparation-only' as const,version:current.desk.opportunity.version,hash,text,chars:text.length };
}
export async function speakReviewedBrief(artist: ArtistRow,showId: string,review: SpokenBriefReview,options: {signal?:AbortSignal;synthesize?:typeof speak}={}) {
  const before=await spokenBriefPreview(artist,showId);
  if (before.version!==review.version||before.hash!==review.hash) throw new HttpError(409,'The exact spoken preparation changed. Review its current preview before playback.');
  const out=await(options.synthesize??speak)(before.text,'idle',{maxChars:1500,requireExactText:true,signal:options.signal});
  if(options.signal?.aborted)throw new HttpError(409,'Preparation speech was canceled.');
  const after=await spokenBriefPreview(artist,showId);
  if(after.version!==review.version||after.hash!==review.hash)throw new HttpError(409,'Preparation changed during synthesis. No stale voice success.');
  return {...out,review:{version:after.version,hash:after.hash},authority:'preparation-only' as const};
}
