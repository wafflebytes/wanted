'use client';
/**
 * A drawer with detents (peek, half, full). Drag the grabber or the head; it settles on the
 * nearest detent, or the next one if you flicked. The body scrolls only at the top detent.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Sheet({ detents, at, onAt, head, children, className }: { detents: number[]; at: number; onAt: (i: number) => void; head?: ReactNode; children: ReactNode; className?: string }) {
  const max = detents[detents.length - 1];
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; t: number; lastY: number; lastT: number } | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const h = drag ?? detents[Math.min(at, detents.length - 1)];

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [data-nodrag]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h, t: performance.now(), lastY: e.clientY, lastT: performance.now() };
  };
  const move = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (drag === null && Math.abs(dy) < 4) return;
    let next = s.h + dy;
    // Rubber band past the ends.
    if (next > max) next = max + (next - max) * 0.25;
    if (next < detents[0]) next = detents[0] - (detents[0] - next) * 0.25;
    s.lastY = e.clientY;
    s.lastT = performance.now();
    setDrag(next);
  };
  const up = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || drag === null) return setDrag(null);
    const v = (s.lastY - e.clientY) / Math.max(1, performance.now() - s.lastT); // px/ms, up is positive
    let i = detents.reduce((best, d, j) => (Math.abs(d - drag) < Math.abs(detents[best] - drag) ? j : best), 0);
    if (Math.abs(v) > 0.45) {
      const dir = v > 0 ? 1 : -1;
      const ahead = detents.findIndex((d) => (dir > 0 ? d > drag + 10 : false));
      if (dir > 0 && ahead >= 0) i = ahead;
      if (dir < 0) i = Math.max(0, detents.filter((d) => d < drag - 10).length - 1);
    }
    setDrag(null);
    onAt(i);
  };

  // At the top detent the body scrolls; elsewhere a scroll gesture moves the sheet instead.
  const full = at === detents.length - 1 && drag === null;
  useEffect(() => {
    if (!full && body.current) body.current.scrollTop = 0;
  }, [full]);

  return (
    <section className={`sheet ${drag !== null ? 'is-drag' : ''} ${full ? 'is-full' : ''} ${className ?? ''}`} style={{ height: max, transform: `translateY(${max - h}px)` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <button className="sheet-grab" aria-label={full ? 'Lower the drawer' : 'Raise the drawer'} onClick={() => onAt(at >= detents.length - 1 ? 0 : at + 1)}>
        <i />
      </button>
      {head && <div className="sheet-head">{head}</div>}
      <div className="sheet-body" ref={body} style={{ overflowY: full ? 'auto' : 'hidden' }}>
        {children}
      </div>
    </section>
  );
}
