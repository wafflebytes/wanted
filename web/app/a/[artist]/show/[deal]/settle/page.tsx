'use client';
/**
 * Settle up. After the set the room hands you a number; Gus checks it against the scanner and
 * your guest list before you shake on it. Three counts land one by one, then one verdict: a
 * line when they match, an amber card when they don't, with the people missing, what that is in
 * your money, and the note to the room already written. Hold to send; when the room fixes it
 * the number rolls to what you're owed and the sheet gets its stamp.
 */
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Deal } from '@/lib/types';
import { Gus } from '@web/components/Gus';
import { HoldKey } from '@web/components/GusPanels';
import { Icon } from '@web/components/Icon';
import { Reel } from '@web/components/Reel';
import { gus } from '@web/lib/gus';
import { haptic } from '@web/lib/haptics';
import { useApi } from '@web/lib/hooks';
import { settleFor, type Settle } from '@web/lib/settle';
import '../../../../../showday.css';
import '../../../../../road.css';
import '../../../../../settle.css';

type Phase = 'checking' | 'off' | 'sent' | 'fixed';
const nice = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const usd = (n: number) => `$${n.toLocaleString()}`;

export default function SettleUp() {
  const { artist: slug, deal: dealId } = useParams<{ artist: string; deal: string }>();
  const dl = useApi<{ deals: Deal[] }>(`/artist/${slug}/deals`);
  const deal = dl.data?.deals.find((d) => d.id === dealId) ?? null;
  const s = useMemo(() => (deal?.terms ? settleFor(deal) : null), [deal]);
  if (!s)
    return (
      <main className="sd">
        <div className="sd-skel">
          <div className="sk" style={{ width: '40%', height: 12 }} />
          <div className="sk" style={{ width: '75%', height: 34, marginTop: 12 }} />
          <div className="sk" style={{ width: '100%', height: 140, marginTop: 24, borderRadius: 22 }} />
        </div>
      </main>
    );
  return <Sheet s={s} slug={slug} dealId={dealId} />;
}

function Sheet({ s, slug, dealId }: { s: Settle; slug: string; dealId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [seen, setSeen] = useState(0); // how many of the three counts have landed

  // Gus reads the three counts one by one, then says what he found.
  useEffect(() => {
    const ts = [450, 1150, 1850].map((ms, i) => setTimeout(() => (setSeen(i + 1), haptic('step')), ms));
    ts.push(setTimeout(() => (setPhase(s.missing ? 'off' : 'fixed'), haptic(s.missing ? 'warn' : 'success')), 2700));
    return () => ts.forEach(clearTimeout);
  }, [s.missing]);

  const send = () => {
    setPhase('sent');
    gus.flash(`Sent ${s.contact} the scans`, 2000);
    haptic('success');
    // Fixture: the room answers. Wired, this is the room's reply arriving on the deal thread.
    setTimeout(() => {
      setPhase('fixed');
      haptic('success');
    }, 3200);
  };

  const off = phase === 'off' || phase === 'sent';
  const say =
    phase === 'checking'
      ? `Checking ${s.room}’s number against the scanner and your guest list.`
      : phase === 'fixed'
        ? `All three match now. ${usd(s.yours)} is yours, and ${s.contact} is sending it tonight.`
        : phase === 'sent'
          ? `Sent ${s.contact} the scan log. Waiting on the room.`
          : `${s.missing} people paid and weren’t counted. That’s ${usd(s.yours - s.roomSays)} of yours. They came in ${s.late}.`;

  return (
    <main className="sd stl">
      <header className="sd-hero">
        <button className="rd-back" onClick={() => router.push(`/a/${slug}/show/${dealId}`)} aria-label="Back to show day">
          <Icon name="back" size={20} />
        </button>
        <span className="kicker k-hot">Getting paid · {nice(s.date)}</span>
        <h1>{s.room}</h1>
        <p className="sd-say" key={phase} aria-live="polite">
          {say}
        </p>
        <Gus mood={phase === 'checking' ? 'thinking' : phase === 'off' ? 'worried' : phase === 'sent' ? 'phone' : 'proud'} size={96} className="sd-gus" />
      </header>

      <section className="stl-counts" aria-label="The three counts">
        {s.counts.map((c, i) => (
          <div key={c.id} className={`stl-count ${seen > i ? 'in' : ''} ${c.id === 'room' && off ? 'off' : ''} ${phase === 'fixed' ? 'ok' : ''}`}>
            <span className="stl-who">{c.who}</span>
            {seen > i ? <Reel value={c.id === 'room' && phase === 'fixed' ? s.paid : c.n} className="stl-n" duration={900} stagger={70} /> : <span className="stl-n stl-wait" aria-label="Checking" />}
            <span className="stl-sub">{c.id === 'room' && phase === 'fixed' ? 'paid, fixed' : c.sub}</span>
          </div>
        ))}
      </section>

      {phase !== 'checking' && (
        <section className={`stl-verdict ${phase === 'fixed' ? 'ok' : 'off'}`}>
          {phase === 'fixed' ? (
            <>
              <span className="stl-big">
                <Reel value={s.yours} prefix="$" className="stl-money" duration={1200} />
                <em>is yours</em>
              </span>
              <span className="stl-stamp" aria-hidden>
                Settled
              </span>
            </>
          ) : (
            <span className="stl-big">
              <b>{s.missing}</b>
              <em>people paid and weren’t counted</em>
            </span>
          )}
          <dl className="stl-receipt">
            <div>
              <dt>Tickets scanned</dt>
              <dd>{s.counts[1].n}</dd>
            </div>
            <div>
              <dt>Your guest list</dt>
              <dd>−{s.counts[2].n}</dd>
            </div>
            <div className="sum">
              <dt>Paid, at {usd(s.price)}</dt>
              <dd>{usd(s.paid * s.price)}</dd>
            </div>
            <div className="sum">
              <dt>Your {s.split}%</dt>
              <dd>{usd(s.yours)}</dd>
            </div>
            <div className={phase === 'fixed' ? 'gone' : 'warn'}>
              <dt>{s.room} counted</dt>
              <dd>{usd(s.roomSays)}</dd>
            </div>
          </dl>
        </section>
      )}

      {off && (
        <section className="sd-sec">
          <div className="sd-sec-h">
            <h2>Gus’s note to {s.contact}</h2>
          </div>
          <div className="stl-thread">
            <p className={`stl-bubble me ${phase === 'sent' ? 'sent' : ''}`}>{s.note}</p>
            <span className="stl-attach">
              <Icon name="document" size={16} /> scan-log-{s.date}.csv · {s.counts[1].n} scans
            </span>
          </div>
          {phase === 'off' ? (
            <HoldKey label={`Hold to send ${s.contact} the scans`} onDone={send} />
          ) : (
            <p className="stl-typing">
              <i />
              <i />
              <i />
              {s.contact} is checking
            </p>
          )}
        </section>
      )}

      {phase === 'fixed' && s.missing > 0 && (
        <section className="sd-sec">
          <div className="stl-thread">
            <p className="stl-bubble me done">{s.note}</p>
            <p className="stl-bubble them">{s.reply}</p>
          </div>
        </section>
      )}

      {phase === 'fixed' && (
        <button className="btn light block" onClick={() => router.push(`/a/${slug}/show/${dealId}`)}>
          Back to show day
        </button>
      )}
      <span className="rd-fine">The venue’s count, the scans and the guest list are a sample until the venue’s ticket scanner is connected.</span>
    </main>
  );
}
