'use client';
/**
 * Show day. Everything about one held date on one page, kept by Gus: the day as a timeline,
 * where each time says who set it (the room, Gus, the road); the advance with the venue; the
 * fans; the opener; what you take home; where you sleep.
 *
 * The moment it earns its keep: the room writes to change something. Gus brings the letter and
 * one sentence of what it would cost; hold to say yes, and only what depends on it moves, on
 * screen, with a mark. Dinner re-picks itself for the whole band in the new window.
 */
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Deal, TourPlan } from '@/lib/types';
import type { ArtistState, Crowd } from '@/ui/types';
import { Gus } from '@web/components/Gus';
import { HoldKey } from '@web/components/GusPanels';
import { Icon } from '@web/components/Icon';
import { gus } from '@web/lib/gus';
import { haptic } from '@web/lib/haptics';
import { useApi } from '@web/lib/hooks';
import { shareStory } from '@web/lib/share';
import { ampm, clock, dayFor, plan, type Day, type Row } from '@web/lib/showday';
import '../../../../showday.css';

const nice = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const daysTo = (iso: string) => Math.max(0, Math.round((new Date(`${iso}T12:00`).getTime() - Date.now()) / 86_400_000));
const WHO_LABEL: Record<Row['who'], string> = { room: 'The venue', gus: 'Gus', road: 'Road', fans: 'Fans' };

export default function ShowDay() {
  const { artist: slug, deal: dealId } = useParams<{ artist: string; deal: string }>();
  const router = useRouter();
  const dl = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`);
  const deal = dl.data?.deals.find((d) => d.id === dealId) ?? null;
  const crowd = useApi<Crowd>(deal ? `/artist/${slug}/crowd?city=${deal.city}` : null);
  const art = useApi<ArtistState>(`/artist/${slug}`);
  const tour = useApi<{ plan: TourPlan | null }>(`/artist/${slug}/plan`);
  const signers = art.data?.opened.find((o) => o.city === deal?.city)?.proof?.signatures ?? 0;

  const [day, setDay] = useState<Day | null>(null);
  useEffect(() => {
    if (!deal?.terms || day || crowd.data === undefined || tour.data === undefined) return;
    // Where you're coming from: the stop before this date on your tour, if it's on one.
    const stops = tour.data?.plan?.stops ?? [];
    const k = stops.findIndex((s) => s.metroId === deal.city);
    const prev = k > 0 ? { city: `${stops[k - 1].city}, ${stops[k - 1].state}`, hours: stops[k].driveHoursFromPrev } : null;
    setDay(dayFor(deal, crowd.data ?? null, signers, prev));
  }, [deal, crowd.data, tour.data, signers, day]);

  if (dl.data && !deal?.terms)
    return (
      <main className="sd">
        <div className="sd-empty">
          <Gus mood="waiting" size={96} />
          <h1>No show here yet</h1>
          <p>Once a venue books you, the show day lives here.</p>
          <button className="btn light" onClick={() => router.push(`/a/${slug}/tour`)}>
            See your tour
          </button>
        </div>
      </main>
    );
  if (!day || !deal) return <main className="sd"><div className="sd-skel"><div className="sk" style={{ width: '40%', height: 12 }} /><div className="sk" style={{ width: '75%', height: 34, marginTop: 12 }} /><div className="sk" style={{ width: '90%', height: 16, marginTop: 14 }} /><div className="sk" style={{ width: '100%', height: 320, marginTop: 28, borderRadius: 22 }} /></div></main>;
  return <Sheet0 day={day} setDay={setDay} slug={slug} deal={deal} />;
}

function Sheet0({ day, setDay, slug, deal }: { day: Day; setDay: (d: Day) => void; slug: string; deal: Deal }) {
  const router = useRouter();
  const [moved, setMoved] = useState<Set<string>>(new Set());
  const [line, setLine] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const settled = day.advance.filter((a) => a.a).length;
  const asked = day.advance.filter((a) => !a.a).map((a) => a.k ?? a.q.toLowerCase());
  const meal = day.meals.find((m) => m.id === day.dinner)!;
  const dinnerRow = day.rows.find((r) => r.id === 'dinner')!;
  const window = (dinnerRow.end ?? 0) - dinnerRow.at;

  const say = line ?? `${settled} of ${day.advance.length} things are settled with ${day.room}. I asked about ${listOf(asked.slice(0, 3))}.`;

  const accept = () => {
    const c = day.pending!;
    const next = { ...day, rows: day.rows.map((r) => (r.id === 'check' ? { ...r, src: `${c.letter.from}, today` } : r)) };
    const p = plan(next, c.soundcheck);
    const before = day.meals.find((m) => m.id === day.dinner)!;
    const after = day.meals.find((m) => m.id === p.dinner)!;
    setDay({ ...next, ...p, pending: null, thread: [...day.thread, c.letter, { from: 'Gus', when: 'Just now', text: c.reply }] });
    setMoved(p.moved);
    const w = (p.rows.find((r) => r.id === 'dinner')!.end ?? 0) - p.rows.find((r) => r.id === 'dinner')!.at;
    setLine(before.id === after.id ? `${day.room} moved soundcheck to ${clock(c.soundcheck)}. Nothing else had to move.` : `Soundcheck is at ${clock(c.soundcheck)} now, so dinner is ${w} minutes. ${before.name} won’t fit; ${after.name} is ${after.walk} minutes away and works for all three of you. Nothing else moved.`);
    gus.flash(`Told ${c.letter.from} yes`, 2200);
    haptic('success');
    setTimeout(() => setMoved(new Set()), 4200);
  };

  return (
    <main className="sd">
      <header className="sd-hero">
        <span className="kicker k-hot">
          Show day · {nice(day.date)}
        </span>
        <h1>{day.room}</h1>
        <span className="sd-city">
          {day.city} · in {daysTo(day.date)} days
        </span>
        <p className="sd-say" key={say}>
          {say}
        </p>
        <Gus mood={day.pending ? 'phone' : 'working'} size={104} className="sd-gus" />
      </header>

      {day.pending && (
        <section className="sd-letter" aria-live="polite">
          <div className="sd-letter-h">
            <i className="dot ask" />
            <b>New from {day.pending.letter.from} at {day.room}</b>
          </div>
          <blockquote>“{day.pending.letter.text}”</blockquote>
          <p className="sd-letter-g">
            <Gus mood="talking" size={26} /> Yes is fine. Dinner gets shorter, so I’ll find a quicker place that still works for all three of you.
          </p>
          <HoldKey label={`Hold to tell ${day.pending.letter.from} yes`} onDone={accept} />
        </section>
      )}

      <section className="sd-sec">
        <div className="sd-sec-h">
          <h2>The day</h2>
          <span className="sd-legend">
            <i className="w-room" /> the venue set it <i className="w-gus" /> Gus picked
          </span>
        </div>
        <ol className="sd-day">
          {day.rows.map((r) => (
            <li key={r.id} className={`sd-row w-${r.who} s-${r.state} ${moved.has(r.id) ? 'moved' : ''}`}>
              <button className="sd-row-b" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                <span className="sd-t">
                  <b>{clock(r.at)}</b>
                  <em>{ampm(r.at)}</em>
                </span>
                <span className="sd-pin" aria-hidden />
                <span className="sd-what">
                  <b>
                    {r.id === 'dinner' ? `Dinner at ${meal.name}` : r.title}
                    {moved.has(r.id) && <span className="sd-tag">Moved</span>}
                  </b>
                  <span>
                    {r.state === 'asked' ? 'Asked, waiting on the venue' : r.id === 'dinner' ? `${meal.walk} min walk · ${window} min to eat` : r.sub}
                  </span>
                </span>
              </button>
              {open === r.id && r.id === 'dinner' && <Dinner day={day} window={window} />}
              {open === r.id && r.id === 'settle' && (
                <div className="sd-why">
                  Gus checks the venue’s count against the ticket scanner and your guest list, so you’re paid for everyone who came.
                  <button className="sd-more sd-go" onClick={() => router.push(`/a/${slug}/show/${deal.id}/settle`)}>
                    See it on a night
                  </button>
                </div>
              )}
              {open === r.id && r.id !== 'dinner' && r.id !== 'settle' && (
                <p className="sd-why">
                  {r.src ? `${WHO_LABEL[r.who] === 'The venue' ? day.room : WHO_LABEL[r.who]} said so · ${r.src}` : r.who === 'road' ? `Leaves time for a stop and the border-free route. ${day.road.drive} door to door.` : r.id === 'hang' ? 'Your crowd here already goes there. Gus will invite the signers.' : 'Gus will do this one for you.'}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <Advance day={day} />
      <Fans day={day} slug={slug} deal={deal} />
      {day.openers.length > 0 && <Opener day={day} />}
      <Money day={day} />
      <Road day={day} />
    </main>
  );
}

function listOf(xs: string[]) {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** Least-worst dinner: the first place that fits the window and every person's needs. */
function Dinner({ day, window }: { day: Day; window: number }) {
  return (
    <div className="sd-dinner">
      <div className="sd-party">
        {day.party.map((p) => (
          <span key={p.name}>
            <b>{p.name}</b>
            {p.needs ?? 'Anything'}
          </span>
        ))}
      </div>
      <ul>
        {day.meals.map((m) => {
          const need = m.sit + m.walk * 2;
          const fits = need <= window;
          const pick = m.id === day.dinner;
          return (
            <li key={m.id} className={`${pick ? 'pick' : ''} ${fits ? '' : 'out'}`}>
              <span className="sd-m-n">
                <b>{m.name}</b>
                <em>{fits ? `${m.note} · ${need} min with the walk` : `Needs ${need} min, you have ${window}`}</em>
              </span>
              {pick ? <Icon name="check" size={18} bold className="ok-text" /> : m.taste && fits ? <span className="sd-m-t">{m.taste}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Advance({ day }: { day: Day }) {
  const [open, setOpen] = useState(false);
  const settled = day.advance.filter((a) => a.a).length;
  return (
    <section className="sd-sec">
      <div className="sd-sec-h">
        <h2>Sorted with the venue</h2>
        <button className="sd-more" onClick={() => setOpen(!open)}>
          {open ? 'Less' : 'Read the emails'}
        </button>
      </div>
      <div className="sd-adv">
        <div className="sd-adv-n">
          <b>
            {settled}
            <span>/{day.advance.length}</span>
          </b>
          <span>settled with {day.room}</span>
        </div>
        <div className="sd-adv-dots" aria-hidden>
          {day.advance.map((a, i) => (
            <i key={i} className={a.a ? 'on' : ''} />
          ))}
        </div>
      </div>
      <ul className="sd-qs">
        {day.advance.map((a) => (
          <li key={a.q} className={a.a ? '' : 'wait'}>
            <span>{a.q}</span>
            <b>{a.a ?? 'Asked'}</b>
          </li>
        ))}
      </ul>
      {open && (
        <ol className="sd-thread">
          {day.thread.map((l, i) => (
            <li key={i} className={l.from === 'Gus' ? 'gus' : ''}>
              <span>
                {l.from} · {l.when}
              </span>
              <p>{l.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Fans({ day, slug, deal }: { day: Day; slug: string; deal: Deal }) {
  const [sent, setSent] = useState(false);
  return (
    <section className="sd-sec">
      <div className="sd-sec-h">
        <h2>{day.signers ? `Your ${day.signers} signers` : 'Your fans here'}</h2>
      </div>
      <div className="sd-fans card">
        <p>
          {day.signers ? 'They got first dibs on tickets. ' : ''}{day.hang ? <>After the show, invite them to <b>{day.hang.name}</b>, where your crowd here already goes.</> : 'After the show, Gus can invite them somewhere near the venue.'}
        </p>
        {sent ? (
          <p className="sd-done">
            <Icon name="check" size={16} bold /> Invite goes out the morning of the show.
          </p>
        ) : (
          <HoldKey label={day.signers ? `Hold to invite the ${day.signers}` : 'Hold to invite your fans'} onDone={() => (setSent(true), gus.flash('Invite ready', 1800), haptic('success'))} />
        )}
        <button className="btn light block" onClick={() => shareStory(`/img/story/${slug}/${deal.city}?kind=booked`, `${deal.city}-booked`, { text: `${day.city}, you did it. See you ${nice(day.date)}.`, url: `${location.origin}/w/${slug}/${deal.city}` })}>
          <Icon name="share" size={18} />
          Post that it’s booked
        </button>
      </div>
    </section>
  );
}

/** Openers who fit both you and this crowd, from Qloo. Asking the room is the room's call. */
function Opener({ day }: { day: Day }) {
  const [asked, setAsked] = useState<string | null>(null);
  return (
    <section className="sd-sec">
      <div className="sd-sec-h">
        <h2>Who opens</h2>
        <span className="ink-3 b-13">The venue asked for ideas</span>
      </div>
      <div className="sd-ops">
        {day.openers.map((o) => (
          <button key={o.name} className={`sd-op ${asked === o.name ? 'on' : ''}`} onClick={() => (setAsked(o.name), haptic('tick'), gus.flash(`Suggesting ${o.name} to the venue`, 2000))}>
            <Icon name="music" size={20} />
            <span>
              <b>{o.name}</b>
              <em>{o.why}</em>
            </span>
            {asked === o.name ? <Icon name="check" size={18} bold /> : <span className="btn xs light">Suggest</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

/** What you take home, as a control: drag the crowd and watch the number. */
function Money({ day }: { day: Day }) {
  const [n, setN] = useState(Math.min(day.cap, Math.max(day.signers * 2, 60)));
  const cost = day.costs.reduce((s, c) => s + c.n, 0);
  const take = Math.round((n * day.price * day.split) / 100);
  const even = Math.ceil(cost / ((day.price * day.split) / 100));
  const last = useRef(n);
  return (
    <section className="sd-sec">
      <div className="sd-sec-h">
        <h2>What you take home</h2>
      </div>
      <div className="sd-money card">
        <div className="sd-take">
          <b>${(take - cost).toLocaleString()}</b>
          <span>
            if {n} come at ${day.price}
          </span>
        </div>
        <input
          className="range"
          type="range"
          min={20}
          max={day.cap}
          step={5}
          value={n}
          aria-label="How many come"
          onChange={(e) => {
            const v = +e.target.value;
            if (v !== last.current) haptic(v === even || (last.current < even) !== (v < even) ? 'step' : 'tick');
            last.current = v;
            setN(v);
          }}
          style={{ ['--p' as string]: `${((n - 20) / (day.cap - 20)) * 100}%` }}
        />
        <p className="sd-even">
          You keep {day.split}% of ticket sales, ${take.toLocaleString()}. The day costs ${cost} ({day.costs.map((c) => c.label.toLowerCase()).join(', ')}). <b>You’re even at {even} people.</b>
        </p>
      </div>
    </section>
  );
}

function Road({ day }: { day: Day }) {
  const [couch, setCouch] = useState(false);
  return (
    <section className="sd-sec">
      <div className="sd-sec-h">
        <h2>Getting there</h2>
      </div>
      <div className="card rows">
        <div className="card-row sd-r">
          <Icon name="van" size={22} />
          <span>
            <b>From {day.road.from}</b>
            <em>
              {day.road.drive} · leave by {clock(day.road.leave)} {ampm(day.road.leave)}
            </em>
          </span>
        </div>
        <button className={`card-row sd-r ${couch ? '' : 'on'}`} onClick={() => setCouch(false)}>
          <Icon name="home" size={22} />
          <span>
            <b>{day.road.sleep.name}</b>
            <em>{day.road.sleep.sub}</em>
          </span>
          {!couch && <Icon name="check" size={18} bold className="ok-text" />}
        </button>
        {day.road.couches > 0 && (
          <button className={`card-row sd-r ${couch ? 'on' : ''}`} onClick={() => (setCouch(true), haptic('tick'))}>
            <Icon name="heart" size={22} />
            <span>
              <b>{day.road.couches} signers offered a couch</b>
              <em>Gus checks they’re real and close. You save $139.</em>
            </span>
            {couch && <Icon name="check" size={18} bold className="ok-text" />}
          </button>
        )}
      </div>
    </section>
  );
}

