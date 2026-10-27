/**
 * The server's own poster render (the same one share cards use), shrunk to a light WebP for
 * screens. `?w=` picks the width (default 720); `?format=story|wide|poster` as the OG route;
 * `?type=jpg` gives link previews a JPEG: not every chat app unfurls WebP, and WhatsApp drops big PNGs.
 */
import sharp from 'sharp';
import { posterPng } from '@/server/share';
import { traceExternals } from '@web/lib/externals';

traceExternals();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const memo = new Map<string, { at: number; buf: Buffer }>();

export async function GET(req: Request, ctx: { params: Promise<{ artist: string; city: string }> }) {
  const { artist, city } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const w = Math.max(160, Math.min(1200, Number(q.get('w')) || 720));
  const f = q.get('format');
  const format = f === 'wide' || f === 'story' ? f : 'poster';
  const jpg = q.get('type') === 'jpg';
  const key = `${artist}/${city}/${format}/${w}/${jpg}/${q.get('v') ?? ''}`;
  const hit = memo.get(key);
  let buf = hit && Date.now() - hit.at < 60_000 ? hit.buf : null;
  if (!buf) {
    try {
      const out = sharp(Buffer.from(await posterPng(artist, city, format))).resize({ width: w });
      buf = await (jpg ? out.jpeg({ quality: 80, mozjpeg: true }) : out.webp({ quality: 82 })).toBuffer();
      memo.set(key, { at: Date.now(), buf });
      if (memo.size > 120) memo.delete(memo.keys().next().value!);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  }
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': jpg ? 'image/jpeg' : 'image/webp', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' } });
}
