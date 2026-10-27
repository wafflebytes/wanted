'use client';
/**
 * The spinning reel counter (transitions.dev): each digit spins down a strip and lands with a
 * slight stagger, blurred while it moves. Used for signature counts and money.
 */
import { useEffect, useRef, useState } from 'react';

export function Reel({ value, className, prefix = '', duration = 1400, stagger = 90, delay = 0 }: { value: number; className?: string; prefix?: string; duration?: number; stagger?: number; delay?: number }) {
  const digits = Math.round(value).toLocaleString('en-US').split('');
  const [armed, setArmed] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    // First paint starts every reel at 0, then spins to the value.
    const id = setTimeout(() => setArmed(true), first.current ? 60 + delay : 0);
    first.current = false;
    return () => clearTimeout(id);
  }, [delay]);
  let d = 0;
  const n = digits.filter((c) => /\d/.test(c)).length;
  return (
    <span className={`reel ${className ?? ''}`} aria-label={`${prefix}${digits.join('')}`} role="img">
      {prefix && <span className="reel-sym">{prefix}</span>}
      {digits.map((c, i) => {
        if (!/\d/.test(c)) return <span key={`s${i}`} className="reel-sym">{c}</span>;
        const k = n - 1 - d++;
        const target = armed ? 20 + Number(c) : 0;
        return (
          <span key={`d${i}-${digits.length}`} className="reel-col" aria-hidden>
            <span className={`reel-strip ${armed ? 'go' : ''}`} style={{ transform: `translateY(${-target}em)`, transitionDuration: `${duration}ms`, transitionDelay: `${k * stagger}ms`, animationDuration: `${duration}ms`, animationDelay: `${k * stagger}ms` }}>
              {Array.from({ length: 30 }, (_, j) => (
                <span key={j}>{j % 10}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
