'use client';
/**
 * Everything that opens out of Gus: the action tiles (tap), the voice card (hold), and the
 * tray that morphs out of the island (running jobs with Pause, approvals, what he did lately).
 * Talking to Gus always produces an object you can act on, never just a paragraph.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import VoiceBeam from 'voice-glow';
import type { Deal, LogEntry } from '@/lib/types';
import type { ArtistState, MapData, MapMetroRow } from '@/ui/types';
import { deals, useDeal } from '@web/lib/deals';
import { gus, useGus } from '@web/lib/gus';
import { useApi, useDark } from '@web/lib/hooks';
import { Approval } from './Approval';
import { Art, type ArtName } from './Art';
import { Gus } from './Gus';
import { Icon } from './Icon';

type Tile = { art: ArtName; title: string; sub: string; tint: string; run: () => void };

export function GusPanels({ slug, artist, waiting, entries }: { slug: string; artist: ArtistState | undefined; waiting: Deal | null; entries: LogEntry[] }) {
  const g = useGus();
  const router = useRouter();
  useEffect(() => {
    if (g.panel === 'none') return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && gus.close();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [g.panel]);

  const top = artist?.opened.slice().sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))[0];
  const city = top?.name ?? 'your top city';
  const go = (p: string) => () => {
    gus.close();
    router.push(`/a/${slug}${p}`);
  };
  const tiles: Tile[] = [
    {
      art: 'room',
      title: 'Ask rooms',
      sub: `in ${city}`,
      tint: 'var(--t-orange)',
      run: () => {
        if (!top) return go('')();
        gus.close();
        gus.flash(`Asking rooms in ${top.name}`, 2200);
        deals.ask(slug, top.city).then(() => gus.open('tray')).catch(() => {});
      },
    },
    { art: 'route', title: 'Plan the tour', sub: 'Route and dates', tint: 'var(--t-green)', run: go('/tour') },
    { art: 'mic', title: 'Find an opener', sub: `for ${city}`, tint: 'var(--t-lilac)', run: () => (gus.open('voice'), gus.ask(`Who should open for me in ${city}?`)) },
    {
      art: 'megaphone',
      title: 'Share a poster',
      sub: 'Get signatures',
      tint: 'var(--t-rose)',
      run: () => {
        const url = top ? `${location.origin}/w/${slug}/${top.city}` : location.href;
        gus.close();
        if (navigator.share) navigator.share({ title: `Wanted in ${city}`, url }).catch(() => {});
        else navigator.clipboard?.writeText(url).then(() => gus.flash('Link copied'));
      },
    },
    { art: 'logbook', title: 'Catch me up', sub: 'What you missed', tint: 'var(--t-sand)', run: () => (gus.open('voice'), gus.ask('Catch me up. What happened while I was away?')) },
    { art: 'dial', title: 'Your limits', sub: 'What I do alone', tint: 'var(--t-mint)', run: go('/settings#gus') },
  ];

  return (
    <>
      <div className={`gp-scrim ${g.panel !== 'none' ? 'on' : ''} p-${g.panel}`} onClick={() => gus.close()} aria-hidden />
      <Tiles open={g.panel === 'tiles'} tiles={tiles} />
      <VoiceCard open={g.panel === 'voice'} />
      <Tray open={g.panel === 'tray'} slug={slug} waiting={waiting} entries={entries} />
    </>
  );
}

function Ask({ autoFocus, placeholder = 'Ask Gus anything' }: { autoFocus?: boolean; placeholder?: string }) {
  const [t, setT] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) setTimeout(() => ref.current?.focus({ preventScroll: true }), 320);
  }, [autoFocus]);
  return (
    <form
      className="ask"
      onSubmit={(e) => {
        e.preventDefault();
        if (!t.trim()) return;
        gus.open('voice');
        gus.ask(t);
        setT('');
      }}
    >
      <input ref={ref} value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholder} aria-label="Ask Gus" enterKeyHint="send" />
      <button type="submit" className={`ask-go ${t.trim() ? 'on' : ''}`} aria-label="Send">
        <Icon name="send" bold size={18} />
      </button>
    </form>
  );
}

function Tiles({ open, tiles }: { open: boolean; tiles: Tile[] }) {
  return (
    <div className={`tiles ${open ? 'on' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="tiles-head" style={{ ['--i' as string]: tiles.length }}>
        {open && <Gus mood="talking" size={112} className="tiles-gus" />}
        <h2 className="d-30">What should I do?</h2>
        <p className="ink-2">Tap a job, or hold my button to talk.</p>
      </div>
      <div className="tiles-ask" style={{ ['--i' as string]: tiles.length - 1 }}>
        <Ask />
      </div>
      <div className="tiles-grid">
        {tiles.map((t, i) => (
          <button key={t.title} className="tile" style={{ ['--i' as string]: tiles.length - 2 - i, ['--tint' as string]: t.tint }} onClick={t.run}>
            <Art name={t.art} size={54} />
            <b>{t.title}</b>
            <span>{t.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Words arrive one at a time (transitions.dev streaming text, 40 ms a word here so it keeps pace with speech). */
function Stream({ text, every = 45 }: { text: string; every?: number }) {
  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((w, i) => (
        <span key={`${i}${w}`} className="sw" style={{ animationDelay: `${(i / 2) * every}ms` }}>
          {w}
        </span>
      ))}
    </>
  );
}

function VoiceCard({ open }: { open: boolean }) {
  const g = useGus();
  const dark = useDark();
  const [showWork, setShowWork] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const live = g.phase === 'listening' || g.phase === 'thinking';
  const caption = g.phase === 'listening' ? 'Listening' : g.phase === 'thinking' ? 'Working on it' : g.error ? 'Hmm' : 'Gus';
  const mood = g.phase === 'listening' ? 'listening' : g.phase === 'thinking' ? 'thinking' : g.speaking ? 'talking' : g.error ? 'worried' : g.answer?.mood === 'proud' ? 'proud' : 'idle';
  const done = g.steps.filter((s) => s.status !== 'running');
  const running = g.steps.find((s) => s.status === 'running');
  const lastFound = [...done].reverse().find((s) => s.found)?.found ?? null;
  // A new question folds the working-out away again and scrolls back to the top.
  useEffect(() => {
    setShowWork(false);
    body.current?.scrollTo({ top: 0 });
  }, [g.heard]);
  const card = (
    <div className="vc-card">
      <div className="vc-top">
        <Gus mood={mood} size={40} sticker={false} level={g.level} />
        <span className="vc-cap">
          <SwapLine text={caption} />
        </span>
        <button className="icon-btn flat" onClick={() => gus.close()} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="vc-body" ref={body}>
        {g.phase === 'listening' && !g.heard && (
          <div className="vc-wave" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} style={{ transform: `scaleY(${0.15 + g.level * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + g.level * 9)))})` }} />
            ))}
          </div>
        )}
        {g.heard && (
          <p className="vc-q" key={g.heard}>
            {g.heard}
          </p>
        )}
        {!g.heard && g.phase === 'idle' && !g.answer && !g.error && <p className="vc-hint">Ask about your cities, rooms, posters or fans. Or hold my button and talk.</p>}
        {g.steps.length > 0 && (
          <div className={`vc-work ${running ? 'is-running' : ''}`}>
            <button className="vc-work-row" onClick={() => setShowWork((v) => !v)} aria-expanded={showWork}>
              <span className="vc-tick">{running ? <i className="spin" /> : <Icon name="check" size={13} />}</span>
              <span className="vc-work-txt">
                <SwapLine text={running ? running.label : `Checked ${done.length} ${done.length === 1 ? 'thing' : 'things'}`} />
                {running && lastFound ? <em key={lastFound}>{lastFound}</em> : null}
              </span>
              <span className={`vc-chev ${showWork ? 'up' : ''}`} aria-hidden>
                <Icon name="forward" size={14} />
              </span>
            </button>
            {showWork && (
              <ul className="vc-steps">
                {g.steps.map((s) => (
                  <li key={s.id} className={`st-${s.status}`}>
                    <span className="vc-tick">{s.status === 'done' ? <Icon name="check" size={12} /> : s.status === 'failed' ? <Icon name="close" size={12} /> : <i className="spin" />}</span>
                    <span>{s.label}</span>
                    {s.found && <em>{s.found}</em>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {g.answer && (
          <p className="vc-reply" key={g.answer.reply}>
            <Stream text={g.answer.reply} every={40} />
          </p>
        )}
        {g.answer && <Cities reply={g.answer.reply} delay={g.answer.reply.split(' ').length * 20} />}
        {g.error && <p className="vc-err">{g.error}</p>}
      </div>
      <div className="vc-foot">
        {g.answer?.action && (
          <button className="btn hot block vc-act" key={g.answer.reply} onClick={() => gus.act(g.answer!.action!)}>
            {g.answer.action.label}
            <Icon name="forward" size={18} />
          </button>
        )}
        <Ask autoFocus={open && g.phase === 'idle' && !g.answer} placeholder={g.answer ? 'Ask a follow-up' : 'Type to Gus'} />
      </div>
    </div>
  );
  return (
    <div className={`vc ${open ? 'on' : ''} ${live ? 'is-live' : ''}`} aria-hidden={!open} inert={!open} role="dialog" aria-label="Talk to Gus">
      {live ? (
        <VoiceBeam level={() => (gus.get().phase === 'listening' ? gus.get().level : 0.25 + 0.1 * Math.sin(performance.now() / 300))} theme={dark ? 'dark' : 'light'} colorVariant="sunset" type="default" style={{ borderRadius: 28 }}>
          {card}
        </VoiceBeam>
      ) : (
        card
      )}
    </div>
  );
}

/**
 * Gus hands back an object, not just words: cities he names become rows you can open
 * (Spotify's generative playlists: the answer is a list you act on).
 */
function Cities({ reply, delay }: { reply: string; delay: number }) {
  const slug = gus.get().slug;
  const map = useApi<MapData>(slug ? `/artist/${slug}/map` : null);
  const rows = useMemo(() => {
    if (!map.data) return [];
    const signed = Object.fromEntries(map.data.proof.map((p) => [p.city, p.signatures]));
    const hits: { m: MapMetroRow; at: number }[] = [];
    const ranked = map.data.metros.filter((m) => m.rank !== null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    const seen = new Set<string>();
    for (const m of ranked) {
      if (seen.has(m.name)) continue;
      const at = reply.search(new RegExp(`\\b${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
      if (at < 0) continue;
      seen.add(m.name);
      hits.push({ m, at });
    }
    return hits.sort((a, b) => a.at - b.at).slice(0, 4).map(({ m }) => ({ m, signed: signed[m.id] ?? 0 }));
  }, [map.data, reply]);
  if (rows.length < 2) return null;
  return (
    <ul className="vc-cities" style={{ ['--d' as string]: `${delay}ms` }}>
      {rows.map(({ m, signed }, i) => (
        <li key={m.id} style={{ ['--i' as string]: i }}>
          <button onClick={() => gus.act({ type: 'city', id: m.id, name: m.name, label: m.name })}>
            <span className={`vc-rank ${i === 0 ? 'top' : ''}`}>{m.rank}</span>
            <span className="vc-city">
              <b>
                {m.name}
                <em>{m.state}</em>
              </b>
              <span>{signed ? `${signed} fans signed` : m.sleeper ? 'A sleeper city' : `#${m.rank} for your sound`}</span>
            </span>
            <Icon name="chevron" size={16} className="ink-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function SwapLine({ text }: { text: string }) {
  return (
    <span className="swap" key={text}>
      <span className="swap-in">{text}</span>
    </span>
  );
}

const WHO: Record<LogEntry['source'], { label: string; cls: string }> = {
  artist: { label: 'You', cls: 'ok' },
  gus: { label: 'Gus', cls: 'hot' },
  fans: { label: 'Fans', cls: 'sky' },
  room: { label: 'A venue', cls: 'ask' },
  qloo: { label: 'Gus', cls: 'hot' },
};

export function ago(at: number) {
  const s = (Date.now() - at) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

function Tray({ open, slug, waiting, entries }: { open: boolean; slug: string; waiting: Deal | null; entries: LogEntry[] }) {
  const g = useGus();
  const live = useDeal();
  const d = live.deal;
  const talking = d?.status === 'talking' ? d : null;
  const ask = d?.status === 'waiting' ? d : waiting;
  const router = useRouter();
  return (
    <div className={`tray ${open ? 'on' : ''}`} aria-hidden={!open} inert={!open} role="dialog" aria-label="Gus's tray">
      <div className="tray-in">
        <div className="tray-head">
          <Gus mood={g.ambient.mood === 'sleeping' ? 'sleeping' : talking ? 'thinking' : ask ? 'worried' : 'idle'} size={48} sticker={false} />
          <div>
            <b className="d-20">Gus</b>
            <span className="ink-2 b-13">{g.ambient.words}</span>
          </div>
          <button className="icon-btn flat" onClick={() => gus.close()} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        {talking && (
          <section className="job">
            <div className="job-top">
              <span className={`dot ${live.paused ? '' : 'hot live'}`} />
              <b>{live.paused ? 'Paused' : 'Asking'} {talking.roomName}</b>
              <span className="ink-3 b-13">{talking.cityName}</span>
            </div>
            <ol className="job-steps">
              {talking.thread.slice(-3).map((l, i) => (
                <li key={`${talking.thread.length}-${i}`} className={l.from}>
                  <span className="job-who">{l.from === 'gus' ? 'Gus' : 'Venue'}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ol>
            <div className="job-bar">
              <i style={{ width: `${Math.min(100, (talking.thread.length / 14) * 100)}%` }} />
            </div>
            <div className="job-acts">
              <button className="btn sm ghost" onClick={() => (live.paused ? deals.play() : deals.pause())}>
                <Icon name={live.paused ? 'play' : 'stop'} size={16} />
                {live.paused ? 'Keep going' : 'Pause'}
              </button>
              <span className="ink-3 b-13">Paused jobs keep their letters.</span>
            </div>
          </section>
        )}

        {ask && <Approval deal={ask} busy={live.deciding} compact />}

        {!talking && !ask && d?.status === 'held' && (
          <section className="job done">
            <Art name="seal" size={44} />
            <div>
              <b>{d.roomName} is held</b>
              <span className="ink-2 b-13">{d.cityName}. The fans who signed hear first.</span>
            </div>
          </section>
        )}

        {!talking && !ask && d?.status !== 'held' && <p className="tray-calm ink-2">Nothing needs you right now. I’ll say so in the island when something does.</p>}

        <div className="tray-sec">
          <span className="kicker">Lately</span>
          <button
            className="tray-more"
            onClick={() => {
              gus.close();
              router.push(`/a/${slug}/logbook`);
            }}
          >
            Logbook
          </button>
        </div>
        <ul className="tray-log">
          {entries.slice(0, 4).map((e) => (
            <li key={e.id}>
              <i className={`dot ${WHO[e.source].cls}`} />
              <span>{e.title}</span>
              <em>{ago(e.createdAt)}</em>
            </li>
          ))}
        </ul>
        <Ask placeholder="Tell Gus what to do" />
      </div>
    </div>
  );
}
