import assert from 'node:assert/strict';import {test} from 'node:test';
import {artist} from './fixtures';import type {OperatorBrief} from '../src/lib/operator-brief';import {pressureResult} from '../src/lib/operations';
process.env.TURSO_DATABASE_URL=`file:${process.cwd()}/.data/test-brief-voice-${process.pid}.db`;process.env.TURSO_AUTH_TOKEN='';
import {kvSet,run} from '../src/server/db';
import {briefId,saveBrief,startBriefTask} from '../src/server/operations/operator-brief';
import {spokenBriefPreview,speakReviewedBrief} from '../src/server/operations/brief-voice';
import {deskFor} from '../src/server/operations/store';import {runAgentTask} from '../src/server/operations/task-runner';
const input=():OperatorBrief=>({city:'Burlington',date:'2026-11-20',format:'music',roomCapacity:150,maxFee:200,act:[{id:'sound',name:'Sound reference'}],scene:[{id:'scene',name:'Scene reference'}],sceneSource:'Operator context, not validated local history',consent:true,roster:['a','b'].map((key,i)=>({key,name:`Test act ${key}`,entity:{id:key,name:`Test act ${key}`},format:'music',inCircuit:true,liveSuitable:true,scale:100,fee:100+i*20,availability:'available',routeHeld:true,source:'Operator assertions; private route remains outside Wanted'}))});
let n=0;async function setup(b=input()){
 const now=Date.now(),showId=briefId(artist().id,`voice${++n}`);await saveBrief(artist(),showId,b,0,now);await startBriefTask(artist(),showId,1,now);
 await runAgentTask(artist(),showId,{now,rank:async()=>{const show=(await deskFor(artist().id,showId))!.opportunity;const view={scores:show.roster.map((c,i)=>({entityId:c.mapping.entityId!,affinity:1-i*.1,rank:i+1})),error:null,receipt:null};const p=pressureResult(show,{act:view,scene:view,joint:view},now);await kvSet(`pressure:${artist().id}:${showId}`,p);return p;}});return showId;
}
const clip={audio:Buffer.alloc(2000),mime:'audio/mpeg',model:'synthetic',cached:false};
test('reviewed speech describes the exact preparation but never asserts booked/sent/payment',async()=>{
 const showId=await setup();const p=await spokenBriefPreview(artist(),showId);assert.equal(p.authority,'preparation-only');assert.match(p.text,/proposes Test act a/);assert.match(p.text,/100.00 US dollar support fee/);assert.match(p.text,/Nothing has been sent, approved or paid/);assert.match(p.text,/assertions, not independently verified/);
 let spoken='';await speakReviewedBrief(artist(),showId,p,{synthesize:async(text,mood,opts)=>{spoken=text;assert.equal(mood,'idle');assert.equal(opts?.requireExactText,true);return clip;}});assert.equal(spoken,p.text);const d=(await deskFor(artist().id,showId))!;assert.equal(d.metrics.fixtureEffects,0);assert.equal(d.actions[0].approval,null);assert.equal(d.actions[0].receipt,null);
});
test('unknown availability never becomes an eligible proposal or a zero-dollar quote',async()=>{
 const b=input();b.roster.forEach(c=>{c.availability='unknown';c.fee=null;});const showId=await setup(b);const p=await spokenBriefPreview(artist(),showId);assert.doesNotMatch(p.text,/proposes|0.00 US/);assert.match(p.text,/2 roster options have missing facts/);assert.match(p.text,/not current/);
});
test('a changed exact revision fails before speech and cross-artist scope is denied',async()=>{
 const showId=await setup(),p=await spokenBriefPreview(artist(),showId);const b=input();b.maxFee=190;await saveBrief(artist(),showId,b,1);let calls=0;
 await assert.rejects(speakReviewedBrief(artist(),showId,p,{synthesize:async()=>{calls++;return clip;}}),/changed/);assert.equal(calls,0);await assert.rejects(spokenBriefPreview(artist('other'),showId),/outside/);
});
test('changing source facts during synthesis rejects stale completion, even with cached audio',async()=>{
 const showId=await setup(),p=await spokenBriefPreview(artist(),showId);
 await assert.rejects(speakReviewedBrief(artist(),showId,p,{synthesize:async()=>{const b=input();b.roster[0].fee=180;await saveBrief(artist(),showId,b,1);return {...clip,cached:true};}}),/changed during/);
});
test('expiry of a comparison invalidates the reviewed spoken choice without renewing assertions',async()=>{
 const showId=await setup(),p=await spokenBriefPreview(artist(),showId);const d=(await deskFor(artist().id,showId))!;d.pressure!.observedAt=Date.now()-86400001;await kvSet(`pressure:${artist().id}:${showId}`,d.pressure);await assert.rejects(speakReviewedBrief(artist(),showId,p,{synthesize:async()=>clip}),/changed/);const next=await spokenBriefPreview(artist(),showId);assert.doesNotMatch(next.text,/proposes/);
});
test('a canceled brief or request cannot return a successful clip',async()=>{
 const showId=await setup(),p=await spokenBriefPreview(artist(),showId),controller=new AbortController();await assert.rejects(speakReviewedBrief(artist(),showId,p,{signal:controller.signal,synthesize:async()=>{controller.abort();return clip;}}),/canceled/);
 const d=(await deskFor(artist().id,showId))!;d.opportunity.status='canceled';await run('update ops_opportunities set body=? where id=?',[JSON.stringify(d.opportunity),showId]);await assert.rejects(spokenBriefPreview(artist(),showId),/no longer active/);
});
