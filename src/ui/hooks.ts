import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { api, ApiError } from './api';

type Entry = { data: unknown; at: number };
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

/** Drops cached responses whose path starts with the prefix and refetches any mounted users. */
export function invalidate(prefix: string) {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
  for (const [key, set] of listeners) if (key.startsWith(prefix)) set.forEach((fn) => fn());
}

/** Seeds the cache, for example with the map data a Scout run already returned. */
export function prime(path: string, data: unknown) {
  cache.set(path, { data, at: Date.now() });
}

/**
 * Small stale-while-revalidate fetch hook. Tab switches render cached data at once;
 * `poll` refreshes in the background (claims arriving on the map, the inbox).
 */
export function useApi<T>(path: string | null, opts: { poll?: number } = {}) {
  const [data, setData] = useState<T | null>(() => (path ? ((cache.get(path)?.data as T) ?? null) : null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!data && !!path);
  const alive = useRef(true);

  const load = useCallback(
    async (quiet = false) => {
      if (!path) return;
      if (!quiet) setLoading(true);
      try {
        const d = await api.get<T>(path);
        cache.set(path, { data: d, at: Date.now() });
        if (alive.current) {
          setData(d);
          setError(null);
        }
        return d;
      } catch (e) {
        if (alive.current) setError(e instanceof ApiError ? e.message : 'Network trouble. Try again.');
        return null;
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    alive.current = true;
    if (!path) return;
    const hit = cache.get(path);
    if (hit) setData(hit.data as T);
    load(!!hit);
    const set = listeners.get(path) ?? new Set();
    const refetch = () => load(true);
    set.add(refetch);
    listeners.set(path, set);
    return () => {
      alive.current = false;
      set.delete(refetch);
    };
  }, [path, load]);

  useEffect(() => {
    if (!opts.poll || !path) return;
    const t = setInterval(() => load(true), opts.poll);
    return () => clearInterval(t);
  }, [opts.poll, path, load]);

  return { data, error, loading, reload: () => load(true), setData };
}

/** Reduce Motion (PRD 8.6). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
