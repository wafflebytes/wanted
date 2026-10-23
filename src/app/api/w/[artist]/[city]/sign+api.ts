import { id } from '@/server/crypto';
import { sign } from '@/server/claims';
import { body, clientIp, getCookie, handler, json, setCookie } from '@/server/http';
import { onSignature } from '@/server/watcher';

type In = { neighborhood?: string | null; initials?: string | null; contact?: string | null; ref?: string | null };

/**
 * Sign the poster (FR-19, FR-20). One signature per device per artist-city via a hashed
 * device cookie; bursts are rate limited per IP. The watcher runs on every signature.
 */
export const POST = handler(async (req: Request, { artist, city }: Record<string, string>) => {
  const input = await body<In>(req);
  let token = getCookie(req, 'wtd');
  const headers: Record<string, string> = {};
  if (!token) {
    token = id('d_') + id();
    headers['Set-Cookie'] = setCookie('wtd', token);
  }
  const result = await sign({
    artist,
    city,
    neighborhood: input.neighborhood ?? null,
    initials: input.initials ?? null,
    contact: input.contact ?? null,
    deviceToken: token,
    ref: input.ref ?? null,
    ip: clientIp(req),
  });
  if (!result.alreadySigned) await onSignature(result.artist.id, city).catch((e) => console.error('[watcher]', String(e)));
  // Public endpoint: never echo the artist row (it holds the artist's contact email).
  return json({ claim: result.claim, alreadySigned: result.alreadySigned, count: result.count, wear: result.wear }, { headers });
});
