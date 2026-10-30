'use client';
/**
 * The tour with Gus (lib/guide.ts). Gus leaves the dock (the tabs slide over to fill his spot)
 * and flies to each live surface. One line at a time sits beside him. Everything else blurs
 * behind a veil with a cut-out, so the one thing he means comes through sharp and only it
 * takes presses; the thing to press shines. On Done he flies back into the dock.
 *
 * The order is what a newcomer needs, in turn: where Maya's fans are (context), asking Gus
 * something yourself (he works on live data, and you did it), the offer and your slide (the
 * money is yours), how fans prove a city, the tour it adds up to, and the record he keeps while
 * you're away. It ends on what is now under way, not on an instruction.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Deal } from '@/lib/types';
import type { ArtistState } from '@/ui/types';
import { Gus } from './Gus';
import { Icon } from './Icon';
import { gus, useGus } from '@web/lib/gus';
import { useApi } from '@web/lib/hooks';
import { story } from '@web/lib/story';
import { guide, useGuide, type GuideStep } from '@web/lib/guide';
import { haptic } from '@web/lib/haptics';
import { live } from '@web/lib/live';
import '../app/guide.css';

type Box = { x: number; y: number; w: number; h: number; r: number };
const PAD = 6;
const SIZE = 72;
const GAP = 14;

/** Each comes back with something Gus can do in place (night chips, a venue to ask, spots to pin). */
const ASKS = ['Which night should I play Ithaca?', 'Which venues in Burlington fit me?', 'Where should I put posters in Burlington?'];

export function steps(): GuideStep[] {
  return [
    {
      id: 'map',
      at: '',
      say: 'This is Maya’s map. The brighter it glows, the more of her fans live there. The pins are the cities you just found.',
      wait: 'next',
      enter: () => (gus.close(), live.expand(null)),
    },
    {
      id: 'ask',
      at: '',
      say: 'I’m Gus, her tour manager. Ask me something, like you’d ask a person.',
      wait: 'ask',
      asks: ASKS,
      working: 'Looking it up live. Each check shows up as I make it.',
      side: 'dock',
      enter: () => live.expand(null),
    },
    {
      id: 'answer',
      at: '',
      target: 'vc',
      side: 'dock',
      say: 'Live data, not a script. When I can act on an answer, I offer to, and nothing goes out without your OK.',
      wait: 'next',
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
      say: 'A venue said yes to a show. I never spend a dollar without your OK. Open it.',
      wait: 'tap',
      settle: 900,
    },
    {
      id: 'room',
      at: '',
      target: 'room',
      say: 'Their offer, next to the limits you set me. If it looks right, you slide to book the date.',
      wait: 'next',
    },
    {
      id: 'poster',
      at: '/posters',
      target: 'poster',
      say: 'Every city gets a WANTED poster for fans to sign. At 50 names, I ask venues there for a date.',
      wait: 'next',
      enter: () => gus.close(),
    },
    {
      id: 'held',
      at: '/tour',
      target: 'run',
      say: 'Booked shows land on her tour. I plan the drives and every show day.',
      wait: 'next',
      enter: () => gus.close(),
    },
    {
      id: 'mail',
      at: '/pulse',
      target: 'mail',
      say: 'Fan Mail: how many fans signed this week, and what they’re saying about Maya.',
      wait: 'next',
    },
    {
      id: 'log',
      at: '/logbook',
      target: 'log',
      say: 'The Logbook: everything I did while you were away, and what needed you.',
      wait: 'next',
    },
    { id: 'end', at: '', say: '', wait: 'end' },
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
  // The ask step: which question went to Gus, and whether he's taking long or lost it.
  const [asked, setAsked] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [mulling, setMulling] = useState(false);
  const [missed, setMissed] = useState(false);
  const voice = useGus();
  const flying = g.on && !g.parked && !!step;
  const target = step?.wait === 'ask' ? (asked ? 'vc' : undefined) : step?.target;
  const act = useApi<ArtistState>(g.on ? `/artist/${slug}` : null);
  const dealList = useApi<{ deals: Deal[] }>(g.on ? `/artist/${slug}/deals` : null);

  useEffect(() => {
    guide.restore();
    // A reload closes the island card, the deal room and Gus's card, so those steps start again.
    const s = guide.get();
    if (s.on && ['card', 'room'].includes(all[s.i]?.id)) guide.go(all.findIndex((x) => x.id === 'island'));
    if (s.on && all[s.i]?.id === 'answer') guide.go(all.findIndex((x) => x.id === 'ask'));
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
    if (path !== want && !['ask', 'answer', 'island', 'card', 'room'].includes(step.id)) router.push(want);
    step.enter?.();
    setLanding(false);
    setShown(false);
    setAsked(null);
    setSlow(false);
    setMissed(false);
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
      const el = target ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`) : null;
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
  }, [g.on, target]);

  const finish = useCallback((done: boolean) => {
    setLeaving(true);
    setTimeout(() => {
      guide.end(done);
      guide.markSeen();
      setLeaving(false);
      if (done) live.bump({ big: 'All yours', small: 'Gus keeps working', tone: 'ok' }, 2600);
    }, 560);
  }, []);

  const advance = useCallback(() => {
    haptic('step');
    if (g.i >= all.length - 1) return finish(true);
    if (all[g.i].id === 'room' || all[g.i].id === 'answer') gus.close();
    guide.next();
  }, [g.i, all, finish]);

  // You picked a question: Gus hears it in his card, works it out in the open, and answers. The
  // step is done when the answer is in. If he loses it, the questions come back; if he's slow,
  // a key lets you go on without him.
  const ask = (q: string) => {
    haptic('tap');
    setAsked(q);
    setMissed(false);
    setSlow(false);
    setMulling(false);
    gus.dictate(q);
  };
  useEffect(() => {
    if (!flying || step?.wait !== 'ask' || !asked) return;
    if (voice.phase === 'answer' && voice.answer) {
      setLanding(true);
      const t = setTimeout(() => {
        setLanding(false);
        guide.next();
      }, 900);
      return () => clearTimeout(t);
    }
    // He lost the thread, or the card was closed before he answered.
    if ((voice.phase === 'answer' && voice.error) || (voice.panel === 'none' && voice.phase !== 'thinking')) {
      setAsked(null);
      setMissed(true);
      gus.close();
    }
  }, [flying, step?.wait, asked, voice.phase, voice.answer, voice.error, voice.panel]);
  useEffect(() => {
    if (!asked) return;
    const m = setTimeout(() => setMulling(true), 8000);
    const t = setTimeout(() => setSlow(true), 25_000);
    return () => (clearTimeout(m), clearTimeout(t));
  }, [asked]);

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
  if (step?.side === 'dock') bottom = vh - floor;
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
  const end = step?.wait === 'end';
  const count = all.filter((x) => x.wait !== 'end').length;
  const working = step?.wait === 'ask' && !!asked;
  const say = working ? (slow ? 'Taking longer than usual. You can wait, or go on and ask me later.' : mulling ? 'Thinking it through first, like a person would. A few more seconds.' : step!.working) : missed ? 'That one got away from me. Try another?' : step?.say;

  if (end) {
    const deals = dealList.data?.deals ?? [];
    const facts = [
      { n: act.data?.opened.length ?? 0, t: 'cities with a poster up' },
      { n: deals.filter((d) => d.status === 'held').length, t: 'shows booked' },
      { n: deals.filter((d) => d.status === 'waiting').length, t: 'offer waiting on you' },
    ];
    return (
      <div className={`guide is-end ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-label="The tour is done">
        <div className="guide-veil is-full" />
        <div className="guide-block" />
        <div className="guide-end">
          <Gus mood="proud" size={96} sticker={false} className="ge-gus" />
          <h2>Maya’s tour is under way.</h2>
          <p>I keep working while the app is closed: watching the posters, asking venues, and bringing you offers to approve.</p>
          <dl className="ge-facts">
            {facts.map((f) => (
              <div key={f.t}>
                <dt>{f.n}</dt>
                <dd>{f.n === 1 ? f.t.replace('cities', 'city').replace('shows', 'show') : f.t.replace('offer waiting', 'offers waiting')}</dd>
              </div>
            ))}
          </dl>
          <button className="btn hot block" onClick={() => (haptic('commit'), finish(true))}>
            Take it from here
          </button>
          <button
            className="ge-again"
            onClick={() => {
              finish(true);
              setTimeout(() => story.start(), 620);
            }}
          >
            Or watch Gus run the whole thing
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>
    );
  }

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
            <p key={say}>{say}</p>
            {step.wait === 'ask' && !asked && (
              <div className="guide-asks">
                {step.asks?.map((q) => (
                  <button key={q} onClick={() => ask(q)}>
                    <span>{q}</span>
                    <Icon name="forward" size={16} />
                  </button>
                ))}
              </div>
            )}
            <div className="guide-keys">
              {(step.wait === 'next' || (working && slow)) && (
                <button className="guide-next" onClick={working ? () => (gus.close(), guide.go(all.findIndex((x) => x.id === 'island'))) : advance}>
                  <span>{working ? 'Go on' : 'Next'}</span>
                </button>
              )}
              <span className="guide-count" aria-label={`Step ${g.i + 1} of ${count}`}>
                {g.i + 1} of {count}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="guide-gus" style={{ transform: `translate(${gx}px, ${gy}px)` }} aria-hidden>
        <div className="guide-gus-in" key={nudge}>
          <Gus mood={working ? 'thinking' : step?.wait === 'tap' || step?.wait === 'ask' ? 'talking' : 'idle'} size={SIZE} sticker={false} />
        </div>
      </div>
    </div>
  );
}
