import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { all, run } from '../src/server/db';
import { upsertArtist } from '../src/server/artists';
import { runBookingJob } from '../src/server/jobs';
import { NOW, artist } from './fixtures';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-jobs-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
let serial = 0;
async function job(state = 'queued', lease: number | null = null) { const id = `job-${++serial}`; await run('insert into gus_jobs(id, artist_id, city, state, lease_until, created_at, updated_at) values(?, ?, ?, ?, ?, ?, ?)', [id, 'test-act', 'burlington-vt', state, lease, NOW, NOW]); return id; }
before(async () => { await upsertArtist({ id: artist().id, name: artist().name, sound: artist().sound, kind: 'music', isDemo: true }); });
test('two workers cannot run the same live lease', async () => { const id = await job(); let calls = 0; const execute = async () => { calls++; await new Promise(r => setTimeout(r, 10)); }; const out = await Promise.all([runBookingJob(id, NOW, execute), runBookingJob(id, NOW, execute)]); assert.equal(calls, 1); assert.equal(out.filter(Boolean).length, 1); });
test('completed job is not replayed', async () => { const id = await job(); await runBookingJob(id, NOW, async () => {}); let calls = 0; assert.equal(await runBookingJob(id, NOW, async () => { calls++; }), false); assert.equal(calls, 0); });
test('restart can resume a persisted expired worker lease', async () => { const id = await job('running', NOW - 1); assert.equal(await runBookingJob(id, NOW, async () => {}), true); const [r] = await all<{ state: string; lease_until: number | null }>('select state, lease_until from gus_jobs where id = ?', [id]); assert.equal(r.state, 'completed'); assert.equal(r.lease_until, null); });
test('unexpired worker lease is not stolen', async () => { const id = await job('running', NOW + 60_000); let called = false; assert.equal(await runBookingJob(id, NOW, async () => { called = true; }), false); assert.equal(called, false); });
test('failures are persisted and bounded, not silently complete', async () => { const id = await job(); let calls = 0; const execute = async () => { calls++; throw new Error('Fixture provider unavailable'); }; for (let i = 0; i < 4; i++) assert.equal(await runBookingJob(id, NOW + i, execute), false); const [r] = await all<{ state: string; attempts: number; error: string }>('select state, attempts, error from gus_jobs where id = ?', [id]); assert.equal(calls, 3); assert.equal(r.state, 'failed'); assert.equal(r.attempts, 3); assert.match(r.error, /Fixture provider unavailable/); });
