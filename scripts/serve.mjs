/**
 * Production server for the web export (`npm run build:web` first): static client files from
 * dist/client, API routes and pages through Expo Router's server build in dist/server.
 *
 *   node scripts/serve.mjs [distDir] [port]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

// expo-server's ESM build uses extensionless imports Node can't resolve; its CJS build is fine.
const { createRequestHandler } = createRequire(import.meta.url)('expo-server/adapter/http');

const dist = path.resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? process.env.PORT ?? 3000);
const clientDir = path.join(dist, 'client');
const handle = createRequestHandler({ build: path.join(dist, 'server') });

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.map': 'application/json', '.wasm': 'application/wasm' };

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = path.join(clientDir, url);
    if (file.startsWith(clientDir) && url !== '/' && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': url.startsWith('/_expo/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300' });
      createReadStream(file).pipe(res);
      return;
    }
    handle(req, res, (err) => {
      res.statusCode = err ? 500 : 404;
      res.end(err ? 'Server error' : 'Not found');
    });
  })
  .listen(port, () => console.log(`Wanted on http://localhost:${port}`));
