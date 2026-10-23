/**
 * Loads a package with Node's own resolver at runtime instead of through Metro.
 *
 * Expo bundles API routes with Metro, which can't load native addons (libsql, resvg)
 * or packages that resolve platform binaries dynamically. Anything that needs real
 * Node module resolution goes through here. Server-only.
 */
type NodeModule = typeof import('node:module');

let cached: NodeJS.Require | null = null;

export function nodeRequire<T = unknown>(id: string): T {
  if (!cached) {
    const mod = process.getBuiltinModule('node:module') as NodeModule;
    cached = mod.createRequire(`${process.cwd()}/package.json`);
  }
  return cached(id) as T;
}
