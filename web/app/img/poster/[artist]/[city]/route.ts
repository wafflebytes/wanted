/**
 * The server's own poster render (the same one share cards use), shrunk to a light WebP for
 * screens. `?w=` picks the width (default 720); `?format=story|wide|poster` as the OG route;
 * `?type=jpg` gives link previews a JPEG: not every chat app unfurls WebP, and WhatsApp drops big PNGs.
 */
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { kvGet, kvSet } from '@/server/db';
import { renderPoster } from '@/server/og';
import { posterInput } from '@/server/share';
import { traceExternals } from '@web/lib/externals';

traceExternals();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bump when the poster's look changes, so renders kept from before are drawn again.
const LOOK = 1;
const memo = new Map<string, Buffer>();

export async function GET(req: Request, ctx: { params: Promise<{ artist: string; city: string }> }) {
  const { artist, city } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const w = Math.max(160, Math.min(1200, Number(q.get('w')) || 720));
  const f = q.get('format');
  const format = f === 'wide' || f === 'story' ? f : 'poster';
  const jpg = q.get('type') === 'jpg';
  // A render takes seconds and a deploy empties the CDN, so finished posters are kept in the
  // database under what's on them: a new signature makes a new key, a redeploy doesn't.
  let input;
  try {
    input = await posterInput(artist, city);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const key = `poster:${createHash('sha1').update(JSON.stringify([LOOK, input, format, w, jpg])).digest('hex')}`;
  let buf = memo.get(key) ?? null;
  if (!buf) {
    const kept = await kvGet<string>(key).catch(() => null);
    buf = kept ? Buffer.from(kept, 'base64') : null;
  }
  if (!buf) {
    const out = sharp(Buffer.from(await renderPoster(input, format))).resize({ width: w });
    buf = await (jpg ? out.jpeg({ quality: 80, mozjpeg: true }) : out.webp({ quality: 82 })).toBuffer();
    await kvSet(key, buf.toString('base64')).catch(() => {});
  }
  memo.set(key, buf);
  if (memo.size > 120) memo.delete(memo.keys().next().value!);
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': jpg ? 'image/jpeg' : 'image/webp', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' } });
}
