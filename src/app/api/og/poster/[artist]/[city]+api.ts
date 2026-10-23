import { handler } from '@/server/http';
import { posterPng } from '@/server/share';

export const GET = handler(async (req: Request, { artist, city }: Record<string, string>) => {
  const f = new URL(req.url).searchParams.get('format');
  const format = f === 'wide' || f === 'poster' ? f : 'story';
  const png = await posterPng(artist, city.replace(/\.png$/, ''), format);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
});
