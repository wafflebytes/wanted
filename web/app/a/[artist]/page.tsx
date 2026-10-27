'use client';
/**
 * Map (home). The map is the product's first sentence; the drawer leads with Gus's one next
 * move, then your five cities as poster cards, then every city ranked. Tap a city and the map
 * dives in while the drawer becomes that city's sheet.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Deal } from '@/lib/types';
import type { ArtistState, CityData, MapData, MapMetroRow } from '@/ui/types';
import { Art } from '@web/components/Art';
import { CitySheet } from '@web/components/CitySheet';
import { Icon } from '@web/components/Icon';
import { Reel } from '@web/components/Reel';
import { Sheet } from '@web/components/Sheet';
import { api } from '@web/lib/api';
import { deals } from '@web/lib/deals';
import { gus } from '@web/lib/gus';
import { mutate, useApi, useViewport } from '@web/lib/hooks';
import { stage } from '@web/lib/stage';
import '../../home.css';

export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

type Move = { kicker: string; title: string; line: string; action: string; art: 'poster' | 'room' | 'coin' | 'map'; go: () => void; progress: number | null; count?: { n: number; of: number } };


function Home() {
  const slug = useSlug();
  const router = useRouter();
  const params = useSearchParams();
  const cityId = params.get('city');
  const art = useApi<ArtistState>(`/artist/${slug}`);
  const map = useApi<MapData>(`/artist/${slug}/map`);
  const dl = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`);
  const city = useApi<CityData>(cityId ? `/artist/${slug}/city/${cityId}` : null);
  const { w, h } = useViewport();
  const wide = w >= 900;

  const dock = 10 + 62 + 12;
  const detents = useMemo(() => {
    const top = h - 64 - 8;
    // Home has two rests, the card and the list, so the card folds about 1:1 with the finger over the
    // whole travel (a middle rest made it fold three times faster than the hand). A city has three.
    return cityId ? [400 + dock, Math.round(h * 0.6), top] : [340 + dock, top];
  }, [h, cityId]);
  const [at, setAt] = useState(0);
  useEffect(() => setAt(cityId ? 1 : 0), [cityId]);

  useEffect(() => {
    stage.set({ show: true, city: cityId, route: null, bottom: wide ? 0 : detents[Math.min(at, 1)], top: 72 });
    return () => stage.set({ show: false });
  }, [cityId, at, detents, wide]);
  useEffect(() => {
    stage.onPick((p) => {
      if (p.kind === 'metro') router.push(`/a/${slug}?city=${p.id}`, { scroll: false });
    });
  }, [slug, router]);

  const ranked = useMemo(() => (map.data ? map.data.metros.filter((m) => m.rank !== null).sort((a, b) => a.rank! - b.rank!) : []), [map.data]);
  const sleepers = useMemo(() => (map.data ? map.data.metros.filter((m) => m.sleeper).sort((a, b) => (a.liftRank ?? 999) - (b.liftRank ?? 999)) : []), [map.data]);
  const proofBy = useMemo(() => Object.fromEntries((map.data?.proof ?? []).map((p) => [p.city, p])), [map.data]);
  const dive = (id: string) => router.push(`/a/${slug}?city=${id}`, { scroll: false });

  const move = useMemo<Move | null>(() => {
    const opened = art.data?.opened ?? [];
    const waiting = dl.data?.deals.find((d) => d.status === 'waiting');
    if (waiting?.terms)
      return { kicker: 'Needs your OK', title: `${waiting.roomName} will hold ${new Date(`${waiting.terms.date}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`, line: `$${waiting.terms.deposit} deposit, ${waiting.terms.split}% of the door is yours.`, action: 'Review', art: 'coin', go: () => (deals.show(waiting), gus.open('room')), progress: null };
    const held = new Set((dl.data?.deals ?? []).filter((d) => d.status === 'held').map((d) => d.city));
    const proven = opened.find((o) => o.proof?.crossed && !held.has(o.city));
    if (proven) return { kicker: 'Your next move', title: `${proven.name} proved it.`, line: `${proven.proof!.signatures} people signed. I can ask three rooms to hold a date.`, action: 'Ask rooms', art: 'room', go: () => (gus.flash(`Asking rooms in ${proven.name}`, 2200), deals.ask(slug, proven.city).then(() => gus.open('room')).catch(() => {})), progress: null };
    // A held date is the next thing to look after: Gus is advancing it with the room.
    const next = (dl.data?.deals ?? []).filter((d) => d.status === 'held' && d.terms && d.terms.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.terms!.date.localeCompare(b.terms!.date))[0];
    if (next?.terms) {
      const when = new Date(`${next.terms.date}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return { kicker: 'Your next show', title: `${next.roomName}, ${when}.`, line: `Gus is advancing it with the room: load-in, soundcheck, where you eat and sleep.`, action: 'Open show day', art: 'room', go: () => router.push(`/a/${slug}/show/${next.id}`), progress: null };
    }
    const warm = [...opened].filter((o) => !o.proof?.crossed).sort((a, b) => (b.proof?.signatures ?? 0) - (a.proof?.signatures ?? 0))[0];
    if (warm && (warm.proof?.signatures ?? 0) > 0) {
      const n = warm.proof!.signatures;
      const twin = ranked.some((m) => m.name === warm.name && m.id !== warm.city);
      const name = twin ? `${warm.name}, ${warm.city.slice(-2).toUpperCase()}` : warm.name;
      return { kicker: 'Your next move', title: `${name} is warming up.`, line: `${Math.max(0, 50 - n)} more and I can ask rooms to hold a date. Share the poster where they hang out.`, action: 'Share the poster', art: 'poster', go: () => router.push(`/a/${slug}/posters?city=${warm.city}`), progress: Math.min(1, n / 50), count: { n, of: 50 } };
    }
    const top = ranked[0];
    if (top) {
      const s = sleepers[0];
      return { kicker: 'Your next move', title: `Start in ${top.name}.`, line: s && s.id !== top.id ? `Your biggest crowd. Then try ${s.name}: more fans than its size.` : 'Your biggest crowd. Put a poster up and see who signs.', action: `Open ${top.name}`, art: 'map', go: () => dive(top.id), progress: null };
    }
    return null;
  }, [art.data, dl.data, ranked, sleepers, slug]);

  const five = ranked.slice(0, 5);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return ranked.slice(5, 60);
    const hit = ranked.filter((m) => `${m.name} ${m.state}`.toLowerCase().includes(k));
    return [...hit.filter((m) => m.name.toLowerCase().startsWith(k)), ...hit.filter((m) => !m.name.toLowerCase().startsWith(k))].slice(0, 25);
  }, [q, ranked]);

  const [posting, setPosting] = useState(false);
  const post = async (id: string) => {
    setPosting(true);
    gus.flash('Putting it up');
    try {
      await api.post(`/artist/${slug}/posters`, { city: id });
      await Promise.all([mutate(`/artist/${slug}`), mutate(`/artist/${slug}/map`)]);
      router.push(`/a/${slug}/posters?city=${id}`);
    } catch {
      gus.flash('Couldn’t post it');
    } finally {
      setPosting(false);
    }
  };

  const signatures = art.data?.opened.reduce((n, o) => n + (o.proof?.signatures ?? 0), 0) ?? 0;

  const head = cityId ? null : move ? <NextMove move={move} /> : <div className="nm-skel"><div className="sk" style={{ width: '40%', height: 12 }} /><div className="sk" style={{ width: '80%', height: 26, marginTop: 10 }} /><div className="sk" style={{ width: '60%', height: 14, marginTop: 10 }} /></div>;

  const body = cityId ? (
    city.data && city.data.metro.id === cityId ? (
      <CitySheet slug={slug} d={city.data} opened={!!art.data?.opened.find((o) => o.city === cityId)} posting={posting} onPost={() => post(cityId)} onClose={() => router.push(`/a/${slug}`, { scroll: false })} />
    ) : (
      <div className="city-skel">
        <div className="sk" style={{ width: '30%', height: 12 }} />
        <div className="sk" style={{ width: '70%', height: 36, marginTop: 12 }} />
        <div className="sk" style={{ width: '90%', height: 14, marginTop: 14 }} />
        <p className="shimmer" style={{ marginTop: 18 }}>
          Diving in. Street-level heat first, then the neighbourhoods…
        </p>
      </div>
    )
  ) : (
    <div className="home-body">
      <div className="home-sum">
        <div className="stat">
          <b>
            <Reel value={signatures} />
          </b>
          <span>signed</span>
        </div>
        <div className="stat">
          <b>{art.data?.opened.length ?? 0}</b>
          <span>posters up</span>
        </div>
        <div className="stat">
          <b>{map.data ? ranked.length : '–'}</b>
          <span>cities with fans</span>
        </div>
      </div>
      <div className="section-h">
        <h2>Your five</h2>
        <span className="ink-3 b-13">Where your crowd is</span>
      </div>
      <div className="five" data-nodrag>
        {five.map((m, i) => (
          <FiveCard key={m.id} m={m} i={i} opened={map.data!.opened.includes(m.id)} signed={proofBy[m.id]?.signatures ?? 0} sleeper={m.sleeper} slug={slug} onOpen={() => dive(m.id)} />
        ))}
      </div>
      <div className="section-h">
        <h2>{q.trim() ? 'Search' : 'Everywhere else'}</h2>
      </div>
      <label className="search" data-nodrag>
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setAt(2)} placeholder={`Search ${ranked.length} cities`} aria-label="Search cities" />
      </label>
      <div className="card rows">
        {list.map((m) => (
          <button key={m.id} className="card-row city-row" onClick={() => (setQ(''), dive(m.id))}>
            <span className="cr-rank num">{m.rank}</span>
            <span className="cr-name">
              <b>{m.name}</b>
              <em>
                {m.state}
                {m.sleeper ? ' · overlooked' : ''}
                {proofBy[m.id] ? ` · ${proofBy[m.id].signatures} signed` : ''}
              </em>
            </span>
            <span className="cr-bar">
              <i style={{ width: `${Math.round((m.score ?? 0) * 0.9 + 10)}%` }} />
            </span>
            <Icon name="chevron" size={16} className="ink-3" />
          </button>
        ))}
        {q.trim() && !list.length && <p className="ink-2" style={{ padding: 16 }}>No “{q.trim()}” in {ranked.length} cities. Try the nearest big city.</p>}
      </div>
      <p className="how ink-3 b-13">
        <Icon name="info" size={14} /> Ranked by where fans of your sound live, weighed against each city’s size.
      </p>
    </div>
  );

  return (
    <main className={`home ${cityId ? 'in-city' : ''}`}>
      {wide ? (
        <aside className="home-panel card">
          {head && <div className="sheet-head">{head}</div>}
          {/* On a computer the panel's own scroll folds the card, the way the drawer does on a phone. */}
          <div className="home-panel-body" onScroll={(e) => {
              const p = Math.min(1, e.currentTarget.scrollTop / 140);
              const panel = e.currentTarget.parentElement!;
              panel.style.setProperty('--p', p.toFixed(3));
              panel.toggleAttribute('data-folded', p > 0.5);
            }}>
            {body}
          </div>
        </aside>
      ) : (
        <Sheet detents={detents} at={at} onAt={setAt} head={head} className={cityId ? 'sheet-city' : ''}>
          {body}
        </Sheet>
      )}
    </main>
  );
}

function useSlug() {
  const [slug, setSlug] = useState(() => (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : ''));
  useEffect(() => setSlug(window.location.pathname.split('/')[2]), []);
  return slug;
}

function NextMove({ move }: { move: Move }) {
  const ask = move.kicker === 'Needs your OK';
  // Both faces are always there; the drawer's --p (0 at the peek, 1 at half) crossfades them and
  // folds the head's height, so the card collapses under your finger instead of swapping.
  const card = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const c = card.current;
    if (!c) return;
    const ro = new ResizeObserver(() => wrap.current?.style.setProperty('--nm-h', `${c.offsetHeight}px`));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="nm-wrap" ref={wrap}>
      <button className="nm-compact" onClick={move.go}>
        <i className={`dot ${ask ? 'ask' : 'hot'}`} />
        <b>{move.title}</b>
        <span className="btn xs">{move.action}</span>
      </button>
      <NextMoveCard move={move} ask={ask} r={card} />
    </div>
  );
}

function NextMoveCard({ move, ask, r }: { move: Move; ask: boolean; r: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className={`nm ${ask ? 'is-ask' : ''}`} ref={r}>
      <Art name={move.art} size={124} className="nm-obj" />
      <span className={`kicker ${ask ? 'k-ask' : 'k-hot'}`}>{move.kicker}</span>
      <h2 className="nm-title">{move.title}</h2>
      {move.count ? (
        <div className="nm-meter" role="img" aria-label={`${move.count.n} of ${move.count.of} signed`}>
          <div className="nm-count">
            <b>
              <Reel value={move.count.n} />
            </b>
            <span>/ {move.count.of} signed</span>
          </div>
          <div className="nm-ticks" aria-hidden>
            {Array.from({ length: move.count.of }, (_, i) => (
              <i key={i} className={i < move.count!.n ? (i === move.count!.n - 1 ? 'on last' : 'on') : ''} style={{ ['--i' as string]: i }} />
            ))}
          </div>
        </div>
      ) : null}
      <p className="nm-line">{move.line}</p>
      <button className={`btn block ${ask ? '' : 'hot'}`} onClick={move.go} data-tour="next-move">
        {move.action}
        <Icon name="forward" size={18} />
      </button>
    </div>
  );
}

function FiveCard({ m, i, opened, signed, sleeper, slug, onOpen }: { m: MapMetroRow; i: number; opened: boolean; signed: number; sleeper: boolean; slug: string; onOpen: () => void }) {
  const why = sleeper ? 'More fans than its size' : (m.heatRank ?? 99) <= 10 ? 'One of your biggest crowds' : (m.liftRank ?? 99) <= 15 ? 'Punches above its size' : 'A solid crowd';
  return (
    <button className={`five-card ${opened ? 'has-poster' : ''}`} onClick={onOpen} style={{ ['--i' as string]: i }}>
      {opened ? (
        <img className="five-poster" src={`/img/poster/${slug}/${m.id}?w=360`} alt={`The WANTED poster for ${m.name}`} loading="lazy" />
      ) : (
        <div className="five-paper">
          <span className="five-rank num">#{m.rank}</span>
          <span className="five-name">{m.name}</span>
          <span className="five-state">{m.state}</span>
          <Halftone seed={m.id} />
        </div>
      )}
      <div className="five-meta">
        <b>
          {m.name}
          {sleeper && <i className="five-star">★</i>}
        </b>
        <span>{opened ? `${signed} signed` : why}</span>
      </div>
    </button>
  );
}

/** A little printed-dot field so cards without a poster still feel like paper. */
function Halftone({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const dots = Array.from({ length: 42 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const x = (i % 7) * 14 + 7;
    const y = Math.floor(i / 7) * 12 + 6;
    const r = 1 + ((h >>> 8) % 100) / 100 * 4 * (1 - Math.abs(x - 49) / 70);
    return <circle key={i} cx={x} cy={y} r={r} />;
  });
  return (
    <svg className="five-ht" viewBox="0 0 98 72" aria-hidden>
      {dots}
    </svg>
  );
}
