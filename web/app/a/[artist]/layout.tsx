import type { ReactNode } from 'react';
import { Shell } from '@web/components/Shell';

export default async function ArtistLayout({ children, params }: { children: ReactNode; params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  return <Shell slug={artist}>{children}</Shell>;
}
