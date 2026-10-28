'use client';
/**
 * Posters: every city with a WANTED poster up, pinned to a wall.
 *
 *   1. The city's name centred with its neighbours peeking (very-good-ref's title pager), and
 *      under it the posters themselves. Swipe and the next one swings straight; tap and it lifts.
 *   2. Where that city stands, said once: a big number, one sentence, one button.
 *   3. The draw, where they signed, and the newest signatures as stamps.
 */
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Deal } from '@/lib/types';
import type { ArtistState, OpenedCity, PosterState } from '@/ui/types';
import { Art } from '@web/components/Art';
import { Icon } from '@web/components/Icon';
import { Reel } from '@web/components/Reel';
import { api } from '@web/lib/api';
import { gus, type Spot } from '@web/lib/gus';
import { haptic } from '@web/lib/haptics';
import { shareStory } from '@web/lib/share';
import { deals } from '@web/lib/deals';
import { mutate, useApi } from '@web/lib/hooks';
import { stage } from '@web/lib/stage';
import '../../../posters.css';

const PROOF = 50;
const nightOf = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};
const img = (slug: string, city: string, w = 640, v = 0) => `/img/poster/${slug}/${city}?w=${w}&v=${v}`;

type Stand = { tone: 'fans' | 'good' | 'live'; big: string; unit: string; line: string; cta: { label: string; icon: 'share' | 'building' | 'check'; run: 'share' | 'rooms' | 'offer' | 'booked' } };

/** Where a city stands, as one number and one sentence, with the one thing to do about it. */
function standing(o: OpenedCity, live: Deal | null, p: PosterState | undefined): Stand {
  const n = p?.count ?? o.proof?.signatures ?? 0;
  const share = { label: `Share the ${o.name} poster`, icon: 'share' as const, run: 'share' as const };
  if (o.playedAt) return { tone: 'live', big: String(n), unit: 'signed', line: `You played ${o.name}${o.playedVenue ? ` at ${o.playedVenue}` : ''}. Every fan’s card has the stamp.`, cta: share };
  // A booked city is news: the post that says so is the next city's poster.
  const booked = { label: `Post that ${o.name} is booked`, icon: 'share' as const, run: 'booked' as const };
  if (live?.status === 'held' && live.terms) return { tone: 'good', big: nightOf(live.terms.date), unit: '', line: `Booked at ${live.roomName}. You keep ${live.terms.split}% of ticket sales. Everyone who signed hears first.`, cta: booked };
  if (p?.show) return { tone: 'good', big: nightOf(p.show.date), unit: '', line: `You’re on at ${p.show.room}. Everyone who signed hears first.`, cta: booked };
  if (live?.status === 'waiting') return { tone: 'good', big: 'Yes', unit: `from ${live.roomName}`, line: `They offered ${live.terms ? nightOf(live.terms.date) : 'a night'}. It’s waiting on your OK.`, cta: { label: 'Look at the offer', icon: 'check', run: 'offer' } };
  if (live?.status === 'talking') return { tone: 'fans', big: String(n), unit: 'signed', line: `Gus is talking to ${live.roomName} now. He’ll bring you the best offer.`, cta: share };
  if (n >= PROOF || o.proof?.crossed) return { tone: 'good', big: String(n), unit: 'signed', line: `That’s enough for venues to take you seriously. Time to ask them for a date.`, cta: { label: `Ask venues in ${o.name}`, icon: 'building', run: 'rooms' } };
  return { tone: 'fans', big: String(n), unit: `/ ${PROOF} signed`, line: `${PROOF - n} more and Gus asks venues here for a date. Put the poster where your fans hang out.`, cta: share };
}

export default function PostersPage() {
  const slug = useParams<{ artist: string }>().artist;
  const router = useRouter();
  const state = useApi<ArtistState>(`/artist/${slug}`);
  const dealList = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`, { every: 8000 });
  // The wall reads as a to-do list: proven cities waiting on rooms, then the closest to proving
  // it, and the shows already played at the end.
  const opened = useMemo(() => {
    const rank = (c: OpenedCity) => (c.playedAt ? 2 : c.proof?.crossed ? 0 : 1);
    return [...(state.data?.opened ?? [])].sort((a, b) => rank(a) - rank(b) || (b.proof?.signatures ?? 0) - (a.proof?.signatures ?? 0));
  }, [state.data]);
  const [idx, setIdx] = useState(0);
  const o = opened[Math.min(idx, Math.max(0, opened.length - 1))] ?? null;
  // On a computer the map beside the rail flies to the poster you're on (with its pinned spots).
  const posterCity = o?.city ?? null;
  useEffect(() => {
    if (window.innerWidth < 900 || !posterCity) return;
    stage.set({ city: posterCity, route: null, top: 72, bottom: 0 });
    return () => stage.set({ city: null });
  }, [posterCity]);
  const poster = useApi<PosterState>(o ? `/w/${slug}/${o.city}` : null, { every: 6000 });
  const p = poster.data?.city.id === o?.city ? poster.data : undefined;
  const live = dealList.data?.deals.find((d) => d.city === o?.city && (d.status === 'held' || d.status === 'waiting' || d.status === 'talking')) ?? null;
  const [lifted, setLifted] = useState(false);
  const pins = useApi<{ spots: Record<string, Spot[]> }>(`/artist/${slug}/spots`);
  const spots = o ? (pins.data?.spots[o.city] ?? []) : [];

  // The wall has its own ground; the header and dock blur into it.
  useEffect(() => {
    document.documentElement.classList.add('on-wall');
    return () => document.documentElement.classList.remove('on-wall');
  }, []);
  // A deep link (?city=) lands on its poster.
  useEffect(() => {
    const want = new URLSearchParams(location.search).get('city');
    const i = want ? opened.findIndex((x) => x.city === want) : -1;
    if (i > 0) setIdx(i);
  }, [opened]);

  const url = o ? `${location.origin}/w/${slug}/${o.city}` : '';
  const share = () => {
    if (!o) return;
    if (navigator.share) navigator.share({ title: `${state.data?.artist.name} is wanted in ${o.name}`, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => gus.flash('Link copied'));
  };
  const s = o ? standing(o, live, p) : null;
  const go = (run: Stand['cta']['run']) => {
    if (run === 'share') return share();
    if (run === 'booked') return shareStory(`/img/story/${slug}/${o!.city}?kind=booked`, `${o!.city}-booked`, { text: `${o!.name}, you did it. See you there.`, url });
    if (run === 'offer') {
      if (live) deals.show(live);
      return gus.open('room');
    }
    router.push(`/a/${slug}?city=${o!.city}`);
  };

  if (state.loading && !state.data) return <main className="pw"><div className="pw-ground" /><div className="pw-skel sk" /></main>;
  if (!opened.length)
    return (
      <main className="pw">
        <div className="pw-ground" />
        <div className="empty pw-empty">
          <Art name="stapler" size={128} />
          <h2 className="d-24">No posters up yet.</h2>
          <p className="ink-2">Open a city on the map and Gus prints a WANTED poster for it. Fans sign it to bring you there.</p>
          <button className="btn hot" onClick={() => router.push(`/a/${slug}`)}>
            Pick a city on the map
          </button>
        </div>
      </main>
    );

  return (
    <main className="pw">
      <div className="pw-ground" />
      <Wall slug={slug} cities={opened} idx={idx} onIdx={setIdx} onLift={() => setLifted(true)} />

      {o && s && (
        <section className="pw-stand" key={o.city}>
          <div className={`pw-num t-${s.tone}`}>
            <b>{/^\d+$/.test(s.big) ? <Reel value={Number(s.big)} /> : s.big}</b>
            {s.unit && <span>{s.unit}</span>}
          </div>
          {s.tone === 'fans' && !live && <Meter n={Number(s.big)} />}
          <p className="pw-line">{s.line}</p>
          <button className="btn hot block" onClick={() => go(s.cta.run)}>
            <Icon name={s.cta.icon} bold size={18} />
            {s.cta.label}
          </button>
          <div className="pw-keys">
            <button className="pw-key" onClick={() => navigator.clipboard?.writeText(url).then(() => gus.flash('Link copied'))}>
              <Icon name="link" size={20} />
              Copy link
            </button>
            <button className="pw-key" onClick={() => shareStory(img(slug, o.city, 1080) + '&format=story&type=jpg', `wanted-${o.city}`, { text: `${o.name}, sign this and I’ll come play.`, url })}>
              <Icon name="layers" size={20} />
              For a story
            </button>
            <a className="pw-key" href={`/w/${slug}/${o.city}`} target="_blank" rel="noreferrer">
              <Icon name="eye" size={20} />
              What fans see
            </a>
          </div>
        </section>
      )}

      {p?.bounty && o && <Bounty slug={slug} city={o.city} artist={state.data?.artist.name.split(' ')[0] ?? 'you'} b={p.bounty} booked={!!(o.playedAt || p.show || live?.status === 'held')} />}

      {p?.dibs && <FirstDibs d={p.dibs} />}

      {o?.proof && o.proof.neighborhoods.length > 0 && (
        <section className="pw-sec">
          <div className="section-h">
            <h2>Where they signed</h2>
          </div>
          <ol className="pw-hoods card">
            {o.proof.neighborhoods.slice(0, 5).map((h, i, all) => (
              <li key={h.name} style={{ ['--w' as string]: `${(h.count / all[0].count) * 100}%`, ['--i' as string]: i }}>
                <span>{h.name}</span>
                <b>{h.count}</b>
              </li>
            ))}
          </ol>
          <p className="fine ink-3 b-13">Put posters up here first. It’s where your people already are.</p>
        </section>
      )}

      {o && pins.data && (
        <section className="pw-sec">
          <div className="section-h">
            <h2>Where your posters go</h2>
            {spots.length > 0 && <span className="ink-3 b-13">Picked with Gus</span>}
          </div>
          {spots.length ? (
            <ol className="pw-spots card">
              {spots.map((s, i) => (
                <li key={s.id} style={{ ['--i' as string]: i }}>
                  <a href={`https://maps.apple.com/?q=${encodeURIComponent(`${s.name}, ${s.address ?? o.name}`)}${s.lat !== null && s.lon !== null ? `&ll=${s.lat},${s.lon}` : ''}`} target="_blank" rel="noopener">
                    <i aria-hidden>{i + 1}</i>
                    <span>
                      <b>{s.name}</b>
                      {s.neighborhood && <em>{s.neighborhood}</em>}
                    </span>
                    <Icon name="location" size={18} className="ink-3" />
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <button className="btn light block" onClick={() => (haptic('tap'), gus.open('voice'), gus.ask(`Where should I put posters up in ${o.name}?`))}>
              <Icon name="gus" size={18} />
              Ask Gus where to put them up
            </button>
          )}
          <p className="fine ink-3 b-13">{spots.length ? 'Bars and cafes where your fans already hang out. Ask the staff first.' : 'He looks for the bars and cafes your fans already hang out in.'}</p>
        </section>
      )}

      {p && p.signatures.length > 0 && (
        <section className="pw-sec">
          <div className="section-h">
            <h2>Newest signatures</h2>
            <span className="ink-3 b-13">{p.count} in all</span>
          </div>
          <div className="pw-stamps">
            {p.signatures.slice(0, 9).map((g, i) => (
              <div key={g.number} className="pw-stamp" title={g.deputy ? 'Shares your poster with friends' : undefined} style={{ ['--i' as string]: i, ['--r' as string]: `${((g.number * 37) % 9) - 4}deg` }}>
                <i>#{g.number}</i>
                <b>{g.initials}</b>
                <span>{g.neighborhood ?? o?.name}</span>
                <em>{ago(g.createdAt)}</em>
                {g.deputy && <Icon name="star" bold size={13} className="pw-star" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {lifted && o && <Lift src={img(slug, o.city, 1080, p?.count ?? 0)} name={o.name} onShare={share} onClose={() => setLifted(false)} />}
    </main>
  );
}

/**
 * The wall: city names in a pager over a row of pinned posters. Scroll position drives both,
 * so the name and the poster move as one; the poster in the middle hangs straight.
 */
function Wall({ slug, cities, idx, onIdx, onLift }: { slug: string; cities: OpenedCity[]; idx: number; onIdx: (i: number) => void; onLift: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const names = useRef<HTMLDivElement>(null);
  const settled = useRef(idx);

  const paint = () => {
    const t = track.current;
    if (!t) return;
    const slide = t.firstElementChild as HTMLElement | null;
    const step = slide ? slide.offsetWidth : 1;
    const at = t.scrollLeft / step;
    Array.from(t.children).forEach((el, i) => {
      const d = i - at;
      const a = Math.min(1, Math.abs(d));
      (el as HTMLElement).style.setProperty('--d', String(Math.max(-1.5, Math.min(1.5, d))));
      (el as HTMLElement).style.setProperty('--a', String(a));
    });
    Array.from(names.current?.children ?? []).forEach((el, i) => {
      const d = i - at;
      const a = Math.min(1.6, Math.abs(d));
      (el as HTMLElement).style.transform = `translateX(calc(-50% + ${d * 190}px)) scale(${1 - a * 0.22})`;
      (el as HTMLElement).style.opacity = String(Math.max(0, 1 - a * 0.66));
    });
    const near = Math.round(at);
    if (near !== settled.current && Math.abs(at - near) < 0.2) {
      settled.current = near;
      onIdx(near);
    }
  };

  useLayoutEffect(() => {
    const t = track.current;
    if (!t) return;
    const step = (t.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    if (idx !== settled.current || t.scrollLeft === 0) {
      t.scrollTo({ left: idx * step, behavior: 'instant' as ScrollBehavior });
      settled.current = idx;
    }
    paint();
  }, [idx, cities.length]);

  const goTo = (i: number) => {
    const t = track.current;
    const step = (t?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    t?.scrollTo({ left: i * step, behavior: 'smooth' });
  };

  return (
    <section className="pw-wall" aria-label="Your posters" data-tour="poster">
      <div className="pw-names" ref={names} aria-hidden>
        {cities.map((c, i) => (
          <button key={c.city} tabIndex={-1} onClick={() => goTo(i)}>
            {c.name}
            <small>{c.state}</small>
          </button>
        ))}
      </div>
      <div className="pw-track" ref={track} onScroll={() => requestAnimationFrame(paint)}>
        {cities.map((c, i) => (
          <div key={c.city} className="pw-slide">
            <button className="pw-poster" onClick={() => (i === idx ? onLift() : goTo(i))} aria-label={i === idx ? `Open the ${c.name} poster` : `Go to ${c.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(slug, c.city, 640)} alt={`WANTED poster for ${c.name}`} loading={Math.abs(i - idx) < 2 ? 'eager' : 'lazy'} draggable={false} />
            </button>
          </div>
        ))}
      </div>
      <div className="pw-dots" aria-hidden>
        {cities.map((c, i) => (
          <i key={c.city} className={i === idx ? 'on' : (c.proof?.signatures ?? 0) >= PROOF ? 'ok' : ''} />
        ))}
      </div>
    </section>
  );
}

/** Fifty ticks, one per signature needed; the ones filled are the ones you have. */
function Meter({ n }: { n: number }) {
  return (
    <div className="pw-meter" role="img" aria-label={`${n} of ${PROOF} signed`}>
      {Array.from({ length: PROOF }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} style={{ ['--i' as string]: i }} />
      ))}
    </div>
  );
}

function Bounty({ slug, city, artist, b, booked }: { slug: string; city: string; artist: string; b: NonNullable<PosterState['bounty']>; booked: boolean }) {
  const [busy, setBusy] = useState(false);
  const draw = async () => {
    setBusy(true);
    try {
      await api.post(`/artist/${slug}/posters`, { city, action: 'draw' });
      await mutate(`/w/${slug}/${city}`);
    } catch {
      gus.flash('Couldn’t draw just now');
    } finally {
      setBusy(false);
    }
  };
  const w = b.drawn?.winner;
  return (
    <section className="pw-sec pw-draw">
      <div className="pw-ticket-sh">
        <div className="pw-ticket">
          <div className="pw-bounty">
            <span className="kicker">A prize for one fan</span>
            <b className="pw-prize">{b.prize}</b>
            {w ? (
              <p>
                <strong>
                  {w.initials}
                  {w.neighborhood ? ` from ${w.neighborhood}` : ''}
                </strong>{' '}
                won it, picked fairly from {b.totalEntries} chances.
              </p>
            ) : !booked ? (
              <p>Once a show here is booked, you draw a winner and Gus tells them.</p>
            ) : (
              <p>The show is booked. Draw now and Gus tells the winner.</p>
            )}
          </div>
          <div className="pw-stub" aria-label={w ? `Winner, signer number ${w.number}` : `${b.signers} in the draw`}>
            {w ? (
              <>
                <i>Winner</i>
                <b>#{w.number}</b>
              </>
            ) : (
              <>
                <b>{b.signers}</b>
                <i>{b.signers === 1 ? 'is in' : 'are in'}</i>
              </>
            )}
          </div>
        </div>
      </div>
      {w && (
        <button className="btn hot block pw-draw-go" onClick={() => shareStory(`/img/story/${slug}/${city}?kind=winner`, `${city}-winner`, { text: `Signer #${w.number}${w.neighborhood ? ` from ${w.neighborhood}` : ''}, you won the draw. Check your number.`, url: `${location.origin}/w/${slug}/${city}` })}>
          <Icon name="share" bold size={18} />
          Post the winner
        </button>
      )}
      {booked && !w && (
        <button className="btn light block pw-draw-go" disabled={busy} onClick={draw}>
          {busy ? 'Drawing…' : `Draw ${artist}’s winner`}
        </button>
      )}
    </section>
  );
}

/** The poster lifts off the wall to fill the screen, with the one thing you'd do with it. */
function Lift({ src, name, onShare, onClose }: { src: string; name: string; onShare: () => void; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="pw-lift" role="dialog" aria-label={`${name} poster`} onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`WANTED poster for ${name}`} onClick={(e) => e.stopPropagation()} />
      <div className="pw-lift-acts" onClick={(e) => e.stopPropagation()}>
        <button className="btn light" onClick={onClose}>
          Done
        </button>
        <button className="btn hot" onClick={onShare}>
          <Icon name="share" bold size={18} />
          Share
        </button>
      </div>
    </div>
  );
}

/**
 * First dibs, from the artist's side: the city's signers get tickets two days before the public
 * sale, and the count of tickets they're holding is the room's proof before a single one sells.
 */
function FirstDibs({ d }: { d: NonNullable<PosterState['dibs']> }) {
  const on = new Date(`${d.signersOn}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <section className="pw-sec">
      <div className="section-h">
        <h2>First dibs</h2>
        <span className="ink-3 b-13">Signers buy first</span>
      </div>
      <div className="pw-dibs card">
        <div className="pw-dibs-n">
          <b>
            <Reel value={d.tickets} />
          </b>
          <span>{d.holders ? `tickets held by ${d.holders} ${d.holders === 1 ? 'signer' : 'signers'}` : 'tickets held so far'}</span>
        </div>
        <p className="ink-2">
          The people who signed get the ticket link on {on}, two days before everyone else. Wanted’s ${d.fee} a ticket comes from the venue, never your fans.
        </p>
      </div>
    </section>
  );
}
