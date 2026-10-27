import type { DealLimits } from '../lib/types';
import { kvGet, kvSet } from './db';
export const DEFAULT_LIMITS: DealLimits = { maxDeposit: 200, minSplit: 70 };
export async function limitsFor(artistId: string): Promise<DealLimits> {
  return { ...DEFAULT_LIMITS, ...((await kvGet<Partial<DealLimits>>(`deal-limits:${artistId}`)) ?? {}) };
}

export async function setLimits(artistId: string, next: Partial<DealLimits>): Promise<DealLimits> {
  const cur = await limitsFor(artistId);
  const out = {
    maxDeposit: Math.min(2000, Math.max(0, Math.round(next.maxDeposit ?? cur.maxDeposit))),
    minSplit: Math.min(95, Math.max(50, Math.round(next.minSplit ?? cur.minSplit))),
  };
  await kvSet(`deal-limits:${artistId}`, out);
  return out;
}

