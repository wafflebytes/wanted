'use client';
/**
 * Exact approvals (agent-native rule 5): amount, payee, date, then what happens next. You slide
 * to pay. If the terms change while the card is open, it voids itself and asks again.
 */
import { useEffect, useRef, useState } from 'react';
import type { Deal } from '@/lib/types';
import { deals } from '@web/lib/deals';
import { haptic } from '@web/lib/haptics';
import { Art } from './Art';
import { Icon } from './Icon';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;
export const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function Approval({ deal, busy, compact, slim }: { deal: Deal; busy?: boolean; compact?: boolean; slim?: boolean }) {
  const seen = useRef(deal.review?.hash ?? null);
  const [voided, setVoided] = useState(false);
  useEffect(() => {
    if (seen.current && deal.review?.hash && deal.review.hash !== seen.current) setVoided(true);
  }, [deal.review?.hash]);
  const t = deal.terms;
  if (!t) return null;
  const left = deal.offerExpiresAt ? Math.max(0, deal.offerExpiresAt - Date.now()) : null;
  return (
    <div className={`approve ${voided ? 'is-void' : ''} ${compact ? 'compact' : ''} ${slim ? 'slim' : ''}`}>
      {slim ? (
        <p className="approve-line">
          Pay the <b>{money(t.deposit)}</b> deposit to lock in {fmtDate(t.date)}. Then the date is yours{left !== null && left < 6 * 3600_000 ? `; the offer ends in ${Math.max(1, Math.round(left / 3600_000))} h` : ''}.
        </p>
      ) : (
      <>
      <div className="approve-top">
        <Art name="coin" size={compact ? 44 : 56} />
        <div>
          <div className="kicker">Needs your OK</div>
          <div className="approve-amt num">{money(t.deposit)}</div>
          <div className="approve-to">deposit to lock in the date at {deal.roomName}</div>
        </div>
      </div>
      <dl className="approve-terms">
        <div>
          <dt>Pay</dt>
          <dd>{deal.roomName}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{fmtDate(t.date)}</dd>
        </div>
        <div>
          <dt>Your cut</dt>
          <dd>{t.split}% of ticket sales</dd>
        </div>
        {t.capacity ? (
          <div>
            <dt>Venue size</dt>
            <dd>About {t.capacity} people</dd>
          </div>
        ) : null}
      </dl>
      <p className="approve-next">
        Then the date is yours, and everyone who signed in {deal.cityName} hears first.{left !== null && left < 6 * 3600_000 ? ` The offer ends in ${Math.max(1, Math.round(left / 3600_000))} h.` : ''}
      </p>
      </>
      )}
      {voided ? (
        <div className="approve-void">
          <Icon name="warn" size={18} />
          <span>The terms changed while this was open. Look again before you pay.</span>
          <button
            className="btn xs light"
            onClick={() => {
              seen.current = deal.review?.hash ?? null;
              setVoided(false);
            }}
          >
            Review
          </button>
        </div>
      ) : (
        <Slide label={`Slide to pay ${money(t.deposit)}`} busy={busy} onDone={() => deals.decide(true)} />
      )}
      <button className="approve-no" onClick={() => deals.decide(false)} disabled={busy}>
        Not this one
      </button>
      <p className="approve-fine">{deal.payment?.rail === 'stripe-test' ? 'Stripe test mode.' : 'Test mode: no real money moves.'}</p>
    </div>
  );
}

/** Slide to confirm: drag the knob to the end; let go early and it eases back. */
export function Slide({ label, onDone, busy }: { label: string; onDone: () => void; busy?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(false);
  const start = useRef<{ px: number; x: number } | null>(null);
  const max = () => (track.current ? track.current.clientWidth - 56 : 200);
  const down = (e: React.PointerEvent) => {
    if (done || busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, x };
    setDrag(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    setX(Math.max(0, Math.min(max(), start.current.x + e.clientX - start.current.px)));
  };
  const up = () => {
    if (!start.current) return;
    start.current = null;
    setDrag(false);
    if (x > max() * 0.9) {
      setX(max());
      setDone(true);
      haptic('commit');
      onDone();
    } else setX(0);
  };
  const p = x / Math.max(1, max());
  return (
    <div className={`slide ${drag ? 'is-drag' : ''} ${done ? 'is-done' : ''}`} ref={track} style={{ ['--p' as string]: p }}>
      <div className="slide-fill" style={{ width: x + 56 }} />
      <span className="slide-label">{done ? (busy ? 'Paying…' : 'Paid') : label}</span>
      <button
        className="slide-knob"
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !done) {
            setX(max());
            setDone(true);
            onDone();
          }
        }}
        aria-label={label}
      >
        <Icon name={done ? 'check' : 'forward'} size={22} />
      </button>
    </div>
  );
}
