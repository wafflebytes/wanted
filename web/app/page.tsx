'use client';
/**
 * The front door. Returning on this device: straight to your last act. First time (or "Add an
 * act" from Settings): Welcome, one question at a time, asking only what Wanted can't work out:
 *
 *   1. Act or fan.
 *   2. Your link, or just your name.
 *   3. Who you sound like, filled in from who your listeners also play.
 *   4. How big your rooms are.
 *
 * Then Gus reads where your people are, the cities come in one by one, and you land on your map.
 * No account, no sign-in.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ActEntity, RoomBand } from '@/lib/types';
import { Art, type ArtName } from '@web/components/Art';
import { Gus, type GusMood } from '@web/components/Gus';
import { Icon } from '@web/components/Icon';
import { api, streamNdjson } from '@web/lib/api';
import { defaultStart, session } from '@web/lib/session';
import './welcome.css';

const DEMO = 'maya-ortiz';
type Step = 'who' | 'link' | 'sound' | 'rooms' | 'fan' | 'run';
type Similar = { name: string; image: string | null; fans: number | null; entity: ActEntity | null };
type Found = { source: string; name: string; image: string | null; fans: number | null; genres: string[]; self: ActEntity | null; similar: Similar[]; spotifyId?: string | null };
type Matched = { self: ActEntity | null; genres: string[]; similar: Similar[] };
type Pick = { metroId: string; name: string; state: string; reason: string; sleeper: boolean };
type RunEvent =
  | { type: 'progress'; text: string }
  | { type: 'tool'; tool: string; text: string }
  | { type: 'line'; text: string }
  | { type: 'error'; error: string }
  | { type: 'result'; artist: { id: string; slug: string; name: string }; line: string; picks: Pick[] };

const ROOMS: { band: RoomBand; title: string; sub: string; cap: string }[] = [
  { band: 'small', title: 'Bars and back rooms', sub: 'Where you can see every face', cap: 'Up to 150' },
  { band: 'mid', title: 'Clubs', sub: 'A real stage, a real door count', cap: '150 to 500' },
  { band: 'big', title: 'Theaters', sub: 'Seats, a balcony, a merch line', cap: '500 and up' },
];
const fans = (n: number | null) => (n == null ? null : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

export default function Page() {
  const router = useRouter();
  const [phase, setPhase] = useState<'blank' | 'splash' | 'welcome'>('blank');
  const next = useRef<() => void>(() => {});
  useEffect(() => {
    const fresh = new URLSearchParams(location.search).has('new');
    const last = session.lastArtist();
    next.current = last && !fresh ? () => router.replace(`/a/${last}`) : () => setPhase('welcome');
    if (last && !fresh) router.prefetch(`/a/${last}`);
    // Once per visit, and never on "Add an act" or for people who asked for less motion.
    let seen = true;
    try {
      seen = !!sessionStorage.getItem('wanted-splash');
    } catch {}
    if (fresh || seen || matchMedia('(prefers-reduced-motion: reduce)').matches) next.current();
    else setPhase('splash');
  }, [router]);
  const done = () => {
    try {
      sessionStorage.setItem('wanted-splash', '1');
    } catch {}
    next.current();
  };
  if (phase === 'splash') return <Splash onDone={done} />;
  if (phase !== 'welcome') return <main className="wl" />;
  return <Welcome />;
}

/** What Gus is doing above each Welcome card. */
const STEP_MOOD: Partial<Record<Step, GusMood>> = { fan: 'proud', link: 'listening', sound: 'thinking', rooms: 'working' };

/** Things from the road, drifting onto the table around Gus. Offsets are from the centre. */
const DRIFT: { name: ArtName; x: number; y: number; r: number; size: number }[] = [
  { name: 'poster', x: -118, y: -118, r: -9, size: 96 },
  { name: 'mail', x: 120, y: -104, r: 11, size: 80 },
  { name: 'ticket', x: -128, y: 56, r: 14, size: 84 },
  { name: 'cassette', x: 126, y: 58, r: -12, size: 84 },
  { name: 'pick', x: 2, y: -132, r: -14, size: 40 },
];

/** At most 1.4 s: the objects settle, the wordmark rolls up, then it clears. Tap to skip. */
function Splash({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    setOut(true);
    setTimeout(onDone, 300);
  };
  useEffect(() => {
    const t = setTimeout(finish, 1100);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className={`sp${out ? ' out' : ''}`} onClick={finish} aria-label="Wanted">
      <div className="wl-ground" />
      <div className="sp-table" aria-hidden>
        {DRIFT.map((d, i) => (
          <span key={d.name} className="sp-obj" style={{ ['--x' as string]: `${d.x}px`, ['--y' as string]: `${d.y}px`, ['--r' as string]: `${d.r}deg`, ['--i' as string]: i }}>
            <Art name={d.name} size={d.size} />
          </span>
        ))}
        <span className="sp-gus">
          <Gus mood="wave" size={150} />
        </span>
      </div>
      <h1 className="sp-word">
        {'Wanted'.split('').map((c, i) => (
          <span key={i} style={{ ['--i' as string]: i }}>
            {c}
          </span>
        ))}
      </h1>
    </main>
  );
}

function Welcome() {
  const router = useRouter();
  const fresh = useRef(typeof location !== 'undefined' && new URLSearchParams(location.search).has('new'));
  const [step, setStep] = useState<Step>(fresh.current ? 'link' : 'who');
  const [text, setText] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const [matched, setMatched] = useState<Matched | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [band, setBand] = useState<RoomBand>('small');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<{ title: string; line: string | null; picks: Pick[] }>({ title: 'Reading where your people are', line: null, picks: [] });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const flow: Step[] = fresh.current ? ['link', 'sound', 'rooms'] : ['who', 'link', 'sound', 'rooms'];
  const at = flow.indexOf(step);
  const go = (s: Step) => {
    setErr(null);
    setStep(s);
  };
  const back = () => (step === 'fan' ? go('who') : at > 0 ? go(flow[at - 1]) : fresh.current ? router.back() : null);

  const read = async (t = text) => {
    if (!t.trim()) return setErr('Paste a link or type your name.');
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<Found>('/scout/link', { text: t.trim() });
      setFound(r);
      setMatched(null);
      setKeep(Object.fromEntries(r.similar.map((s, i) => [s.name, i < 3])));
      go('sound');
      // Pin the lookalikes down while the artist looks at their card.
      api
        .post<Matched>('/scout/link', { match: { name: r.name, spotifyId: r.spotifyId ?? null, similar: r.similar } })
        .then((m) => {
          setMatched(m);
          setKeep((k) => Object.fromEntries(m.similar.map((s, i) => [s.name, k[s.name] ?? i < 3])));
        })
        .catch(() => setMatched({ self: null, genres: [], similar: [] }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That link didn’t work. Try your name instead.');
    } finally {
      setBusy(false);
    }
  };

  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (!t) return setErr('Nothing on your clipboard yet.');
      setText(t);
      read(t);
    } catch {
      setErr('Your browser kept the clipboard to itself. Paste it in the box.');
    }
  };

  const start = async () => {
    if (!found || !matched) return;
    const refs = matched.similar.filter((s) => keep[s.name] && s.entity).map((s) => s.entity!);
    if (!refs.length && !matched.self) return setErr('Keep at least one act you sound like.');
    go('run');
    const ctl = new AbortController();
    abort.current = ctl;
    let done = false;
    try {
      await streamNdjson<RunEvent>(
        '/scout/run',
        {
          artistName: found.name,
          self: matched.self ? { id: matched.self.id, name: matched.self.name } : null,
          refs: refs.map((r) => ({ id: r.id, name: r.name })),
          kind: 'music',
          text: `I'm ${found.name}. I sound like ${refs.map((r) => r.name).join(' and ')}.`,
          roomBand: band,
          homeBase: null,
        },
        (e) => {
          if (e.type === 'progress') setRun((r) => ({ ...r, title: e.text }));
          else if (e.type === 'line') setRun((r) => ({ ...r, line: e.text }));
          else if (e.type === 'error') throw new Error(e.error);
          else if (e.type === 'result') {
            done = true;
            const slug = e.artist.slug;
            setRun({ title: 'Here’s where you’re wanted', line: e.line, picks: e.picks });
            session.setConstraints(slug, { regions: [], dates: 10, roomBand: band, homeBase: null, startDate: defaultStart() });
            session.setLastArtist(slug);
            session.setOnboarded(true);
            session.addAct({ slug, name: e.artist.name, sounds: refs.map((r) => r.name) });
            setTimeout(() => router.replace(`/a/${slug}`), 2200 + e.picks.length * 220);
          }
        },
        ctl.signal,
      );
      if (!done) throw new Error('Gus lost the thread. Try again.');
    } catch (e) {
      if (ctl.signal.aborted) return;
      setErr(e instanceof Error ? e.message : 'That didn’t work. Try again.');
      setStep('rooms');
    }
  };

  const sims = matched?.similar ?? found?.similar ?? [];
  const kept = sims.filter((s) => keep[s.name]).length;

  return (
    <main className="wl">
      <div className="wl-ground" />

      {step === 'who' && (
        <section className="wl-hero" key="who">
          <div className="wl-who">
            <span className="wl-tag">Gus, your tour manager</span>
            <Gus mood="wave" size={220} className="wl-gus" label="Gus, your tour manager" />
          </div>
          <h1>Find the cities that want you.</h1>
          <p>I read where your listeners live, put a WANTED poster up in their city, and ask venues for a date once enough of them sign.</p>
          <div className="wl-acts">
            <button className="btn hot block" onClick={() => go('link')}>
              I make music
            </button>
            <button className="btn light block" onClick={() => go('fan')}>
              I’m a fan
            </button>
            <button className="wl-demo" onClick={() => router.push(`/a/${DEMO}?tour=1`)}>
              Take a quick tour with Gus first
              <Icon name="chevron" size={14} />
            </button>
          </div>
        </section>
      )}

      {step !== 'who' && step !== 'run' && <Gus mood={STEP_MOOD[step] ?? 'idle'} size={150} className="wl-gus wl-gus-top" />}
      {step !== 'who' && (
        <section className="wl-card" key={step}>
          {step !== 'run' && (
            <div className="wl-top">
              <button className="icon-btn" onClick={back} aria-label="Back" disabled={step === flow[0] && !fresh.current}>
                <Icon name="back" size={18} />
              </button>
              {step !== 'fan' && (
                <div className="wl-dots" aria-label={`Step ${at + 1} of ${flow.length}`}>
                  {flow.map((s, i) => (
                    <i key={s} className={i <= at ? 'on' : ''} />
                  ))}
                </div>
              )}
              <span style={{ width: 44 }} />
            </div>
          )}

          {step === 'fan' && (
            <>
              <h2>Good. Fans are how this works.</h2>
              <p>When an act you like puts up a WANTED poster for your city, sign it. Fifty signatures and Gus asks the venues for a date. You hear first.</p>
              <button className="btn hot block" onClick={() => router.push(`/a/${DEMO}/posters`)}>
                See a poster
              </button>
            </>
          )}

          {step === 'link' && (
            <>
              <h2>Where can I hear you?</h2>
              <p>Paste a Spotify, Apple Music, Bandcamp, SoundCloud or YouTube link. Or just type your name.</p>
              <form
                className="wl-field"
                onSubmit={(e) => {
                  e.preventDefault();
                  read();
                }}
              >
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="open.spotify.com/artist/… or your name" autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" aria-label="Your link or name" />
                {!text && (
                  <button type="button" className="btn xs light" onClick={paste}>
                    Paste
                  </button>
                )}
              </form>
              {err && <p className="wl-err">{err}</p>}
              <button className="btn hot block" disabled={busy || !text.trim()} onClick={() => read()}>
                {busy ? 'Looking you up…' : 'Find me'}
              </button>
            </>
          )}

          {step === 'sound' && found && (
            <>
              <div className="wl-me">
                {found.image ? <img src={found.image} alt="" /> : <span>{found.name[0]}</span>}
                <div>
                  <b>{found.name}</b>
                  <em>{fans(found.fans) ? `${fans(found.fans)} listeners` : 'Found you'}</em>
                </div>
                <Icon name="verify" bold size={22} className="wl-ok" />
              </div>
              <h2>Who do you sound like?</h2>
              <p>Your listeners also play these. Keep the ones that fit; Gus finds your crowd through theirs.</p>
              <div className="wl-sims">
                {sims.slice(0, 8).map((s) => (
                  <button key={s.name} className={`wl-sim${keep[s.name] ? ' on' : ''}`} aria-pressed={!!keep[s.name]} onClick={() => setKeep((k) => ({ ...k, [s.name]: !k[s.name] }))}>
                    {s.image ? <img src={s.image} alt="" /> : <span>{s.name[0]}</span>}
                    {s.name}
                    {keep[s.name] && <Icon name="check" bold size={14} />}
                  </button>
                ))}
              </div>
              {err && <p className="wl-err">{err}</p>}
              <button className="btn hot block" disabled={!matched || !kept} onClick={() => go('rooms')}>
                {!matched ? 'Checking these…' : kept ? 'These fit' : 'Keep at least one'}
              </button>
            </>
          )}

          {step === 'rooms' && (
            <>
              <h2>How big are the venues you play?</h2>
              <p>Be honest. Nobody fills a theater on hope.</p>
              <div className="wl-rooms" role="radiogroup">
                {ROOMS.map((r) => (
                  <button key={r.band} role="radio" aria-checked={band === r.band} className={`wl-room${band === r.band ? ' on' : ''}`} onClick={() => setBand(r.band)}>
                    <span>
                      <b>{r.title}</b>
                      <em>{r.sub}</em>
                    </span>
                    <small>{r.cap}</small>
                  </button>
                ))}
              </div>
              {err && <p className="wl-err">{err}</p>}
              <button className="btn hot block" onClick={start}>
                Find my cities
              </button>
            </>
          )}

          {step === 'run' && (
            <div className="wl-run" aria-live="polite">
              <Gus mood={run.picks.length ? 'proud' : 'working'} size={150} />
              <h2>{run.title}</h2>
              {run.line && <p>{run.line}</p>}
              {run.picks.length > 0 ? (
                <ol className="wl-picks">
                  {run.picks.map((p, i) => (
                    <li key={p.metroId} style={{ ['--i' as string]: i }}>
                      <b>{p.name}</b>
                      <span>{p.state}</span>
                      {p.sleeper && <em>Nobody’s playing it</em>}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="wl-wait">
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
