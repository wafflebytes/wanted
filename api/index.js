/**
 * Vercel Function that serves Wanted's server output (`expo export -p web`): Expo Router's
 * API routes and server-rendered pages. Static files in dist/client are served by Vercel first.
 */
const path = require('node:path');
const { createRequestHandler } = require('expo-server/adapter/vercel');

module.exports = createRequestHandler({ build: path.join(__dirname, '../dist/server') });

// The server bundle loads these with a runtime require, which Vercel's file tracing can't see.
// Naming them here (never called) makes the tracer ship them, native binaries included.
// eslint-disable-next-line no-unused-vars
function traceRuntimeModules() {
  require('@libsql/client');
  require('satori');
  require('@resvg/resvg-js');
  require('sharp');
}
