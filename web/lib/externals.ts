/**
 * Hands the shared server code the packages it would otherwise load with Node's resolver
 * (nodeRequire), so Next bundles them as ordinary externals and ships them to Vercel. Each
 * loads on first use: the local SQLite client only ever runs where the database is a file.
 */
export function traceExternals() {
  const g = globalThis as { __wantedModules?: Record<string, () => unknown> };
  g.__wantedModules ??= {
    '@libsql/client': () => require('@libsql/client'),
    '@libsql/client/web': () => require('@libsql/client/web'),
    satori: () => require('satori'),
    '@resvg/resvg-js': () => require('@resvg/resvg-js'),
    sharp: () => require('sharp'),
  };
}
