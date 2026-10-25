Here's a prompt for ChatGPT's image generator. I based Gus's description on his actual art (`assets/images/gus-cut-wave.webp`) and the heat-map look from option H. **Attach two images when you send it:** `gus-cut-wave.webp` as the character reference, and `design/icon-concepts/H-dot-matrix.png` as the map reference.

```
Design a premium iOS app icon, square 1024x1024, full-bleed (no rounded corners, no border, no drop shadow, no mockup, no device frame, no text, no letters, no watermark). Apple will round the corners itself.

REFERENCES: Image 1 is the character "Gus". Image 2 is the map style. Keep Gus's face and look consistent with Image 1.

THE CONCEPT
A glowing dot-matrix heat map of the lower 48 United States, with Gus, a weathered, charismatic tour manager, rising up from the bottom edge in front of it like he is "peeking over" the map. The map is the hero and must be recognizable from across a room. Gus is the personality.

THE MAP (hero, ~70% of the visual weight)
- The contiguous USA drawn as a dense halftone grid of round dots (hex-offset rows, tightly packed so the dots merge into one clearly readable country silhouette, not a scattered cloud).
- The map is large and cropped: it bleeds off the left and right edges of the icon, with the west coast and Maine cut off. Florida, the Texas bulge and the Great Lakes notch must stay visible, because those make it recognizable.
- Heat coloring by how many people live nearby: cold dots in the west and plains are deep burnt red/brown (#6E3A2A to #B44A2A), warming to saturated orange (#FF9F1C), then bright amber-yellow (#FFD26A), and the hottest city cores (New York corridor, Chicago, LA, Texas triangle, Atlanta, Florida) are glowing near-white cream (#FFF1D0). Dot size also grows with heat (cold dots small, hot dots big).
- The hot clusters emit soft warm bloom/glow like lit LEDs or embers. Subtle, not blurry mush. Dots stay crisp.
- Light comes from the map itself. It looks like a city-lights-at-night satellite view turned into a halftone.

GUS (character, ~30% of the visual weight)
- Gus emerges from the bottom center of the icon, cropped at the chest, large enough to read at small sizes (his head is roughly 35% of the icon height).
- Same character as Image 1: weathered tanned skin, warm sly half-smile, laugh lines, salt-and-pepper stubble beard, long messy grey hair swept back in a small ponytail, aviator sunglasses pushed up on top of his head with amber lenses, black over-ear headphones hanging around his neck, khaki utility vest over a black tee, a red lanyard, pens in his chest pockets, and a brown clipboard in one hand, raised like a tip of the hat or a wave.
- Rendering style: bold inked comic-illustration look (confident black outline, flat-to-soft cel shading, warm orange skin tones) matching Image 1. Not photoreal, not 3D, not glossy.
- Gus is rim-lit in warm orange from behind by the glowing map, so he separates cleanly from it. Keep his shadow side deep and dark so the face pops.
- Place him so he does NOT cover the hottest map areas on the east coast or Texas. Shift him slightly left-of-center or low so the map's silhouette still reads clearly around him.

COMPOSITION
- Background: near-black with a faint warm vignette (#0A0608 to #1A0C08), so the glowing map pops.
- The map sits in the upper two-thirds, centered slightly high. Gus rises from the bottom in the lower third, overlapping the southern part of the map.
- Strong silhouette and high contrast. It must still read as "glowing map + friendly guy" when shrunk to 60x60 pixels.
- Keep a safe margin: nothing important within the outer 8% of the canvas, except the intentional map bleed on the left and right.

MOOD
Confident, warm, a little cheeky. "Every city that wants you, lit up." Premium music-industry app feel, like a tour-routing tool made by someone who loves live music. Think Flighty / Apple Maps polish crossed with a vintage tour poster.

AVOID
No map pins, no location markers, no text or lettering, no flags, no stars, no guitars or cliché music notes, no neon purple, no cartoon-mascot-for-kids look, no gradients with banding, no extra characters, no frame or border, no realistic photo texture.

OUTPUT
One finished square image, 1024x1024, flat artwork only.
```

**Tips for the diffusion round:**
- Generate 4 or more variations and pick the one where the USA silhouette reads best. The model often shrinks the map to make room for Gus, which is the failure to watch for.
- If it adds text or a rounded frame, reply "no text, no border, full-bleed square only".
- If Gus is too big or hides the map, reply "make Gus 30% smaller and lower; make the map bigger".
- If it ignores the heat colors, reply "keep dots crisp, no blur; heat goes dark red → orange → yellow → white".
- Bring the best result back here. I'll check it at 60px, add the foreground and background layers iOS wants, and swap it in as the real icon.