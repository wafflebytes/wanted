import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artist } from './fixtures';
import type { Deal } from '../src/lib/types';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-calls-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
import { run, all } from '../src/server/db';
import { checkIn, answerCall, currentCall } from '../src/server/calls';
import { dealReview, assertDealReview } from '../src/server/deal-scope';
import { setMandate } from '../src/server/mandate';
let n = 0;
async function setup() {
  const a = artist(`call-act-${++n}`); const now = Date.now();
  const d: Deal = { id: `test-deal-${n}`, mode: 'simulation', version: 1, offerExpiresAt: now + 2 * 3_600_000, city: 'burlington-vt', cityName: 'Burlington', roomId: 'fixture-room', roomName: 'Fixture Room', neighborhood: null, status: 'waiting', terms: { date: '2026-11-20', day: 'friday', split: 70, deposit: 140, capacity: 150 }, thread: [], withinLimits: true, payment: null, createdAt: now, updatedAt: now };
  await run('insert into deals(id,artist_id,city,body,created_at,updated_at) values(?,?,?,?,?,?)', [d.id, a.id, d.city, JSON.stringify(d), now, now]);
  await setMandate(a.id, { callsPerWeek: 1 }); return { a, d };
}
test('one call survives concurrent check-ins and reserves its weekly attention budget atomically', async () => {
  const { a } = await setup(); const calls = await Promise.all([checkIn(a, 12), checkIn(a, 12)]); assert.ok(calls[0]); assert.equal(calls[0]!.id, calls[1]!.id);
  assert.equal((await all('select id from gus_calls where artist_id = ?', [a.id])).length, 1);
});
test('unknown local hour and quiet hours never create a new ring', async () => {
  const { a } = await setup(); assert.equal(await checkIn(a, null), null); assert.equal(await checkIn(a, 23), null); assert.equal((await all('select id from gus_calls where artist_id = ?', [a.id])).length, 0);
});
test('a changed room/date/amount/version or expiry cannot reuse a spoken approval', async () => {
  const { a, d } = await setup(); const c = (await checkIn(a, 12))!;
  await answerCall(a, c.id, 'pickup'); d.terms!.deposit = 999; d.version = 2;
  await run('update deals set body = ? where id = ?', [JSON.stringify(d), d.id]);
  await assert.rejects(answerCall(a, c.id, 'yes'), /reviewed offer changed/); await assert.rejects(currentCall(a, c.id), /reviewed offer changed/);
  assert.equal((await all<{ status: string }>('select status from gus_calls where id = ?', [c.id]))[0].status, 'answered');
});
test('answer-before-pickup, declined call, cross-artist access and conflicting repeat decisions fail', async () => {
  const { a } = await setup(); const c = (await checkIn(a, 12))!;
  await assert.rejects(answerCall(a, c.id, 'yes'), /Pick up/); await assert.rejects(currentCall(artist('other-act'), c.id), /No such call/);
  await answerCall(a, c.id, 'pickup'); const result = await answerCall(a, c.id, 'no'); assert.equal(result.call.outcome, 'no');
  assert.equal((await answerCall(a, c.id, 'no')).call.status, 'done'); await assert.rejects(answerCall(a, c.id, 'yes'), /different decision/);
  const second = await setup(); const c2 = (await checkIn(second.a, 12))!; await answerCall(second.a, c2.id, 'decline'); await assert.rejects(answerCall(second.a, c2.id, 'pickup'), /no longer active/);
});
test('scope binds the exact room, date, cents-equivalent amount, currency context and hold expiry', async () => {
  const { d } = await setup(); const scope = dealReview(d); assert.doesNotThrow(() => assertDealReview(d, scope));
  for (const changed of [{ ...d, roomName: 'Other' }, { ...d, offerExpiresAt: d.offerExpiresAt! + 1 }, { ...d, terms: { ...d.terms!, deposit: 141 } }]) assert.throws(() => assertDealReview(changed, scope));
  assert.throws(() => assertDealReview(d));
});
test('canonical call speech preserves all decision text and refuses changes during synthesis', async () => {
  const { canonicalCallSpeech } = await import('../src/server/call-voice');
  const { a, d } = await setup(); const c = (await checkIn(a, 12))!;
  let spoken = ''; const output = { audio: Buffer.alloc(2000), mime: 'audio/mpeg', model: 'synthetic', cached: false };
  const out = await canonicalCallSpeech(a,c.id,{synthesize:async(text,mood,opts)=>{spoken=text;assert.equal(mood,'idle');assert.equal(opts?.maxChars,1500);return output;}});
  assert.equal(spoken,c.script);assert.ok(spoken.includes('test deposit?'));assert.equal(out.review.hash,dealReview(d).hash);
  await assert.rejects(canonicalCallSpeech(a,c.id,{synthesize:async()=>{d.version=2;d.terms!.deposit=999;await run('update deals set body=? where id=?',[JSON.stringify(d),d.id]);return output;}}),/reviewed offer changed/);
});
test('declined or canceled speech cannot complete successfully, including a cached transport',async()=>{
  const { canonicalCallSpeech } = await import('../src/server/call-voice');const {a}=await setup();const c=(await checkIn(a,12))!;
  const output={audio:Buffer.alloc(2000),mime:'audio/mpeg',model:'synthetic',cached:true};
  await assert.rejects(canonicalCallSpeech(a,c.id,{synthesize:async()=>{await answerCall(a,c.id,'decline');return output;}}),/no longer current/);
  const second=await setup();const c2=(await checkIn(second.a,12))!;const controller=new AbortController();
  await assert.rejects(canonicalCallSpeech(second.a,c2.id,{signal:controller.signal,synthesize:async()=>{controller.abort();return output;}}),/canceled/);
});
test('late decline or conflicting no cannot hide a pending exact yes payment',async()=>{
 const {a}=await setup();const c=(await checkIn(a,12))!;await answerCall(a,c.id,'pickup');const original=globalThis.fetch,oldKey=process.env.STRIPE_SECRET_KEY;process.env.STRIPE_SECRET_KEY='sk_test_synthetic_calls';
 let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>{entered=r;}),gate=new Promise<void>(r=>{release=r;});let payments=0;
 globalThis.fetch=async(u:unknown)=>{if(!String(u).includes('api.stripe.com'))return new Response('{}',{status:503});payments++;entered();await gate;return new Response(JSON.stringify({id:'pi_synthetic_pending_call',status:'succeeded',livemode:false,amount:14000,currency:'usd'}),{status:200});};
 try{
  const yes=answerCall(a,c.id,'yes');await started;
  await assert.rejects(answerCall(a,c.id,'decline'),/already recorded or executing/);await assert.rejects(answerCall(a,c.id,'no'),/different decision/);
  const {canonicalCallSpeech}=await import('../src/server/call-voice');await assert.rejects(canonicalCallSpeech(a,c.id,{synthesize:async()=>{throw new Error('must not synthesize decided call');}}),/no longer current/);
  release();const result=await yes;assert.equal(result.call.status,'done');assert.equal(result.call.outcome,'yes');assert.equal(result.deal?.payment?.ref,'pi_synthetic_pending_call');assert.equal(payments,1);
 }finally{release();globalThis.fetch=original;if(oldKey===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldKey;}
});
