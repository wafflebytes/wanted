# Wanted on the web: design spec

Owner: design. Applies to `web/` (Next.js). The Expo app in `src/` stays the iOS codebase and catches up later.

## The one-line brief

A tour manager in your pocket, built like a well-made physical thing. Cream paper, soft-lit objects, a map that glows where you're wanted, and an agent you can always see working.

## What we kept, and why

- **Onboarding.** Slide the van, answer four things Wanted can't work out itself, watch the map ignite while Gus reads. Restyled, same beats.
- **Map + drawer on Home.** The map is the product's first sentence. The drawer leads with one next move, then the five cities.
- **Tour tab.** Route map with numbered stops, a score you can read in one glance, constraints you can edit.
- **The poster.** Fans sign a WANTED poster. It's the one place the handbill look lives.

## What we borrowed from Baari

- **Type:** display is SF Pro Rounded on every device that has it (`ui-rounded` in Safari, `local()` for an installed copy in any browser), and **Wanted Rounded** everywhere else: our OFL derivative of Nunito, rebuilt by `scripts/build-wanted-rounded.py` to SF Pro Rounded's measured proportions (weights 500 to 900 mapped to Nunito 575/675/750/875/975 by stem thickness, x-height +8.4%, word space 0.284 → 0.194 em, digits +6.2% from a lighter master, capitals −2.3%). Overlaid on the real font, the outlines land within a pixel or two at 30 px. One CSS family, `Wanted Display`, declares SF first and Wanted Rounded second per weight (`web/app/fonts.css`). SF Pro Rounded itself is never served or committed (Apple's licence: Apple-platform UI only, no redistribution). Body is SF Pro / system-ui with Inter as fallback. No serif anywhere: Gus speaks in the display face too. Haffer XH (Baari's face) is licensed and not used.
- **Header:** act avatar left, a live island in the middle, one round button right. No titles in the header; titles live on the page.
- **Dock:** a floating white nav pill with five tabs and a sliding highlight, plus a separate dark round button. Here that button is Gus.
- **Icons:** mx-icons line/bold pairs (already a Wanted dependency): line when idle, bold when selected.
- **Large titles with an object:** every tab opens with a small 3D object next to a big title and one plain sentence. That object is the page's identity, so tabs feel like distinct tools, not one long feed.
- **Cream ground, ink type, black primary pills,** one warm attention colour.

## What we took from spottedinprod (the bigger creative well)

| Clip | What we took |
|---|---|
| Pool: Swipe the duck, Importing | Enter the app by dragging a physical thing (our van). Items float in while the agent works. Serif voice for the brand. |
| Pool: Screenshot intelligence | Home made of tilted card stacks with counts. Two floating round buttons, not a toolbar. |
| Corner: Launch screen | Splash: soft 3D objects drift into frame, then clear for the first question. |
| Airbnb: Experiences, Tour, No matches, Mode switcher | The asset language: soft-lit 3D objects, isometric empty states, a gold wax seal that rises for "vetted", a full-screen object morph between modes. |
| Gowalla: Spinning markers | Chunky map pins that spin and swell when picked; the sheet answers with one coloured action. |
| Bump: Check in | A radius ring on the map, "Were you here?" sheet, then a counter in the island. Our version: "Fans in Columbus? 56 signed." |
| Waymo: Almost there | The route draws as the sheet morphs. Used on Tour. |
| Toasted / Family: Morphing tray | Gus's running jobs: the button grows into a live tray (timer, step, Pause) and folds back into a pill. |
| Things: Draggable FAB | Drag Gus onto a city or a show to hand him that job. |
| Linear: Glassy menu | Act switcher and long menus as frosted trays anchored to where you tapped. |
| Arc: Pinch to summarize | When Gus reads something (a booker's email, a city), the source shrinks into a card and his summary streams in under it. |
| Spotify: Generative playlists | Talking to Gus produces a real object you edit (a hold request, a route, a poster), never just a chat reply. |
| Sesame / Raycast / ChatGPT voice | Hold Gus to talk. Words stream in; a soft beam rings the card while he listens. |
| Sudoku / Product Hunt / GitHub: badges | Milestones as collectible round badges with a share button. |
| Introspect: Printing receipt | Every approval prints a receipt you can keep. |
| Sleep Cycle / Believe charts | Fan Mail's week as a live trace you can scrub. |

transitions.dev studio pieces: the **spinning reel counter** (signature counts, offer amounts), the **voice card** (VoiceBeam, streaming words, caption swap, live mic wave), the **heart-rate monitor** (a live sign-up trace for the city that's moving, with a stat trio).

## Agent-native rules

Built from Linear's agent interaction guidelines, Ink & Switch on malleable software, Amelia Wattenberger and Geoffrey Litt on interfaces beyond chat, and the research pack (07).

1. **Gus is always visible, never loud.** The island says what he's doing in four words or fewer: Reading Columbus, Asking 3 rooms, Waiting on The Basement, Done. Tap it to open his tray.
2. **Gus makes objects, not paragraphs.** A hold request, a route, an offer, a poster. Each one is editable in place. Chat is the outer loop; direct manipulation is the inner loop.
3. **Instant acknowledgement.** Every ask gets a reaction within 100 ms: the island flips to "On it" before the server answers.
4. **One tap to stop.** Every running job in the tray has Pause. Paused jobs keep their work.
5. **Exact approvals.** An approval card shows the amount, the payee, the date and what happens next, in that order. You slide to approve. If the terms change, the card voids itself visibly and asks again.
6. **Ask in proportion.** Logbook line, then a note, then a question, then a card, then a call. Quiet hours are respected and shown.
7. **Receipts, in plain words.** The Logbook tells the story like a tour diary. Proof sits behind "Check it's fair".
8. **Limits you can feel.** What Gus may do alone is a set of sliders (biggest deposit, smallest cut of the door, how far to drive), not a settings form.
9. **Changes as a diff.** When Gus replans, he shows what moves: Columbus out, Cincinnati in, +2 h driving, +40 fans. Accept line by line.
10. **Humans are accountable.** The artist approves money and anything sent in their name. The UI never implies a promoter agreed when they haven't.

## Tokens

Colour (light; dark mirrors them in `globals.css`):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F4EF` | page ground (paper) |
| `--card` | `#FFFFFF` | cards, sheets, dock |
| `--ink` | `#15130F` | text, primary buttons |
| `--ink-2` | `#6B675F` | secondary text |
| `--ink-3` | `#A29E95` | tertiary, units |
| `--wanted` | `#FF5A1F` | brand: heat, the poster, Gus's ring |
| `--ok` | `#1F9D63` | signed, booked, paid |
| `--ask` | `#F2B705` | needs your OK |
| `--no` | `#E5484D` | failure only |

Type scale: display 34/30/24/20 (`var(--display)`, 700 to 800, -0.02em), body 17/15/13 (Inter), Gus's voice in Instrument Serif italic at 19 to 26, numbers in SF Pro Rounded with tabular figures.

Radius 12 / 16 / 22 / 32 / pill. Spacing on a 4 px grid, 16 px side gutter, content max 480 px centred on desktop.

Motion (Apple-quiet; no long springs): tap 120 ms, fade 200, move 300, enter 420, hero 520, all `cubic-bezier(0.22, 1, 0.36, 1)`. One small overshoot is allowed for the stamp and the Gus button press. Reduced motion turns movement into fades.

## Shell

- **Header:** act avatar (opens acts tray), Gus island (status, tap for tray), settings button.
- **Dock:** Map, Tour, Posters, Fan Mail, Logbook. Gus button to the right. Tap Gus for the action grid; hold Gus to talk.
- **Mobile Safari:** edge strips top and bottom carry the page colour behind Safari's bars (Josh Puckett's technique), `viewport-fit=cover`, safe-area padding everywhere.
- **Desktop:** the phone column centred at 480 px with the map full-bleed behind it on Home, plus a quiet side note: "Wanted for iPhone is in development, open source on GitHub" with the Apple logo.

## Screens

1. **Splash** (≤1.4 s, skippable): objects drift in on paper and settle, the wordmark rolls in, then hand off to Welcome or Home.
2. **Welcome:** halftone US map on paper, "Find the cities that want you", slide the van. The card rises for: act or fan, your link, who you sound like, room size, meet Gus. The run: the card drops, the map ignites city by city, Gus's lines stream in the island.
3. **Map (Home):** map full screen, drawer with three detents. Peek: Gus's next move in one sentence and one button. Half: the five cities as a pager of poster cards. Full: every city ranked.
4. **City sheet:** the city's name huge, the one-line reason, neighbourhoods as a ranked list, rooms, who the fans are, a Without Qloo switch.
5. **Tour:** route map with numbered stops, one sentence, the stats row, stops as a list you can lock, Replan shows a diff.
6. **Posters:** very-good-ref: route with a pin gliding to the current city, a peeking title pager, the stamped poster below that tilts and lifts.
7. **Fan Mail:** "A hot week." One big reel number, a live sign-up trace, the booking desk card, the newest signatures.
8. **Logbook:** a tour diary. Days as headers, one line per thing Gus did, a dot that says who decided (you, Gus, a fan, a venue).
9. **Gus:** action tiles, the morphing job tray, hold-to-talk voice card, exact approval cards.
10. **Fan poster page** (`/w/[artist]/[city]`): the poster full width, the count reeling up, sign with initials and neighbourhood, a printed receipt.
11. **Settings:** acts, Gus's limits as sliders, quiet hours, theme, the iOS note.
