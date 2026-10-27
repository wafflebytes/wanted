# Web redesign: build handoff (working notes, delete when the redesign ships)

Carried across compactions by the auto-loaded memories `web-redesign-direction`, `wanted-rounded-font`, `design-reference-library` and by the repo `CLAUDE.md`. Update the "Next steps" list below whenever a step finishes.

Status as of 2026-10-27, mid-build. Read this first after a context reset.

## Decisions locked

- **Web moves to Next.js 16.4.3** in `web/`; Expo app in `src/` stays as the iOS codebase, untouched. One root `package.json` (`next` installed at root). Scripts: `npm run web` (port 3100), `web:build`, `web:start`, `web:routes`.
- **API bridge:** `scripts/web-routes.ts` scans `src/app/api/**/*+api.ts` and writes `web/lib/routes.generated.ts`; `web/app/api/[...path]/route.ts` matches and calls the Expo handler as `fn(req, params)`. 35 routes. Server code (`src/server`, `src/lib`) is shared, unchanged.
- `web/next.config.ts`: turbopack root = repo, loads root `.env*` via `@next/env`, server externals for libsql/sharp/resvg/satori. `web/tsconfig.json` paths: `@/*` → `../src/*`, `@web/*` → `./*`. Root `tsconfig.json` now excludes `web`.
- **Type (done, verified):** `web/app/fonts.css` defines `Wanted Display` per weight as `local("SF Pro Rounded …")` then `/fonts/WantedRounded-<w>.woff2`; `--display: ui-rounded, "Wanted Display"`. Wanted Rounded = Nunito re-proportioned to SF Pro Rounded by `scripts/build-wanted-rounded.py` (rebuild: `python3 scripts/build-wanted-rounded.py <Nunito[wght].ttf>` from github.com/google/fonts ofl/nunito). No weight/tracking hacks needed. Never self-host SF fonts. Body `--body` = -apple-system → Inter; Gus's voice `--voice` = Instrument Serif. Haffer not used.
- **Look:** Baari shell (cream `#F6F4EF` paper, ink `#15130F`, white cards, black primary pills; header = act avatar left, Gus island centre, settings button right; floating white nav pill with sliding highlight + separate dark round Gus button). Brand accent marquee orange `#FF5A1F`; ok `#1F9D63`; ask `#F2B705`; no `#E5484D`. Motion: 120/200/300/420/520 ms, `cubic-bezier(0.22,1,0.36,1)`, no bouncy springs (only tiny overshoot for stamp + Gus press).
- **Art direction:** Airbnb-2025 soft-lit 3D objects; Gus recommended as "road case" object-character. Until art exists, use SVG/CSS skeuomorphic placeholders; an `<Art name>` component should try `/art/<name>.png` and fall back to the SVG.
- **Tabs:** Map (home, map + drawer), Tour, Posters, Fan Mail (route `/pulse`), Logbook. Gus button: tap = action tiles, hold = talk. Settings via header button.
- **iOS note:** desktop shows "Wanted for iPhone is in development, open source" with Apple logo, linking the GitHub repo.

## Written deliverables (done)

- `docs/design/WEB-DESIGN.md`: spec (kept/borrowed/spottedinprod table, 10 agent-native rules, tokens, shell, 11 screens).
- `docs/design/ASSET-PROMPTS.md`: style lock, Gus A/B/C + 9-state expression sheet, page objects, action tiles, pins, empty states, seal/receipt/badges, splash set, app icon, banner.

## Reference notes (so they need not be re-watched)

- spottedinprod: public API `/api/clips/combined?page=N` (1169 clips, none locked). 67 clips downloaded with contact sheets in the session scratchpad (`.../scratchpad/vid`, `sheets`, `stacks`). Key takeaways are in the WEB-DESIGN.md table.
- transitions.dev studio: (1) spinning reel counter with vertical SVG motion blur, staggered landing, `cubic-bezier(0.16,1,0.3,1)` 1400 ms, 90 ms stagger; (2) voice card: `voice-glow` VoiceBeam border, words stream in at 280 ms, caption text-swap 150 ms, mic wave bars; (3) heart-rate monitor: digit group stagger, ECG path drawing on a grid (`pathLength=100`), stat trio with italic units, dropdown with transform-origin.
- Josh Puckett: fixed `.edge-top/.edge-bottom` strips (`max(12px, env(safe-area-inset-*))`) painted with the page colour so Safari's bars match; html bg = top colour, body bg = bottom colour; `viewport-fit=cover`.
- Baari (served locally at `http://localhost:4310/?fixture=lock` from `~/baari/app`): hero card with photo + big name + stats row ("4 log 50 min 8:00 Sunita": bold number, grey unit); FAB opens full-screen colourful action tiles grid with a large title; Khata = object-icon large title + skeuomorphic ledger card. Dock CSS at `~/baari/app/app.css` lines ~817-870.
- User refs on disk (watch when doing motion): Pool = `~/Downloads/ScreenRecording_10-23-2026 21-00-12_1.MP4`, `~/Downloads/refs/ref-3.mp4`, `~/Downloads/refs/very-good-ref.mp4`.

## Existing code to port

- Map: `src/ui/map/CrowdMap.dom.tsx` (`'use dom'` React DOM + maplibre + deck.gl H3). Port to `web/components/map/` with a light paper style (OpenFreeMap `positron`), a light ember ramp, and purple → orange. Props in `src/ui/map/types.ts`.
- Icons: `src/ui/icons/mx.native.generated.ts` exports `MX_SVG[name].linear|bold` SVG strings.
- Data shapes: `src/ui/types.ts` (MapData, CityData, Crowd, PlanResponse, PosterState, ArtistState). Client patterns: `src/ui/api.ts` (`api.get/post`, `streamNdjson`).
- Endpoints per screen: home `/artist/:slug`, `/map`, `/plan`, `/city/:id(?wait=1)`; tour `/plan` (POST constraints/action); posters `/map`, `/deals`, `/w/:slug/:city`, POST `/artist/:slug/posters`; fan mail `/pulse`, `/inbox`, `/crowd`, `/deals`; logbook `/logbook`; settings `/settings`, `/trace`; onboarding POST `/scout/link`, NDJSON `/scout/run`, `/artists`; fan page `/w/:artist/:city` + POST `/sign`; Gus NDJSON in `src/ui/gus/controller.ts`; call `/artist/:slug/call`.
- Onboarding flow to keep: `src/app/welcome.tsx` (steps who → link → sound → rooms → gus → run; slide the van).

## Built so far (2026-10-27, session 2)

- **Boot:** `web/app/layout.tsx` (edge strips, theme boot from `localStorage['wanted-theme']`), `globals.css` (tokens light/dark, type, buttons, cards, tags, `.page`/`.page-title`/`.enter` stagger, stats, skeleton, shimmer, reel), `shell.css` (header, island, dock, Gus button, tiles, voice card, tray, approval + slide, map stage, drawer `.sheet`). `.claude/launch.json` has `wanted-next` (port 3100). `next.config.ts` force-reloads the root `.env*` (Next caches web/'s env otherwise; health now shows qloo/llm/voice true).
- **lib:** `api.ts` (+`streamNdjson`), `hooks.ts` (`useApi` SWR cache, `mutate`, `useDark`, `usePrefersReducedMotion`), `session.ts`, `gus.ts` (store: panel none/tiles/voice/tray, phase, MediaRecorder hold-to-talk with level meter + silence cut, `/api/voice` playback, `ask`, `flash`, `ambient` island line, `wire(slug, nav)`), `deals.ts` (agent turn loop with pause/play, `ask`, `decide`), `stage.ts` (persistent map: show/city/route/bottom/top/pulse + `onPick`).
- **components:** `Art.tsx` (20 SVG soft-lit objects; PNG override via `ART_FILES`), `Gus.tsx` (road case, 9 moods; verified at 18–84 px), `Icon.tsx` (MX_SVG + apple/github), `Shell.tsx` (header avatar/island/settings, dock with sliding pill, Gus button tap=tiles hold=talk, ambient island from deals/quiet hours), `GusPanels.tsx` (9 tiles, voice card with voice-glow `VoiceBeam`, streamed steps + serif reply + action button, tray morphing from island with live job + Pause, approval, Lately), `Approval.tsx` (exact approval, voids on review-hash change, `Slide` to pay), `Sheet.tsx` (detent drawer), `Reel.tsx`, `CitySheet.tsx`, `map/CrowdMap.tsx` (positron repainted to paper/night, orange route that draws in, numbered stops), `map/MapStage.tsx` (mounted in Shell, kept alive).
- **Routes:** `/a/[artist]` layout = Shell; `/a/[artist]` page = map home (next move peek, Your five poster pager, search + ranked list, `?city=` city sheet; desktop ≥900 px shows a left panel). `/img/poster/[artist]/[city]?w=` = server poster render resized to WebP (sharp). `/lab` = art/Gus contact sheet (delete before ship).
- **Verified in browser (390 px light):** shell, island, tiles, typed ask → steps → answer → action button with voice. Map home renders the paper map.

## Session 3 (landed)

- **No serif anywhere.** Instrument Serif removed (font file, `--voice`, `.voice`). Gus speaks in the display face.
- **Gus answer card** rebuilt for mobile: question as a bubble, one live "working" line (tap to expand the lookups, collapses to "Checked N things"), the answer as the hero, then **the cities he named as tappable rows** (Spotify generative-playlist idea: answers are objects). Action button and the field are pinned at the bottom; only the middle scrolls.
- **Progressive blur** (`components/ProgressiveBlur.tsx`): stacked masked backdrop blurs above the dock on every tab, and under the header off the map. Content melts under the dock instead of being cut.
- **Map labels are DOM markers** now (`syncLabels`/`declutter` in CrowdMap): deck's TextLayer atlas rendered garbled. Duplicate names get their state; only the top 4 sleepers get stars; city labels hide while a route shows.
- **Drawer rests ~1.5× higher** (Map peek 340, City 400, Tour 430 + dock).
- **Map hero** (next move): big title, a 50-tick signature meter with a rolling count, the poster object breaking out over the drawer edge, one full-width button.
- **Tour tab** (`app/a/[artist]/tour`, `app/tour.css`): Waymo-style route (ink line with white casing, numbered stop pills, ends named). Hero: dates big, the run strip (long drives red dashed, locked filled, moved orange), score ring with Gus's potential gain as a pale arc, "See Gus's N changes". Raised: hero folds into a slim bar. Fix cards (before → after, take or keep), the run as an inset grouped list on a numbered rail with drive times and a 44 px lock. Replan marks changed stops "New". Verified: taking a fix moved 48 → 49 and redrew the route.
- Gus tiles trimmed to 6 (Ask rooms, Plan the tour, Find an opener, Share a poster, Catch me up, Your limits). Small buttons get 44 px hit areas.

## Session 4 (landed)

- **Material system (dark first).** Tokens in `web/app/globals.css`: `--bevel`, `--drop`, `--drop-press`, `--raise`, `--well-bg`, `--well`, `--key`/`--key-bevel` (default button: glossy black by day, ivory key by night), `--hot`/`--hot-bevel` (orange key, lit top edge, no coloured glow). Rule: anything you press is a raised key that sinks 1 px on press; anything you read or type into (ask field, meters, score panel, the home tally) is a recessed well. `.btn` variants set `--b-bg/--b-fg/--b-bevel`.
- Gus tiles are raised tinted slabs (`--tint` per tile); the dock's selected pill is a lit glass key; signature meters are lit LED segments in a well (Map and Posters share it).
- **Posters tab** (`web/app/a/[artist]/posters/page.tsx`, `web/app/posters.css`): a cork wall (`html.on-wall` sets `--page`), the city-name pager over swipeable posters that swing straight in the centre (scroll-driven `--d/--a`), tap to lift. Below: one number + one sentence + one button per city state (warming → share; proven → ask rooms; offer waiting → open tray; held/played → share), three secondary keys (copy link, story size, fan page), the draw (only offered once a show is booked), where they signed, newest signatures as perforated stamps. Wall order is a to-do list: proven, then closest to 50, played last.
- Server copy: tour lines now reject dashboard words (data, score, signal, gaps, empty) and fall back; fallback lines no longer mention Qloo or "taste graph".
- Map: reveals after first draw (or 600 ms) instead of waiting for every tile; `paint` guards against a removed map (StrictMode double-mount crashed it).

## Known issues to fix first

1. Map load time is unverified: the in-app browser pane was hidden (background tab throttling) and the dev server recompiles after edits. Measure with the pane visible or a production build.
2. ~~Gus fallback after many lookups~~ (fixed, session 5): `src/server/gus/ask.ts` caps 4 lookups a turn, then forces a final answer with `toolChoice: 'none'`; the lite fallback says what the lookups found instead of "Ask me about a city…".
3. Tour fix takes ~15 s with only "On it…": show Gus's step in the island while it runs.
4. Desktop panel layout not checked; Posters has no wide layout yet.
5. The saved demo tour still carries the old jargon `gusLine` until the plan is next changed.

## Next steps

(Tour and Posters done. Dark is the main mode: design there first, then check light. Use the material system above for every new control. Judge product and copy as well as pixels: one job per screen, one primary key, plain musician words.)

1. ~~Fan Mail~~ (landed, session 5): airmail letter with how the week felt + reel number + scrubbable 14-day trace on a recessed screen; "For you" notes (deduped, one key each); Almost there; latest signatures with wax seals; posts as a postcard row; Earlier folded. `plain()` rewrites old stored copy (Qloo, Bounty, "(Demo data.)").
2. ~~Logbook and Settings~~ (landed, session 5): ruled diary by day with who-dots (You, Gus, A venue, Fans) and an Everything / Needed you switch; the mandate as one paragraph with a key to Settings. Settings: acts, autoAsk switch, venues-at-once segment, deposit and door-cut sliders (debounced POST `/logbook {mandate}`), calls switch, quiet hours, theme, iOS note. Shared `.seg`, `.switch`, `.range` controls live in `globals.css`. "Add an act" is hidden until Welcome exists; `/` redirects to the last act (or the demo act).
3. Known issues above.
4. ~~Welcome~~ (landed, session 5): `/` sends a returning device to its last act; a new one gets "Find the cities that want you" (I make music / I'm a fan / demo act), then link → who you sound like → room size → the run streaming picks, then the map. `/?new=1` is Add an act. The full run (`/scout/run`) wasn't exercised from the web yet. Still to do: splash, fan poster page `/w/[artist]/[city]` (sign + receipt).
5. Verify every screen at 375 px dark + light; delete `/lab`. Vercel: `vercel.json` now builds `next build web` and main deploys fine, but the project's production branch is `ui-overhaul-iphone16`, so main lands as a protected Preview until the user switches it.
