/** Explicit scoped playback only. Does not start work, approve, send, book or pay. */
import { z } from 'zod';
import {body,getCookie,handler,HttpError,json,limit} from '@/server/http';
import {requireArtist} from '@/server/service';
import {briefId} from '@/server/operations/operator-brief';
import {spokenBriefPreview,speakReviewedBrief} from '@/server/operations/brief-voice';
import {VoiceError} from '@/server/voice';
async function own(req:Request,id:string){
 const artist=await requireArtist(id);const token=getCookie(req,`wanted_brief_${artist.id}`);
 if(!token||!/^[a-zA-Z0-9_-]{12,40}$/.test(token))throw new HttpError(403,'Save your own preparation brief before requesting its voice.');
 return {artist,showId:briefId(artist.id,token)};
}
export const GET=handler(async(req:Request,{id}:Record<string,string>)=>{
 const {artist,showId}=await own(req,id);return json(await spokenBriefPreview(artist,showId),{headers:{'Cache-Control':'private, no-store'}});
});
const schema=z.object({version:z.number().int().positive(),hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const POST=handler(async(req:Request,{id}:Record<string,string>)=>{
 await limit(req,'voice',30);const parsed=schema.safeParse(await body(req));if(!parsed.success)throw new HttpError(400,'Supply only the exact preview version and hash.');
 const {artist,showId}=await own(req,id);
 try{
  const out=await speakReviewedBrief(artist,showId,parsed.data,{signal:req.signal});
  return new Response(new Uint8Array(out.audio),{headers:{'Content-Type':out.mime,'Cache-Control':'private, no-store','X-Voice-Model':out.model,'X-Voice-Cached':String(out.cached),'X-Preparation-Only':'true','X-Voice-Review-Version':String(out.review.version)}});
 }catch(e){if(e instanceof VoiceError)throw new HttpError(503,e.message);throw e;}
});
