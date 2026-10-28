/**
 * The artist's story post for a moment (`?kind=winner|booked|thanks`, thanks with `&n=` the room's
 * count; `/img/story/<artist>/tour` is the whole run), as a JPEG a phone can drop straight into
 * Instagram or TikTok stories.
 */
import sharp from 'sharp';
import { announcePng, tourPng } from '@/server/share';
import { traceExternals } from '@web/lib/externals';

traceExternals();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ artist: string; city: string }> }) {
  const { artist, city } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const kind = q.get('kind') === 'booked' ? 'booked' : q.get('kind') === 'thanks' ? 'thanks' : 'winner';
  try {
    const png = city === 'tour' ? await tourPng(artist) : await announcePng(artist, city, kind, Number(q.get('n')));
    const buf = await sharp(Buffer.from(png)).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
