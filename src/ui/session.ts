/**
 * Small per-device memory: whether onboarding is done, the last artist, the tour constraints
 * parsed from the Scout ask and the last Scout result's Gus line. Web keeps them in
 * localStorage; native keeps them in a JSON file in the app's documents folder, read once
 * at launch so every read stays synchronous.
 */
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { Region } from '@/lib/regions';
import type { RoomBand } from '@/lib/types';

export type Constraints = { regions: Region[]; dates: number; roomBand: RoomBand; homeBase: string | null; startDate: string };
export type Act = { slug: string; name: string; sounds: string[]; at: number };
export type ScoutMemo = { line: string; model: string; picks: { metroId: string; name: string; state: string; reason: string; sleeper: boolean }[]; at: number };

const mem = new Map<string, string>();
const native = Platform.OS !== 'web';
let file: File | null = null;
if (native) {
  try {
    file = new File(Paths.document, 'wanted-session.json');
    if (file.exists) for (const [k, v] of Object.entries(JSON.parse(file.textSync()) as Record<string, string>)) mem.set(k, v);
  } catch {
    file = null;
  }
}
function flush() {
  if (!file) return;
  try {
    file.write(JSON.stringify(Object.fromEntries(mem)));
  } catch {}
}

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
    else {
      mem.set(key, raw);
      flush();
    }
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
  onboarded: (): boolean => read('wanted.onboarded') ?? false,
  setOnboarded: (on: boolean) => write('wanted.onboarded', on),
  lastArtist: (): string | null => read('wanted.lastArtist'),
  setLastArtist: (slug: string) => write('wanted.lastArtist', slug),
  /** Acts scouted on this device, newest first, for the switcher on the map. */
  acts: (): Act[] => read<Act[]>('wanted.acts') ?? [],
  addAct: (a: Omit<Act, 'at'>) => {
    const rest = (read<Act[]>('wanted.acts') ?? []).filter((x) => x.slug !== a.slug);
    write('wanted.acts', [{ ...a, at: Date.now() }, ...rest].slice(0, 12));
  },
};
