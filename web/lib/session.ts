/** Per-device memory in localStorage. Every read survives a private window (it just comes back empty). */
import type { Region } from '@/lib/regions';
import type { RoomBand } from '@/lib/types';

export type Constraints = { regions: Region[]; dates: number; roomBand: RoomBand; homeBase: string | null; startDate: string };
export type Act = { slug: string; name: string; sounds: string[]; at: number };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const defaultStart = () => new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);

export const session = {
  onboarded: () => read<boolean>('wanted.onboarded') ?? false,
  setOnboarded: (on: boolean) => write('wanted.onboarded', on),
  lastArtist: () => read<string>('wanted.lastArtist'),
  setLastArtist: (slug: string) => write('wanted.lastArtist', slug),
  constraints: (artist: string) => read<Constraints>(`wanted.constraints.${artist}`),
  setConstraints: (artist: string, c: Constraints) => write(`wanted.constraints.${artist}`, c),
  acts: () => read<Act[]>('wanted.acts') ?? [],
  addAct: (a: Omit<Act, 'at'>) => {
    const rest = (read<Act[]>('wanted.acts') ?? []).filter((x) => x.slug !== a.slug);
    write('wanted.acts', [{ ...a, at: Date.now() }, ...rest].slice(0, 12));
  },
  splashSeen: () => {
    try {
      return sessionStorage.getItem('wanted.splash') === '1';
    } catch {
      return false;
    }
  },
  setSplashSeen: () => {
    try {
      sessionStorage.setItem('wanted.splash', '1');
    } catch {}
  },
};
