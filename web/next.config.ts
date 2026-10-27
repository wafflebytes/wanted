import { loadEnvConfig } from '@next/env';
import path from 'node:path';
import type { NextConfig } from 'next';

// One repo, two front ends: the Expo app (iOS) and this Next.js app (web). Both read the
// same server code in ../src and the same .env at the repo root.
const repo = path.join(__dirname, '..');
// Next has already loaded (and cached) web/'s env files; force a reload from the repo root, where .env lives.
loadEnvConfig(repo, process.env.NODE_ENV !== 'production', undefined, true);

const config: NextConfig = {
  turbopack: { root: repo },
  outputFileTracingRoot: repo,
  serverExternalPackages: ['@libsql/client', 'libsql', 'sharp', '@resvg/resvg-js', 'satori'],
  // The server loads these through nodeRequire (Metro can't bundle native addons), which file
  // tracing can't see; web/lib/externals.ts names them for it. libsql then picks its platform
  // binary by name at runtime, and the share renders read fonts and art from assets/, so those
  // ship explicitly.
  outputFileTracingIncludes: {
    '/**': [
      '../node_modules/@libsql/**/*',
      '../node_modules/libsql/**/*',
      '../node_modules/@neon-rs/**/*',
      '../node_modules/detect-libc/**/*',
      '../node_modules/@resvg/**/*',
      '../assets/fonts/*.ttf',
      '../assets/og/**/*',
    ],
  },
  typedRoutes: false,
  devIndicators: false,
  images: { unoptimized: true },
};

export default config;
