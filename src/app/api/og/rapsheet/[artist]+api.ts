import { handler } from '@/server/http';
import { rapSheetPng } from '@/server/share';

export const GET = handler(async (_req: Request, { artist }: Record<string, string>) => {
  const png = await rapSheetPng(String(artist).replace(/\.png$/, ''));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' } });
});
