/** Scheduler transport only. The durable queue, not the scheduler request, owns work.
 * Configure an external scheduler with a bearer secret. Nothing is publicly runnable. */
import { timingSafeEqual } from 'node:crypto';
import { handler, HttpError, json } from '@/server/http';
import { drainBookingJobs } from '@/server/jobs';
import { drainDepositFollowups } from '@/server/deals';
import { drainTaskAttention } from '@/server/operations/attention';
import { drainAgentTasks } from '@/server/operations/task-runner';
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
  return json({ booking, agent, attention, commerce });
});
