# Wanted

Two front ends, one server:

- `web/`: the Next.js 16 web app (what judges use). `npm run web` serves it on port 3100.
- `src/app`: the Expo app, kept as the iOS codebase.
- `src/server`, `src/lib`: shared server code. The web serves the Expo API routes (`src/app/api/**/*+api.ts`) unchanged through `web/app/api/[...path]/route.ts`; run `npm run web:routes` after adding or renaming an API route.

## Web redesign in progress

Before any web work, read `docs/design/BUILD-HANDOFF.md` and continue from its "Next steps", ticking them off as they land. The spec is `docs/design/WEB-DESIGN.md`; art prompts are `docs/design/ASSET-PROMPTS.md`.

Rules that don't change between sessions:

- Display type is `var(--display)` from `web/app/fonts.css`: SF Pro Rounded where the device has it, else Wanted Rounded (`scripts/build-wanted-rounded.py`). Never commit or serve SF font files.
- Screens speak to touring musicians: plain words, one number and a sentence, no internal jargon, hashes or tool names on screen.
- Motion is Apple-quiet: 120 to 520 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, no long or bouncy springs.
- Verify every screen in the browser at 375 px, light and dark, before calling it done.
