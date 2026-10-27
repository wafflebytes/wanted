# Wanted asset prompt sheet

New art direction: **soft-lit 3D objects in the Airbnb 2025 manner**, plus a much simpler, more expressive Gus. No sticker outlines, no grunge, no halftone-on-characters. Each asset should read at 28 px and still reward a look at 280 px.

Generate everything at 2048 × 2048 on a pure white background (or transparent if your tool supports it), then export a 1024 PNG and a 512 WebP. File names are given per asset; drop them in `web/public/art/`.

## 1. The style lock

Paste this after every prompt. Don't edit it between assets, or the set stops matching.

```
Style: Airbnb 2025 icon style. Soft-lit 3D object render, matte clay and painted-plastic
materials with a hint of real texture (paper grain, brushed metal, rubber). One soft key
light from the top left, a gentle fill, a soft contact shadow directly underneath.
Three-quarter view from slightly above. Simplified, chunky forms with a crisp silhouette,
rounded edges, no tiny details. Warm neutral palette (cream, warm grey, kraft brown, ink
black) with ONE accent of marquee orange #FF5A1F. No text, no letters, no logos, no
outlines, no stickers, no noise or grunge. Single object, centred, filling about 75% of the
frame, isolated on a pure white background.
```

Negative prompt (for tools that take one): `text, letters, watermark, outline, sticker border, cartoon line art, grunge, halftone, photo background, multiple objects, cropped, harsh shadows, neon, glossy chrome everywhere`.

## 2. Gus

Gus is the agent. He needs to work as a 28 px status glyph in the island and as a 200 px presence on a card. Pick one direction, then generate the expression sheet in that direction only.

**A. Gus the road case (recommended).** An object-character: the agent *is* tour gear, so it never pretends to be a human.

```
A small, chunky black flight case standing upright like a little character: rounded
chrome corner caps, two latches, a short leather handle on top like a tuft of hair. Two
simple friendly eyes (white ovals with ink pupils) on the front panel, no mouth, small
orange #FF5A1F luggage tag hanging from the handle. Stubby rubber feet. Cute, calm,
competent.
```

**B. Gus the tour manager.** A person, but as a simple vinyl figurine.

```
A small rounded vinyl toy figurine of a friendly tour manager: pear-shaped body in a
warm-grey work jacket, a flat cap, a thick moustache, simple dot eyes, a lanyard with an
orange #FF5A1F backstage pass on his chest, a walkie-talkie in one hand. Stubby legs,
mitten hands. Calm, competent, a little dry.
```

**C. Gus the van.** The tour van with headlight eyes. Fun, but it competes with the van in onboarding, so use only if you drop the van there.

```
A small, chubby cream-and-orange 1970s tour van seen from the front three-quarter,
round headlights as friendly eyes, a gentle grille smile, a roof rack with one guitar case
strapped on. Toy-like proportions.
```

**Expression sheet** (same seed, change only the line in brackets; files `gus-<state>.png`):

| State | File | Line to add |
|---|---|---|
| Idle | `gus-idle.png` | `[standing, eyes open, relaxed]` |
| Listening | `gus-listening.png` | `[leaning slightly forward, eyes wide, one side tilted as if listening]` |
| Thinking | `gus-thinking.png` | `[eyes looking up and to the side, a tiny pencil tucked behind the handle/ear]` |
| Working | `gus-working.png` | `[holding a clipboard, eyes down on it, focused]` |
| On the phone | `gus-phone.png` | `[holding an old orange telephone handset to his side]` |
| Waiting | `gus-waiting.png` | `[sitting down, eyes half closed, patient]` |
| Proud | `gus-proud.png` | `[standing tall, eyes happy crescents, a small gold star medal]` |
| Paused | `gus-paused.png` | `[eyes closed, asleep, a tiny pillow]` |
| Oops | `gus-oops.png` | `[eyes squinting, one corner dented, a small sweat drop]` |

Also generate `gus-glyph.png`: the face only, flat front view, filling 90% of the frame, for the 28 px island glyph.

## 3. Page objects (one per tab, beside the large title)

| Tab | File | Prompt |
|---|---|---|
| Map | `obj-map.png` | `A folded paper road map, partly open, one big round orange push-pin standing in it.` |
| Tour | `obj-van.png` | `A chubby cream and orange 1970s tour van, side three-quarter view, roof rack with a guitar case and a suitcase strapped on.` |
| Posters | `obj-poster.png` | `A rolled-up kraft-paper poster with a strip of masking tape and a small staple gun beside it.` |
| Fan Mail | `obj-mail.png` | `A cream envelope standing on its edge, sealed with an orange wax seal pressed with a heart.` |
| Logbook | `obj-logbook.png` | `A small black leather notebook with an orange elastic band and a stubby pencil.` |
| Settings | `obj-pass.png` | `A laminated backstage pass on an orange lanyard, the card blank, with a metal clip.` |

## 4. Gus's action tiles (the Gus button grid)

Same style lock. Files `act-<name>.png`.

| Action | File | Object |
|---|---|---|
| Find a room | `act-room.png` | `A small venue doorway with a marquee awning and a row of round bulbs, door ajar, warm light inside.` |
| Plan a run | `act-route.png` | `A wooden signpost with three arrow boards pointing different ways.` |
| Who should open | `act-mics.png` | `Two vintage microphones on short stands, leaning toward each other.` |
| Answer a booker | `act-reply.png` | `An envelope with a curved arrow made of folded paper coming out of it.` |
| Put up posters | `act-staple.png` | `A chunky staple gun and a stack of three small posters.` |
| Call me about it | `act-phone.png` | `A retro orange rotary telephone.` |
| Fill the room | `act-megaphone.png` | `A cream megaphone with an orange band.` |
| Pay a deposit | `act-deposit.png` | `A cream envelope with a gold wax seal and the corner of a cheque peeking out.` |

## 5. Map pins

Square, the pin centred with room for its shadow. Files `pin-*.png`.

- `pin-city.png`: `A chunky map pin with a round orange head and a short cream stem, standing.`
- `pin-sleeper.png`: same, `with a small gold star on the head`.
- `pin-booked.png`: same, `the head green #1F9D63 with a white check embossed`.
- `pin-room.png`: `A tiny marquee sign on a short post.`

## 6. Empty states (isometric, like Airbnb's "No matches")

Files `empty-*.png`.

- `empty-shows.png`: `An empty little stage with one microphone stand and a single spotlight.`
- `empty-mail.png`: `A small cream mailbox with the flag down.`
- `empty-logbook.png`: `A closed black notebook with a pencil lying across it.`
- `empty-offline.png`: `An amplifier with its cable unplugged, the plug lying beside it.`
- `empty-search.png`: `A pair of binoculars resting on a folded map.`

## 7. Moments

- `seal-approved.png`: `A round gold wax seal, embossed with a five-point star, thick and slightly irregular.` (The approval stamp; the UI animates it rising, like Airbnb's "vetted" seal.)
- `receipt-paper.png`: `A short curled strip of thermal receipt paper, blank, with a torn top edge.`
- Milestone badges (round, like GitHub achievements; each `badge-<name>.png`, generate on a solid colour circle, 1:1):
  - `badge-first-poster.png`, cream circle: `a tiny poster on a wooden post`.
  - `badge-fifty.png`, orange circle: `a stack of fifty tiny paper signatures fanned out`.
  - `badge-booked.png`, green circle: `a door with a star on it`.
  - `badge-sold-out.png`, ink circle: `a ticket stub with a punched hole`.
  - `badge-back-again.png`, sky-blue circle: `a boomerang`.

## 8. Splash set

Six objects that drift in on the splash and onboarding. Reuse: `obj-van.png`, `obj-poster.png`, `obj-mail.png`, `seal-approved.png`, plus:

- `obj-ticket.png`: `A paper ticket stub, cream with an orange stripe, perforated edge.`
- `obj-pick.png`: `A big orange guitar pick, slightly tilted.`
- `obj-cassette.png`: `A cream cassette tape with an orange label (blank).`

## 9. App icon and banner

- **App icon** (`icon-1024.png`, no transparency, full bleed):
  ```
  App icon, iOS squircle-safe composition. A single chunky orange #FF5A1F map pin
  standing on a cream paper ground, soft key light from the top left, soft contact
  shadow. Nothing else.
  ```
- **Banner / OG** (`banner-1600x900.png`): generate the scene, add the words in the browser, not in the image.
  ```
  A flat-lay on cream paper seen from directly above: a folded US road map, an orange
  push-pin, a rolled poster with masking tape, a laminated backstage pass on an orange
  lanyard, a ticket stub and a small black notebook, arranged with generous empty space on
  the left third for a headline. Soft daylight, soft shadows, Airbnb 2025 3D render style.
  ```

## 10. Checklist before you drop files in

- Same style lock on every prompt, same model, and ideally the same seed family.
- Look at each asset at 28 px. If the silhouette doesn't read, simplify, don't add detail.
- Exactly one orange accent per object.
- White background removed cleanly (no halo) for anything used on the cream ground.
