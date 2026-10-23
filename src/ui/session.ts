/**
 * Small per-device memory: the tour constraints parsed from the Scout ask, and the last Scout
 * result's Gus line, so the Map and Tour tabs can pick them up. Web keeps them in
 * localStorage; native keeps them in memory for the session.
 */
import { Platform } from 'react-native';
import type { Region } from '@/lib/regions';
import type { RoomBand } from '@/lib/types';

export type Constraints = { regions: Region[]; dates: number; roomBand: RoomBand; homeBase: string | null; startDate: string };
export type ScoutMemo = { line: string; model: string; picks: { metroId: string; name: string; state: string; reason: string; sleeper: boolean }[]; at: number };

const mem = new Map<string, string>();

function read<T>(key: string): T | null {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage.getItem(key) : (mem.get(key) ?? null);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(key, raw);
    else mem.set(key, raw);
  } catch {
    mem.set(key, raw);
  }
}

export function defaultStart() {
  return new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
}

export const session = {
  constraints: (artist: string): Constraints | null => read(`wanted.constraints.${artist}`),
  setConstraints: (artist: string, c: Constraints) => write(`wanted.constraints.${artist}`, c),
  scout: (artist: string): ScoutMemo | null => read(`wanted.scout.${artist}`),
  setScout: (artist: string, s: ScoutMemo) => write(`wanted.scout.${artist}`, s),
  withoutQloo: (): boolean => read('wanted.withoutQloo') ?? false,
  setWithoutQloo: (on: boolean) => write('wanted.withoutQloo', on),
  lastArtist: (): string | null => read('wanted.lastArtist'),
  setLastArtist: (slug: string) => write('wanted.lastArtist', slug),
};
