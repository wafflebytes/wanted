'use client';
/**
 * One city: its name huge, the one-line reason, then where your people are (ranked
 * neighbourhoods with signatures), the rooms worth playing, who the fans are, and what a plain
 * chatbot would have said instead.
 */
import Link from 'next/link';
import type { CityData, Crowd } from '@/ui/types';
import { deals, useDeal } from '@web/lib/deals';
import { gus } from '@web/lib/gus';
import { useApi } from '@web/lib/hooks';
import { Icon } from './Icon';
import { PlainChatbot } from './PlainChatbot';
import { Reel } from './Reel';

export function CitySheet({ slug, d, opened, posting, onPost, onClose }: { slug: string; d: CityData; opened: boolean; posting: boolean; onPost: () => void; onClose: () => void }) {
  const crowd = useApi<Crowd>(`/artist/${slug}/crowd?city=${d.metro.id}`);
  const live = useDeal();
  const s = d.score;
  const signed = d.proof?.signatures ?? 0;
  const ratio = d.proof?.ratio ?? null;
  const reason = s?.sleeper
    ? `More of your fans live here than a city this size should have.`
    : (s?.heatRank ?? 999) <= 10
      ? `One of the biggest crowds for your sound in the country.`
      : (s?.liftRank ?? 999) <= 20
        ? `Punches above its size for your sound.`
        : d.thin
          ? `Not much taste data here yet. Fans signing will tell us more.`
          : `A steady crowd for your sound.`;
  const hoodCount = Object.fromEntries((d.proof?.neighborhoods ?? []).map((n) => [n.name, n.count]));
  const asking = live.asking === d.metro.id || (live.deal?.city === d.metro.id && live.deal.status === 'talking');
  const ask = (roomId: string | null = null, name?: string) => {
    gus.flash(name ? `Asking ${name}` : `Asking venues`, 2200);
    deals.ask(slug, d.metro.id, roomId).then(() => gus.open('room')).catch(() => gus.flash('Couldn’t reach them'));
  };
  return (
    <div className="city">
      <div className="city-top">
        <span className={`kicker ${s?.sleeper ? 'k-gold' : ''}`}>{s?.sleeper ? '★ Overlooked city' : s?.rank ? `#${s.rank} for your sound` : d.metro.stateName}</span>
        <button className="icon-btn flat" onClick={onClose} aria-label="Back to the country">
          <Icon name="close" size={18} />
        </button>
      </div>
      <h2 className="city-name">{d.metro.name}</h2>
      <p className="city-why">{reason}</p>
      <div className="stats city-stats">
        {opened ? (
          <div className="stat">
            <b>
              <Reel value={signed} />
            </b>
            <span>signed</span>
          </div>
        ) : null}
        {ratio ? (
          <div className="stat">
            <b>{ratio.toFixed(1)}×</b>
            <span>what we’d expect</span>
          </div>
        ) : null}
        <div className="stat">
          <b>{d.rooms.length}</b>
          <span>venues</span>
        </div>
      </div>
      <div className="city-acts">
        {opened ? (
          <>
            <button className="btn hot" onClick={() => ask()} disabled={asking}>
              {asking ? 'Gus is asking…' : 'Ask venues for a date'}
            </button>
            <Link className="btn light" href={`/a/${slug}/posters?city=${d.metro.id}`}>
              Poster
            </Link>
          </>
        ) : (
          <button className="btn hot block" onClick={onPost} disabled={posting}>
            {posting ? 'Putting it up…' : `Put up a poster in ${d.metro.name}`}
          </button>
        )}
      </div>

      <div className="section-h">
        <h2>Where your people are</h2>
      </div>
      {d.neighborhoodsPending && !d.neighborhoods.length ? (
        <p className="shimmer">Finding the neighbourhoods…</p>
      ) : (
        <ol className="card rows hoods">
          {d.neighborhoods.slice(0, 6).map((n) => (
            <li key={n.id} className="card-row">
              <span className={`hood-rank num ${n.rank <= 3 ? 'top' : ''}`}>{n.rank}</span>
              <span className="hood-name">{n.name}</span>
              {hoodCount[n.name] ? <span className="tag hot">{hoodCount[n.name]} signed</span> : null}
            </li>
          ))}
        </ol>
      )}

      {d.rooms.length > 0 && (
        <>
          <div className="section-h">
            <h2>Venues that fit you</h2>
          </div>
          <div className="rooms" data-nodrag>
            {d.rooms.slice(0, 6).map((r) => (
              <article key={r.id} className="room card">
                <div className="room-img">{r.image ? <img src={r.image} alt="" loading="lazy" /> : null}</div>
                <div className="room-txt">
                  <b>{r.name}</b>
                  <span>
                    {[r.neighborhood, r.sizeGuess ? `${r.sizeGuess === 'intimate' ? 'Tiny' : r.sizeGuess[0].toUpperCase() + r.sizeGuess.slice(1)} venue` : null].filter(Boolean).join(' · ')}
                  </span>
                  {r.pulledBy?.[0] && <em>Fans of {r.pulledBy[0].name} go here</em>}
                </div>
                {opened && (
                  <button className="btn xs" onClick={() => ask(r.id, r.name)}>
                    Ask
                  </button>
                )}
              </article>
            ))}
          </div>
          <p className="fine ink-3 b-13">Room sizes are a guess unless a source says so. Nothing is booked until a venue agrees and you say yes.</p>
        </>
      )}

      {crowd.data?.who?.line && (
        <>
          <div className="section-h">
            <h2>Who they are</h2>
          </div>
          <div className="card pad who">
            <p className="d-17">Your crowd here {crowd.data.who.line}.</p>
            {crowd.data.love.shows.length > 0 && (
              <div className="loves">
                <span className="kicker">They also love</span>
                <div className="love-row">
                  {[...crowd.data.love.shows.slice(0, 2), ...crowd.data.love.podcasts.slice(0, 1), ...crowd.data.love.brands.slice(0, 1)].map((t) => (
                    <span key={t.id} className="love">
                      {t.image ? <img src={t.image} alt="" loading="lazy" /> : null}
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <PlainChatbot slug={slug} city={d.metro.id} name={d.metro.name} />
    </div>
  );
}
