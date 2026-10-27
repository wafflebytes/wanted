'use client';
/**
 * Logbook: Gus's tour diary. Everything he did, day by day, in his own words, with a dot for
 * who made the call: you, Gus, a venue, your fans. Money and calls are marked, because those
 * are the ones you'll look for later.
 *
 * What he's allowed to do alone sits at the bottom as one sentence, and changes in Settings.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { LogEntry, Mandate } from '@/lib/types';
import { Icon, type IconName } from '@web/components/Icon';
import { useApi } from '@web/lib/hooks';
import '../../../logbook.css';

type Who = 'you' | 'gus' | 'room' | 'fans';
const WHO: Record<LogEntry['source'], Who> = { artist: 'you', gus: 'gus', qloo: 'gus', room: 'room', fans: 'fans' };
const WHO_NAME: Record<Who, string> = { you: 'You', gus: 'Gus', room: 'A venue', fans: 'Fans' };
const KIND: Record<LogEntry['kind'], IconName> = { lookup: 'search', decision: 'flag', letter: 'mail', escalation: 'notification', payment: 'receipt', bounty: 'award' };

const time = (t: number) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayOf = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === new Date(today.getTime() - 86_400_000).toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};
const hour = (h: number) => (h === 0 ? 'midnight' : h < 12 ? `${h} am` : h === 12 ? 'noon' : `${h - 12} pm`);
/** Older lines were written before Gus stopped saying "Bounty" and "demo". */
const plain = (s: string) => s.replace(/\s*\(Demo data\.?\)/gi, '').replace(/\bBounty\b/g, 'draw');

export default function Logbook() {
  const slug = useParams<{ artist: string }>().artist;
  const book = useApi<{ entries: LogEntry[]; mandate: Mandate }>(`/artist/${slug}/logbook`, { every: 6000 });
  const [only, setOnly] = useState<'all' | 'you'>('all');

  useEffect(() => {
    document.documentElement.classList.add('on-log');
    return () => document.documentElement.classList.remove('on-log');
  }, []);

  const entries = book.data?.entries ?? [];
  // "Needed you": anything he asked you about, rang you for, or that moved money.
  const needed = (e: LogEntry) => e.level >= 2 || e.kind === 'payment' || e.source === 'artist';
  const shown = only === 'you' ? entries.filter(needed) : entries;
  const days = useMemo(() => {
    const out: [string, LogEntry[]][] = [];
    for (const e of shown) {
      const d = dayOf(e.createdAt);
      const last = out[out.length - 1];
      if (last && last[0] === d) last[1].push(e);
      else out.push([d, [e]]);
    }
    return out;
  }, [shown]);
  const week = entries.filter((e) => Date.now() - e.createdAt < 7 * 86_400_000);
  const asked = week.filter(needed).length;
  const m = book.data?.mandate;

  if (book.loading && !book.data)
    return (
      <main className="lb">
        <div className="lb-ground" />
        <div className="sk" style={{ height: 120, borderRadius: 22, marginTop: 8 }} />
        <div className="sk" style={{ height: 380, borderRadius: 22, marginTop: 16 }} />
      </main>
    );

  return (
    <main className="lb">
      <div className="lb-ground" />

      <header className="lb-hero">
        <span className="kicker">Gus’s logbook</span>
        {entries.length ? (
          <>
            <h1>
              {week.length} {week.length === 1 ? 'thing' : 'things'} this week.
            </h1>
            <p>{asked ? `${asked} needed you. Gus handled the rest and wrote it all down.` : 'None of it needed you. Gus wrote it all down.'}</p>
          </>
        ) : (
          <>
            <h1>Nothing yet.</h1>
            <p>When a city fills its poster, Gus gets to work. Everything he does lands here, in plain words.</p>
          </>
        )}
        <div className="lb-legend" aria-label="Who made the call">
          {(['you', 'gus', 'room', 'fans'] as Who[]).map((w) => (
            <span key={w}>
              <i className={`lb-dot w-${w}`} />
              {WHO_NAME[w]}
            </span>
          ))}
        </div>
      </header>

      {entries.length > 0 && (
        <div className="seg lb-seg" role="tablist">
          {(
            [
              ['all', 'Everything'],
              ['you', 'Needed you'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={only === k} className={only === k ? 'on' : ''} onClick={() => setOnly(k)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {days.map(([day, list], di) => (
        <section key={day} className="lb-day" style={{ ['--i' as string]: di }}>
          <h2>{day}</h2>
          <ol className="lb-page">
            {list.map((e) => {
              const w = WHO[e.source];
              return (
                <li key={e.id} className={`lb-e${e.level >= 3 ? ' loud' : ''}${e.kind === 'payment' ? ' money' : ''}`}>
                  <time>{time(e.createdAt)}</time>
                  <i className={`lb-dot w-${w}`} title={WHO_NAME[w]} aria-label={WHO_NAME[w]} />
                  <div className="lb-txt">
                    <b>{plain(e.title)}</b>
                    {e.detail && <p>{plain(e.detail)}</p>}
                  </div>
                  <Icon name={KIND[e.kind]} size={16} className="lb-k" />
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {m && (
        <section className="lb-mandate">
          <span className="kicker">What Gus does without asking</span>
          <p>
            {m.autoAsk ? (
              <>
                When a city fills its poster, he asks up to <b>{m.roomsAtOnce}</b> {m.roomsAtOnce === 1 ? 'venue' : 'venues'} for a date. He won’t take less than <b>{m.minSplit}%</b> of the door or
                agree to more than <b>${m.maxDeposit}</b> to hold it.
              </>
            ) : (
              <>He doesn’t talk to venues on his own. He tells you when a city fills its poster and waits.</>
            )}{' '}
            {m.callsPerWeek > 0 ? `He only calls when money’s on the line, never between ${hour(m.quietStart)} and ${hour(m.quietEnd)}.` : 'He never calls.'}
          </p>
          <p className="ink-3 b-13">He never pays anything without your OK.</p>
          <Link href={`/a/${slug}/settings#gus`} className="btn light block">
            <Icon name="sliders" size={18} />
            Change what Gus can do
          </Link>
        </section>
      )}
    </main>
  );
}
