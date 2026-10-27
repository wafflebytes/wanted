/** Actual canonical HTTP speech, with isolated local demo records and no decision/effect. */
import './lib/env';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {getArtist} from '../src/server/artists';
import {run} from '../src/server/db';
import {callScript} from '../src/server/calls';
import {dealReview} from '../src/server/deal-scope';
import {redact} from '../src/server/env';
import type {Deal} from '../src/lib/types';
async function main(){
 const artist=await getArtist('maya-ortiz');assert.ok(artist?.isDemo,'Only a local fictional demo artist may be probed');
 const now=Date.now(),dealId=`voice-probe-deal:${now}`,callId=`voice-probe-call:${now}`;
 const deal:Deal={id:dealId,mode:'simulation',version:1,offerExpiresAt:now+2*3600000,city:'burlington-vt',cityName:'Burlington',roomId:'voice-probe-fixture',roomName:`Fixture Voice Room ${now%10000}`,neighborhood:null,status:'waiting',terms:{date:'2026-11-20',day:'friday',split:70,deposit:140,capacity:150},thread:[],withinLimits:true,payment:null,createdAt:now,updatedAt:now};
 const script=callScript(artist,deal,2);const review=dealReview(deal);const started=Date.now();
 try{
  await run('insert into deals(id,artist_id,city,body,created_at,updated_at) values(?,?,?,?,?,?)',[dealId,artist.id,deal.city,JSON.stringify(deal),now,now]);
  await run("insert into gus_calls(id,artist_id,deal_id,city,script,status,created_at,updated_at) values(?,?,?,?,?,'answered',?,?)",[callId,artist.id,dealId,deal.city,script,now,now]);
  await run('insert into gus_call_scopes(call_id,artist_id,body) values(?,?,?)',[callId,artist.id,JSON.stringify({review,expiresAt:deal.offerExpiresAt})]);
  const r=await fetch(`${process.env.WANTED_TEST_ORIGIN??'http://localhost:8082'}/api/voice`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({artist:artist.slug,call:callId,text:'CLIENT TEXT MUST NOT REPLACE THE EXACT SERVER CALL',mood:'losing-it'}),signal:AbortSignal.timeout(50000)});
  const bytes=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200,r.status===200?'':redact(bytes.toString()));assert.ok(r.headers.get('content-type')?.startsWith('audio/'));assert.ok(bytes.length>=1000);assert.equal(r.headers.get('x-voice-cached'),'false');assert.equal(r.headers.get('cache-control'),'private, no-store');
  mkdirSync('.data',{recursive:true});writeFileSync('.data/voice-call-latest.mp3',bytes);writeFileSync('.data/voice-call-latest.txt',script);
  const result={at:new Date().toISOString(),passed:true,scope:'Uncached canonical HTTP speech with isolated demo call; no real ring, payment, voice cloning or human intelligibility/prosody judgment',chars:script.length,bytes:bytes.length,model:r.headers.get('x-voice-model'),cached:false,elapsedMs:Date.now()-started};writeFileSync('.data/voice-call-latest.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await run('delete from gus_call_scopes where call_id=?',[callId]);await run('delete from gus_calls where id=?',[callId]);await run('delete from deals where id=?',[dealId]);}
}
main().then(()=>process.exit(0),e=>{console.error(redact(String(e)));process.exit(1);});
