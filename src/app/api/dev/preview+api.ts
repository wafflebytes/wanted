/** Local-only viewport harness. The iframe has a REAL 393 x 852 layout viewport.
 * No production route, authentication change or third-party service involved.
 */
export function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return new Response('Not found', { status: 404 });
  const selected = new URL(req.url).searchParams.get('screen');
  const paths: Record<string, string> = { desk: '/a/maya-ortiz/desk', mail: '/a/maya-ortiz/pulse', map: '/a/maya-ortiz', fan: '/w/maya-ortiz/burlington-vt' };
  const src = paths[selected ?? 'desk'] ?? paths.desk;
  return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wanted · iPhone 16 viewport</title><style>html,body{margin:0;background:#242424;color:#ddd;font:13px system-ui}main{display:flex;justify-content:center;gap:24px;padding:32px;align-items:flex-start}aside{max-width:240px;line-height:1.6}iframe{border:0;width:393px;height:852px;flex:none;background:#000;box-shadow:0 8px 50px #0006}a{color:#B45CF0}h1{font-size:18px}@media(max-width:750px){main{padding:0;display:block}aside{display:none}}</style></head><body><main><iframe title="Wanted iPhone 16 preview" src="${src}" width="393" height="852"></iframe><aside><h1>iPhone 16 viewport</h1><p>393 × 852 CSS pixels. The app reads the iframe’s viewport, not the surrounding desktop window. This checks layout, not native Safari behavior.</p><p><a href="?screen=desk">Booking desk</a><br><a href="?screen=mail">Fan Mail</a><br><a href="?screen=map">Crowd map</a><br><a href="?screen=fan">Fan poster</a></p><p>Development only. Not included in a production response.</p></aside></main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
