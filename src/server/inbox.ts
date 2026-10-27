/** Inbox storage has no booking/agent dependencies. */
import type { InboxMessage } from '../lib/types';
import { id } from './crypto';
import { all, run, transaction } from './db';

export async function inbox(artistId: string, limit = 50): Promise<InboxMessage[]> {
  const rows = await all<{ id: string; kind: string; body: string; action: string | null; evidence: string | null; created_at: number; read: number }>(
    'select * from gus_inbox where artist_id = ? order by created_at desc limit ?',
    [artistId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as InboxMessage['kind'],
    body: r.body,
    action: r.action ? JSON.parse(r.action) : null,
    evidence: r.evidence ? JSON.parse(r.evidence) : null,
    createdAt: r.created_at,
    read: !!r.read,
  }));
}

export async function postInbox(artistId: string, msg: Omit<InboxMessage, 'id' | 'read'>) {
  const mid = id('m_');
  await run('insert into gus_inbox(id, artist_id, kind, body, action, evidence, created_at) values(?, ?, ?, ?, ?, ?, ?)', [
    mid,
    artistId,
    msg.kind,
    msg.body,
    msg.action ? JSON.stringify(msg.action) : null,
    msg.evidence ? JSON.stringify(msg.evidence) : null,
    msg.createdAt,
  ]);
  return mid;
}

export async function markRead(artistId: string, messageId?: string) {
  await transaction(async tx => {
    if (messageId) await tx.execute({sql:'update gus_inbox set read=1 where artist_id=? and id=?',args:[artistId,messageId]});
    else await tx.execute({sql:'update gus_inbox set read=1 where artist_id=?',args:[artistId]});
    // Reading a notice is a delivery acknowledgment only. Never an action approval.
    if (messageId?.startsWith('attention-inbox:')) await tx.execute({sql:"update ops_attention set state='acknowledged',updated_at=? where artist_id=? and id=? and state='delivered'",args:[Date.now(),artistId,messageId.replace(/^attention-inbox:/,'')]});
    else if (!messageId) await tx.execute({sql:"update ops_attention set state='acknowledged',updated_at=? where artist_id=? and state='delivered'",args:[Date.now(),artistId]});
  });
}
