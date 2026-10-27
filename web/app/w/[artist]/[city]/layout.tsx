/**
 * What a fan's poster link says when it's pasted into a chat: the poster on the wall, the city,
 * how many have signed. The page itself is a client screen, so the tags live here.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getArtist } from '@/server/artists';
import { cityCount } from '@/server/claims';
import { metroById } from '@/server/score';
import { traceExternals } from '@web/lib/externals';

traceExternals();

export async function generateMetadata({ params }: { params: Promise<{ artist: string; city: string }> }): Promise<Metadata> {
  const { artist: slug, city } = await params;
  const [artist, metro] = await Promise.all([getArtist(slug).catch(() => null), metroById(city)]);
  if (!artist || !metro) return { title: 'Wanted' };
  const count = await cityCount(artist.id, city).catch(() => 0);
  const title = `WANTED in ${metro.name}: ${artist.name}`;
  const description = count >= 50
    ? `${count} people in ${metro.name} signed for ${artist.name}. Sign and hear first when there’s a date.`
    : `${count} of 50 signed. Help bring ${artist.name} to ${metro.name}: sign the poster.`;
  const image = { url: `/img/poster/${slug}/${city}?format=wide&w=1200&type=jpg&v=${count}`, width: 1200, height: 630, alt: `WANTED poster for ${artist.name} in ${metro.name}` };
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'Wanted', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
