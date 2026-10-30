'use client';
/**
 * A tiny stale-while-revalidate cache: screens read instantly from the last answer and refresh
 * behind it, so moving between tabs never shows a spinner twice.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api } from './api';

type Entry = { data?: unknown; error?: Error; at: number; inflight?: Promise<unknown> };
const cache = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();

function notify(key: string) {
  subs.get(key)?.forEach((f) => f());
}

export function mutate<T>(path: string, data?: T | ((prev: T | undefined) => T)) {
  const e = cache.get(path) ?? { at: 0 };
  if (data !== undefined) {
    const next = typeof data === 'function' ? (data as (p: T | undefined) => T)(e.data as T | undefined) : data;
    cache.set(path, { ...e, data: next, at: Date.now() });
    notify(path);
    return Promise.resolve(next);
  }
  return load(path, true);
}

function load(path: string, force = false): Promise<unknown> {
  const e = cache.get(path);
  if (e?.inflight) return e.inflight;
  if (!force && e?.data !== undefined && Date.now() - e.at < 4000) return Promise.resolve(e.data);
  const p = api
    .get<unknown>(path)
    .then((data) => {
      cache.set(path, { data, at: Date.now() });
      notify(path);
      return data;
    })
    .catch((error: Error) => {
      cache.set(path, { ...(cache.get(path) ?? { at: 0 }), error, inflight: undefined });
      notify(path);
      throw error;
    });
  cache.set(path, { ...(e ?? { at: 0 }), inflight: p });
  return p;
}

/** Fetch these into the cache ahead of time (a tour about to open them), quietly. */
export function warm(paths: string[]) {
  for (const p of paths) load(p).catch(() => {});
}

/** GET `path` (or nothing while `path` is null). Optional polling for live screens. */
export function useApi<T>(path: string | null, opts: { every?: number } = {}) {
  const subscribe = useCallback(
    (fn: () => void) => {
      if (!path) return () => {};
      if (!subs.has(path)) subs.set(path, new Set());
      subs.get(path)!.add(fn);
      return () => subs.get(path)?.delete(fn);
    },
    [path],
  );
  const snap = useSyncExternalStore(
    subscribe,
    () => (path ? cache.get(path) : undefined),
    () => undefined,
  );
  useEffect(() => {
    if (!path) return;
    load(path).catch(() => {});
    if (!opts.every) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(path, true).catch(() => {});
    }, opts.every);
    return () => clearInterval(id);
  }, [path, opts.every]);
  return {
    data: snap?.data as T | undefined,
    error: snap?.data === undefined ? snap?.error : undefined,
    loading: !!path && snap?.data === undefined && !snap?.error,
    refresh: () => (path ? load(path, true) : Promise.resolve(undefined)),
  };
}

export function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return r;
}

/** True when the page is drawn dark (saved choice, else the system). */
export function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)');
    const on = () => {
      const t = document.documentElement.dataset.theme;
      setDark(t === 'dark' || (t !== 'light' && m.matches));
    };
    on();
    m.addEventListener('change', on);
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      m.removeEventListener('change', on);
      mo.disconnect();
    };
  }, []);
  return dark;
}

/** Runs once after mount; returns whether we're past hydration (for client-only bits). */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** The previous value of `v` across renders. */
export function usePrevious<T>(v: T) {
  const r = useRef<T>(v);
  useEffect(() => {
    r.current = v;
  }, [v]);
  return r.current;
}

/** The last size seen, so a tab opened later starts at the real width (no phone drawer flashing in on a computer). */
let lastViewport: { w: number; h: number } | null = null;

/** Window size, for drawer detents. */
export function useViewport() {
  const [v, setV] = useState(() => lastViewport ?? { w: 390, h: 844 });
  useEffect(() => {
    const on = () => setV((lastViewport = { w: window.innerWidth, h: window.innerHeight }));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

/**
 * A computer's side panel folds its head card as it scrolls, in one move: a little way down it folds,
 * back at the top it opens, so it never rests half cut. (Only when there's enough below to fold for.)
 */
export function foldPanel(e: { currentTarget: HTMLElement }) {
  const el = e.currentTarget;
  const panel = el.parentElement!;
  const folded = panel.hasAttribute('data-folded');
  const next = folded ? el.scrollTop > 8 : el.scrollTop > 40 && el.scrollHeight - el.clientHeight > 420;
  if (next === folded) return;
  panel.toggleAttribute('data-folded', next);
  panel.style.setProperty('--p', next ? '1' : '0');
}
