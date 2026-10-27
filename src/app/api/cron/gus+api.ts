/** Scheduler transport only. The durable queue, not the scheduler request, owns work.
 * Configure an external scheduler with a bearer secret. Nothing is publicly runnable. */
import { timingSafeEqual } from 'node:crypto';
import { handler, HttpError, json } from '@/server/http';
import { drainBookingJobs } from '@/server/jobs';
import { drainDepositFollowups } from '@/server/deals';
import { drainTaskAttention } from '@/server/operations/attention';
import { drainAgentTasks } from '@/server/operations/task-runner';
import { tick } from '@/server/ambient';
import { all } from '@/server/db';
import { getArtist } from '@/server/artists';
export function schedulerAuthorized(req: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(req.headers.get('authorization') ?? '');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
export const GET = handler(async (req: Request) => {
  if (!schedulerAuthorized(req)) throw new HttpError(401, 'Scheduler authorization required.');
  const [booking, agent] = await Promise.all([drainBookingJobs(5), drainAgentTasks(5)]);
  const attention = await drainTaskAttention();
  const commerce = await drainDepositFollowups(1);
  // Calls in progress keep going for every act, watched or not.
  const acts = await all<{ artist_id: string }>("select distinct artist_id from deals where body like '%\"status\":\"talking\"%' limit 20");
  const ambient = [];
  for (const a of acts) { const artist = await getArtist(a.artist_id); if (artist) ambient.push(await tick(artist, Date.now(), { force: true })); }
  return json({ booking, agent, attention, commerce, ambient });
});
