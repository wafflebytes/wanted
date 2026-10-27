import './lib/env';
import { drainBookingJobs } from '../src/server/jobs';
import { drainDepositFollowups } from '../src/server/deals';
import { drainTaskAttention } from '../src/server/operations/attention';
import { drainAgentTasks } from '../src/server/operations/task-runner';
Promise.all([drainBookingJobs(), drainAgentTasks()]).then(async ([booking, agent]) => { const attention = await drainTaskAttention(); const commerce = await drainDepositFollowups(); console.log(JSON.stringify({ booking, agent, attention, commerce })); process.exit(booking.completed < booking.attempted || agent.progressed < agent.attempted ? 1 : 0); }, (e) => { console.error(String(e)); process.exit(1); });
