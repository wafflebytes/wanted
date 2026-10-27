'use client';
/**
 * The road. One long leg of the tour, and what Gus would do with it. A long drive between two
 * shows usually means dark nights that cost money; Gus finds the city on the way where people
 * already love your sound and lays it next to driving straight and flying, each as nights on a
 * strip and one number for what it does to your money. Pick one; hold to send Gus.
 */
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { TourPlan, TourStop } from '@/lib/types';
import type { Crowd, MapData } from '@/ui/types';
import { Gus } from '@web/components/Gus';
import { HoldKey } from '@web/components/GusPanels';
import { Icon } from '@web/components/Icon';
import { deals } from '@web/lib/deals';
import { gus } from '@web/lib/gus';
import { haptic } from '@web/lib/haptics';
import { useApi } from '@web/lib/hooks';
import { dayName, dayNum, hrsLabel, legFor, niceDate, pickLane, short, type Lane, type Leg, type Night } from '@web/lib/road';
import '../../../../showday.css';
import '../../../../road.css';

const money = (n: number) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toLocaleString()}`;

export default function Road() {
  const { artist: slug, stop } = useParams<{ artist: string; stop: string }>();
  const router = useRouter();
  const tour = useApi<{ plan: TourPlan | null }>(`/artist/${slug}/plan`);
  const map = useApi<MapData>(`/artist/${slug}/map`);
  const plan = tour.data?.plan ?? null;
  const i = plan ? Math.max(1, plan.stops.findIndex((s) => s.metroId === stop)) : -1;
  const leg = useMemo(() => (plan && map.data !== undefined ? legFor(plan, i, map.data ?? null) : null), [plan, i, map.data]);

  if (tour.data && !leg)
    return (
      <main className="rd">
        <div className="sd-empty">
          <Gus mood="waiting" size={96} />
          <h1>No drive here</h1>
          <p>Long drives on your tour show up here with Gus’s ideas.</p>
          <button className="btn light" onClick={() => router.push(`/a/${slug}/tour`)}>
            See your tour
          </button>
        </div>
      </main>
    );
  if (!leg || !plan)
    return (
      <main className="rd">
        <div className="sd-skel">
          <div className="sk" style={{ width: '40%', height: 12 }} />
          <div className="sk" style={{ width: '80%', height: 34, marginTop: 12 }} />
          <div className="sk" style={{ width: '100%', height: 220, marginTop: 24, borderRadius: 22 }} />
        </div>
      </main>
    );
  return <LegView leg={leg} plan={plan} slug={slug} />;
}

function LegView({ leg, plan, slug }: { leg: Leg; plan: TourPlan; slug: string }) {
  const router = useRouter();
  const best = pickLane(leg);
  const [at, setAt] = useState<Lane['id']>(best.id);
  const [sent, setSent] = useState(false);
  const lane = leg.lanes.find((l) => l.id === at)!;
  const drive = leg.lanes.find((l) => l.id === 'drive')!;
  const via = leg.via;
  const crowd = useApi<Crowd>(via ? `/artist/${slug}/crowd?city=${via.id}` : null);
  const spots = (crowd.data?.hang?.spots ?? []) as { name: string; description?: string }[];
  const spot = spots.find((s) => /music|show|venue|bar|brew/i.test(s.description ?? '')) ?? spots[0] ?? null;
  const opener = crowd.data?.openers?.[0] ?? null;

  const say =
    best.id === 'way' && via
      ? `${leg.gap} nights without a show and ${hrsLabel(leg.hrs)} of road. ${via.name} is on the way and people there love your sound. Play it and the drive pays for itself.`
      : `${hrsLabel(leg.hrs)} of road. Split it over two days and you show up rested.`;

  const pick = (id: Lane['id']) => {
    if (id === at) return;
    setAt(id);
    haptic('tick');
  };
  const go = async () => {
    if (!via) return;
    setSent(true);
    gus.flash(`Asking rooms in ${via.name}`, 2200);
    try {
      await deals.ask(slug, via.id);
      gus.open('room');
    } catch {
      setSent(false);
    }
  };

  return (
    <main className="rd">
      <header className="rd-hero">
        <button className="rd-back" onClick={() => router.push(`/a/${slug}/tour`)} aria-label="Back to your tour">
          <Icon name="back" size={20} />
        </button>
        <span className="kicker k-hot">
          The road · {niceDate(leg.from.date).replace(/^.*, /, '')} to {niceDate(leg.to.date).replace(/^.*, /, '')}
        </span>
        <h1>
          {leg.from.city} <i>to</i> {leg.to.city}
        </h1>
        <span className="rd-stats">
          <b>{Math.round(leg.km / 1.609).toLocaleString()}</b> mi <b>{Math.round(leg.hrs)}</b> h in the van <b>{leg.gap}</b> nights between
        </span>
        <p className="rd-say">{say}</p>
      </header>

      <RouteArt leg={leg} plan={plan} lane={lane} />

      <section className="rd-lanes" role="radiogroup" aria-label="Ways to do this drive">
        {leg.lanes
          .slice()
          .sort((a, b) => (a.id === best.id ? -1 : b.id === best.id ? 1 : 0))
          .map((l) => (
            <button key={l.id} role="radio" aria-checked={l.id === at} className={`rd-lane ${l.id === at ? 'on' : ''} ${l.ok ? '' : 'no'}`} onClick={() => pick(l.id)}>
              <span className="rd-lane-ic">
                <Icon name={l.id === 'way' ? 'music' : l.id === 'drive' ? 'van' : 'send'} size={20} bold={l.id === at} />
              </span>
              <span className="rd-lane-t">
                <b>
                  {l.name}
                  {l.id === best.id && <em className="rd-pick">Gus’s pick</em>}
                </b>
                <span>{l.ok ? l.line : l.catch}</span>
              </span>
              <span className={`rd-net ${l.net >= 0 ? 'up' : ''}`}>{money(l.net)}</span>
            </button>
          ))}
      </section>

      <section className="sd-sec">
        <div className="sd-sec-h">
          <h2>Your nights</h2>
          <span className="sd-legend">{lane.id === 'way' ? `${money(lane.net - drive.net).replace('+', '')} better than driving it` : lane.ok ? '' : 'Doesn’t work'}</span>
        </div>
        <ol className="rd-nights" key={lane.id} style={{ ['--n' as string]: lane.nights.length + 2 }}>
          <NightCell n={{ date: leg.from.date, kind: 'there', title: leg.from.city, sub: 'your show' }} k={0} />
          {lane.nights.map((n, k) => (
            <NightCell key={n.date} n={n} k={k + 1} />
          ))}
          <NightCell n={{ date: leg.to.date, kind: 'there', title: leg.to.city, sub: leg.to.room?.name ?? 'your show' }} k={lane.nights.length + 1} />
        </ol>
        <p className="rd-plan">
          {lane.nights
            .filter((n) => n.kind !== 'off')
            .map((n) => `${dayName(n.date)}: ${n.title}${n.kind === 'show' ? ',' : ''} ${n.sub}.`)
            .join(' ')}
        </p>
        <p className={`rd-arrive ${lane.ok ? '' : 'no'}`}>
          <Icon name={lane.ok ? 'clock' : 'warn'} size={18} />
          <span>{lane.ok ? lane.arrive : lane.catch}</span>
        </p>
      </section>

      {lane.id === 'way' && via && (
        <section className="sd-sec">
          <div className="sd-sec-h">
            <h2>In {via.name}</h2>
          </div>
          <div className="card rows">
            <div className="card-row sd-r">
              <Icon name="heart" size={22} />
              <span>
                <b>One of your top {Math.max(10, Math.ceil(via.top / 10) * 10)} cities</b>
                <em>{via.signers ? `${via.signers} people already signed there` : 'Nobody has signed yet. Gus puts a poster up the day a room says yes.'}</em>
              </span>
            </div>
            {spot ? (
              <div className="card-row sd-r">
                <Icon name="location" size={22} />
                <span>
                  <b>Your crowd hangs at {spot.name}</b>
                  <em>{spot.description?.split(/[.,;]/)[0] ?? 'Gus will ask if they host shows'}</em>
                </span>
              </div>
            ) : (
              crowd.loading && <div className="card-row sd-r"><div className="sk" style={{ width: '70%', height: 16 }} /></div>
            )}
            {opener && (
              <div className="card-row sd-r">
                <Icon name="music" size={22} />
                <span>
                  <b>{opener.name} could open</b>
                  <em>Same crowd as you. Gus asks them along.</em>
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="rd-go">
        {lane.id === 'way' && via ? (
          sent ? (
            <button className="btn light wide" onClick={() => gus.open('room')}>
              See what the rooms say
            </button>
          ) : (
            <HoldKey label={`Hold to ask venues in ${via.name}`} onDone={go} />
          )
        ) : lane.ok ? (
          <button className="btn wide" onClick={() => (gus.flash(lane.id === 'drive' ? 'Gus will find a motel halfway' : 'Gus will save the seats', 2200), haptic('success'))}>
            {lane.id === 'drive' ? 'Plan the drive' : 'Hold three seats'}
          </button>
        ) : (
          <button className="btn light wide" onClick={() => pick(best.id)}>
            Go back to Gus’s pick
          </button>
        )}
        <span className="rd-fine">Fares, gas and ticket sales are Gus’s guesses until he checks.</span>
      </div>
    </main>
  );
}

function NightCell({ n, k }: { n: Night; k: number }) {
  return (
    <li className={`rd-night k-${n.kind}`} style={{ ['--i' as string]: k }} title={`${n.title}, ${n.sub}`}>
      <em>{dayName(n.date)}</em>
      <b>{dayNum(n.date)}</b>
      <i aria-hidden />
      <strong>{short(n)}</strong>
    </li>
  );
}

/** The leg drawn as a glowing line over the tour's other stops, like a ride trace. */
function RouteArt({ leg, plan, lane }: { leg: Leg; plan: TourPlan; lane: Lane }) {
  const W = 340;
  const H = 210;
  const pts: { lat: number; lon: number }[] = [leg.from, leg.to, ...(leg.via ? [leg.via] : [])];
  const all = [...pts, ...plan.stops];
  const mid = (Math.min(...all.map((p) => p.lat)) + Math.max(...all.map((p) => p.lat))) / 2;
  const cx = Math.cos((mid * Math.PI) / 180);
  const xs = all.map((p) => p.lon * cx);
  const ys = all.map((p) => -p.lat);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((W - 70) / (x1 - x0 || 1), (H - 56) / (y1 - y0 || 1));
  const ox = (W - (x1 - x0) * s) / 2;
  const oy = (H - (y1 - y0) * s) / 2;
  const P = (p: { lat: number; lon: number }) => [ox + (p.lon * cx - x0) * s, oy + (-p.lat - y0) * s] as const;
  const [fx, fy] = P(leg.from);
  const [tx, ty] = P(leg.to);
  const v = leg.via ? P(leg.via) : null;
  // A gentle bow so the line reads as a road, not a ruler.
  const bow = (ax: number, ay: number, bx: number, by: number, k: number) => {
    const mx = (ax + bx) / 2 - (by - ay) * k;
    const my = (ay + by) / 2 + (bx - ax) * k;
    return `Q ${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  };
  const d =
    lane.id === 'way' && v
      ? `M ${fx} ${fy} ${bow(fx, fy, v[0], v[1], 0.08)} ${bow(v[0], v[1], tx, ty, 0.08)}`
      : lane.id === 'fly'
        ? `M ${fx} ${fy} ${bow(fx, fy, tx, ty, -0.28)}`
        : `M ${fx} ${fy} ${bow(fx, fy, tx, ty, 0.06)}`;
  const half = lane.id === 'drive' && lane.nights.filter((n) => n.kind === 'drive').length > 1 ? [(fx + tx) / 2 - (ty - fy) * 0.03, (fy + ty) / 2 + (tx - fx) * 0.03] : null;
  const pill = (x: number) => (x > W - 120 ? 'end' : x < 120 ? 'start' : 'middle');

  return (
    <figure className={`rd-art lane-${lane.id}`} aria-label={`Map of the drive from ${leg.from.city} to ${leg.to.city}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="rd-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {plan.stops.map((st: TourStop) => {
          const [x, y] = P(st);
          return <circle key={st.metroId} cx={x} cy={y} r={2.6} className="rd-other" />;
        })}
        <path key={`g-${lane.id}`} d={d} pathLength={1} className="rd-line-glow" filter="url(#rd-glow)" />
        <path key={`l-${lane.id}`} d={d} pathLength={1} className={`rd-line ${lane.id === 'fly' ? 'air' : ''}`} />
        {half && <circle cx={half[0]} cy={half[1]} r={4.5} className="rd-half" />}
        {v && (
          <g className={`rd-via ${lane.id === 'way' ? 'on' : ''}`}>
            <circle cx={v[0]} cy={v[1]} r={lane.id === 'way' ? 7 : 4} />
            <text x={v[0] + (pill(v[0]) === 'end' ? -12 : 12)} y={v[1] + 4} textAnchor={pill(v[0]) === 'end' ? 'end' : 'start'}>
              {leg.via!.name}
            </text>
          </g>
        )}
        {[
          [fx, fy, leg.from.city],
          [tx, ty, leg.to.city],
        ].map(([x, y, name]) => (
          <g key={name as string} className="rd-end">
            <circle cx={x as number} cy={y as number} r={6} />
            <text x={(x as number) + ((x as number) > W - 110 ? -12 : 12)} y={(y as number) + 4} textAnchor={(x as number) > W - 110 ? 'end' : 'start'}>
              {name as string}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        {lane.id === 'fly' ? (
          <span className="rd-times">
            <b>6:05</b>
            <em>am</em>
            <i />
            <b>11:40</b>
            <em>am</em>
          </span>
        ) : (
          <span className="rd-times" key={lane.id}>
            <b>{lane.id === 'way' && leg.via ? Math.max(1, Math.round(leg.via.detour)) : Math.round(leg.hrs)}</b>
            <em>{lane.id === 'way' ? 'h out of your way' : 'h on the road'}</em>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
