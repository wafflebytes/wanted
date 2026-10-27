'use client';
/**
 * The tour with Gus (lib/guide.ts). Gus leaves the dock (the tabs slide over to fill his spot)
 * and flies to each live surface. One line at a time sits beside him. Everything else blurs
 * behind a veil with a cut-out, so the one thing he means comes through sharp and only it
 * takes presses; the thing to press shines. On Done he flies back into the dock.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gus } from './Gus';
import { gus } from '@web/lib/gus';
import { guide, useGuide, type GuideStep } from '@web/lib/guide';
import { haptic } from '@web/lib/haptics';
import { live } from '@web/lib/live';
import '../app/guide.css';

type Box = { x: number; y: number; w: number; h: number; r: number };
const PAD = 6;
const SIZE = 72;
const GAP = 14;

export function steps(): GuideStep[] {
  return [
    {
      id: 'map',
      at: '',
      say: 'Hi, I’m Gus. I book Maya’s tours. The brighter the map, the more fans she has there.',
      wait: 'next',
      enter: () => (gus.close(), live.expand(null)),
    },
    {
      id: 'island',
      at: '',
      target: 'island',
      say: 'Up here is what I’m doing right now. Tap it.',
      wait: 'tap',
      settle: 700,
      enter: () => gus.close(),
    },
    {
      id: 'card',
      at: '',
      target: 'isl-card',
      cta: '.isl-keys .p',
      say: 'A room said yes. I never spend a dollar without your OK. Open it.',
      wait: 'tap',
      settle: 900,
    },
    {
      id: 'room',
      at: '',
      target: 'room',
      say: 'Their offer next to your floor. When it’s right, you slide to hold the night.',
      wait: 'next',
    },
    {
      id: 'poster',
      at: '/posters',
      target: 'poster',
      say: 'Every city gets a WANTED poster. At fifty fan names, I go ask the rooms.',
      wait: 'next',
      enter: () => gus.close(),
    },
    {
      id: 'held',
      at: '/tour',
      target: 'run',
      say: 'Held nights join your run. I plan the drives and keep the day sheet.',
      wait: 'next',
      enter: () => gus.close(),
    },
    {
      id: 'gus',
      at: '/tour',
      say: 'Hold me to talk, tap me for jobs. I keep working while you’re gone.',
      wait: 'next',
    },
  ];
}

const radius = (el: HTMLElement) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 14;

/** The same hole as an SVG mask with a feathered edge, so the blur fades into the focus. */
function holeMask(vw: number, vh: number, b: Box) {
  const x = b.x - PAD, y = b.y - PAD, w = b.w + PAD * 2, h = b.h + PAD * 2;
  const r = Math.min(b.r + PAD, w / 2, h / 2);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${vw}' height='${vh}'><defs><filter id='f' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='7'/></filter><mask id='m'><rect width='100%' height='100%' fill='white'/><rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${r}' fill='black' filter='url(#f)'/></mask></defs><rect width='100%' height='100%' fill='black' mask='url(#m)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** A full-screen rectangle with a rounded hole: presses on the rest go nowhere. */
function holePath(vw: number, vh: number, b: Box) {
  const x = b.x - PAD, y = b.y - PAD, w = b.w + PAD * 2, h = b.h + PAD * 2;
  const r = Math.min(b.r + PAD, w / 2, h / 2);
  return `path(evenodd, 'M0 0H${vw}V${vh}H0Z M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z')`;
}

export function Guide({ slug }: { slug: string }) {
  const g = useGuide();
  const router = useRouter();
  const path = usePathname();
  const all = useMemo(steps, []);
  const step = g.on ? all[g.i] : null;
  const [box, setBox] = useState<Box | null>(null);
  const [cta, setCta] = useState<Box | null>(null);
  const [home, setHome] = useState<Box | null>(null);
  const [shown, setShown] = useState(false);
  const [landing, setLanding] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [nudge, setNudge] = useState(0);
  const flying = g.on && !g.parked && !!step;

  useEffect(() => {
    guide.restore();
    // A reload closes the island card and the deal room, so those steps start again from the island.
    const s = guide.get();
    if (s.on && ['card', 'room'].includes(all[s.i]?.id)) guide.go(all.findIndex((x) => x.id === 'island'));
    if (new URLSearchParams(location.search).has('tour')) {
      guide.start();
      const u = new URL(location.href);
      u.searchParams.delete('tour');
      history.replaceState(null, '', u);
    }
  }, [all]);

  // Gus leaves the dock: the dock button folds away while he's out.
  useEffect(() => {
    const out = flying && !leaving;
    document.documentElement.classList.toggle('guide-on', out);
    if (!out) setLaunched(false);
    else requestAnimationFrame(() => requestAnimationFrame(() => setLaunched(true)));
    return () => document.documentElement.classList.remove('guide-on');
  }, [flying, leaving]);

  // Each step: go where it lives, set the stage, then the line comes in.
  useEffect(() => {
    if (!flying || !step) return;
    const want = `/a/${slug}${step.at}`;
    if (path !== want && !['island', 'card', 'room'].includes(step.id)) router.push(want);
    step.enter?.();
    setLanding(false);
    setShown(false);
    const t = setTimeout(() => setShown(true), 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying, g.i]);

  // Follow the target (drawers settle, sheets scroll) and the dock's Gus spot.
  useEffect(() => {
    if (!g.on) return;
    let raf = 0;
    let last = '';
    const read = () => {
      const el = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      const r = el?.getBoundingClientRect();
      const c = el && step?.cta ? el.querySelector<HTMLElement>(step.cta) : el;
      const cr = c?.getBoundingClientRect();
      const d = document.querySelector('.dock')?.getBoundingClientRect();
      const key = JSON.stringify([r && [r.left | 0, r.top | 0, r.width | 0, r.height | 0], cr && [cr.left | 0, cr.top | 0, cr.width | 0], d && [d.right | 0, d.top | 0]]);
      if (key !== last) {
        last = key;
        setBox(el && r && r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height, r: radius(el) } : null);
        setCta(c && cr && cr.width > 0 ? { x: cr.left, y: cr.top, w: cr.width, h: cr.height, r: radius(c) } : null);
        if (d) setHome({ x: d.right - d.height, y: d.top, w: d.height, h: d.height, r: d.height / 2 });
      }
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [g.on, step?.target]);

  const finish = useCallback((done: boolean) => {
    setLeaving(true);
    setTimeout(() => {
      guide.end(done);
      guide.markSeen();
      setLeaving(false);
      if (done) live.bump({ big: 'All yours', small: 'Gus keeps working while you’re away', tone: 'ok' }, 2600);
    }, 560);
  }, []);

  const advance = useCallback(() => {
    haptic('step');
    if (g.i >= all.length - 1) return finish(true);
    if (all[g.i].id === 'room') gus.close();
    guide.next();
  }, [g.i, all, finish]);

  // A press on the one thing is the step. Everything else sits under the veil, and other
  // presses inside the cut-out are swallowed.
  useEffect(() => {
    if (!flying || !step?.target || step.wait !== 'tap') return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const inside = t.closest(`[data-tour="${step.target}"]`);
      if (!inside) return;
      if (step.cta && !t.closest(step.cta)) {
        e.preventDefault();
        e.stopPropagation();
        return setNudge((n) => n + 1);
      }
      setLanding(true);
      setTimeout(advance, step.settle ?? 600);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [flying, step, advance]);

  useEffect(() => {
    if (!flying) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [flying, finish]);

  if (!flying) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const col = Math.min(vw, 480);
  const right = (vw + col) / 2 - 16;
  const floor = home ? home.y - 12 : vh - 90;
  // The row (line + Gus) goes above the target if it fits, else below, else over the dock. The
  // last line sits right over Gus's spot in the dock, where he'll go back to.
  let top: number | undefined;
  let bottom: number | undefined;
  if (step?.id === 'gus') bottom = vh - floor;
  else if (!box) top = vh * 0.56;
  else if (box.y - PAD - GAP - 120 > 56) bottom = vh - (box.y - PAD - GAP);
  else if (box.y + box.h + PAD + GAP + 120 < floor) top = box.y + box.h + PAD + GAP;
  else bottom = vh - floor;
  let gx = right - SIZE;
  let gy = top !== undefined ? top : vh - (bottom ?? 0) - SIZE;
  if ((!launched || leaving) && home) {
    gx = home.x + (home.w - SIZE) / 2;
    gy = home.y + (home.h - SIZE) / 2;
  }
  const veil = box ? holePath(vw, vh, box) : undefined;
  const mask = box ? holeMask(vw, vh, box) : undefined;
  const last = g.i === all.length - 1;

  return (
    <div className={`guide ${landing ? 'is-landing' : ''} ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
      <div className={`guide-veil ${box ? '' : 'is-open'}`} style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined} />
      <div
        className="guide-block"
        style={{ clipPath: veil }}
        onClick={() => {
          haptic('tick');
          setNudge((n) => n + 1);
        }}
      />
      {cta && step?.wait === 'tap' && !landing && (
        <div className="guide-shine" style={{ transform: `translate(${cta.x}px, ${cta.y}px)`, width: cta.w, height: cta.h, borderRadius: cta.r }}>
          <i />
        </div>
      )}
      <div
        className={`guide-row ${top !== undefined ? 'is-top' : 'is-bottom'}`}
        style={{ top, bottom, left: (vw - col) / 2 + 16, width: col - 32 - SIZE - 10 }}
      >
        {step && (
          <div className={`guide-line ${shown && !landing && !leaving ? 'in' : ''}`} key={step.id}>
            <p>{step.say}</p>
            {step.wait === 'next' && (
              <div className="guide-keys">
                <button className="guide-next" onClick={advance}>
                  <span>{last ? 'Done' : 'Next'}</span>
                </button>
                {!last && (
                  <button className="guide-skip" onClick={() => finish(false)}>
                    Skip tour
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="guide-gus" style={{ transform: `translate(${gx}px, ${gy}px)` }} aria-hidden>
        <div className="guide-gus-in" key={nudge}>
          <Gus mood={step?.wait === 'tap' ? 'talking' : 'idle'} size={SIZE} sticker={false} />
        </div>
      </div>
    </div>
  );
}
