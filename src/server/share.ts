/** Data assembly for the share renders (poster, card, rap sheet). */
import { getArtist, openedCities } from './artists';
import { claimByNumber, proofFor, recentSignatures, cityCount, wearLevel } from './claims';
import { env } from './env';
import { HttpError } from './http';
import { renderCard, renderPoster, renderRapSheet } from './og';
import { metroById } from './score';
import { loadPlan } from './service';

export function posterLink(slug: string, city: string) {
  return `${env.publicOrigin}/w/${slug}/${city}`;
}

export async function posterPng(slug: string, city: string, format: 'story' | 'wide' | 'poster') {
  const artist = await getArtist(slug);
  const metro = metroById(city);
  const opened = artist ? (await openedCities(artist.id)).find((c) => c.city === city) : null;
  if (!artist || !metro || !opened) throw new HttpError(404, 'No such poster.');
  const count = await cityCount(artist.id, city);
  return renderPoster(
    {
      artistName: artist.name,
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
    },
    format,
  );
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
