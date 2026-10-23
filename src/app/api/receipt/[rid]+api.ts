import { handler, HttpError, json } from '@/server/http';
import { receiptById } from '@/server/qloo/client';

/** Receipts (FR-30b): the exact Qloo call behind a "Qloo says" chip. The key is never stored. */
export const GET = handler(async (_req: Request, { rid }: Record<string, string>) => {
  const r = (await receiptById(rid)) as Record<string, unknown> | null;
  if (!r) throw new HttpError(404, 'No such receipt.');
  return json({
    id: r.id,
    endpoint: r.endpoint,
    method: r.method,
    params: JSON.parse(String(r.params)),
    status: r.status,
    latencyMs: r.latency_ms,
    cached: !!r.cached,
    cachedAt: r.cache_date,
    purpose: r.purpose,
    resultCount: r.result_count,
    at: r.created_at,
  });
});
