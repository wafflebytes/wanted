/** Data assembly for the share renders (poster, card, rap sheet). */
import { getArtist, openedCities } from './artists';
import { claimByNumber, proofFor, recentSignatures, cityCount, wearLevel } from './claims';
import { env } from './env';
import { HttpError } from './http';
import { renderAnnounce, renderCard, renderPoster, renderRapSheet, renderTour, type AnnounceData } from './og';
import { bountyView } from './bounty';
import { dealsFor } from './deals';
import { metroById } from './score';
import { loadPlan } from './service';

export function posterLink(slug: string, city: string) {
  return `${env.publicOrigin}/w/${slug}/${city}`;
}

/** Everything a poster shows. Two calls with the same input draw the same poster. */
export async function posterInput(slug: string, city: string) {
  const artist = await getArtist(slug);
  const metro = metroById(city);
  const opened = artist ? (await openedCities(artist.id)).find((c) => c.city === city) : null;
  if (!artist || !metro || !opened) throw new HttpError(404, 'No such poster.');
  const count = await cityCount(artist.id, city);
  return {
    artistName: artist.name,
    cityId: city,
    cityName: metro.name,
    state: metro.state,
    count,
    wear: wearLevel(count),
    topNeighborhoods: opened.topNeighborhoods,
    signatures: await recentSignatures(artist.id, city, 28),
    played: !!opened.playedAt,
    portrait: artist.portrait,
    imageUrl: artist.imageUrl,
    link: posterLink(artist.slug, city),
    isDemo: artist.isDemo,
  };
}

export async function posterPng(slug: string, city: string, format: 'story' | 'wide' | 'poster') {
  return renderPoster(await posterInput(slug, city), format);
}

export async function cardPng(slug: string, city: string, n: number, format: 'story' | 'wide') {
  const artist = await getArtist(slug);
  const metro = metroById(city);
  const opened = artist ? (await openedCities(artist.id)).find((c) => c.city === city) : null;
  if (!artist || !metro || !opened) throw new HttpError(404, 'No such poster.');
  const claim = await claimByNumber(artist.id, city, n);
  if (!claim) throw new HttpError(404, 'No such signature.');
  const total = await cityCount(artist.id, city);
  return renderCard(
    {
      artistName: artist.name,
      cityId: city,
      cityName: metro.name,
      state: metro.state,
      claim,
      played: opened.playedAt ? { venue: opened.playedVenue } : null,
      total,
      wear: wearLevel(total),
      portrait: artist.portrait,
      imageUrl: artist.imageUrl,
      topNeighborhoods: opened.topNeighborhoods,
      link: posterLink(artist.slug, city),
    },
    format,
  );
}

export async function rapSheetPng(slug: string) {
  const artist = await getArtist(slug);
  if (!artist) throw new HttpError(404, 'No such artist.');
  const [opened, proof, plan] = await Promise.all([openedCities(artist.id), proofFor(artist.id, { includeDemo: artist.isDemo }), loadPlan(artist.id)]);
  const sig = (c: string) => proof.find((p) => p.city === c)?.signatures ?? 0;
  const stops = plan?.stops.length
    ? plan.stops.map((s) => ({
        city: s.city,
        state: s.state,
        date: s.date.slice(5).replace('-', '/'),
        room: s.room?.name ?? null,
        signatures: sig(s.metroId),
        line: s.blurb ?? '',
        caught: !!opened.find((o) => o.city === s.metroId)?.playedAt,
      }))
    : opened.map((o) => ({ city: o.name, state: o.state, date: null, room: o.playedVenue, signatures: sig(o.city), line: '', caught: !!o.playedAt }));
  const totalSignatures = proof.reduce((s, p) => s + p.signatures, 0);
  const hoods = new Set(proof.flatMap((p) => p.neighborhoods.map((n) => `${p.city}:${n.name}`)));
  const best = [...proof].sort((a, b) => b.signatures - a.signatures)[0];
  const bestName = best ? metroById(best.city)?.name : null;
  return renderRapSheet({
    artistName: artist.name,
    isDemo: artist.isDemo,
    mugshot: artist.portrait === 'maya-engraving' ? 'maya-mugshot' : null,
    imageUrl: artist.imageUrl,
    stops,
    totalSignatures,
    neighborhoods: hoods.size,
    headline: `Wanted in ${hoods.size} neighborhoods${bestName ? `; ${bestName} brought the most signatures` : ''}.`,
  });
}

/** The artist's story post for a moment: the draw's winner, or the date a city got. */
export async function announcePng(slug: string, city: string, kind: 'winner' | 'booked' | 'thanks', came = 0) {
  const artist = await getArtist(slug);
  const metro = metroById(city);
  const opened = artist ? (await openedCities(artist.id)).find((c) => c.city === city) : null;
  if (!artist || !metro || !opened) throw new HttpError(404, 'No such poster.');
  const count = await cityCount(artist.id, city);
  const base = {
    artistName: artist.name,
    cityId: city,
    cityName: metro.name,
    state: metro.state,
    count,
    wear: wearLevel(count),
    topNeighborhoods: opened.topNeighborhoods,
    signatures: await recentSignatures(artist.id, city, 28),
    played: !!opened.playedAt,
    portrait: artist.portrait,
    imageUrl: artist.imageUrl,
    // Every post points at the artist's posters, so the next city can start signing.
    link: posterLink(artist.slug, city),
    isDemo: artist.isDemo,
  };
  let d: AnnounceData;
  if (kind === 'winner') {
    const b = await bountyView(artist, city, null);
    if (!b.drawn) throw new HttpError(404, 'No winner yet.');
    d = { ...base, kind, number: b.drawn.winner.number, neighborhood: b.drawn.winner.neighborhood, prize: b.prize, entries: b.totalEntries };
  } else {
    const held = (await dealsFor(artist.id)).find((x) => x.city === city && x.status === 'held');
    if (!held?.terms) throw new HttpError(404, 'Nothing booked here yet.');
    const date = new Date(`${held.terms.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
    // The morning after: the room's count, the one the artist settled on.
    d = kind === 'thanks' ? { ...base, kind, venue: held.roomName, date, came: Math.max(1, Math.min(20000, Math.round(came) || 0)) } : { ...base, kind, venue: held.roomName, date };
  }
  return renderAnnounce(d);
}

/** The whole run as one tour poster: every night, the booked ones with their venue. */
export async function tourPng(slug: string) {
  const artist = await getArtist(slug);
  if (!artist) throw new HttpError(404, 'No such artist.');
  const [plan, deals, proof] = await Promise.all([loadPlan(artist.id), dealsFor(artist.id), proofFor(artist.id, { includeDemo: artist.isDemo })]);
  if (!plan?.stops.length) throw new HttpError(404, 'No tour yet.');
  const held = new Map(deals.filter((x) => x.status === 'held' && x.terms).map((x) => [x.city, x]));
  const day = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });
  const stops = plan.stops.map((s) => {
    const h = held.get(s.metroId);
    const date = h?.terms?.date ?? s.date;
    return { day: day(date, { weekday: 'short' }), date: day(date, { month: 'short', day: 'numeric' }), city: s.city, state: s.state, room: h?.roomName ?? null, booked: !!h, signed: proof.find((p) => p.city === s.metroId)?.signatures ?? 0 };
  });
  const dates = plan.stops.map((s) => held.get(s.metroId)?.terms?.date ?? s.date).sort();
  const [firstDate, lastDate] = [dates[0], dates[dates.length - 1]];
  const sameMonth = firstDate.slice(0, 7) === lastDate.slice(0, 7);
  const span: [string, string] = [day(firstDate, { month: 'short', day: 'numeric' }), sameMonth ? day(lastDate, { day: 'numeric' }) : day(lastDate, { month: 'short', day: 'numeric' })];
  const booked = stops.filter((s) => s.booked).length;
  // The key points fans at the night that most needs them: the first one still asking.
  const asking = plan.stops.find((s) => !held.has(s.metroId)) ?? plan.stops[0];
  return renderTour({
    artistName: artist.name,
    span,
    sub: `${stops.length} nights${booked ? `, ${booked} booked` : ''} · ${plan.stops[0].city} to ${plan.stops[plan.stops.length - 1].city}`,
    stops,
    link: posterLink(artist.slug, asking.metroId),
  });
}
