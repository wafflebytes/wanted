'use client';
/**
 * Tour. The route draws across the map; the drawer says the run in one sentence with one button.
 * Half up: Gus's fixes as before → after cards you can take or leave. Full: the run as a dated
 * timeline, each stop lockable, with the drive between stops. Replan keeps the locks and marks
 * what moved.
 */
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deal, Roast, TourPlan, TourStop } from '@/lib/types';
import { Art } from '@web/components/Art';
import { Gus } from '@web/components/Gus';
import { Icon } from '@web/components/Icon';
import { Sheet } from '@web/components/Sheet';
import { ApiError, streamNdjson } from '@web/lib/api';
import { gus } from '@web/lib/gus';
import { mutate, useApi, useViewport } from '@web/lib/hooks';
import { stage } from '@web/lib/stage';
import '../../../tour.css';

type PlanAction = { kind: 'new' } | { kind: 'replan' } | { kind: 'lock'; stopIndex: number; locked: boolean } | { kind: 'fix'; fix: NonNullable<Roast['fix']> };

const day = (iso: string) => new Date(`${iso}T12:00`);
const md = (iso: string) => day(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function TourPage() {
  const slug = useParams<{ artist: string }>().artist;
  const router = useRouter();
  const path = `/artist/${slug}/plan`;
  const res = useApi<{ plan: TourPlan | null }>(path);
  const plan = res.data?.plan ?? null;
  // Held dates open their show day; the rest open the city.
  const dl = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`);
  const heldIn = useMemo(() => Object.fromEntries((dl.data?.deals ?? []).filter((d) => d.status === 'held').map((d) => [d.city, d])), [dl.data]);
  const { w, h } = useViewport();
  const wide = w >= 900;
  const dock = 10 + 62 + 12;
  const detents = useMemo(() => [Math.min(h - 200, 430 + dock), Math.round(h * 0.66), h - 72], [h]);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [moved, setMoved] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const fixesRef = useRef<HTMLDivElement>(null);

  const route = useMemo(() => plan?.stops.map((s) => ({ lat: s.lat, lon: s.lon, city: s.city })) ?? null, [plan]);
  useEffect(() => {
    stage.set({ show: true, city: null, route, bottom: wide ? 0 : detents[Math.min(at, 1)], top: 72 });
    return () => stage.set({ show: false, route: null });
  }, [route, at, detents, wide]);

  const run = async (action: PlanAction, key: string, say: string) => {
    if (busy) return;
    setBusy(key);
    setStep(say);
    gus.flash(say, 60_000);
    const before = plan?.stops ?? [];
    try {
      const constraints = plan?.constraints ?? defaults();
      // Streamed so the island can say each step of a ~15 s change instead of a bare "On it".
      let out: TourPlan | null = null;
      let failed: string | null = null;
      await streamNdjson<{ type: 'step'; words: string } | { type: 'plan'; plan: TourPlan } | { type: 'error'; error: string }>(path, { constraints, action, stream: true }, (e) => {
        if (e.type === 'step') {
          setStep(e.words);
          gus.flash(e.words, 60_000);
        } else if (e.type === 'plan') out = e.plan;
        else failed = e.error;
      });
      const next = out as TourPlan | null;
      if (failed || !next) throw new ApiError(500, failed ?? 'No plan came back.');
      // Mark the stops that changed city or room, so the diff is visible at a glance.
      const was = new Map(before.map((s) => [s.date, `${s.metroId}|${s.room?.id ?? ''}`]));
      const changed = before.length ? next.stops.filter((s) => was.get(s.date) !== `${s.metroId}|${s.room?.id ?? ''}`).map((s) => s.date) : [];
      setMoved(new Set(changed));
      mutate(path, { plan: next });
      gus.flash(action.kind === 'lock' ? 'Done' : changed.length ? `Moved ${changed.length} ${changed.length === 1 ? 'date' : 'dates'}` : 'Done. Nothing needed moving');
    } catch {
      gus.flash('Couldn’t change the plan');
    } finally {
      setBusy(null);
      setStep(null);
    }
  };

  const fixes = (plan?.roasts ?? []).filter((r) => r.fix && r.card && !skipped.has(r.id)).sort((a, b) => b.severity - a.severity);
  const hours = Math.round((plan?.stops ?? []).reduce((n, s) => n + s.driveHoursFromPrev, 0));
  const first = plan?.stops[0];
  const last = plan?.stops[plan.stops.length - 1];

  const gain = fixes.reduce((n, r) => n + (r.gain ?? 0), 0);
  const seeFixes = () => {
    setAt(1);
    setTimeout(() => fixesRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 320);
  };
  const head = !plan ? null : at > 0 ? (
    <button className="th-compact" onClick={() => (fixes.length ? seeFixes() : setAt(0))}>
      <span className="th-mini" style={{ ["--v" as string]: Math.round(plan.total) }}>{Math.round(plan.total)}</span>
      <b>
        {md(first!.date)} → {md(last!.date)}
        <em>
          {plan.stops.length} nights · {first!.city} to {last!.city}
        </em>
      </b>
      {fixes.length > 0 && <span className="btn xs hot">{fixes.length} changes</span>}
    </button>
  ) : (
    <div className="th">
      <Gus mood={busy ? 'working' : fixes.length ? 'thinking' : 'proud'} size={124} className="th-obj" />
      <span className="kicker k-hot">Your run</span>
      <h2 className="th-title">
        {md(first!.date)}
        <span className="th-arrow">→</span>
        {day(first!.date).getMonth() === day(last!.date).getMonth() ? day(last!.date).getDate() : md(last!.date)}
      </h2>
      <p className="th-sub">
        {plan.stops.length} nights · {first!.city} to {last!.city}
      </p>
      <RunStrip stops={plan.stops} moved={moved} />
      <div className="th-score">
        <Ring value={plan.total} gain={gain} />
        <p>
          {plan.gusLine}
          {gain >= 1 && <b> Gus can get it to {Math.round(plan.total + gain)}.</b>}
        </p>
      </div>
      {fixes.length > 0 ? (
        <button className="btn hot block" onClick={seeFixes}>
          {fixes.length === 1 ? 'See Gus’s change' : `See Gus’s ${fixes.length} changes`}
          <Icon name="forward" size={18} />
        </button>
      ) : (
        <button className="btn block" onClick={() => router.push(`/a/${slug}`)}>
          Ask rooms on the map
          <Icon name="forward" size={18} />
        </button>
      )}
    </div>
  );

  const body = res.loading && !plan ? (
    <div className="tr-skel">
      <div className="sk" style={{ width: '35%', height: 12 }} />
      <div className="sk" style={{ width: '80%', height: 28, marginTop: 12 }} />
      <div className="sk" style={{ width: '60%', height: 14, marginTop: 12 }} />
    </div>
  ) : !plan ? (
    <div className="empty tr-empty">
      <Art name="stage" size={132} />
      <h2 className="d-24">No run yet.</h2>
      <p className="ink-2">Gus strings your best cities into ten nights, short drives, good nights of the week.</p>
      <button className="btn hot" disabled={!!busy} onClick={() => run({ kind: 'new' }, 'new', 'Planning your run')}>
        {busy ? 'Planning…' : 'Plan my run'}
      </button>
    </div>
  ) : (
    <div className="tr-body">
      {fixes.length > 0 && (
        <div ref={fixesRef} className="tr-fixes">
          <div className="section-h">
            <h2>Gus would change</h2>
          </div>
          {fixes.map((r, i) => (
            <Fix key={r.id} r={r} i={i} step={busy === r.id ? step : null} busy={busy === r.id} disabled={!!busy} onTake={() => run({ kind: 'fix', fix: r.fix! }, r.id, r.card!.action)} onSkip={() => setSkipped((s) => new Set(s).add(r.id))} />
          ))}
        </div>
      )}

      <div className="section-h">
        <h2>The run</h2>
        <span className="ink-3 b-13">Lock what you love</span>
      </div>
      <ol className="tr-stops card">
        {plan.stops.map((s, i) => (
          <Stop
            key={`${s.date}-${s.metroId}`}
            s={s}
            i={i}
            isNew={moved.has(s.date)}
            busy={busy === `lock${i}`}
            onLock={() => run({ kind: 'lock', stopIndex: i, locked: !s.locked }, `lock${i}`, s.locked ? `Unlocked ${s.city}` : `Locked ${s.city}`)}
            held={heldIn[s.metroId]?.roomName ?? null}
            onOpen={() => router.push(heldIn[s.metroId] ? `/a/${slug}/show/${heldIn[s.metroId].id}` : `/a/${slug}?city=${s.metroId}`)}
          />
        ))}
      </ol>
      <button className="btn light block tr-replan" disabled={!!busy} onClick={() => run({ kind: 'replan' }, 'replan', 'Replanning around your locks')}>
        <Icon name="refresh" size={18} />
        {busy === 'replan' ? 'Replanning…' : 'Replan around my locks'}
      </button>
      <p className="fine ink-3 b-13">Locked nights stay put. Nothing is booked until a room says yes and you approve it.</p>
    </div>
  );

  return (
    <main className="tour">
      {wide ? (
        <aside className="home-panel card">
          {head && <div className="sheet-head">{head}</div>}
          <div className="home-panel-body">{body}</div>
        </aside>
      ) : (
        <Sheet detents={detents} at={at} onAt={setAt} head={head}>
          {body}
        </Sheet>
      )}
    </main>
  );
}

function Fix({ r, i, step, busy, disabled, onTake, onSkip }: { r: Roast; i: number; step: string | null; busy: boolean; disabled: boolean; onTake: () => void; onSkip: () => void }) {
  const c = r.card!;
  return (
    <article className="tr-fix card" style={{ ['--i' as string]: i }}>
      <b className="tr-fix-title">{c.title}</b>
      {c.from && c.to && (
        <div className="tr-diff">
          <span className="tr-from">{c.from}</span>
          <Icon name="forward" size={14} className="ink-3" />
          <span className="tr-to">{c.to}</span>
        </div>
      )}
      <p className="ink-2">{c.note}</p>
      <div className="tr-fix-acts">
        <button className="btn sm hot" disabled={disabled} onClick={onTake}>
          {busy ? 'On it…' : c.action}
        </button>
        <button className="btn sm ghost" disabled={disabled} onClick={onSkip}>
          Keep it
        </button>
      </div>
      {step && (
        <p className="tr-live" aria-live="polite">
          <i />
          {step}…
        </p>
      )}
    </article>
  );
}

function Stop({ s, i, isNew, busy, held, onLock, onOpen }: { s: TourStop; i: number; isNew: boolean; busy: boolean; held: string | null; onLock: () => void; onOpen: () => void }) {
  const d = day(s.date);
  const long = s.driveHoursFromPrev >= 8;
  return (
    <li className={`tr-stop ${isNew ? 'is-new' : ''} ${s.locked ? 'is-locked' : ''} ${long ? 'after-long' : ''}`} style={{ ['--i' as string]: i }}>
      <span className="tr-node" aria-hidden>
        {i + 1}
      </span>
      <div className="tr-cell">
        {i > 0 && (
          <span className={`tr-drive ${long ? 'long' : ''}`}>
            <Icon name="van" size={13} />
            {s.driveHoursFromPrev < 1 ? 'Under an hour' : `${Math.round(s.driveHoursFromPrev)} h`} in the van
          </span>
        )}
        <div className="tr-row">
          <button className="tr-main" onClick={onOpen}>
            <span className="tr-what">
              <em>
                {d.toLocaleDateString('en-US', { weekday: 'short' })} {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </em>
              <b>
                {s.city}
                {isNew && <i className="tag hot">New</i>}
              </b>
              <span>{held ? <><b className="tr-held">Held</b> {held} · show day</> : s.room?.name ?? 'Room to find'}</span>
            </span>
          </button>
          <button className={`tr-lock ${s.locked ? 'on' : ''}`} onClick={onLock} disabled={busy} aria-pressed={s.locked} aria-label={s.locked ? `Unlock ${s.city}` : `Lock ${s.city}`}>
            <Icon name={s.locked ? 'lock' : 'unlock'} bold={s.locked} size={18} />
          </button>
        </div>
      </div>
    </li>
  );
}

/** The whole run in one line: a node per night, long drives in red, locked nights filled. */
function RunStrip({ stops, moved }: { stops: TourStop[]; moved: Set<string> }) {
  return (
    <div className="rs" role="img" aria-label={`${stops.length} stops`}>
      {stops.map((s, i) => (
        <span key={s.date} className="rs-seg" style={{ ['--i' as string]: i }}>
          {i > 0 && <i className={`rs-link ${s.driveHoursFromPrev >= 8 ? 'long' : ''}`} />}
          <b className={`rs-node ${s.locked ? 'locked' : ''} ${moved.has(s.date) ? 'moved' : ''}`}>{day(s.date).getDate()}</b>
        </span>
      ))}
    </div>
  );
}

/** Tour score as a ring; a paler arc shows where Gus's changes would take it. */
function Ring({ value, gain }: { value: number; gain: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value)) / 100;
  const g = Math.max(0, Math.min(100, value + gain)) / 100;
  return (
    <span className="ring" role="img" aria-label={`Tour score ${Math.round(value)} out of 100`}>
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r={r} className="ring-bg" />
        <circle cx="32" cy="32" r={r} className="ring-gain" strokeDasharray={`${g * c} ${c}`} />
        <circle cx="32" cy="32" r={r} className="ring-val" strokeDasharray={`${v * c} ${c}`} />
      </svg>
      <b>{Math.round(value)}</b>
    </span>
  );
}

function defaults(): TourPlan['constraints'] & { regions: string[] } {
  const d = new Date();
  d.setDate(d.getDate() + 28 + ((4 - d.getDay() + 7) % 7));
  return { region: 'all', regions: [], startDate: d.toISOString().slice(0, 10), dates: 10, roomBand: 'small', homeBase: null };
}
