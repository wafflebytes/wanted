# Devpost submission text

Copy each section into the matching Devpost field.

## Name

Wanted

## Tagline (under 200 characters)

Gus, an AI tour manager on Qloo's taste graph, finds the cities that want your band. Fans sign the poster there, then he books the room.

## Elevator pitch (spoken, about 30 seconds)

Indie musicians have fans in two hundred cities and no idea which ten would fill a room on a Tuesday. Wanted gives them Gus, a tour manager who runs on Qloo's taste graph. He finds the cities and the exact neighborhoods where your sound already has a crowd, and puts a WANTED poster up there. Fans sign it. When a city hits fifty names, Gus writes to the rooms that fit, haggles inside your limits and comes back with one question: yes or no. You keep making the music while he works the road.

## About the project

### Inspiration

Most working musicians aren't famous and aren't broke either. They have 30,000 listeners spread across the country, no booking agent, and a calendar four to six months out. Picking cities means guessing from a streaming dashboard and sending cold emails to rooms that may be dark that night. In Ditto's survey of 1,500 independent artists, 82% said they couldn't afford to tour. The venues are hurting too: NIVA found 64% of independent US stages lost money in 2024. When an act guesses wrong about a city, both of them lose the night.

We kept coming back to one idea. The fans are already out there, and nobody has asked them. So the product began as a poster: WANTED, in a city where the taste data says you have a crowd, for fans to sign.

### What it does

Paste a Spotify, Apple Music or Bandcamp link and Gus hears your sound. Using Qloo, he scores every US city for it and finds the neighborhoods where that crowd lives. He lists the rooms that fit and who the fans are, down to the podcasts they listen to. He flags "sleepers", cities with far more fans than their size suggests.

In the cities you pick, he puts up a WANTED poster. Fans sign it with their neighborhood. At fifty signatures he writes to the rooms Qloo ranks for you and skips the ones closed that night. He trades letters with each booker and never goes past your limits: the smallest share of the door, the biggest deposit, the nights you won't play. When a room agrees, you get one decision. The offer sits next to your floor. Say yes and the deposit is paid against that exact offer.

Then he helps fill the room. The signers hear first, posters go where the crowd hangs out, and an opener who shares your crowd gets an invite. After the show, he checks the room's ticket count against the door.

You can ask Gus anything along the way, by typing or out loud. He looks things up as he answers and shows each lookup as it runs. He'll even call you about an offer. He also works as an MCP connector, so you can ask him from Claude or ChatGPT where you're wanted. In Claude his answers come back as cards in the chat (an MCP App): tap a city to open it, then send him to ask the venue, without leaving the conversation.

### How we built it

- **Web app:** Next.js 16. The same TypeScript server and API routes also back an Expo iPhone app.
- **Gus:** our own tool loop on OpenRouter, with no agent framework. He has six tools (`top_cities`, `city_fit`, `rooms`, `openers`, `crowd`, `fan_proof`), each backed by Qloo or the act's own data.
- **Grounding:** a reply that names a place no lookup returned gets thrown out, and a rules planner answers from the same lookups.
- **Qloo:** `/search` and entities for the sound. Heatmap insights for cities and neighborhoods, normalized against a panel of 20 acts so big cities don't win by size. Place insights with explainability and hours for rooms and poster spots. Demographics and cross-domain podcasts, shows, films and brands for the crowd. The analysis compare endpoint for openers.
- **Ambient work:** Gus advances his calls on the server as time passes, plus a cron sweep. When you open the app, he's already mid-call, and it shows in the Dynamic Island.
- **Money:** the server enforces it as policy, so the prompt can't change it. Each offer has a hash of its exact terms. A yes approves that hash only and mints a one-time pass for that amount, payee and 48 hours. Payments run in Stripe test mode.
- **Fan privacy:** fan data never leaves Wanted. Qloo and the models only see the act's taste and counts by neighborhood.

### Challenges we ran into

- **Big cities.** Raw heatmap scores just rank big cities first. Normalizing against a panel of other acts is what made the sleepers show up.
- **Making up places.** Early on, the model would confidently name venues that don't exist. That's why the grounding check is strict. Our eval against a plain chatbot shows the problem: only 46% of its suggested rooms held up against Qloo, and some were closed for good or dark that night.
- **Eval bugs.** Writing evals found bugs we hadn't seen. "Portland Maine" resolved to Oregon. Gus didn't know a poster needs fifty signatures. He'd offer to ask a room without the button that does it.
- **Cards in Claude.** Gus's cards in Claude sat on "Looking it up" for a while. The card introduced itself with the wrong field name, so Claude never sent it the answer, and Claude kept the broken card by its address. A new address and a card that asks Gus itself if the answer never arrives fixed it.
- **Free model limits.** Running the graded eval used up a day's free model quota on every key we had. Gus now falls back to rules and says so, and the eval skips those answers instead of grading them.

### Accomplishments that we're proud of

- The first screen shows Gus already working: a call in progress, an offer waiting, a date held. You didn't start any of it.
- Every place Gus names came back from a Qloo lookup, so he can't make one up.
- The money path is boring on purpose. The model can't approve anything, and a changed offer voids the yes.
- It reads like an app for musicians. Every screen gives one number and a sentence, with no charts to decode.

### What we learned

Taste data matters most where a general model is most confident: which neighborhood and which room. An LLM will name the famous venue in a city; Qloo knows whether your crowd goes there. We also learned that an agent that asks less gets trusted more. Gus reaches out in proportion to the stakes, from a Logbook line up to the occasional phone call.

### What's next for Wanted

- TestFlight for the iPhone app.
- Hand-onboard 30 acts from Bandcamp and Instagram, and run Gus as a concierge with a human in the loop for their first run.
- Put real WANTED posters up in two cities ourselves.
- Partner with five rooms in the Northeast and Midwest to answer Gus directly.
- Then real venue replies, real deposits, and the number that matters most: whether the shows sell.

## Built with

qloo, typescript, next.js, react, expo, openrouter, libsql, turso, maplibre, deck.gl, stripe, mcp, vercel

## Try it out

- https://trywanted.vercel.app/a/maya-ortiz?tour=1
- https://github.com/wafflebytes/wanted
- Gus in Claude or ChatGPT: add `https://trywanted.vercel.app/api/mcp` as a custom connector, no sign-in

## Image gallery

Upload [docs/gallery](gallery) in order: `0-cover.jpg` as the thumbnail (Gus standing in front of the app, on Wanted orange), then cards 1 to 12. They're 3:2 and move between orange, cream and dark. Each screen appears once. Cards 2, 3, 5, 7 and 11 are real iPhone Safari screenshots of trywanted.vercel.app from the iOS Simulator; card 11 is the Claude iPhone app (`claude.png`, taken by hand). Cards 1, 4 and 6 draw the surfaces Gus talks through in code from the app's own styles and the demo's real numbers: the Dynamic Island, an offer waiting on your OK, and Tap to talk. Cards 8 to 10 explain how Gus works, why taste data matters and the loop that pays the band, and card 12 has a QR code for the live demo. `node scripts/gallery-refresh.mjs` retakes the screenshots and rebuilds every card; `ONLY=4 node scripts/gallery-cards.mjs .data/gallery docs/gallery` rebuilds one card.
