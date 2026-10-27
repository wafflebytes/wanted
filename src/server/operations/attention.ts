/** Ambient work has a durable handoff, not repeated LLM polling or an open HTTP request.
 * One internal-inbox notice per task generation. No SMS, push, call, sending or payment.
 * A committed human wait and its attention intent live in the same transaction. */
import type { Transaction } from '@libsql/client';
import type { AgentTask } from '../../lib/agent-task';
import { taskSummary } from '../../lib/agent-task';
import { all, transaction } from '../db';
export type AttentionIntent = { id: string; taskId: string; artistId: string; opportunityId: string; version: number; generation: number; need: NonNullable<AgentTask['waitingFor']> | 'retry'; level: 2 | 3; title: string; body: string; dueAt: number };
export async function cancelTaskAttention(tx: Transaction, taskId: string, artistId: string, now: number) {
  const pending = await tx.execute({ sql: "select id from ops_attention where task_id = ? and artist_id = ? and state in ('queued','delivered')", args: [taskId, artistId] });
  for (const row of pending.rows) await tx.execute({ sql: 'update gus_inbox set read = 1 where id = ? and artist_id = ?', args: [`attention-inbox:${row.id}`, artistId] });
  await tx.execute({ sql: "update ops_attention set state = 'canceled', updated_at = ? where task_id = ? and artist_id = ? and state in ('queued','delivered')", args: [now, taskId, artistId] });
}
export async function queueTaskAttention(tx: Transaction, task: AgentTask, now: number) {
  // Waiting on a counterparty is not an invitation to nag the artist. Expiry is checked by the job queue.
  if (task.opportunityId.startsWith('brief:')) return; // operator planning is export-only; never issue fixture send/approval copy
  if (task.opportunityId.startsWith('llm-eval:')) return; // isolated model evals never enter an artist inbox
  const failed = task.state === 'failed' && task.attempts >= 3;
  if (!failed && (task.state !== 'waiting' || !task.waitingFor || task.waitingFor === 'reply')) return;
  const need = failed ? 'retry' as const : task.waitingFor!;
  const text = failed ? { title: 'Gus stopped retrying.', body: 'The check did not finish after its bounded attempts. Your exact approvals and receipts are unchanged. Review the job before explicitly resuming.' } : taskSummary(task);
  const intent: AttentionIntent = { id: `attention:${task.id}:g${task.generation}:${need}`, taskId: task.id, artistId: task.artistId, opportunityId: task.opportunityId, version: task.version, generation: task.generation, need, level: ['approval', 'save', 'follow-up'].includes(need) ? 3 : 2, title: text.title, body: text.body, dueAt: now };
  await tx.execute({ sql: "insert into ops_attention(id, artist_id, task_id, opportunity_id, version, generation, state, due_at, body, created_at, updated_at) values(?,?,?,?,?,?,'queued',?,?,?,?) on conflict(id) do nothing", args: [intent.id, task.artistId, task.id, task.opportunityId, task.version, task.generation, intent.dueAt, JSON.stringify(intent), now, now] });
}
export async function drainTaskAttention(limit = 20, now = Date.now()) {
  const pending = await all<{ id: string }>("select id from ops_attention where state = 'queued' and due_at <= ? order by due_at, id limit ?", [now, Math.max(1, Math.min(100, limit))]);
  let delivered = 0, canceled = 0;
  for (const row of pending) {
    const result = await transaction(async tx => {
      const r = await tx.execute({ sql: "select body from ops_attention where id = ? and state = 'queued' and due_at <= ?", args: [row.id, now] });
      if (!r.rows[0]) return 'unchanged';
      const intent = JSON.parse(String(r.rows[0].body)) as AttentionIntent;
      const t = await tx.execute({ sql: 'select body from ops_agent_tasks where id = ? and artist_id = ?', args: [intent.taskId, intent.artistId] });
      const task = t.rows[0] ? JSON.parse(String(t.rows[0].body)) as AgentTask : null;
      if (!task || task.generation !== intent.generation || task.version !== intent.version || (intent.need === 'retry' ? task.state !== 'failed' || task.attempts < 3 : task.state !== 'waiting' || task.waitingFor !== intent.need)) {
        await tx.execute({ sql: "update ops_attention set state = 'canceled', updated_at = ? where id = ?", args: [now, intent.id] }); return 'canceled';
      }
      // Inbox save and outbox acknowledgment are atomic. Crash/restart cannot create two messages.
      await tx.execute({ sql: "insert into gus_inbox(id,artist_id,kind,body,action,evidence,created_at,read) values(?,?,'info',?,null,?,?,0) on conflict(id) do nothing", args: [`attention-inbox:${intent.id}`, intent.artistId, `${intent.title} ${intent.body}`, JSON.stringify({ source: 'gus-task', taskId: intent.taskId, opportunityId: intent.opportunityId, version: intent.version, generation: intent.generation, need: intent.need, level: intent.level, mode: 'fixture', delivery: 'internal-inbox-only' }), now] });
      await tx.execute({ sql: "update ops_attention set state = 'delivered', updated_at = ? where id = ?", args: [now, intent.id] }); return 'delivered';
    });
    if (result === 'delivered') delivered++; if (result === 'canceled') canceled++;
  }
  return { attempted: pending.length, delivered, canceled };
}
