'use client';
/**
 * The artist's frame: act avatar, Gus's island and settings on top; five tabs and the Gus
 * button at the bottom. The island always says what Gus is doing in four words or fewer.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Deal, DealLetter, LogEntry, Mandate } from '@/lib/types';
import type { ArtistState } from '@/ui/types';
import { deals, useDeal } from '@web/lib/deals';
import { haptic } from '@web/lib/haptics';
import { gus, useGus, type GusAction, type Spot } from '@web/lib/gus';
import { live, useLive, type Activity } from '@web/lib/live';
import { api } from '@web/lib/api';
import { mutate, useApi } from '@web/lib/hooks';
import { session } from '@web/lib/session';
import { Gus, type GusMood } from './Gus';
import { GusPanels } from './GusPanels';
import { Guide } from './Guide';
import { MapStage } from './map/MapStage';
import { ProgressiveBlur } from './ProgressiveBlur';
import { Icon, type IconName } from './Icon';
import { plainWords } from '@/lib/plain';

const TABS: { key: string; href: string; label: string; icon: IconName }[] = [
  { key: 'map', href: '', label: 'Map', icon: 'map' },
  { key: 'tour', href: '/tour', label: 'Tour', icon: 'van' },
  { key: 'posters', href: '/posters', label: 'Posters', icon: 'posters' },
  { key: 'pulse', href: '/pulse', label: 'Fan Mail', icon: 'mail' },
  { key: 'logbook', href: '/logbook', label: 'Logbook', icon: 'document' },
];

export function tabOf(path: string, slug: string) {
  const rest = path.replace(`/a/${slug}`, '');
  if (!rest || rest === '/') return 'map';
  return rest.split('/')[1];
}

export function Shell({ slug, children }: { slug: string; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const tab = tabOf(path, slug);
  const g = useGus();
  const call = useDeal();
  const artist = useApi<ArtistState>(`/artist/${slug}`);
  const book = useApi<{ entries: LogEntry[]; mandate: Mandate }>(`/artist/${slug}/logbook`, { every: 30_000 });
  const dealList = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`, { every: 20_000 });

  useEffect(() => {
    session.setLastArtist(slug);
    session.setOnboarded(true);
    deals.resume(slug);
  }, [slug]);

  // Gus starts calls on his own (server tick): the island picks up a new one when you're not in a room.
  useEffect(() => {
    const on = dealList.data?.deals.find((x) => x.status === 'talking');
    const cur = deals.get().deal;
    if (on && cur?.id !== on.id && cur?.status !== 'talking' && gus.get().panel !== 'room') deals.show(on);
  }, [dealList.data]);

  // A link can open Gus with a question already asked: /a/<act>?ask=<words>.
  useEffect(() => {
    const u = new URL(location.href);
    const q = u.searchParams.get('ask')?.trim();
    if (!q) return;
    u.searchParams.delete('ask');
    history.replaceState(null, '', u);
    // This runs before the effect that wires Gus to the act, so name the act first.
    if (gus.get().slug !== slug) gus.set({ slug });
    gus.open('voice');
    gus.ask(q.slice(0, 300));
  }, []);

  // A link can open the deal room: /a/<act>?deal=<id> (from Fan Mail, a notification, a share).
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('deal');
    const d = id && dealList.data?.deals.find((x) => x.id === id);
    if (!d) return;
    deals.show(d);
    gus.open('room');
    const u = new URL(location.href);
    u.searchParams.delete('deal');
    history.replaceState(history.state, '', u);
  }, [dealList.data]);

  useEffect(() => {
    if (artist.data) session.addAct({ slug, name: artist.data.artist.name, sounds: artist.data.artist.sound.entities.map((e) => e.name) });
  }, [artist.data, slug]);

  // Gus drives the app: answers carry one action.
  useEffect(() => {
    gus.wire(slug, (a: GusAction) => {
      const base = `/a/${slug}`;
      if (a.type === 'link') return void window.open(a.url, '_blank', 'noopener');
      if (a.type === 'limit') {
        // Rung 1: Gus changes it in place and says so in the island with a way back. No page jump.
        const key = a.key;
        const book = `/artist/${slug}/logbook`;
        api
          .get<{ mandate: Mandate }>(book)
          .then(async ({ mandate }) => {
            const was = mandate[key];
            await api.post(book, { mandate: { [key]: a.value } });
            mutate(book).catch(() => {});
            haptic('commit');
            const say = key === 'maxDeposit' ? `Deposit up to $${a.value}` : `At least ${a.value}% of ticket sales`;
            gus.did(say, () => {
              api.post(book, { mandate: { [key]: was } }).then(() => mutate(book)).catch(() => {});
              haptic('tap');
              gus.flash('Put it back', 1600);
            });
          })
          .catch(() => gus.flash('Couldn’t change that'));
        return;
      }
      if (a.type === 'quiet') {
        const book = `/artist/${slug}/logbook`;
        api
          .get<{ mandate: Mandate }>(book)
          .then(async ({ mandate }) => {
            const was = { quietStart: mandate.quietStart, quietEnd: mandate.quietEnd };
            await api.post(book, { mandate: { quietStart: a.start, quietEnd: a.end } });
            mutate(book).catch(() => {});
            haptic('commit');
            gus.did(`Quiet ${fmtHour(a.start)} to ${fmtHour(a.end)}`, () => {
              api.post(book, { mandate: was }).then(() => mutate(book)).catch(() => {});
              haptic('tap');
              gus.flash('Put it back', 1600);
            });
          })
          .catch(() => gus.flash('Couldn’t change that'));
        return;
      }
      if (a.type === 'spots') {
        // Rung 1 too: pinning is a note to self, nothing leaves the app.
        const url = `/artist/${slug}/spots`;
        api
          .post<{ was: Spot[] }>(url, { city: a.id, spots: a.spots })
          .then(({ was }) => {
            mutate(url).catch(() => {});
            haptic('commit');
            gus.did(`Pinned ${a.spots.length} spot${a.spots.length === 1 ? '' : 's'} in ${a.name}`, () => {
              api.post(url, { city: a.id, spots: was }).then(() => mutate(url)).catch(() => {});
              haptic('tap');
              gus.flash('Unpinned', 1600);
            });
          })
          .catch(() => gus.flash('Couldn’t pin those'));
        return;
      }
      if (a.type === 'tab') return router.push(`${base}${a.tab === 'map' ? '' : `/${a.tab}`}`);
      if (a.type === 'deal') {
        gus.flash(`Asking ${a.name}`);
        deals.ask(slug, a.id, a.roomId).then(() => gus.open('room')).catch(() => {});
        return;
      }
      router.push(`${base}?city=${a.id}${a.type === 'pitch' ? '&pitch=1' : ''}`);
    });
  }, [slug, router]);

  useEffect(() => {
    gus.screen(tab);
  }, [tab]);

  // The island answers your taps too: switch tabs and it swells with where you are, then settles.
  const firstTab = useRef(true);
  useEffect(() => {
    if (firstTab.current) return void (firstTab.current = false);
    const posters = artist.data?.opened.length ?? 0;
    const unread = artist.data?.unread ?? 0;
    const say: Record<string, string> = {
      map: posters ? `Watching ${posters} ${posters === 1 ? 'city' : 'cities'}` : 'Your map',
      tour: 'Your route',
      posters: posters ? `${posters} ${posters === 1 ? 'poster' : 'posters'} up` : 'Your posters',
      pulse: unread ? `${unread} new from fans` : 'Fan Mail',
      logbook: 'What Gus did',
      settings: 'Your limits',
    };
    if (say[tab]) gus.glance(say[tab]);
  }, [tab]);

  // The island's resting line, from what's actually happening.
  const d = call.deal;
  const waiting = d?.status === 'waiting' ? d : dealList.data?.deals.find((x) => x.status === 'waiting');
  const quiet = useQuiet(book.data?.mandate);
  useEffect(() => {
    if (d?.status === 'talking' && !call.paused) gus.ambient({ words: `Asking ${shortRoom(d.roomName)}`, mood: 'thinking', tone: 'live' });
    else if (d?.status === 'talking' && call.paused) gus.ambient({ words: 'Paused', mood: 'idle', tone: 'idle' });
    else if (waiting) gus.ambient({ words: 'Needs your OK', mood: 'worried', tone: 'ask' });
    else if (quiet) gus.ambient({ words: `Quiet till ${fmtHour(book.data!.mandate.quietEnd)}`, mood: 'sleeping', tone: 'idle' });
    else {
      const n = artist.data?.opened.length ?? 0;
      gus.ambient({ words: n ? `Watching ${n} ${n === 1 ? 'city' : 'cities'}` : 'Ready when you are', mood: 'idle', tone: 'idle' });
    }
  }, [d?.status, d?.roomName, call.paused, waiting?.id, quiet, artist.data?.opened.length]);

  useDealActivity(d ?? null, waiting ?? null, call.paused);

  const onMap = tab === 'map';
  const hideChrome = tab === 'settings';
  return (
    <div className={`shell tab-${tab}`} data-panel={g.panel}>
      <MapStage slug={slug} />
      <Header slug={slug} artist={artist.data} onMap={onMap} />
      {children}
      {!onMap && <ProgressiveBlur side="top" />}
      {!hideChrome && <ProgressiveBlur side="bottom" />}
      {!hideChrome && <Dock slug={slug} tab={tab} badge={!!waiting} />}
      <GusPanels slug={slug} artist={artist.data} waiting={waiting ?? null} entries={book.data?.entries ?? []} />
      <Guide slug={slug} />
    </div>
  );
}

const lastTerms = (t: DealLetter[], from: 'gus' | 'house') => [...t].reverse().find((l) => l.from === from && l.terms)?.terms ?? null;

/**
 * The deal as a live activity: Gus on the phone (where the two sides stand, Pause, Listen in),
 * or the room's yes waiting on you. A new offer or a yes swells the island for a moment, so a
 * call left in the background still tells you when it moves.
 */
function useDealActivity(d: Deal | null, waiting: Deal | null, paused: boolean) {
  const g = useGus();
  const seen = useRef<{ id: string | null; n: number; status: string | null }>({ id: null, n: 0, status: null });
  const talking = d?.status === 'talking' ? d : null;
  const ask = d?.status === 'waiting' ? d : waiting;
  const held = d?.status === 'held' ? d : null;
  const roomOpen = g.panel === 'room';

  useEffect(() => {
    if (!talking) return live.drop('call');
    const ours = lastTerms(talking.thread, 'gus');
    const theirs = lastTerms(talking.thread, 'house');
    const apart = ours && theirs ? Math.max(0, ours.split - theirs.split) : null;
    const a: Activity = {
      id: 'call',
      rank: 2,
      tone: paused ? 'idle' : 'live',
      lead: 'gus',
      title: paused ? 'Paused' : shortRoom(talking.roomName),
      trail: theirs ? `${theirs.split}%` : undefined,
      progress: Math.min(1, talking.thread.length / 14),
      kicker: paused ? 'Call paused' : 'Gus is on the phone',
      head: talking.roomName,
      line: !theirs ? `Gus asked for ${ours?.split ?? '…'}% of ticket sales. Waiting on them.` : apart ? `${apart} ${apart === 1 ? 'point' : 'points'} apart on ticket sales.` : 'They’re meeting in the middle.',
      nums: [
        ...(ours ? [{ k: 'Gus asks', v: `${ours.split}% · $${ours.deposit}`, tone: 'hot' as const }] : []),
        ...(theirs ? [{ k: 'They offer', v: `${theirs.split}% · $${theirs.deposit}` }] : []),
      ],
      keys: [
        { label: 'Listen in', primary: true, run: () => (live.expand(null), gus.open('room')) },
        { label: paused ? 'Keep going' : 'Pause', run: () => (paused ? deals.play() : deals.pause()) },
      ],
    };
    live.put(a);
  }, [talking, paused]);

  useEffect(() => {
    if (!ask?.terms) return live.drop('ask');
    const t = ask.terms;
    live.put({
      id: 'ask',
      rank: 3,
      tone: 'ask',
      lead: 'gus',
      title: 'Needs your OK',
      trail: new Date(`${t.date}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      kicker: 'They said yes. Your call',
      head: ask.roomName,
      line: `${ask.cityName}, ${new Date(`${t.date}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`,
      nums: [
        { k: 'Your cut', v: `${t.split}%`, tone: 'ok' },
        { k: 'Deposit', v: `$${t.deposit}` },
        ...(t.capacity ? [{ k: 'Fits', v: `${t.capacity} people` }] : []),
      ],
      keys: [
        {
          label: 'Look it over',
          primary: true,
          run: () => {
            live.expand(null);
            if (deals.get().deal?.id !== ask.id) deals.show(ask);
            gus.open('room');
          },
        },
      ],
    });
  }, [ask?.id, ask?.terms?.split, ask?.terms?.deposit]);

  // Swell the island when the call moves and you're not watching it.
  useEffect(() => {
    const cur = d ?? null;
    const s = seen.current;
    if (!cur) return;
    if (cur.id !== s.id) {
      seen.current = { id: cur.id, n: cur.thread.length, status: cur.status };
      return;
    }
    const fresh = cur.thread.slice(s.n);
    seen.current = { id: cur.id, n: cur.thread.length, status: cur.status };
    if (roomOpen) return;
    if (cur.status !== s.status && cur.status === 'waiting' && cur.terms) return live.bump({ big: `${cur.terms.split}%`, small: `${shortRoom(cur.roomName)} said yes`, tone: 'ask' });
    if (cur.status !== s.status && cur.status === 'held') return live.bump({ big: 'Held', small: `${shortRoom(cur.roomName)} is yours`, tone: 'ok' }, 3000);
    const offer = [...fresh].reverse().find((l) => l.from === 'house' && l.terms);
    if (offer?.terms) live.bump({ big: `${offer.terms.split}%`, small: `${shortRoom(cur.roomName)} came back`, tone: 'live' });
  }, [d?.id, d?.thread.length, d?.status, roomOpen]);

  useEffect(() => {
    if (!held) return;
    live.drop('call');
  }, [held?.id]);
}

const shortRoom = (n: string) => n.replace(/\s+-\s+.*$/, '').replace(/^The\s+/i, 'The ');
const fmtHour = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? 'noon' : `${h - 12}pm`);

function useQuiet(m: Mandate | undefined) {
  const [q, setQ] = useState(false);
  useEffect(() => {
    if (!m) return;
    const on = () => {
      const h = new Date().getHours();
      setQ(m.quietStart > m.quietEnd ? h >= m.quietStart || h < m.quietEnd : h >= m.quietStart && h < m.quietEnd);
    };
    on();
    const id = setInterval(on, 60_000);
    return () => clearInterval(id);
  }, [m?.quietStart, m?.quietEnd]);
  return q;
}

function Header({ slug, artist, onMap }: { slug: string; artist: ArtistState | undefined; onMap: boolean }) {
  const a = artist?.artist;
  const portrait = a?.portrait === 'maya-engraving' || a?.isDemo ? '/img/maya-avatar.webp' : a?.imageUrl;
  const initials = (a?.name ?? '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
  return (
    <header className={`hdr ${onMap ? 'over-map' : ''}`}>
      <Link href={`/a/${slug}/settings#acts`} className="hdr-av" aria-label={a ? `${a.name}: switch act` : 'Switch act'}>
        {portrait ? <img src={portrait} alt="" /> : <span>{initials || '·'}</span>}
      </Link>
      <Island />
      <UndoChip />
      <Link href={`/a/${slug}/settings`} className="icon-btn hdr-btn" aria-label="Settings">
        <Icon name="settings" size={20} />
      </Link>
    </header>
  );
}

/** Beside the island for a few seconds after Gus changes something: what he did, and Undo. */
function UndoChip() {
  const g = useGus();
  const [last, setLast] = useState(g.undo);
  useEffect(() => {
    if (g.undo) setLast(g.undo);
  }, [g.undo]);
  return (
    <div className={`undo-chip ${g.undo ? 'on' : ''}`} aria-live="polite" inert={!g.undo}>
      <span>{plainWords(last?.words)}</span>
      <button onClick={() => gus.undo()}>Undo</button>
    </div>
  );
}

function Island() {
  const g = useGus();
  const lv = useLive();
  const step = g.steps.filter((s) => s.status === 'running').at(-1);
  // Gus talking to you takes the island; otherwise the top live activity; otherwise his resting line.
  const busy = g.phase === 'listening' || g.phase === 'thinking' || g.speaking || !!g.flash;
  const act = busy ? null : lv.list[0] ?? null;
  const second = busy ? null : lv.list[1] ?? null;
  let words = act?.title ?? g.ambient.words;
  let mood: GusMood = act ? (act.tone === 'ask' ? 'worried' : act.tone === 'live' ? 'phone' : 'idle') : g.ambient.mood;
  let tone = act?.tone ?? g.ambient.tone;
  if (g.phase === 'listening') (words = 'Listening'), (mood = 'listening'), (tone = 'live');
  else if (g.phase === 'thinking') (words = step ? islandWords(step.label) : 'Thinking'), (mood = 'thinking'), (tone = 'live');
  else if (g.speaking) (words = 'Talking'), (mood = 'talking'), (tone = 'live');
  if (g.flash) (words = g.flash), (tone = 'live');
  const glance = !busy && g.glance;
  if (glance) words = glance;
  const bump = busy ? null : lv.bump;

  const inner = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number | null>(null);
  // The compact row unmounts while a bump shows, so watch whichever element is there now.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!bump]);
  useEffect(() => {
    if (bump) haptic(bump.tone === 'ok' ? 'success' : 'heard');
  }, [bump]);
  const tap = () => {
    haptic('tap');
    if (act) return live.expand(lv.open === act.id ? null : act.id);
    gus.open(g.panel === 'tray' ? 'none' : 'tray');
  };
  const hidden = g.panel === 'tray' || !!lv.open;
  return (
    <div className="island-row">
      <button data-tour="island" className={`island tone-${tone} ${hidden ? 'is-open' : ''} ${bump ? 'is-bump' : ''} ${glance ? 'is-glance' : ''}`} style={w && !bump ? { width: w } : undefined} onClick={tap} aria-label={`Gus: ${words}. ${act ? 'Open what he is doing' : 'Open Gus’s tray'}`} aria-expanded={hidden}>
        {bump ? (
          <span className={`island-bump tone-${bump.tone}`} key={bump.big + bump.small}>
            <span className="island-gus">
              <Gus mood={bump.tone === 'ok' ? 'proud' : 'phone'} size={30} sticker={false} />
            </span>
            <b>{bump.big}</b>
            <em>{bump.small}</em>
          </span>
        ) : (
          <span className="island-in" ref={inner}>
            <span className="island-gus">
              <Gus mood={mood} size={24} sticker={false} level={g.level} />
            </span>
            <Swap text={words} />
            {act?.trail && !glance ? (
              <span className="island-trail">
                {act.progress !== undefined && (
                  <svg viewBox="0 0 20 20" aria-hidden>
                    <circle cx="10" cy="10" r="8" />
                    <circle cx="10" cy="10" r="8" pathLength={1} style={{ strokeDasharray: `${act.progress} 1` }} />
                  </svg>
                )}
                <b>{act.trail}</b>
              </span>
            ) : (
              tone !== 'idle' && <i className={`island-dot ${tone}`} />
            )}
          </span>
        )}
      </button>
      {second && !bump && !hidden && (
        <button className={`island-2 tone-${second.tone}`} onClick={() => (haptic('tap'), live.expand(second.id))} aria-label={`Also: ${second.title}`}>
          {second.lead === 'gus' ? <Gus mood="phone" size={22} sticker={false} /> : <Icon name={second.lead} size={16} />}
        </button>
      )}
      <IslandCard />
    </div>
  );
}

/**
 * The island, expanded: the live activity it was carrying, with its numbers and the one or two
 * keys that move it. It drops out of the pill and folds back into it.
 */
function IslandCard() {
  const lv = useLive();
  const a = lv.list.find((x) => x.id === lv.open) ?? null;
  const [last, setLast] = useState(a);
  useEffect(() => {
    if (a) setLast(a);
  }, [a]);
  useEffect(() => {
    if (!lv.open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && live.expand(null);
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [lv.open]);
  const x = a ?? last;
  return (
    <>
      <div className={`isl-scrim ${a ? 'on' : ''}`} onClick={() => live.expand(null)} aria-hidden />
      <div className={`isl-card ${a ? 'on' : ''} tone-${x?.tone ?? 'idle'}`} data-tour="isl-card" role="dialog" aria-label={x?.head ?? 'Gus'} aria-hidden={!a} inert={!a}>
        {x && (
          <>
            <div className="isl-top">
              <span className="isl-face">
                <Gus mood={x.tone === 'ask' ? 'waiting' : x.tone === 'ok' ? 'proud' : x.tone === 'live' ? 'phone' : 'sleeping'} size={40} sticker={false} />
              </span>
              <div className="isl-who">
                <span className="isl-k">
                  {x.tone === 'live' && <i className="island-dot live" />}
                  {x.kicker}
                </span>
                <b>{x.head}</b>
              </div>
              {x.trail && <span className="isl-trail">{x.trail}</span>}
            </div>
            <p className="isl-line">{plainWords(x.line)}</p>
            {x.nums && x.nums.length > 0 && (
              <dl className="isl-nums">
                {x.nums.map((n) => (
                  <div key={n.k} className={n.tone ?? ''}>
                    <dt>{n.k}</dt>
                    <dd>{n.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="isl-keys">
              {x.keys?.map((k) => (
                <button key={k.label} className={k.primary ? 'p' : ''} onClick={() => (haptic('tap'), k.run())}>
                  {k.label}
                </button>
              ))}
              <button className="more" onClick={() => (live.expand(null), gus.open('tray'))} aria-label="Everything Gus is doing">
                <Icon name="grid" size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** "Looking at where your fans live" → "Reading your fans" style: four words, max. */
function islandWords(label: string) {
  const w = label.replace(/\.$/, '').split(/\s+/);
  return w.length <= 4 ? label : `${w.slice(0, 3).join(' ')}…`;
}

/** Text swap: the old words blur out up, the new blur in from below (transitions.dev text-swap). */
function Swap({ text }: { text: string }) {
  const [cur, setCur] = useState(text);
  const [old, setOld] = useState<string | null>(null);
  useEffect(() => {
    if (text === cur) return;
    setOld(cur);
    setCur(text);
    const id = setTimeout(() => setOld(null), 260);
    return () => clearTimeout(id);
  }, [text]);
  return (
    <span className="swap">
      {old && (
        <span className="swap-out" key={`o${old}`}>
          {old}
        </span>
      )}
      <span className="swap-in" key={cur}>
        {cur}
      </span>
    </span>
  );
}

function Dock({ slug, tab, badge }: { slug: string; tab: string; badge: boolean }) {
  const g = useGus();
  const nav = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  // A show's day and a leg of the road live under the tour.
  const idx = TABS.findIndex((t) => t.key === (tab === 'show' || tab === 'road' ? 'tour' : tab));
  useLayoutEffect(() => {
    const el = nav.current?.querySelectorAll<HTMLAnchorElement>('a')[idx];
    if (!el) return setPill(null);
    setPill({ x: el.offsetLeft, w: el.offsetWidth });
  }, [idx]);
  useEffect(() => {
    const on = () => {
      const el = nav.current?.querySelectorAll<HTMLAnchorElement>('a')[idx];
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [idx]);

  // Tap: talk until a pause. Hold: talk until you let go.
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    held.current = false;
    gus.press();
    timer.current = setTimeout(() => {
      held.current = true;
      gus.hold();
    }, 280);
    haptic('tap');
  };
  const up = () => {
    if (timer.current) clearTimeout(timer.current);
    gus.release(held.current);
  };
  const open = g.panel !== 'none' && g.panel !== 'tray';
  return (
    <div className="dock" role="navigation" aria-label="Tabs">
      <nav className="nav glass" ref={nav}>
        <span className="nav-pill" style={pill ? { transform: `translateX(${pill.x}px)`, width: pill.w } : { opacity: 0 }} />
        {TABS.map((t) => (
          <Link key={t.key} href={`/a/${slug}${t.href}`} className={t.key === tab ? 'on' : ''} aria-current={t.key === tab ? 'page' : undefined} prefetch>
            <Icon name={t.icon} bold={t.key === tab} size={22} />
            <span>{t.label}</span>
            {t.key === 'pulse' && badge && <i className="nav-badge" />}
          </Link>
        ))}
      </nav>
      <button
        data-tour="gus"
        className={`gus-btn ${g.holding ? 'is-held' : ''} ${open ? 'is-open' : ''} ${g.phase === 'listening' ? 'is-listening' : ''}`}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open) gus.close();
            else gus.talk();
          }
        }}
        aria-label={open ? 'Close Gus' : 'Talk to Gus. Tap and speak, or hold'}
        aria-expanded={open}
      >
        <span className="gus-btn-face">
          <Gus mood={g.phase === 'listening' ? 'listening' : g.phase === 'thinking' ? 'thinking' : open ? 'proud' : 'idle'} size={40} sticker={false} level={g.level} />
        </span>
        <span className="gus-btn-x" aria-hidden>
          <Icon name="close" size={22} />
        </span>
        <span className="gus-btn-ring" style={{ transform: `scale(${1 + g.level * 0.35})` }} />
      </button>
    </div>
  );
}

export function useArtistSlug(path: string) {
  return useMemo(() => path.split('/')[2], [path]);
}
