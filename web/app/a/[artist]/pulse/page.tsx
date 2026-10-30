'use client';
/**
 * Fan Mail: what came in for you. The screen an artist opens with their coffee.
 *
 *   1. This week as a letter: how it felt in two words, one big number, and the last two weeks
 *      as a trace you can scrub.
 *   2. Mail that needs you (an offer, a city that proved it), one button each.
 *   3. Cities almost there, the newest signatures, what people are posting.
 *   4. Everything older, folded away.
 *
 * The route stays /pulse so old links work.
 */
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deal, InboxMessage } from '@/lib/types';
import type { Pulse } from '@/server/pulse';
import type { ArtistState, MapData } from '@/ui/types';
import { Art } from '@web/components/Art';
import { Icon, type IconName } from '@web/components/Icon';
import { Reel } from '@web/components/Reel';
import { api } from '@web/lib/api';
import { deals } from '@web/lib/deals';
import { gus } from '@web/lib/gus';
import { mutate, useApi } from '@web/lib/hooks';
import '../../../mail.css';
import { plainWords } from '@/lib/plain';

const PROOF = 50;
const DAY = 86_400_000;
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};
const dayName = (back: number) => (back === 0 ? 'Today' : back === 1 ? 'Yesterday' : new Date(Date.now() - back * DAY).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

/** How the week felt, in the words a friend would use. Nobody sees the number behind it. */
function feel(v: number) {
  if (v >= 80) return 'You’re on fire.';
  if (v >= 60) return 'A hot week.';
  if (v >= 35) return 'Heating up.';
  if (v >= 15) return 'Warming up.';
  return 'A quiet week.';
}

/** Older notes were written before Gus stopped naming his sources. Say it the way he would now. */
const plain = (s: string) =>
  plainWords(s)
    .replace(/than Qloo expected for a city this size/gi, 'than a city that size usually gives')
    .replace(/\bQloo\b/g, 'Gus')
    .replace(/\s*\(Demo data\.?\)/gi, '')
    .replace(/\bBounty\b/g, 'draw');

const ICON: Record<string, IconName> = { deal: 'ticket', show: 'calendar', bounty: 'award', pitch: 'building', 'add-city': 'van' };

export default function FanMail() {
  const slug = useParams<{ artist: string }>().artist;
  const router = useRouter();
  const state = useApi<ArtistState>(`/artist/${slug}`);
  const pulse = useApi<Pulse>(`/artist/${slug}/pulse`, { every: 20_000 });
  const inbox = useApi<{ messages: InboxMessage[] }>(`/artist/${slug}/inbox`, { every: 8000 });
  const dealList = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`, { every: 8000 });
  const [earlier, setEarlier] = useState(false);
  const [openStacks, setOpenStacks] = useState<Set<string>>(new Set());
  const map = useApi<MapData>(`/artist/${slug}/map`);

  // Airmail paper; the header and dock blur into it.
  useEffect(() => {
    document.documentElement.classList.add('on-mail');
    return () => document.documentElement.classList.remove('on-mail');
  }, []);

  const p = pulse.data;
  const name = state.data?.artist.name ?? '';
  const dealsById = useMemo(() => new Map((dealList.data?.deals ?? []).map((d) => [d.id, d])), [dealList.data]);

  // The same note can land twice (a retried offer). Keep the newest of each.
  const mail = useMemo(() => {
    const seen = new Set<string>();
    return (inbox.data?.messages ?? []).filter((m) => {
      const k = `${m.kind}|${m.body}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [inbox.data]);
  // Mail stays on top while it still needs you: an offer that's waiting, a show plan for a day.
  const open = (m: InboxMessage) =>
    m.action?.kind === 'deal' ? dealsById.get(m.action.dealId ?? '')?.status === 'waiting' : m.action?.kind === 'show' ? Date.now() - m.createdAt < DAY : false;
  const needs = mail.filter((m) => m.action && (!m.read || open(m))).slice(0, 2);
  const rest = mail.filter((m) => !needs.includes(m));
  const unread = mail.filter((m) => !m.read).length;
  // Older notes from the same city fold into one stack under the newest ("3 more from Burlington").
  const stacks = useMemo(() => {
    const cityOf = (m: InboxMessage) => m.action?.city ?? (typeof m.evidence?.city === 'string' ? m.evidence.city : null);
    const out: { key: string; city: string | null; notes: InboxMessage[] }[] = [];
    const byCity = new Map<string, (typeof out)[number]>();
    for (const m of rest) {
      const c = cityOf(m);
      const hit = c ? byCity.get(c) : undefined;
      if (hit) hit.notes.push(m);
      else {
        const st = { key: c ?? m.id, city: c, notes: [m] };
        out.push(st);
        if (c) byCity.set(c, st);
      }
    }
    return out;
  }, [rest]);
  const cityName = (id: string | null) => (id && map.data?.metros.find((m) => m.id === id)?.name) || 'there';
  const toggleStack = (k: string) =>
    setOpenStacks((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // Opening Fan Mail reads it, after a beat so the new marks register first.
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => {
      api.post(`/artist/${slug}/inbox`, { read: 'all' }).then(() => mutate(`/artist/${slug}/inbox`)).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, [slug, unread]);

  const act = (m: InboxMessage) => {
    const a = m.action;
    if (!a) return;
    if (a.kind === 'deal') {
      const d = dealsById.get(a.dealId ?? '');
      if (d) {
        deals.show(d);
        gus.open('room');
      }
      return;
    }
    if ((a.kind === 'show' || a.kind === 'bounty') && a.city) return router.push(`/a/${slug}/posters?city=${a.city}`);
    if (a.kind === 'pitch' && a.city) return router.push(`/a/${slug}?city=${a.city}&pitch=1`);
    if (a.kind === 'add-city') return router.push(`/a/${slug}/tour`);
  };

  if (!p)
    return (
      <main className="fm">
        <div className="fm-ground" />
        {pulse.error ? (
          <div className="empty fm-empty">
            <Art name="mail" size={120} />
            <h3>The mail’s late.</h3>
            <p>Gus couldn’t pick it up just now. It usually comes through in a minute.</p>
            <button className="btn light" onClick={() => mutate(`/artist/${slug}/pulse`)}>
              Try again
            </button>
          </div>
        ) : (
          <div className="fm-skel">
            <div className="sk" style={{ height: 300, borderRadius: 26 }} />
            <div className="sk" style={{ height: 120, borderRadius: 22 }} />
          </div>
        )}
      </main>
    );

  const s = p.signatures;
  const climbing = s.cities.filter((c) => c.toProof > 0).slice(0, 4);
  const talk = p.chatter.posts.filter((x) => x.kind === 'talk').slice(0, 6);
  const aboutMe = p.chatter.about.includes(name);
  const diff = s.week - s.lastWeek;

  return (
    <main className="fm">
      <div className="fm-ground" />

      <section className="fm-letter" data-tour="mail">
        <div className="fm-airmail" aria-hidden />
        <div className="fm-letter-in">
          <h1 className="fm-feel">{s.week === 0 ? 'Quiet so far this week.' : diff < 0 ? 'A little quieter than last week.' : feel(p.meter.value)}</h1>
          <div className="fm-big">
            <b>
              <Reel value={s.week} />
            </b>
            <span>
              new {s.week === 1 ? 'signature' : 'signatures'}
              <em className={diff > 0 ? 'up' : diff < 0 ? 'down' : ''}>{diff === 0 ? 'same as last week' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than last week`}</em>
            </span>
          </div>
          <Trace daily={s.daily} />
          {s.leader && (
            <p className="fm-lead">
              <b>{s.leader.name}</b> led with {s.leader.count}. {s.today ? `${s.today} signed today.` : 'Nobody’s signed yet today.'}
            </p>
          )}
        </div>
      </section>

      {needs.length > 0 && (
        <section>
          <div className="section-h">
            <h2>For you</h2>
          </div>
          <div className="fm-needs">
            {needs.map((m, i) => (
              <article key={m.id} className="fm-note" style={{ ['--i' as string]: i }}>
                <div className="fm-note-h">
                  <span className="fm-seal">
                    <Icon name={ICON[m.action?.kind ?? ''] ?? 'mail'} bold size={18} />
                  </span>
                  <span className="ink-3 b-13">From Gus · {ago(m.createdAt)}</span>
                  {!m.read && <i className="fm-new">New</i>}
                </div>
                <p>{plain(m.body)}</p>
                {m.action && (
                  <button className={`btn block ${i === 0 ? 'hot' : 'light'}`} onClick={() => act(m)}>
                    {plain(m.action.label)}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {climbing.length > 0 && (
        <section>
          <div className="section-h">
            <h2>Almost there</h2>
            <span className="ink-3 b-13">{PROOF} signed and Gus asks rooms</span>
          </div>
          <ul className="fm-climb card">
            {climbing.map((c, i) => (
              <li key={c.city}>
                <button onClick={() => router.push(`/a/${slug}/posters?city=${c.city}`)}>
                  <span className="fm-climb-t">
                    <b>{c.name}</b>
                    <em>{c.week ? `+${c.week} this week` : 'Quiet this week'}</em>
                  </span>
                  <span className="fm-bar" style={{ ['--w' as string]: `${Math.min(100, (c.total / PROOF) * 100)}%`, ['--i' as string]: i }}>
                    <i />
                  </span>
                  <span className="fm-togo">
                    <b>{c.toProof}</b>
                    to go
                  </span>
                  <Icon name="chevron" size={16} className="ink-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.latest.length > 0 && (
        <section>
          <div className="section-h">
            <h2>Latest signatures</h2>
            <span className="ink-3 b-13">{s.total} in all</span>
          </div>
          <ul className="fm-sigs card">
            {[...s.latest].sort((a, b) => b.at - a.at || b.number - a.number).slice(0, 6).map((g) => (
              <li key={`${g.city}-${g.number}`}>
                <span className="fm-wax">{g.initials.replace(/\./g, '')}</span>
                <span className="fm-sig-t">
                  <b>{g.neighborhood ? `${g.neighborhood}, ${g.name}` : g.name}</b>
                  <em>
                    Fan #{g.number} · {ago(g.at)}
                  </em>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {talk.length > 0 && (
        <section>
          <div className="section-h">
            <h2>{aboutMe ? 'People are talking about you' : 'What fans of your sound are saying'}</h2>
          </div>
          {!aboutMe && <p className="fm-about ink-2">Nobody’s posting about you by name yet. Here’s what fans of {p.chatter.about.slice(0, 2).join(' and ')} are saying.</p>}
          <div className="fm-cards">
            {talk.map((x, i) => (
              <a key={x.id} className="fm-card" href={x.url} target="_blank" rel="noreferrer" style={{ ['--r' as string]: `${[-1.2, 0.9, -0.5][i % 3]}deg`, ['--i' as string]: i }}>
                <p>{x.text}</p>
                <span className="fm-card-by">
                  <b>{x.author}</b>
                  <em>
                    {x.source === 'bluesky' ? 'Bluesky' : 'Lemmy'} · {ago(x.at)}
                  </em>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {stacks.length > 0 && (
        <section>
          <div className="section-h">
            <h2>Earlier</h2>
            {stacks.length > 4 && <button onClick={() => setEarlier((v) => !v)}>{earlier ? 'Fold away' : `Show ${stacks.length - 4} more`}</button>}
          </div>
          <ul className="fm-stacks">
            {stacks.slice(0, earlier ? 20 : 4).map((st, si) => {
              const opened = openStacks.has(st.key);
              const more = st.notes.length - 1;
              return (
                <li key={st.key} className={`fm-stack ${more && !opened ? 'is-stacked' : ''} ${more > 1 && !opened ? 'is-deep' : ''}`} style={{ ['--i' as string]: si }}>
                  {(opened ? st.notes : st.notes.slice(0, 1)).map((m, ni) => (
                    <div key={m.id} className="fm-old" style={{ ['--j' as string]: ni }}>
                      <Icon name={ICON[m.action?.kind ?? ''] ?? 'mail'} size={18} className="ink-3" />
                      <span>
                        <p>{plain(m.body)}</p>
                        <em className="ink-3 b-13">
                          {ago(m.createdAt)}
                          {m.action && (
                            <>
                              {' · '}
                              <button onClick={() => act(m)}>{plain(m.action.label)}</button>
                            </>
                          )}
                        </em>
                      </span>
                    </div>
                  ))}
                  {more > 0 && (
                    <button className="fm-more" aria-expanded={opened} onClick={() => toggleStack(st.key)}>
                      {opened ? 'Fold them up' : `${more} more from ${cityName(st.city)}`}
                      <Icon name="chevron" size={14} className={opened ? 'fm-more-up' : ''} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

/**
 * The last two weeks as a lit trace on a recessed screen. Drag across it to read any day;
 * let go and it rests on today.
 */
function Trace({ daily }: { daily: number[] }) {
  const W = 320;
  const H = 96;
  const pad = 6;
  const max = Math.max(4, ...daily);
  const n = daily.length;
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2 - 8);
  const pts = daily.map((v, i) => [x(i), y(v)] as const);
  // A soft curve through the days (Catmull-Rom as cubic Béziers).
  const line = pts.reduce((d, [px, py], i) => {
    if (i === 0) return `M${px},${py}`;
    const [x0, y0] = pts[i - 2] ?? pts[i - 1];
    const [x1, y1] = pts[i - 1];
    const [x3, y3] = pts[i + 1] ?? [px, py];
    const c = (v: number) => Math.max(pad, Math.min(H - pad, v));
    return `${d} C${x1 + (px - x0) / 6},${c(y1 + (py - y0) / 6)} ${px - (x3 - x1) / 6},${c(py - (y3 - y1) / 6)} ${px},${py}`;
  }, '');
  const [at, setAt] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pick = (cx: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.round(((cx - r.left) / r.width) * (W / (W - pad * 2)) * (n - 1) - (pad / (W - pad * 2)) * (n - 1));
    setAt(Math.max(0, Math.min(n - 1, i)));
  };
  const i = at ?? n - 1;
  const back = n - 1 - i;

  return (
    <div className="fm-trace">
      <div className="fm-read" aria-live="polite">
        <span>{dayName(back)}</span>
        <b>
          {daily[i]} signed
        </b>
      </div>
      <div
        ref={box}
        className="fm-screen"
        role="img"
        aria-label={`Signatures over the last ${n} days, ${daily.reduce((a, b) => a + b, 0)} in all`}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => (e.buttons || e.pointerType === 'mouse') && pick(e.clientX)}
        onPointerUp={() => setAt(null)}
        onPointerLeave={() => setAt(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="fm-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--trace)" stopOpacity="0.32" />
              <stop offset="1" stopColor="var(--trace)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.33, 0.66].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="fm-grid" />
          ))}
          <line x1={x(n - 7) - (x(1) - x(0)) / 2} x2={x(n - 7) - (x(1) - x(0)) / 2} y1="0" y2={H} className="fm-week" />
          <path d={`${line} L${x(n - 1)},${H} L${x(0)},${H} Z`} fill="url(#fm-fill)" />
          <path d={line} className="fm-line" pathLength={1} />
          <line x1={x(i)} x2={x(i)} y1="0" y2={H} className="fm-cursor" />
        </svg>
        <i className={`fm-dot${at == null ? ' live' : ''}`} style={{ ['--fx' as string]: x(i) / W, ['--fy' as string]: y(daily[i]) / H }} />
      </div>
      <div className="fm-axis" aria-hidden>
        <span>Last week</span>
        <span>This week</span>
      </div>
    </div>
  );
}
