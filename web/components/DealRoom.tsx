'use client';
/**
 * The deal room: Gus on the phone with a venue, shown as where things stand rather than as a
 * chat log. Two tug lines carry the whole story at a glance (your cut of the door, the deposit
 * to hold the night): Gus's ask, the venue's offer and your own line, sliding toward each other
 * as letters land. The letters themselves fold under it. While they talk you can steer
 * ("hold out for 75%") and the next letter follows your note. When they agree, the approval
 * rises in place; once paid, the room stamps itself held.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Deal, DealLetter, DealLimits, Mandate } from '@/lib/types';
import { deals, useDeal } from '@web/lib/deals';
import { gus } from '@web/lib/gus';
import { haptic } from '@web/lib/haptics';
import { useApi } from '@web/lib/hooks';
import { Approval, fmtDate } from './Approval';
import { Art } from './Art';
import { Gus } from './Gus';
import { Icon } from './Icon';
import '../app/dealroom.css';

type Terms = { split: number; deposit: number };
const lastTerms = (thread: DealLetter[], from: 'gus' | 'house'): Terms | null => [...thread].reverse().find((l) => l.from === from && l.terms)?.terms ?? null;
const words = (n: number) => (['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n));

export function DealRoom({ open, slug }: { open: boolean; slug: string }) {
  const live = useDeal();
  const router = useRouter();
  const book = useApi<{ mandate: Mandate }>(open ? `/artist/${slug}/logbook` : null);
  const d = live.deal;
  // Older deals didn't keep their own lines; the saved limits stand in.
  const lim: DealLimits | null = d?.limits ?? book.data?.mandate ?? null;
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && gus.close();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [open]);
  // A held room lands with a firm tap, once.
  const [stamped, setStamped] = useState<string | null>(null);
  useEffect(() => {
    if (d?.status === 'held' && stamped !== d.id) {
      if (open) haptic('success');
      setStamped(d.id);
    }
  }, [d?.status, d?.id, open, stamped]);

  if (!d)
    return (
      <div className={`dr ${open ? 'on' : ''}`} aria-hidden={!open} inert={!open} role="dialog" aria-label="Deal room">
        <div className="dr-sheet">
          <div className="dr-empty">
            <Art name="phone" size={110} />
            <h3>No one on the line.</h3>
            <p>Ask a venue from any city and Gus takes the call here.</p>
            <button className="btn light sm" onClick={() => gus.close()}>
              Close
            </button>
          </div>
        </div>
      </div>
    );

  const talking = d.status === 'talking';
  const waiting = d.status === 'waiting';
  const held = d.status === 'held';
  const mood = held ? 'proud' : waiting ? 'waiting' : live.paused ? 'sleeping' : talking ? 'phone' : 'idle';
  const kicker = held ? 'Held' : waiting ? 'They agreed. Your call' : live.paused ? 'Paused' : talking ? 'Gus is on the phone' : d.status === 'declined' ? 'You passed' : 'Let go';
  const go = (path: string) => {
    gus.close();
    router.push(`/a/${slug}${path}`);
  };

  return (
    <div className={`dr ${open ? 'on' : ''} s-${d.status}`} aria-hidden={!open} inert={!open} role="dialog" aria-label={`Deal room: ${d.roomName}`}>
      <div className="dr-sheet">
        <header className="dr-head">
          <span className={`dr-gus ${talking && !live.paused ? 'live' : ''}`}>
            <Gus mood={mood} size={60} />
          </span>
          <div className="dr-who">
            <span className="dr-k">
              {talking && !live.paused && <i className="dot hot live" />}
              {kicker}
            </span>
            <h2>{d.roomName}</h2>
            <span className="dr-sub">
              {d.cityName}
              {d.terms ? ` · ${fmtDate(d.terms.date)}` : ''}
            </span>
          </div>
          <button className="icon-btn flat dr-x" onClick={() => gus.close()} aria-label="Close the deal room">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="dr-body">
          <Lines deal={d} lim={lim} />
          {held && (
            <div className="dr-stamp" key={d.id}>
              <Art name="seal" size={64} />
              <div>
                <b>{d.roomName} is yours</b>
                <span>
                  {d.payment ? `$${d.payment.amount} paid. ` : ''}Everyone who signed in {d.cityName} hears first.
                </span>
              </div>
            </div>
          )}
          <Beats deal={d} talking={talking && !live.paused} />
          {live.error && <p className="dr-err">{live.error}</p>}
        </div>

        <footer className="dr-foot">
          {talking && <Steer lim={lim} paused={live.paused} />}
          {waiting && <Approval deal={d} busy={live.deciding} compact slim />}
          {held && (
            <div className="dr-next">
              <button className="btn hot block" onClick={() => go(`/posters?city=${d.city}`)}>
                Tell the fans in {d.cityName}
                <Icon name="send" size={18} />
              </button>
              <button className="btn light block" onClick={() => go(`/show/${d.id}`)}>
                Plan the day with Gus
              </button>
            </div>
          )}
          {!talking && !waiting && !held && (
            <button className="btn light block" onClick={() => (gus.close(), deals.dismiss())}>
              Done
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * The two tug lines. Each has your line (where you said you'd stop), Gus's ask and the venue's
 * offer. The stretch on your side of the line is tinted, so an offer sliding into it reads as
 * good news before any words do.
 */
function Lines({ deal, lim }: { deal: Deal; lim: DealLimits | null }) {
  const ask = lastTerms(deal.thread, 'gus');
  const offer = lastTerms(deal.thread, 'house');
  const done = deal.status !== 'talking' && deal.terms ? { split: deal.terms.split, deposit: deal.terms.deposit } : null;
  // Scale the deposit line to the money on the table, not to your limit: a $775 limit would
  // crush a $60-vs-$110 argument into one corner. A limit past the end pins to the edge.
  const top = Math.max(ask?.deposit ?? 0, offer?.deposit ?? 0, done?.deposit ?? 0);
  const depMax = Math.max(200, Math.ceil((top * 2) / 50) * 50, lim && lim.maxDeposit <= 600 ? Math.ceil((lim.maxDeposit * 1.15) / 50) * 50 : 0);
  const gap = ask && offer && !done ? { split: Math.max(0, ask.split - offer.split), deposit: Math.max(0, offer.deposit - ask.deposit) } : null;
  let gist: string;
  if (done) {
    const short = lim && done.split < lim.minSplit ? `${done.split}% of the door, under your ${lim.minSplit}%` : null;
    const over = lim && done.deposit > lim.maxDeposit ? `$${done.deposit} up front, over your $${lim.maxDeposit}` : null;
    gist = short || over ? `Their last word is ${[short, over].filter(Boolean).join(', and ')}. Your call.` : `They came inside both your lines: ${done.split}% of the door to you, $${done.deposit} to hold it.`;
  }
  else if (!offer) gist = ask ? `Gus opened at ${ask.split}% of the door and $${ask.deposit} to hold it. Waiting on them.` : 'Gus is getting the room on the line.';
  else if (gap && gap.split + gap.deposit === 0) gist = 'They’re meeting in the middle.';
  else
    gist = [gap && gap.split ? `${words(gap.split)} ${gap.split === 1 ? 'point' : 'points'} apart on the door` : null, gap && gap.deposit ? `$${gap.deposit} apart on the deposit` : null].filter(Boolean).join(', and ') + '.';
  return (
    <section className="dr-lines" aria-label="Where the deal stands">
      <Tug
        label="Your cut of the door"
        min={40}
        max={100}
        show={(v) => `${v}%`}
        line={lim?.minSplit ?? null}
        good="above"
        ask={done ? null : ask?.split ?? null}
        offer={done ? null : offer?.split ?? null}
        met={done?.split ?? null}
      />
      <Tug
        label="Deposit to hold the night"
        min={0}
        max={depMax}
        show={(v) => `$${v}`}
        line={lim?.maxDeposit ?? null}
        good="below"
        ask={done ? null : ask?.deposit ?? null}
        offer={done ? null : offer?.deposit ?? null}
        met={done?.deposit ?? null}
      />
      <p className="dr-gist" key={gist}>
        {gist}
      </p>
    </section>
  );
}

function Tug({ label, min, max, show, line, good, ask, offer, met }: { label: string; min: number; max: number; show: (v: number) => string; line: number | null; good: 'above' | 'below'; ask: number | null; offer: number | null; met: number | null }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  const past = line !== null && line > max;
  const lo = ask !== null && offer !== null ? Math.min(ask, offer) : null;
  const hi = ask !== null && offer !== null ? Math.max(ask, offer) : null;
  const inside = (v: number | null) => v !== null && line !== null && (good === 'above' ? v >= line : v <= line);
  // When the two pucks sit close, their labels split up and down instead of colliding.
  const close = ask !== null && offer !== null && Math.abs(ask - offer) / (max - min) < 0.16;
  return (
    <div className="tug">
      <div className="tug-h">
        <span>{label}</span>
        {met !== null && <b className={inside(met) ? 'ok' : 'no'}>{show(met)}</b>}
      </div>
      <div className="tug-track">
        {line !== null && <i className={`tug-ok ${good}`} style={good === 'above' ? { left: pct(line), right: 0 } : { left: 0, width: pct(line) }} />}
        {lo !== null && hi !== null && <i className="tug-gap" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />}
        {line !== null && (
          <span className={`tug-line ${past ? 'past' : ''}`} style={{ left: pct(line) }}>
            <em>{past ? `You: up to ${show(line)}` : `You: ${show(line)}`}</em>
          </span>
        )}
        {offer !== null && (
          <span className={`tug-puck venue ${close ? 'low' : ''} ${inside(offer) ? 'in' : ''}`} style={{ left: pct(offer) }} aria-label={`Venue offers ${show(offer)}`}>
            <i>
              <Icon name="building" size={13} />
            </i>
            <em>{show(offer)}</em>
          </span>
        )}
        {ask !== null && (
          <span className="tug-puck gus" style={{ left: pct(ask) }} aria-label={`Gus asks ${show(ask)}`}>
            <i>
              <img src="/art/gus-glyph.webp" alt="" />
            </i>
            <em>{show(ask)}</em>
          </span>
        )}
        {met !== null && (
          <span className={`tug-puck met ${inside(met) ? 'in' : 'out'}`} style={{ left: pct(met) }} aria-label={`Agreed at ${show(met)}`}>
            <i>
              <Icon name="check" bold size={13} />
            </i>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The conversation, folded. Letters read as one line each with their numbers pulled out; the
 * checks Gus runs between letters fold into a single quiet line. The latest few show; the rest
 * open on a tap.
 */
function Beats({ deal, talking }: { deal: Deal; talking: boolean }) {
  const [all, setAll] = useState(false);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const beats = useMemo(() => {
    const out: { i: number; l: DealLetter; checks: string[] }[] = [];
    let checks: string[] = [];
    deal.thread.forEach((l, i) => {
      if (l.kind === 'tool') checks.push(plain(l.text));
      else {
        out.push({ i, l, checks });
        checks = [];
      }
    });
    if (checks.length) out.push({ i: -1, l: { from: 'gus', kind: 'tool', text: '', terms: null }, checks });
    return out;
  }, [deal.thread]);
  const SHOW = 3;
  const shown = all ? beats : beats.slice(-SHOW);
  const hidden = beats.length - shown.length;
  const lastLetter = [...deal.thread].reverse().find((l) => l.kind === 'letter' && l.from !== 'you');
  const writing = talking ? (lastLetter?.from === 'gus' ? 'The venue is writing' : 'Gus is writing') : null;
  return (
    <section className="beats" aria-label="The conversation">
      <div className="beats-h">
        <span className="kicker">The conversation</span>
        {hidden > 0 && (
          <button className="beats-more" onClick={() => (haptic('tap'), setAll(true))}>
            {hidden} earlier
          </button>
        )}
      </div>
      <ol>
        {shown.map(({ i, l, checks }) => (
          <li key={`${i}-${checks.length}`} className={`beat ${l.from} ${l.kind}`}>
            {checks.length > 0 && <span className="beat-check">{checks[checks.length - 1]}</span>}
            {l.kind === 'letter' && (
              <button className={`beat-l ${openAt === i ? 'open' : ''}`} onClick={() => (haptic('tick'), setOpenAt(openAt === i ? null : i))} aria-expanded={openAt === i}>
                <span className="beat-who">{l.from === 'gus' ? 'Gus' : l.from === 'you' ? 'You' : 'Venue'}</span>
                <span className="beat-t">{l.text}</span>
                {l.terms && (
                  <span className="beat-n">
                    {l.terms.split}% · ${l.terms.deposit}
                  </span>
                )}
              </button>
            )}
          </li>
        ))}
        {writing && (
          <li className="beat writing">
            <span className="beat-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {writing}
          </li>
        )}
      </ol>
    </section>
  );
}

// Gus's checks are written for the logbook; here they read as one plain clause.
function plain(t: string) {
  return t.replace(/\.?\s*Simulation capacity (\d+); actual capacity unverified/i, ', fits about $1').replace(/: performance availability unverified; metadata is not a calendar/i, ' looks open').replace(/\. Pushing for better$/, '. Asking for better').replace(/\. Countering$/, '. Writing back');
}

/**
 * Steering a call in progress. Each chip is a sentence you'd say to a manager standing next
 * to you; it goes into the thread as your note and the next letter follows it.
 */
function Steer({ lim, paused }: { lim: DealLimits | null; paused: boolean }) {
  const [sent, setSent] = useState<string | null>(null);
  const say = (key: string, patch: { minSplit?: number; maxDeposit?: number }) => {
    haptic('commit');
    setSent(key);
    deals.steer(patch).finally(() => setTimeout(() => setSent(null), 900));
  };
  const up = lim ? Math.min(95, lim.minSplit + 5) : null;
  const dep = lim ? lim.maxDeposit + 50 : null;
  const down = lim && lim.minSplit > 50 ? lim.minSplit - 5 : null;
  return (
    <div className="steer">
      <span className="steer-k">Tell Gus</span>
      <div className="steer-row">
        {up !== null && up > (lim?.minSplit ?? 0) && (
          <button className={`steer-c ${sent === 'up' ? 'sent' : ''}`} onClick={() => say('up', { minSplit: up })}>
            Hold out for {up}%
          </button>
        )}
        {dep !== null && (
          <button className={`steer-c ${sent === 'dep' ? 'sent' : ''}`} onClick={() => say('dep', { maxDeposit: dep })}>
            Go up to ${dep}
          </button>
        )}
        {down !== null && (
          <button className={`steer-c ${sent === 'down' ? 'sent' : ''}`} onClick={() => say('down', { minSplit: down })}>
            {down}% is fine
          </button>
        )}
      </div>
      <button className="btn ghost sm steer-p" onClick={() => (haptic('tap'), paused ? deals.play() : deals.pause())}>
        <Icon name={paused ? 'play' : 'stop'} size={16} />
        {paused ? 'Keep going' : 'Pause the call'}
      </button>
    </div>
  );
}
