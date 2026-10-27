'use client';
/**
 * Settings: your acts, what Gus may do without asking, when he keeps quiet, and how the app
 * looks. Limits are things you can feel (a slider for the deposit, a slider for your cut), not
 * a form. Every change saves as you make it.
 */
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { LogEntry, Mandate } from '@/lib/types';
import type { ArtistState } from '@/ui/types';
import { Icon } from '@web/components/Icon';
import { api } from '@web/lib/api';
import { gus } from '@web/lib/gus';
import { haptic, hapticKind, setHaptics } from '@web/lib/haptics';
import { mutate, useApi } from '@web/lib/hooks';
import { session, type Act } from '@web/lib/session';
import '../../../settings.css';

type Book = { entries: LogEntry[]; mandate: Mandate };
type Theme = 'system' | 'light' | 'dark';
const hour = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
const GITHUB = 'https://github.com/wafflebytes/wanted';

export default function Settings() {
  const slug = useParams<{ artist: string }>().artist;
  const router = useRouter();
  const artist = useApi<ArtistState>(`/artist/${slug}`);
  const book = useApi<Book>(`/artist/${slug}/logbook`);
  const [m, setM] = useState<Mandate | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [theme, setTheme] = useState<Theme>('system');
  const [feel, setFeel] = useState<{ kind: ReturnType<typeof hapticKind>; on: boolean } | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pending = useRef<Partial<Mandate>>({});
  // Gus changed a row from the voice card: light it up so you see what moved.
  const [hl, setHl] = useState<string | null>(null);
  useEffect(() => {
    const k = new URLSearchParams(location.search).get('hl');
    if (!k) return;
    setHl(k);
    const t = setTimeout(() => setHl(null), 2400);
    return () => clearTimeout(t);
  }, []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow the saved limits (Gus or Undo may change them) unless you're mid-drag.
  useEffect(() => {
    if (book.data && !Object.keys(pending.current).length) setM(book.data.mandate);
  }, [book.data]);
  useEffect(() => {
    setActs(session.acts());
    try {
      const t = localStorage.getItem('wanted-theme');
      setTheme(t === 'light' || t === 'dark' ? t : 'system');
    } catch {}
    const kind = hapticKind();
    let on = kind !== 'sound';
    try {
      const h = JSON.parse(localStorage.getItem('wanted-haptics') ?? 'null');
      if (h) on = kind === 'sound' ? !!h.sound : h.enabled !== false;
    } catch {}
    setFeel({ kind, on });
  }, []);
  // Arriving from "Change what Gus can do" lands on that section.
  useEffect(() => {
    if (m && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [!!m]);

  // Sliders send many values; save the last one a beat after the hand stops.
  const change = (patch: Partial<Mandate>) => {
    if (!m) return;
    setM({ ...m, ...patch });
    pending.current = { ...pending.current, ...patch };
    setSaved('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const body = pending.current;
      pending.current = {};
      try {
        const r = await api.post<{ mandate: Mandate }>(`/artist/${slug}/logbook`, { mandate: body });
        setM(r.mandate);
        mutate(`/artist/${slug}/logbook`);
        setSaved('saved');
      } catch {
        setSaved('idle');
        gus.flash('Couldn’t save that');
      }
    }, 450);
  };

  // Phones get real haptics; a Mac can't reach the trackpad, so it offers soft sound ticks.
  const pickFeel = (on: boolean) => {
    if (!feel) return;
    setHaptics(feel.kind === 'sound' ? { sound: on } : { enabled: on });
    setFeel({ ...feel, on });
    if (on) haptic('success');
  };

  const pickTheme = (t: Theme) => {
    haptic('tick');
    setTheme(t);
    try {
      if (t === 'system') localStorage.removeItem('wanted-theme');
      else localStorage.setItem('wanted-theme', t);
    } catch {}
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  };

  const done = () => (history.length > 1 ? router.back() : router.push(`/a/${slug}`));
  const name = artist.data?.artist.name;

  return (
    <main className="st">
      <div className="st-top">
        <h1>Settings</h1>
        <button className="btn sm light" onClick={done}>
          Done
        </button>
      </div>

      <section id="acts">
        <div className="section-h">
          <h2>Your acts</h2>
        </div>
        <ul className="st-group">
          {(acts.length ? acts : name ? [{ slug, name, sounds: [], at: 0 }] : []).map((a) => (
            <li key={a.slug}>
              <Link href={`/a/${a.slug}`} className="st-row">
                <span className="st-av">{a.slug === 'maya-ortiz' ? <img src="/img/maya-avatar.webp" alt="" /> : a.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</span>
                <span className="st-t">
                  <b>{a.name}</b>
                  {a.sounds.length > 0 && <em>Sounds like {a.sounds.slice(0, 2).join(' and ')}</em>}
                </span>
                {a.slug === slug ? <Icon name="check" bold size={18} className="st-on" /> : <Icon name="chevron" size={16} className="ink-4" />}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/?new=1" className="st-row">
              <span className="st-av add">
                <Icon name="add" bold size={18} />
              </span>
              <span className="st-t">
                <b>Add an act</b>
                <em>Another band, a side project, a solo set</em>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section id="gus">
        <div className="section-h">
          <h2>What Gus can do</h2>
          <span className={`st-saved ${saved}`} aria-live="polite">
            {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : ''}
          </span>
        </div>
        {m ? (
          <>
            <ul className="st-group">
              <li className="st-row">
                <span className="st-t">
                  <b>Talk to venues for you</b>
                  <em>When a city fills its poster, he asks a few venues and brings you the best offer.</em>
                </span>
                <Switch on={m.autoAsk} label="Talk to venues for you" onChange={(on) => change({ autoAsk: on })} />
              </li>
              {m.autoAsk && (
                <li className="st-row col">
                  <span className="st-t">
                    <b>Venues to ask at once</b>
                  </span>
                  <div className="seg">
                    {[1, 2, 3].map((n) => (
                      <button key={n} className={m.roomsAtOnce === n ? 'on' : ''} aria-pressed={m.roomsAtOnce === n} onClick={() => (haptic('tick'), change({ roomsAtOnce: n }))}>
                        {n}
                      </button>
                    ))}
                  </div>
                </li>
              )}
              <li className={`st-row col ${hl === 'maxDeposit' ? 'st-hl' : ''}`}>
                <Slide label="Biggest deposit" hint="He won’t agree to put down more to hold a date." value={m.maxDeposit} min={0} max={1000} step={25} show={(v) => (v ? `$${v}` : 'None')} onChange={(v) => change({ maxDeposit: v })} />
              </li>
              <li className={`st-row col ${hl === 'minSplit' ? 'st-hl' : ''}`}>
                <Slide label="Your cut of the door" hint="He won’t take a deal that leaves you less." value={m.minSplit} min={50} max={95} step={5} show={(v) => `${v}%`} onChange={(v) => change({ minSplit: v })} />
              </li>
              <li className="st-row">
                <span className="st-t">
                  <b>Gus can call you</b>
                  <em>Only when money’s on the line and a date is about to go.</em>
                </span>
                <Switch on={m.callsPerWeek > 0} label="Gus can call you" onChange={(on) => change({ callsPerWeek: on ? 1 : 0 })} />
              </li>
            </ul>
            <p className="st-foot">Gus never pays anything without your OK. Test mode: no real money moves.</p>
          </>
        ) : (
          <div className="sk" style={{ height: 300, borderRadius: 22 }} />
        )}
      </section>

      {m && (
        <section id="quiet">
          <div className="section-h">
            <h2>Quiet hours</h2>
          </div>
          <div className="st-group st-quiet">
            <Hour label="From" value={m.quietStart} onChange={(h) => change({ quietStart: h })} />
            <Icon name="moon" size={20} className="ink-3" />
            <Hour label="Until" value={m.quietEnd} onChange={(h) => change({ quietEnd: h })} />
          </div>
          <p className="st-foot">
            No calls or pings between {hour(m.quietStart)} and {hour(m.quietEnd)}. Gus keeps working and tells you in the morning.
          </p>
        </section>
      )}

      <section id="look">
        <div className="section-h">
          <h2>Look</h2>
        </div>
        <div className="seg st-theme">
          {(
            [
              ['system', 'Automatic'],
              ['dark', 'Dark'],
              ['light', 'Light'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={theme === k ? 'on' : ''} aria-pressed={theme === k} onClick={() => pickTheme(k)}>
              {label}
            </button>
          ))}
        </div>
        {feel && feel.kind !== 'none' && (
          <ul className="st-group st-feel">
            <li className="st-row">
              <span className="st-t">
                <b>{feel.kind === 'sound' ? 'Sound ticks' : 'Haptics'}</b>
                <em>{feel.kind === 'sound' ? 'A soft click when you press, hold or Gus answers. Your trackpad can’t buzz from a browser, so this stands in.' : 'A little buzz when you press, hold or Gus answers.'}</em>
              </span>
              <Switch on={feel.on} label={feel.kind === 'sound' ? 'Sound ticks' : 'Haptics'} onChange={pickFeel} />
            </li>
          </ul>
        )}
      </section>

      <section className="st-ios">
        <Icon name="apple" size={26} />
        <div>
          <b>Wanted for iPhone is on the way.</b>
          <p>Same Gus, in your pocket. It’s open source while we build it.</p>
          <a href={GITHUB} target="_blank" rel="noreferrer" className="btn sm light">
            <Icon name="github" size={16} />
            See it on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return <button role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => (haptic(on ? 'tick' : 'tap'), onChange(!on))} />;
}

function Slide({ label, hint, value, min, max, step, show, onChange }: { label: string; hint: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onChange: (v: number) => void }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <>
      <span className="st-t st-slide-h">
        <b>{label}</b>
        <output>{show(value)}</output>
      </span>
      <input type="range" className="range" min={min} max={max} step={step} value={value} aria-label={label} aria-valuetext={show(value)} style={{ ['--p' as string]: `${p}%` }} onChange={(e) => (haptic('tick'), onChange(Number(e.target.value)))} />
      <em className="st-hint">{hint}</em>
    </>
  );
}

function Hour({ label, value, onChange }: { label: string; value: number; onChange: (h: number) => void }) {
  return (
    <label className="st-hour">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {hour(h)}
          </option>
        ))}
      </select>
      <b className="st-hour-v" aria-hidden>
        {hour(value)}
      </b>
    </label>
  );
}
