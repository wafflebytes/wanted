# Deploying Wanted

Wanted is an Expo Router app with server output: a static web client plus API routes
(Qloo, Gus, Fish Audio). It runs on Vercel Functions with Turso for data (PRD 10).

## Vercel

1. Import `wafflebytes/wanted` in Vercel. `vercel.json` sets the build (`expo export -p web`),
   serves `dist/client` statically and sends everything else to `api/index.js`, which runs
   Expo's own Vercel adapter over `dist/server`.
2. Set these environment variables in the Vercel project (never in the repo):
   - `QLOO_API_KEY`, `OPENROUTER_API_KEY`, `FISH_AUDIO_API_KEY` (and `SETLIST_API_KEY` if used)
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`: the serverless filesystem is read-only, so the
     local SQLite file can't be used there.
   - `WANTED_CONTACT_KEY` (32-byte hex), `WANTED_DEVICE_SALT`, `WANTED_PUBLIC_ORIGIN` (the
     deployed URL, for share links and OG images).
3. Seed the Turso database once from a laptop with the same env vars:
   `npm run seed -- --panel && npm run seed -- --demo`.

Every push to a branch gets a preview URL.

## Any Node host

```
npx expo export -p web
node scripts/serve.mjs dist 3000
```
