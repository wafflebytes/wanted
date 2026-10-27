'use client';
/**
 * The artist's frame: act avatar, Gus's island and settings on top; five tabs and the Gus
 * button at the bottom. The island always says what Gus is doing in four words or fewer.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Deal, LogEntry, Mandate } from '@/lib/types';
import type { ArtistState } from '@/ui/types';
import { deals, useDeal } from '@web/lib/deals';
import { haptic } from '@web/lib/haptics';
import { gus, useGus, type GusAction } from '@web/lib/gus';
import { api } from '@web/lib/api';
import { mutate, useApi } from '@web/lib/hooks';
import { session } from '@web/lib/session';
import { Gus, type GusMood } from './Gus';
import { GusPanels } from './GusPanels';
import { MapStage } from './map/MapStage';
import { ProgressiveBlur } from './ProgressiveBlur';
import { Icon, type IconName } from './Icon';

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
  const live = useDeal();
  const artist = useApi<ArtistState>(`/artist/${slug}`);
  const book = useApi<{ entries: LogEntry[]; mandate: Mandate }>(`/artist/${slug}/logbook`, { every: 30_000 });
  const dealList = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`, { every: 20_000 });

  useEffect(() => {
    session.setLastArtist(slug);
    session.setOnboarded(true);
    deals.resume(slug);
  }, [slug]);

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
        // Rung 1: Gus changes it where it lives, shows you the row, and keeps a way back.
        const key = a.key;
        const book = `/artist/${slug}/logbook`;
        api
          .get<{ mandate: Mandate }>(book)
          .then(async ({ mandate }) => {
            const was = mandate[key];
            await api.post(book, { mandate: { [key]: a.value } });
            mutate(book).catch(() => {});
            haptic('commit');
            router.push(`${base}/settings?hl=${key}#gus`);
            const say = key === 'maxDeposit' ? `Deposit up to $${a.value}` : `At least ${a.value}% of the door`;
            gus.did(say, () => {
              api.post(book, { mandate: { [key]: was } }).then(() => mutate(book)).catch(() => {});
              haptic('tap');
              gus.flash('Put it back', 1600);
            });
          })
          .catch(() => gus.flash('Couldn’t change that'));
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

  // The island's resting line, from what's actually happening.
  const d = live.deal;
  const waiting = d?.status === 'waiting' ? d : dealList.data?.deals.find((x) => x.status === 'waiting');
  const quiet = useQuiet(book.data?.mandate);
  useEffect(() => {
    if (d?.status === 'talking' && !live.paused) gus.ambient({ words: `Asking ${shortRoom(d.roomName)}`, mood: 'thinking', tone: 'live' });
    else if (d?.status === 'talking' && live.paused) gus.ambient({ words: 'Paused', mood: 'idle', tone: 'idle' });
    else if (waiting) gus.ambient({ words: 'Needs your OK', mood: 'worried', tone: 'ask' });
    else if (quiet) gus.ambient({ words: `Quiet till ${fmtHour(book.data!.mandate.quietEnd)}`, mood: 'sleeping', tone: 'idle' });
    else {
      const n = artist.data?.opened.length ?? 0;
      gus.ambient({ words: n ? `Watching ${n} ${n === 1 ? 'city' : 'cities'}` : 'Ready when you are', mood: 'idle', tone: 'idle' });
    }
  }, [d?.status, d?.roomName, live.paused, waiting?.id, quiet, artist.data?.opened.length]);

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
    </div>
  );
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
      <span>{last?.words}</span>
      <button onClick={() => gus.undo()}>Undo</button>
    </div>
  );
}

function Island() {
  const g = useGus();
  const step = g.steps.filter((s) => s.status === 'running').at(-1);
  let words = g.ambient.words;
  let mood: GusMood = g.ambient.mood;
  let tone = g.ambient.tone;
  if (g.phase === 'listening') (words = 'Listening'), (mood = 'listening'), (tone = 'live');
  else if (g.phase === 'thinking') (words = step ? islandWords(step.label) : 'Thinking'), (mood = 'thinking'), (tone = 'live');
  else if (g.speaking) (words = 'Talking'), (mood = 'talking'), (tone = 'live');
  if (g.flash) (words = g.flash), (tone = 'live');

  const inner = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!inner.current) return;
    const ro = new ResizeObserver(() => setW(inner.current!.offsetWidth));
    ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <button className={`island tone-${tone} ${g.panel === 'tray' ? 'is-open' : ''}`} style={w ? { width: w } : undefined} onClick={() => gus.open(g.panel === 'tray' ? 'none' : 'tray')} aria-label={`Gus: ${words}. Open Gus's tray`} aria-expanded={g.panel === 'tray'}>
      <span className="island-in" ref={inner}>
        <span className="island-gus">
          <Gus mood={mood} size={24} sticker={false} level={g.level} />
        </span>
        <Swap text={words} />
        {tone !== 'idle' && <i className={`island-dot ${tone}`} />}
      </span>
    </button>
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
  const idx = TABS.findIndex((t) => t.key === tab);
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
