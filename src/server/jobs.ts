/** Durable work queue. Await a bounded attempt; restart can reclaim expired leases.
 * Production needs a scheduler to invoke jobs:drain. No detached Promise owns business work.
 */
import { getArtist } from './artists';
import { all, run } from './db';
import { redact } from './env';

const LEASE_MS = 5 * 60_000;
export async function runBookingJob(jobId: string, now = Date.now(), execute?: (artist: import('./artists').ArtistRow, city: string) => Promise<unknown>): Promise<boolean> {
  const lease = await run(`update gus_jobs set state = 'running', attempts = attempts + 1, lease_until = ?, updated_at = ? where id = ? and attempts < 3 and (state in ('queued', 'failed') or (state = 'running' and lease_until <= ?))`, [now + LEASE_MS, now, jobId, now]);
  if (!lease.rowsAffected) return false;
  const [job] = await all<{ artist_id: string; city: string }>('select artist_id, city from gus_jobs where id = ?', [jobId]);
  try {
    const artist = await getArtist(job.artist_id);
    if (!artist) throw new Error('Artist no longer exists.');
    if (execute) await execute(artist, job.city);
    else { const { autoBook } = await import('./autobook'); await autoBook(artist, job.city); }
    await run("update gus_jobs set state = 'completed', lease_until = null, error = null, updated_at = ? where id = ? and lease_until = ?", [Date.now(), jobId, now + LEASE_MS]);
    return true;
  } catch (err) {
    await run("update gus_jobs set state = 'failed', lease_until = null, error = ?, updated_at = ? where id = ? and lease_until = ?", [redact(String(err)).slice(0, 300), Date.now(), jobId, now + LEASE_MS]);
    return false;
  }
}
export async function drainBookingJobs(limit = 10): Promise<{ attempted: number; completed: number }> {
  const jobs = await all<{ id: string }>("select id from gus_jobs where attempts < 3 and (state in ('queued', 'failed') or (state = 'running' and lease_until <= ?)) order by created_at limit ?", [Date.now(), limit]);
  let completed = 0;
  for (const job of jobs) if (await runBookingJob(job.id)) completed++;
  return { attempted: jobs.length, completed };
}
