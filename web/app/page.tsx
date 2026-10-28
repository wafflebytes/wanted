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
 *
 * The demo path (the default; `?new=1` is the real one): you play Maya Ortiz. Her link types
 * itself, the lookalikes and venue size are real questions with her answers filled in, and the
 * run shows what Qloo does with them (the cities come from her live map). A short "why" under
 * each question says what the answer is for. It ends on the story.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ActEntity, RoomBand } from '@/lib/types';
import { Art, type ArtName } from '@web/components/Art';
import { Gus, type GusMood } from '@web/components/Gus';
import { Icon } from '@web/components/Icon';
import type { ArtistState, MapData } from '@/ui/types';
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

/** A line under a question saying what the answer is for. */
function Why({ children }: { children: React.ReactNode }) {
  return (
    <p className="wl-why">
      <b>Why</b>
      {children}
    </p>
  );
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
  const [lines, setLines] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typed = useRef(false);
  const demo = useRef(typeof location !== 'undefined' && !new URLSearchParams(location.search).has('new'));
  useEffect(
    () => () => {
      abort.current?.abort();
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  const later = (ms: number, f: () => void) => void timers.current.push(setTimeout(f, ms));

  // Demo: Maya's link types itself, then Gus finds her.
  useEffect(() => {
    if (!demo.current || step !== 'link' || typed.current) return;
    typed.current = true;
    const target = 'open.spotify.com/artist/maya-ortiz';
    let i = 0;
    const tick = () => {
      i++;
      setText(target.slice(0, i));
      if (i < target.length) later(30 + (i % 3) * 12, tick);
      else later(700, () => readDemo());
    };
    later(700, tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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

  /** The demo's "find me": Maya, with the two acts her page already knows she sounds like. */
  const readDemo = async () => {
    setBusy(true);
    setErr(null);
    try {
      const [a, m] = await Promise.all([api.get<ArtistState>(`/artist/${DEMO}`), new Promise((r) => setTimeout(r, 1100))]);
      void m;
      const similar: Similar[] = a.artist.sound.entities.map((e) => ({ name: e.name, image: null, fans: null, entity: e as unknown as ActEntity }));
      const self = { name: a.artist.name, image: '/img/maya-avatar.webp', fans: null, genres: [] as string[], self: null, similar, source: 'demo' } satisfies Found;
      setFound(self);
      setMatched({ self: null, genres: [], similar });
      setKeep(Object.fromEntries(similar.map((x) => [x.name, true])));
      go('sound');
    } catch {
      setErr('Couldn’t reach the demo. Try again.');
    } finally {
      setBusy(false);
    }
  };

  /** The demo's run: what Qloo does with her sound, one line at a time, then her real top cities. */
  const startDemo = async () => {
    go('run');
    setLines([]);
    setReady(false);
    const sims = (matched?.similar ?? []).filter((x) => keep[x.name]).map((x) => x.name);
    const map = api.get<MapData>(`/artist/${DEMO}/map`).catch(() => null);
    const say = (ms: number, t: string) => later(ms, () => setLines((l) => [...l, t]));
    say(150, `Hearing the sound: ${sims.join(' and ') || 'Maya’s'}`);
    say(1200, 'Qloo scores every neighborhood for it');
    say(2400, 'Against 20 other acts, so big cities don’t win by size');
    say(3600, 'Flagging cities with more fans than their size');
    later(4800, async () => {
      const d = await map;
      const top = d ? d.metros.filter((x) => x.rank).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 5) : [];
      const picks: Pick[] = top.length
        ? top.map((x) => ({ metroId: x.id, name: x.name, state: x.state, reason: '', sleeper: x.sleeper }))
        : [
            { metroId: 'burlington-vt', name: 'Burlington', state: 'VT', reason: '', sleeper: false },
            { metroId: 'portland-me', name: 'Portland', state: 'ME', reason: '', sleeper: false },
            { metroId: 'ithaca-ny', name: 'Ithaca', state: 'NY', reason: '', sleeper: true },
          ];
      setRun({ title: 'Here’s where Maya is wanted', line: 'The first poster goes up in each of these.', picks });
      later(1000 + picks.length * 220, () => setReady(true));
    });
    session.setConstraints(DEMO, { regions: [], dates: 10, roomBand: band, homeBase: null, startDate: defaultStart() });
    session.setLastArtist(DEMO);
    session.setOnboarded(true);
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
    if (demo.current) return startDemo();
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
            <Gus mood="wave" size={168} className="wl-gus" label="Gus, your tour manager" />
          </div>
          <h1>Find the cities that want you.</h1>
          <p>Most bands guess where to tour. I read where your listeners already live, so you play to a full room, not an empty one.</p>
          <ol className="wl-how" aria-label="How it works">
            <li>
              <b>1</b>
              <span>Qloo’s taste graph finds the cities where your sound already has a crowd</span>
            </li>
            <li>
              <b>2</b>
              <span>Fans there sign a WANTED poster</span>
            </li>
            <li>
              <b>3</b>
              <span>At 50 names I ask the venues. You only say yes or no.</span>
            </li>
          </ol>
          <div className="wl-acts">
            <button className="btn hot block" onClick={() => go('link')}>
              I make music
            </button>
            <button className="btn light block" onClick={() => go('fan')}>
              I’m a fan
            </button>
            <button className="wl-demo" onClick={() => router.push(`/a/${DEMO}?story=1`)}>
              Skip setup and watch Gus work
              <Icon name="chevron" size={14} />
            </button>
          </div>
          {demo.current && <p className="wl-note">Demo: you’ll play Maya Ortiz, an indie songwriter. Her cities come live from Qloo. Venues and money are stand-ins.</p>}
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
              {demo.current && <Why>No account and no sign-in. Gus only needs a sound to start from, and Qloo turns it into taste signals.</Why>}
              <form
                className="wl-field"
                onSubmit={(e) => {
                  e.preventDefault();
                  read();
                }}
              >
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="open.spotify.com/artist/… or your name" autoFocus={!demo.current} autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" aria-label="Your link or name" readOnly={demo.current} />
                {!text && !demo.current && (
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
              {demo.current && <Why>This is how Qloo finds your fans without a mailing list: people who love these acts, and where they live.</Why>}
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
              {demo.current && <Why>It sets which venues Gus will ever ask, so he never pitches you to a room you can’t fill.</Why>}
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
              <h2>{demo.current && !run.picks.length ? 'Reading where Maya’s people are' : run.title}</h2>
              {run.line && <p>{run.line}</p>}
              {demo.current && !run.picks.length && (
                <ul className="wl-lines">
                  {lines.map((l, i) => (
                    <li key={l} className={i === lines.length - 1 ? 'now' : ''}>
                      {i === lines.length - 1 ? <i className="spin" /> : <Icon name="check" bold size={14} />}
                      {l}
                    </li>
                  ))}
                </ul>
              )}
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
                !demo.current && (
                  <div className="wl-wait">
                    <i />
                    <i />
                    <i />
                  </div>
                )
              )}
              {demo.current && ready && (
                <button className="btn hot block wl-go" onClick={() => router.replace(`/a/${DEMO}?story=1`)}>
                  Watch Gus work
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
