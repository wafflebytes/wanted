import { handler } from '@/server/http';
import { cardPng } from '@/server/share';

export const GET = handler(async (req: Request, { artist, city, n }: Record<string, string>) => {
  const format = new URL(req.url).searchParams.get('format') === 'wide' ? 'wide' : 'story';
  const png = await cardPng(artist, city, Number(String(n).replace(/\.png$/, '')), format);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' } });
});
