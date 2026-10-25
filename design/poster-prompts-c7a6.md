You're right, it's just the posters. Everything else (Gus in every pose, the icon, the van, stamps, the deputy star, the cover) is already in `assets/images`. The poster slots in `src/ui/posterArt.ts` are all empty, so every city currently uses the same plain paper.

**What to make: 15 images, all 1024×1536 PNG**

1. **6 city posters**, one for each of Maya's demo cities. Save them as `columbus-oh.png`, `burlington-vt.png`, `santa-cruz-ca.png`, `portland-me.png`, `ithaca-ny.png` and `poughkeepsie-ny.png`.
2. **6 region posters**, the fallback for every other city. Save them as `region-northeast.png`, `region-midwest.png`, `region-south.png`, `region-mountain.png`, `region-northwest.png` and `region-california.png`.
3. **3 wear overlays**, laid on top at 50, 100 and 250 signatures. Save them as `wear-1.png`, `wear-2.png` and `wear-3.png`, with transparent backgrounds.

Put them all in `assets/images/posters/`. I'll convert them to WebP and hook them up. Do Columbus first and send it to me before doing the rest. If the boxes drift even a little, the photo and the name land on the artwork, so I'd rather catch that on one poster than on 15.

**In every chat, attach two files:** `assets/images/poster-0.webp` (the current poster) and `design/poster-kit/layout-guide.png` (the boxes that must stay blank).

### Base prompt for the 12 posters

Paste this, then add that poster's motif line at the end:

```
Redraw the attached WANTED poster as a new version with the exact same layout. The attached layout guide shows the zones.

Keep identical: canvas 1024x1536, the torn aged-paper silhouette, the nails in the corners, the big "WANTED" header at the top, the "REWARD" word near the bottom, and the position and size of the central portrait frame, the two ruled lines under it, and the line under REWARD.

Keep completely blank, as plain aged paper with no drawings, texture changes or words: the inside of the portrait frame, the two bands under the frame (artist name and city line), the band under REWARD, the band along the bottom edge, and the narrow side strips next to the frame.

Add local character only in the border, the corner ornaments and the outer margins: small engraved, woodcut-style motifs worked into the frame flourishes, like a 1880s print shop made this poster for one town. Same dark sepia ink as the original, plus at most one faded accent ink. No other text anywhere, no logos, no people, no modern objects. Transparent background outside the paper.

Local motifs for this poster:
```

### Motif lines

| File | Paste after "Local motifs for this poster:" |
|---|---|
| `columbus-oh` | buckeye leaves and buckeye nuts, the Scioto River as engraved waves, German Village brick and lamp posts. Accent ink: faded scarlet. |
| `burlington-vt` | maple leaves, the Green Mountains in silhouette, Lake Champlain waves, a small covered bridge. Accent ink: faded forest green. |
| `santa-cruz-ca` | redwood boughs, rolling surf, an old wooden roller coaster in silhouette, sea lions on rocks. Accent ink: faded ocean teal. |
| `portland-me` | a lighthouse, lobsters, pine boughs, coiled rope and nautical knots. Accent ink: faded navy. |
| `ithaca-ny` | gorge waterfalls, layered shale cliffs, apple branches, a stone footbridge. Accent ink: faded slate blue. |
| `poughkeepsie-ny` | a long steel-arch bridge over a river, Hudson River sloops with sails, river reeds. Accent ink: faded river blue. |
| `region-northeast` | pine sprigs, autumn oak leaves, brick rowhouse cornices, a lighthouse. Accent ink: faded brick red. |
| `region-midwest` | wheat sheaves, corn stalks, a red barn, prairie grass, Great Lakes waves. Accent ink: faded harvest gold. |
| `region-south` | magnolia blossoms, live oak with Spanish moss, a brass horn, a riverboat. Accent ink: faded magnolia green. |
| `region-mountain` | jagged peaks, sagebrush and saguaro, horseshoes, a night sky of small stars. Accent ink: faded turquoise. |
| `region-northwest` | Douglas fir boughs, ferns, falling rain lines, leaping salmon. Accent ink: faded moss green. |
| `region-california` | fan palms, California poppies, sun rays, rolling waves. Accent ink: faded poppy orange. |

### Wear overlays

This one is a different prompt. Attach only `poster-0.webp`:

```
Make a transparent PNG overlay, 1024x1536, that lines up with the attached poster's paper outline. Draw ONLY damage, nothing else: no paper, no ink, no text, no frame. Everything that isn't damage must be fully transparent.

Damage level: [LEVEL]

The damage should look photographic and sit naturally on top of any aged-paper poster: semi-transparent brown stains, darker torn edges, small holes with burnt or curled rims. Keep the center of the poster (the portrait area and the text bands below it) mostly clear so the name stays readable.
```

Replace `[LEVEL]` with one of these:

- **wear-1:** "light. A few coffee rings and water stains near the edges, one small tear at a corner."
- **wear-2:** "medium. More stains, two or three edge tears, a creased fold across the paper, a couple of extra nail holes."
- **wear-3:** "heavy, a poster that's been up all summer. Big torn chunks at the edges, sun-faded patches, scorch marks, a few bullet holes in the margins, deep creases."

**ChatGPT settings:** use GPT Image at high quality, PNG, portrait 1024×1536. Ask for a transparent background every time. If it gives you a background anyway, send it to me and I'll cut it out.