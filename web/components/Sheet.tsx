'use client';
/**
 * A drawer with detents (peek, half, full) that behaves like one surface with its content, the
 * way Maps and Find My do on a phone:
 *
 * - It follows the finger 1:1 from anywhere on it, not only the grabber. Let go and it glides
 *   on with the speed you gave it (a critically damped spring: no bounce), landing on the
 *   detent your flick was heading for.
 * - Scrolling is the same gesture. Below the top, a scroll raises the drawer; at the top it
 *   hands over to the list mid-swipe. Pull the list down past its start and the drawer follows.
 * - A trackpad or mouse wheel does the same on a computer: the drawer tracks the wheel, then
 *   settles one detent along; leftover momentum is swallowed so the list doesn't jump.
 *
 * Progress is exposed as CSS variables so the content can morph with the drag instead of
 * swapping at a detent: `--p` runs 0 to 1 from peek to half, `--q` 0 to 1 from half to full.
 */
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { haptic } from '@web/lib/haptics';

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
// Past the ends the drawer gives a little and resists more the further you pull.
const band = (over: number) => 60 * (1 - 1 / (over / 160 + 1));
// The spring: response 0.42 s, critically damped. Apple-quiet; it never overshoots.
const OMEGA = (2 * Math.PI) / 0.42;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Sheet({ detents, at, onAt, head, children, className }: { detents: number[]; at: number; onAt: (i: number) => void; head?: ReactNode; children: ReactNode; className?: string }) {
  const max = detents[detents.length - 1];
  const el = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const h = useRef(detents[Math.min(at, detents.length - 1)]);
  const target = useRef(h.current);
  const raf = useRef(0);
  const live = useRef({ detents, onAt, at });
  live.current = { detents, onAt, at };

  /** Paint a height: transform, progress variables, and whether the list may scroll. */
  const paint = (next: number) => {
    const d = live.current.detents;
    const top = d[d.length - 1];
    h.current = next;
    const s = el.current;
    if (!s) return;
    s.style.transform = `translate3d(0, ${Math.round((top - next) * 10) / 10}px, 0)`;
    const p = clamp((next - d[0]) / (d[1] - d[0]));
    s.style.setProperty('--p', p.toFixed(3));
    s.toggleAttribute('data-folded', p > 0.5);
    s.style.setProperty('--q', d.length > 2 ? clamp((next - d[1]) / (d[2] - d[1])).toFixed(3) : '1');
    s.toggleAttribute('data-full', next >= top - 0.5);
  };

  /** Glide to a detent, starting at the speed of the hand (px/s, up positive). */
  const settle = (i: number, v = 0) => {
    const d = live.current.detents;
    i = clamp(i, 0, d.length - 1);
    const to = d[i];
    cancelAnimationFrame(raf.current);
    target.current = to;
    if (i !== live.current.at) {
      live.current.at = i;
      live.current.onAt(i);
    }
    if (reduced()) return paint(to);
    const x0 = h.current - to;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      const e = Math.exp(-OMEGA * t);
      const x = (x0 + (v + OMEGA * x0) * t) * e;
      const vel = (v - OMEGA * (v + OMEGA * x0) * t) * e;
      if (Math.abs(x) < 0.4 && Math.abs(vel) < 8) {
        paint(to);
        if (Math.abs(x0) > 30) haptic('tick');
        return;
      }
      paint(to + x);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  /** Where a release lands: project the flick forward, take the nearest detent. */
  const landing = (v: number) => {
    const d = live.current.detents;
    const projected = h.current + v * 0.18;
    let i = d.reduce((best, x, j) => (Math.abs(x - projected) < Math.abs(d[best] - projected) ? j : best), 0);
    // A deliberate flick always moves at least one detent from where the hand let go.
    if (Math.abs(v) > 500) {
      const from = d.reduce((best, x, j) => (Math.abs(x - h.current) < Math.abs(d[best] - h.current) ? j : best), 0);
      if (i === from && Math.abs(d[from] - h.current) < 40) i = clamp(from + Math.sign(v), 0, d.length - 1);
    }
    return i;
  };

  /** Move the drawer by a hand delta (px, up positive). At the top, the rest scrolls the list. */
  const drive = (next: number) => {
    const d = live.current.detents;
    const top = d[d.length - 1];
    const b = body.current;
    if (next > top) {
      const room = b ? b.scrollHeight - b.clientHeight - b.scrollTop : 0;
      if (b && room > 0) {
        b.scrollTop += next - top;
        return paint(top);
      }
      return paint(top + band(next - top));
    }
    if (next < d[0]) return paint(d[0] - band(d[0] - next));
    paint(next);
  };

  // Mount and outside changes (a tap on the grabber, the search field, a new city): glide there.
  useLayoutEffect(() => {
    paint(h.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const to = detents[Math.min(at, detents.length - 1)];
    if (target.current !== to) settle(at);
    if (at < detents.length - 1 && body.current) body.current.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  }, [at, detents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch: one gesture for drawer and list.
  useEffect(() => {
    const s = el.current;
    if (!s) return;
    let g: { y: number; x: number; base: number; mode: 'sheet' | 'list' | 'off' | null; lastY: number; lastT: number; v: number } | null = null;
    const full = () => h.current >= live.current.detents[live.current.detents.length - 1] - 0.5;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return (g = null);
      cancelAnimationFrame(raf.current);
      const y = e.touches[0].clientY;
      g = { y, x: e.touches[0].clientX, base: h.current, mode: null, lastY: y, lastT: performance.now(), v: 0 };
    };
    const move = (e: TouchEvent) => {
      if (!g || g.mode === 'off') return;
      const y = e.touches[0].clientY;
      const dy = g.y - y;
      const b = body.current;
      if (!g.mode) {
        const dx = e.touches[0].clientX - g.x;
        if (Math.abs(dy) < 5 && Math.abs(dx) < 5) return;
        // Sideways on a pager: leave it to the pager.
        if (Math.abs(dx) > Math.abs(dy) && (e.target as HTMLElement).closest('[data-nodrag]')) return void (g.mode = 'off');
        const listCanTake = full() && b && (b.scrollTop > 0 || dy > 0);
        g.mode = listCanTake ? 'list' : 'sheet';
        g.y = y;
        g.base = h.current;
      }
      if (g.mode === 'list') {
        // The list ran out of room going down: hand the rest of this swipe to the drawer.
        if (b && b.scrollTop <= 0 && y > g.lastY) {
          g.mode = 'sheet';
          g.y = y;
          g.base = h.current;
        } else {
          g.lastY = y;
          g.lastT = performance.now();
          return;
        }
      }
      if (e.cancelable) e.preventDefault();
      const now = performance.now();
      const inst = ((g.lastY - y) / Math.max(1, now - g.lastT)) * 1000;
      g.v = g.v * 0.4 + inst * 0.6;
      g.lastY = y;
      g.lastT = now;
      drive(g.base + (g.y - y));
    };
    const end = () => {
      if (g?.mode === 'sheet') {
        if (performance.now() - g.lastT > 90) g.v = 0;
        settle(landing(g.v), g.v);
      }
      g = null;
    };
    s.addEventListener('touchstart', start, { passive: true });
    s.addEventListener('touchmove', move, { passive: false });
    s.addEventListener('touchend', end);
    s.addEventListener('touchcancel', end);
    return () => {
      s.removeEventListener('touchstart', start);
      s.removeEventListener('touchmove', move);
      s.removeEventListener('touchend', end);
      s.removeEventListener('touchcancel', end);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trackpad and wheel: the drawer tracks the scroll, then settles one detent along.
  useEffect(() => {
    const s = el.current;
    if (!s) return;
    let w: { from: number; idle: number; lock: boolean } | null = null;
    const done = () => {
      if (!w) return;
      const d = live.current.detents;
      const from = d.reduce((best, x, j) => (Math.abs(x - w!.from) < Math.abs(d[best] - w!.from) ? j : best), 0);
      const moved = h.current - w.from;
      const i = Math.abs(moved) > 18 ? clamp(from + Math.sign(moved), 0, d.length - 1) : from;
      if (!w.lock) settle(i);
      w = null;
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom on a trackpad
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && (e.target as HTMLElement).closest('[data-nodrag]')) return;
      const d = live.current.detents;
      const top = d[d.length - 1];
      const b = body.current;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const isFull = h.current >= top - 0.5;
      if (!w && isFull && b && (b.scrollTop > 0 || dy > 0)) return; // the list's turn
      e.preventDefault();
      if (!w) {
        cancelAnimationFrame(raf.current);
        w = { from: h.current, idle: 0, lock: false };
      }
      clearTimeout(w.idle);
      w.idle = window.setTimeout(done, 140);
      if (w.lock) return; // momentum after the drawer arrived: let it die out
      const next = h.current + dy;
      if (next >= top && dy > 0) {
        paint(top);
        w.lock = true;
        settle(d.length - 1);
        return;
      }
      if (next <= d[0] && dy < 0) {
        paint(d[0]);
        w.lock = true;
        settle(0);
        return;
      }
      paint(next);
    };
    s.addEventListener('wheel', wheel, { passive: false });
    return () => s.removeEventListener('wheel', wheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse drag (a pen or a mouse on a narrow window), anywhere but controls.
  const mouse = useRef<{ y: number; base: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [data-nodrag]')) return;
    cancelAnimationFrame(raf.current);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    mouse.current = { y: e.clientY, base: h.current, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false };
  };
  const pmove = (e: React.PointerEvent) => {
    const m = mouse.current;
    if (!m) return;
    if (!m.moved && Math.abs(m.y - e.clientY) < 4) return;
    m.moved = true;
    const now = performance.now();
    m.v = m.v * 0.4 + ((m.lastY - e.clientY) / Math.max(1, now - m.lastT)) * 1000 * 0.6;
    m.lastY = e.clientY;
    m.lastT = now;
    drive(m.base + (m.y - e.clientY));
  };
  const up = () => {
    const m = mouse.current;
    mouse.current = null;
    if (!m?.moved) return;
    if (performance.now() - m.lastT > 90) m.v = 0;
    settle(landing(m.v), m.v);
  };

  const isFull = at === detents.length - 1;
  return (
    <section ref={el} className={`sheet ${className ?? ''}`} style={{ height: max }} onPointerDown={down} onPointerMove={pmove} onPointerUp={up} onPointerCancel={up}>
      <button className="sheet-grab" aria-label={isFull ? 'Lower the drawer' : 'Raise the drawer'} onClick={() => settle(at >= detents.length - 1 ? 0 : at + 1)}>
        <i />
      </button>
      {head && <div className="sheet-head">{head}</div>}
      <div className="sheet-body" ref={body}>
        {children}
      </div>
    </section>
  );
}
