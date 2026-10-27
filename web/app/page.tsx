'use client';
/**
 * The front door. Until Welcome lands on the web, it opens your last act, or the demo act so a
 * first visit lands on a live map instead of a blank page.
 */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { session } from '@web/lib/session';

const DEMO = 'maya-ortiz';

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/a/${session.lastArtist() ?? DEMO}`);
  }, [router]);
  return <main style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;
}
