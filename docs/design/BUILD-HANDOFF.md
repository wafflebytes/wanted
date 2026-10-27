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
3. ~~Tour fix progress~~ (session 6): `/plan` POST with `stream: true` sends `{type:'step',words}` lines from `planFor(..., say)`; the island and the fix card show each step. Verified by curl; not yet clicked through in the browser.
4. Desktop panel layout not checked; Posters has no wide layout yet.
5. ~~Demo tour jargon line~~ (session 6): regenerated. Also fixed fix cards titled "null asked for you" (`roastCard` ignored-proof).

## Session 7: the art landed (Gus is a tour manager now)

- Gus is a person, not a road case: flat cap, moustache, vest, lanyard, walkie. Raw renders live in `new-assets-gus/` (gitignored, 60 MB); `python3 scripts/build-art.py` trims them onto square canvases and writes 512 px WebPs to `web/public/art` (1.3 MB total). Gus's full-body poses share one canvas and baseline so mood swaps never jump.
- `Gus.tsx` is now an `<img>`: ≥64 px shows the pose for the mood (idle, listening, thinking, talking/wave = walkie, proud/done, worried = oops, sleeping = paused, plus new working = clipboard, waiting = sitting on a case, phone); <64 px shows his face (`gus-glyph`) with small CSS motions per mood (shell.css).
- `Art.tsx` maps names to renders via `FILES`; SVGs remain only for `van` and `pass` (now unused). New names: badges (`fifty`, `booked`, `back-again`, `sold-out`), empties (`amp`, `binoculars`, `stage`), `receipt`, `pin-booked`, `pin-sleeper`.
- Where the art is used: Welcome hero (Gus waving + orange "Gus, your tour manager" lanyard tag, copy now in his first person), Gus standing on each Welcome card in a pose for that step, splash (Gus + poster, mail, ticket, cassette, pick), Gus above the tiles title, Gus on the Tour drawer (working while a change runs), Logbook header (Gus writing) and a new **On the shelf** row of milestones (first poster, fifty signed, first date held, sold out, back again; unearned ones are shadows with how to get them), map pushpins (opened cities = orange pin, top sleepers = starred pin, both tappable), empty states (stapler on Posters, mailbox on Fan Mail, binoculars on a missing fan poster), new `not-found.tsx` (binoculars) and `error.tsx` (unplugged amp).
- App icon: Gus's face on marquee orange (`scripts/build-icon.py` → `web/app/icon.png`, `apple-icon.png`, `favicon.ico`); `manifest.ts` for Add to Home Screen. Night and cream variants can be previewed by passing an output dir to the script.
- `/lab` deleted. "Your limits" tile now lands on `#gus` in Settings (was a dead `#limits`).
- Unused so far: `gus-phone` (for when Gus calls you), `badge-sold-out` (no sold-out data yet), `empty-shows` (stage), `receipt-paper`, `pin-booked`, `pin-room`.

## Session 8: link previews and the rest of the art

- Fan poster links unfurl: `w/[artist]/[city]/layout.tsx` sets title, a count-aware line and the server's 1200x630 wide render as og/twitter image (`/img/poster/...?format=wide&w=1200&type=jpg`, ~150 KB so WhatsApp keeps it). The wide render's serif lines are Archivo now.
- Every other link shows `web/app/opengraph-image.jpg`: Gus under the lamp, poster pinned on a post, "Find out where you're wanted." in Wanted Rounded. Built by `python3 scripts/build-og.py` from the raw renders (local only). `metadataBase` comes from `WANTED_PUBLIC_ORIGIN` (unless it's the Expo :8081 default), else `VERCEL_PROJECT_PRODUCTION_URL`.
- Map: a city with a held date gets the green check pin (`pin-booked`) instead of the pushpin (MapStage polls deals every 30 s). Not seen painted: the hidden pane doesn't draw WebGL.
- Logbook Gus is on the phone while a venue talk is open; Tour's empty state is the stage.
- Still unused: `receipt-paper`, `badge-sold-out` (no sold-out data), `pin-room` on the city map (venues are blue dots).

## Session 9: the deal room, the drawer, Show day

- Deal room (`DealRoom.tsx`): tug lines, folded letters, steer chips; slim approval; `?deal=` opens it. Limits as genUI (`LimitProposal`) applied in place with an Undo chip. Appllama pass: press and radius tokens, 44 pt targets. `docs/design/AGENT-UX.md` is the agent spec (approvals ladder, surfaces, loops).
- Share images (session 12, `src/server/og.tsx`) are all in the app's look now: Wanted Rounded only (handwriting stays for fans' signatures), cream paper and orange, raised dark cards on a ground lit like the map's heat, our 3D art. The poster is a new layout (WANTED, the city in orange, the artist as a two-tone ink/orange/paper print made with sharp, a count seal, the reward, signatures in rows along the bottom); the old western art, wood backdrop, gold coin, Archivo, Instrument Serif and Chivo Mono are gone from the web renders (the Expo poster component still uses the old art). Story posts: island pill with Gus, a hero card with the door (booked) or ticket (winner) breaking out, one number with the 50-segment meter, the light key and link.
- Posters are themed per city (session 13, `src/server/scenes.ts`): each opened city has its own painted SVG scene (Burlington maples over Lake Champlain, Columbus skyline with the LeVeque Tower, Ithaca Falls, Portland Head Light, the Walkway over the Hudson, Santa Cruz's Giant Dipper) and every other city its region's (northeast, midwest, south, mountain, northwest, california). The scene hands the poster its palette (paper, ink, accent, seal) and the story/link grounds take the city's ink lit in its accent. Maya is the current 3D Maya (`assets/og/maya-full.png` full length, `maya-avatar.png` face), standing in the scene with her hair over WANTED; other acts show their photo, round. Booked/winner posts open on a window of the city with Maya stepping out of it. Image generation via OpenRouter returns 402 (no credit for image models; text still works), so scenes are vector, not generated.
- Stories: `/img/story/<act>/<city>?kind=winner|booked` (1080x1920 JPEG); `web/lib/share.ts` hands it to the share sheet (files) or saves it and copies the caption. Wired: draw winner, Posters held CTA, Story size key, Show day.
- Drawer (`Sheet.tsx`) rebuilt: follows the finger from anywhere, critically damped spring from release speed (no bounce), scroll and trackpad drive it and hand off to the list both ways, wheel momentum swallowed at the ends. Exposes `--p`/`--q` and `[data-folded]`; the home card folds with the drag (`.nm-wrap`). Home has two rests now (card, list); a city keeps three. The desktop panel folds the card on scroll.
- Show day (`/a/<act>/show/<deal>`, `web/lib/showday.ts`, `showday.css`): see AGENT-UX 3.6 for what's real and what's fixture. Home's next move leads with the next held date; Tour's held stops open it.

## Session 10 (landed)

- **The road** (`web/lib/road.ts`, `app/a/[artist]/road/[stop]`, `app/road.css`): a long leg as three ways (play the city on the way / drive it / fly) with nights strip, one money number each, Gus's pick, honest van catch on Fly, hold to ask rooms in the on-the-way city. Entry: Tour hero row + long-drive chips in the run list. Dock highlights Tour on `/show` and `/road`. Verified 375 px dark + light.
- **Settle up** (`web/lib/settle.ts`, `show/[deal]/settle`, `app/settle.css`): three counts land as recessed screens, amber verdict with the missing people in money, receipt, drafted note + scan log, hold to send, room fixes it, total rolls, Settled stamp. Verified 375 px dark + light.
- New spottedinprod sheet `.data/refs/spottedinprod/road_4.jpg` (Flighty alternate flights + passport, Transit trip summary, ride-trace timeline, Canopi trip). Borrowed: glowing trace with labelled points, big times, recap stat card (for a future tour recap story).

## Session 11 (landed): agent-native last leg

- **Ambient Gus** (`src/server/ambient.ts`): any deals read advances calls by the time that passed; the cron sweep ticks acts with calls in progress; the demo act keeps one held, one waiting and one talking deal in stock. The act read (`/api/artist/[id]`) no longer ticks, so it stays fast.
- **Island live activities**: call in progress with a ring, offer waiting, bumps; the deal room folds into the island to keep a call running.
- **The tour with Gus** (`web/lib/guide.ts`, `components/Guide.tsx`, `app/guide.css`): `?tour=1` (Welcome's "Take a quick tour with Gus first"). Gus leaves the dock (the tabs close the gap), one line beside him, a feathered blur over everything but the focus, presses off the path blocked, the thing to press glows and shines; a reload resumes (panel steps rewind to the island). Targets are `data-tour` attributes. Verified 375 dark + light.
- **Gus in Claude** (`src/server/mcp.ts`, `/api/mcp`): remote MCP, five tools, nothing can pay; Settings card "Gus in Claude"; `tests/mcp.test.ts`.
- **Ask a chatbot instead?** (`components/PlainChatbot.tsx`) at the bottom of every city sheet, cached a day per city.
- `llms.txt`, `llms-full.txt`, robots, sitemap; `npm run smoke:prod`.
- Limits Gus changes stay in place with Undo (no jump to Settings).

## Next steps

(Tour and Posters done. Dark is the main mode: design there first, then check light. Use the material system above for every new control. Judge product and copy as well as pixels: one job per screen, one primary key, plain musician words.)

1. ~~Fan Mail~~ (landed, session 5): airmail letter with how the week felt + reel number + scrubbable 14-day trace on a recessed screen; "For you" notes (deduped, one key each); Almost there; latest signatures with wax seals; posts as a postcard row; Earlier folded. `plain()` rewrites old stored copy (Qloo, Bounty, "(Demo data.)").
2. ~~Logbook and Settings~~ (landed, session 5): ruled diary by day with who-dots (You, Gus, A venue, Fans) and an Everything / Needed you switch; the mandate as one paragraph with a key to Settings. Settings: acts, autoAsk switch, venues-at-once segment, deposit and door-cut sliders (debounced POST `/logbook {mandate}`), calls switch, quiet hours, theme, iOS note. Shared `.seg`, `.switch`, `.range` controls live in `globals.css`. "Add an act" is hidden until Welcome exists; `/` redirects to the last act (or the demo act).
3. Known issues above.
4. ~~Welcome~~ (landed, session 5): `/` sends a returning device to its last act; a new one gets "Find the cities that want you" (I make music / I'm a fan / demo act), then link → who you sound like → room size → the run streaming picks, then the map. `/?new=1` is Add an act. The full run (`/scout/run`) wasn't exercised from the web yet. Fan poster page `/w/[artist]/[city]` landed too: the poster nailed to the cork wall, count + LED meter + one sentence, a form (initials well, neighbourhood keys, optional contact behind a disclosure), and a torn thermal receipt after signing with a share-to-two-friends key. A real signature wasn't submitted from the web (kept demo counts clean). Splash (session 6): `/` shows Gus with five objects drifting in and the wordmark rolling up, ≤1.4 s, tap to skip, once per browser session, skipped for reduced motion and `?new`. Not yet seen in the browser at full speed (the hidden pane redirected before a screenshot).
5. Desktop layout (≥900 px): not designed yet; the map already pads for a 520 px left column.
7. Tech pass for Show day: advance desk (per-deal email thread, parsed answers with source), per-person meal ranking, settle-up. ~~Fly or drive~~ landed as The road (session 10, AGENT-UX 3.6b): needs fares + room holds wired. ~~Settle up~~ landed (AGENT-UX 3.6c): needs scanner + settlement email wired. Next 3.7 job: conflict radar.
6. Verify every screen at 375 px dark + light (session 7: Welcome, splash, map, tiles, Tour, Logbook, 404 checked; session 8: Posters, Fan Mail, Settings, fan poster dark, fan poster + Tour light, all fine with the new art). ~~Delete `/lab`~~ (session 7). Vercel: `vercel.json` now builds `next build web` and main deploys fine, but the project's production branch is `ui-overhaul-iphone16`, Production branch switched to main (session 6).
