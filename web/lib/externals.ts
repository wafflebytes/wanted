/**
 * Names the packages the shared server code loads through nodeRequire, so Next's file tracing
 * ships them to Vercel. Never runs: the condition is never true, but the tracer still sees the
 * requires.
 */
export function traceExternals() {
  if (process.env.WANTED_TRACE_EXTERNALS === 'never-set') {
    require('@libsql/client');
    require('libsql');
    require('satori');
    require('@resvg/resvg-js');
    require('sharp');
  }
}
