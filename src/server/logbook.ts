/**
 * Gus's Logbook (PRD 9.3f): every step he takes on his own, with why and from whose data.
 * Delegating to an agent is only safe when you can see what it did and why, so nothing Gus does
 * unasked happens without a line here. Fan data never appears: counts and neighborhoods only.
 */
import type { EscalationLevel, LogEntry } from '../lib/types';
import { id } from './crypto';
import { all, run } from './db';

export async function log(artistId: string, e: Omit<LogEntry, 'id' | 'createdAt' | 'level' | 'ref' | 'detail' | 'city'> & Partial<Pick<LogEntry, 'level' | 'ref' | 'detail' | 'city'>>) {
  const entry: LogEntry = { id: id('l_'), level: 0 as EscalationLevel, ref: null, detail: null, city: null, ...e, createdAt: Date.now() };
  await run('insert into gus_log(id, artist_id, kind, city, title, detail, source, level, ref, created_at) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    entry.id,
    artistId,
    entry.kind,
    entry.city,
    entry.title.slice(0, 240),
    entry.detail?.slice(0, 600) ?? null,
    entry.source,
    entry.level,
    entry.ref ? JSON.stringify(entry.ref) : null,
    entry.createdAt,
  ]);
  return entry;
}

export async function logbook(artistId: string, limit = 80): Promise<LogEntry[]> {
  const rows = await all<{ id: string; kind: string; city: string | null; title: string; detail: string | null; source: string; level: number; ref: string | null; created_at: number }>(
    'select * from gus_log where artist_id = ? order by created_at desc limit ?',
    [artistId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as LogEntry['kind'],
    city: r.city,
    title: r.title,
    detail: r.detail,
    source: r.source as LogEntry['source'],
    level: Number(r.level) as EscalationLevel,
    ref: r.ref ? JSON.parse(r.ref) : null,
    createdAt: Number(r.created_at),
  }));
}
