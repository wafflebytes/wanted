/**
 * Loads a package with Node's own resolver at runtime instead of through Metro.
 *
 * Expo bundles API routes with Metro, which can't load native addons (libsql, resvg)
 * or packages that resolve platform binaries dynamically. Anything that needs real
 * Node module resolution goes through here. Server-only.
 */
type NodeModule = typeof import('node:module');

let cached: NodeJS.Require | null = null;

/**
 * A host can hand over modules it bundled itself (the web app does, so Next ships them to
 * Vercel); anything it doesn't name falls back to Node's resolver.
 */
type Provided = Record<string, () => unknown>;
const provided = () => (globalThis as { __wantedModules?: Provided }).__wantedModules;

export function nodeRequire<T = unknown>(id: string): T {
  const own = provided()?.[id];
  if (own) return own() as T;
  if (!cached) {
    const mod = process.getBuiltinModule('node:module') as NodeModule;
    cached = mod.createRequire(`${process.cwd()}/package.json`);
  }
  return cached(id) as T;
}
