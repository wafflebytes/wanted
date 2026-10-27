import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { artist } from './fixtures';
import type { Deal, DealPayment } from '../src/lib/types';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-commerce-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
process.env.STRIPE_SECRET_KEY = ''; // no real provider in the injected-state cases
import { run, all } from '../src/server/db';
import { decideDeal, runDepositFollowup } from '../src/server/deals';
import { dealReview } from '../src/server/deal-scope';
let n = 0;
async function setup() {
  const a = artist(`commerce-act-${++n}`), now = Date.now();
  const d: Deal = { id: `commerce-deal-${n}`, mode: 'simulation', version: 1, offerExpiresAt: now + 2 * 3_600_000, city: 'burlington-vt', cityName: 'Burlington', roomId: 'fixture-room', roomName: 'Fixture Room', neighborhood: null, status: 'waiting', terms: { date: '2026-11-20', day: 'friday', split: 70, deposit: 140, capacity: 150 }, thread: [], withinLimits: true, payment: null, createdAt: now, updatedAt: now };
  await run('insert into deals(id,artist_id,city,body,created_at,updated_at) values(?,?,?,?,?,?)', [d.id, a.id, d.city, JSON.stringify(d), now, now]); return { a, d, review: dealReview(d) };
}
const payment = (d: Deal): DealPayment => ({ rail: 'sandbox', ref: `effect:${d.id}`, amount: d.terms!.deposit, at: Date.now(), pass: { amount: d.terms!.deposit, payee: d.roomName, expiresAt: d.offerExpiresAt! } });
test('missing or altered exact review makes no payment attempt', async () => {
  const { a, d, review } = await setup(); let calls = 0;
  for (const r of [undefined, { ...review, hash: 'wrong' }]) await assert.rejects(decideDeal(a, d.id, true, r, { pay: async () => { calls++; return payment(d); }, followup: false }), /reviewed offer changed/);
  assert.equal(calls, 0);
});
test('concurrent yes/yes and yes/no reserve one decision and one exact effect', async () => {
  const { a, d, review } = await setup(); let release!: () => void, entered!: () => void, calls = 0;
  const gate = new Promise<void>(r => { release = r; }), started = new Promise<void>(r => { entered = r; });
  const first = decideDeal(a, d.id, true, review, { pay: async () => { calls++; entered(); await gate; return payment(d); }, followup: false });
  await started;
  await assert.rejects(decideDeal(a, d.id, true, review, { followup: false }), /already executing/);
  await assert.rejects(decideDeal(a, d.id, false, review, { followup: false }), /different scope or choice/);
  release(); assert.equal((await first).status, 'held'); assert.equal(calls, 1);
});
test('lost acknowledgment survives restart with the original receipt and no new effect', async () => {
  const { a, d, review } = await setup(); let calls = 0;
  await assert.rejects(decideDeal(a, d.id, true, review, { pay: async () => { calls++; return payment(d); }, followup: false, loseAcknowledgment: true }), /acknowledgment lost/);
  const script = `import { decideDeal } from './src/server/deals.ts'; const r=await decideDeal(${JSON.stringify(a)},${JSON.stringify(d.id)},true,${JSON.stringify(review)},{followup:false,pay:async()=>{throw new Error('Must not pay again')}});console.log(JSON.stringify({status:r.status,ref:r.payment.ref}));process.exit(0);`;
  const child = spawnSync(process.execPath, ['--import','tsx','--input-type=module','-e',script], { env: process.env, cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr); assert.equal(JSON.parse(child.stdout).ref, `effect:${d.id}`); assert.equal(calls, 1);
});
test('change during payment retains the historical receipt but cannot mark the changed offer held', async () => {
  const { a, d, review } = await setup();
  await assert.rejects(decideDeal(a, d.id, true, review, { pay: async () => { const changed = { ...d, version: 2, terms: { ...d.terms!, deposit: 999 } }; await run('update deals set body=? where id=?', [JSON.stringify(changed),d.id]); return payment(d); }, followup: false }), /receipt retained/);
  const current = JSON.parse((await all<{ body: string }>('select body from deals where id=?',[d.id]))[0].body); assert.equal(current.status,'waiting'); assert.equal(current.payment,null);
  assert.equal((await all('select id from deal_payment_receipts where deal_id=?',[d.id])).length,1);
  await assert.rejects(decideDeal(a,d.id,true,dealReview(current),{followup:false}),/different scope/);
});
test('provider timeout keeps uncertainty; retries use the same Stripe test idempotency key and reconcile one effect', async () => {
  const { a,d,review }=await setup(); const original=globalThis.fetch; const keys:string[]=[]; const effects=new Map<string,string>(); let calls=0;
  process.env.STRIPE_SECRET_KEY='sk_test_synthetic_contract';
  globalThis.fetch=async (_u,init)=>{calls++; const key=(init!.headers as Record<string,string>)['Idempotency-Key']; keys.push(key); if(!effects.has(key))effects.set(key,'pi_synthetic_original'); if(calls===1)throw new Error('Transport lost after provider accepted'); return new Response(JSON.stringify({id:effects.get(key),status:'succeeded',livemode:false,amount:14000,currency:'usd'}),{status:200});};
  try {
    await assert.rejects(decideDeal(a,d.id,true,review,{followup:false}),/Transport lost/);
    assert.equal((await all<{state:string}>('select state from deal_decisions where deal_id=?',[d.id]))[0].state,'uncertain');
    const recovered=await decideDeal(a,d.id,true,review,{followup:false}); assert.equal(recovered.payment!.ref,'pi_synthetic_original'); assert.equal(effects.size,1); assert.equal(keys[0],keys[1]);
  } finally {globalThis.fetch=original;process.env.STRIPE_SECRET_KEY='';}
});
test('uncertain intent beyond provider retention or expired offer cannot blind-repost', async()=>{
  const {a,d,review}=await setup();await assert.rejects(decideDeal(a,d.id,true,review,{pay:async()=>{throw new Error('unknown');},followup:false}));
  await run('update deal_decisions set body=? where deal_id=?',[JSON.stringify({firstAttemptAt:Date.now()-24*3_600_000}),d.id]);
  await assert.rejects(decideDeal(a,d.id,true,review,{followup:false}),/retention may have elapsed/);
});
test('receipt and post-payment continuation are committed together; retrying continuation never pays', async()=>{
  const {a,d,review}=await setup();await decideDeal(a,d.id,true,review,{pay:async()=>payment(d),followup:false});
  const job=(await all<{id:string}>('select id from deal_followups where deal_id=?',[d.id]))[0].id;
  assert.equal(await runDepositFollowup(a,job,async()=>{throw new Error('Restart during follow-up');}),false);
  const script=`import {runDepositFollowup} from './src/server/deals.ts';console.log(await runDepositFollowup(${JSON.stringify(a)},${JSON.stringify(job)},async()=>{}));process.exit(0);`;
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{env:process.env,cwd:process.cwd(),encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),'true');
  assert.equal(await runDepositFollowup(a,job,async()=>{throw new Error('Duplicate');}),false);
  assert.equal((await all('select id from deal_payment_receipts where deal_id=?',[d.id])).length,1);
});
