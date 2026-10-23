/**
 * Vercel Function that serves Wanted's server output (`expo export -p web`): Expo Router's
 * API routes and server-rendered pages. Static files in dist/client are served by Vercel first.
 */
const path = require('node:path');
const { createRequestHandler } = require('expo-server/adapter/vercel');

module.exports = createRequestHandler({ build: path.join(__dirname, '../dist/server') });
