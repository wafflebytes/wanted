'use client';
/**
 * The same question put to a plain chatbot with no taste data (src/server/without-qloo.ts),
 * then each room and neighbourhood it named checked against what Gus can see. The point in one
 * number: how much of a confident answer doesn't hold up.
 */
import { useState } from 'react';
import { api } from '@web/lib/api';
import { haptic } from '@web/lib/haptics';
import { Icon } from './Icon';

type Mark = { ok: boolean; level: 'ok' | 'unverified' | 'wrong'; reason: string };
type Report = {
  rooms: { name: string; mark: Mark }[];
  neighborhoods: { name: string; mark: Mark }[];
  llm: { model: string };
};

/** The checks are written for engineers; say them the way a musician would. */
const plain = (r: string) =>
  r
    .replace(/Qloo lists it as/g, 'Listed as')
    .replace(/Qloo places it at/g, 'It’s at')
    .replace(/Qloo has no venue by that name/g, 'Couldn’t find a venue by that name')
    .replace(/One of the rooms Wanted ranked for this Sound here too/g, 'One of my picks too')
    .replace(/Exists, but Qloo doesn't tag it as a live music or comedy room/g, 'Real, but not a place that puts on shows')
    .replace(/per Qloo's hours/g, 'by its hours')
    .replace(/Qloo ranks it/g, 'Ranked')
    .replace(/In Qloo's list, but only/g, 'Only')
    .replace(/Not in Qloo's ranked list for this Sound, so there's no taste evidence behind it/g, 'Nothing says your crowd lives here')
    .replace(/for this Sound/g, 'for your sound')
    .replace(/Could not check \(Qloo error\)/g, 'Couldn’t check')
    .replace(/Qloo's neighborhood list is still loading/g, 'Still checking');

const ICON = { ok: 'check', wrong: 'close', unverified: 'info' } as const;

export function PlainChatbot({ slug, city, name }: { slug: string; city: string; name: string }) {
  const [r, setR] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const run = () => {
    haptic('tap');
    setBusy(true);
    setErr(false);
    api
      .post<Report>(`/artist/${slug}/without-qloo`, { focusCity: city })
      .then(setR)
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  };
  const named = r ? [...r.rooms, ...r.neighborhoods] : [];
  const held = named.filter((x) => x.mark.level === 'ok').length;

  return (
    <>
      <div className="section-h">
        <h2>Ask a chatbot instead?</h2>
      </div>
      <div className={`card pad plain ${r ? 'is-done' : ''}`}>
        {!r ? (
          <>
            <p className="d-17">Same question about {name}, asked of a chatbot with no taste data. Then I check every place it names.</p>
            <button className="btn light" onClick={run} disabled={busy}>
              {busy ? 'Asking and checking…' : 'Compare'}
            </button>
            {busy && <p className="plain-wait shimmer">This takes under a minute.</p>}
            {err && <p className="plain-wait ink-2">That didn’t come back. Try again in a minute.</p>}
          </>
        ) : (
          <>
            <p className="plain-big">
              <b>
                {held} of {named.length}
              </b>{' '}
              things it said hold up.
            </p>
            {[
              ['Rooms it picked', r.rooms],
              ['Where it said your crowd is', r.neighborhoods],
            ].map(([title, xs]) =>
              (xs as Report['rooms']).length ? (
                <div key={title as string} className="plain-list">
                  <span className="kicker">{title as string}</span>
                  <ul>
                    {(xs as Report['rooms']).map((x) => (
                      <li key={x.name} className={`lv-${x.mark.level}`}>
                        <i>
                          <Icon name={ICON[x.mark.level]} size={14} />
                        </i>
                        <span>
                          <b>{x.name}</b>
                          <em>{plain(x.mark.reason)}</em>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </>
        )}
      </div>
    </>
  );
}
