# Devpost submission text

Copy each section into the matching Devpost field.

## The voice (for anything a judge or musician reads)

- Talk to a musician booking their first real tour. Say venue, your cut of ticket sales, book the date. Never cap, door split, hold or routing.
- One number and a sentence beats a chart. Lead with the stakes, then the proof.
- Gus is calm, a little gruff, and on your side. He never hypes.
- Be exact about what's real and what's simulated. No claims about bookings or ticket sales we haven't seen.
- No em dashes and no hype words. Read it out loud before it ships.

## Name

Wanted

## Tagline (under 200 characters)

Gus, an AI tour manager on Qloo's taste graph, finds the cities that want your band. Fans sign a WANTED poster there, then he books the venue.

## Elevator pitch (spoken, about 30 seconds)

Indie musicians have fans in two hundred cities and no idea which ten would fill a venue on a Tuesday. So most of them never tour. Wanted gives them Gus, a tour manager who runs on Qloo's taste graph. He finds the cities and the neighborhoods where your sound already has a crowd, and puts a WANTED poster up there. Fans sign it. At fifty names, Gus asks the venues that fit, negotiates inside your limits and comes back with one question: yes or no. You keep making music. He works the road.

## About the project

### Inspiration

Most working musicians aren't famous, and they aren't broke either. They have 30,000 listeners spread across the country, no booking agent, and a calendar that fills four to six months out. Picking cities means guessing from a streaming dashboard and sending cold emails to venues that may be closed that night. One small venue in western New York counted 50 to 60 of those emails in a single week. In Ditto's survey of 1,500 independent artists, 82% said they couldn't afford to tour, and three in four never had.

Venues are struggling too. NIVA found 64% of independent US stages lost money in 2024. When an act guesses wrong about a city, both of them lose the night.

We kept coming back to one idea. The fans are already out there, and nobody asks them. So Wanted began as a poster: WANTED, in a city where the taste data says you have a crowd, for those fans to sign. Everything else grew out of making that poster mean something.

### What it does

Paste a Spotify, Apple Music or Bandcamp link and Gus hears your sound. Using Qloo, he scores every US city for it, weighed against twenty other acts so a city doesn't win just by being big. He finds the neighborhoods where your crowd lives, the venues that fit and the nights they're open, and who your fans are, down to the podcasts they listen to. He flags sleepers: cities with far more fans than their size suggests.

In the cities you pick, he puts up a WANTED poster. Fans sign it with their neighborhood. At fifty signatures he writes to the venues Qloo ranks for you and negotiates with each booker, never past your limits. When one agrees, you get one decision: the offer next to your limits, and a slider. Say yes and the deposit locks in that exact offer.

Then he helps fill the venue. The fans who signed hear first and get first dibs on tickets, two days before everyone else. Gus makes the posts for each moment: the whole tour as one story, the day a city gets booked, and a thank-you the morning after. An opener who shares your crowd gets an invite. After the show, he checks the ticket count so you get your full cut.

Gus works when the app is closed. When you open it, he's already mid-call, with an offer waiting and a show booked. He remembers how you tour, so you only tell him once that you don't play Mondays. You can ask him anything by typing or out loud, and he shows each lookup as it runs. He'll even call you, in his own voice, when an offer is about to run out. And he works from Claude or ChatGPT as a connector, with his answers as cards you can tap.

### How we built it

Harrison Chase splits an agent into a model, a harness and context. We built Gus around that split, and each part has one job.

**Context: what no model knows on its own.**
- **Qloo's taste graph** is behind every decision. Search and entities find the sound. Heatmaps score every US city and its neighborhoods against a 20-act panel, so big cities don't win by size. Place insights with explainability and hours pick the venues and the poster spots. Demographics plus podcasts, TV, films, brands and tags describe the crowd. Artist insights and the compare endpoint find openers.
- **What you've told him.** A `remember` lookup writes down lasting facts in your words ("won't play Mondays"). He reads them before every answer as your words, not as instructions, and you can strike any of them.
- **A short brief per answer**, with the last few turns, so "there" means the right city.

**The harness: ours, with no agent framework, on purpose.** For Gus the harness is the product. We looked at the frameworks, and none of them did the jobs that matter here, so we wrote one loop we can read end to end.
- **Grounding.** Every city, venue and number in a reply has to come from a lookup, his notes or you. If not, the reply is thrown out and a rules planner answers from the same lookups.
- **Actions a lookup backs.** He can only offer to ask a venue a lookup actually returned.
- **A budget.** Up to four rounds, four lookups at once, 25 seconds, with each lookup streaming to the app as it runs.
- **Money on the server.** Each offer carries a fingerprint of its exact terms. Your yes approves that fingerprint only and mints a one-time pass for that amount, that venue and 48 hours. Payments run in Stripe test mode.
- **Always on.** Calls move forward on the server as time passes, with a scheduled sweep for the rest. How loudly he reaches you (a Logbook line, a note, a question, a card, a call) is decided in code, with quiet hours and one call a week at most.
- **Fan privacy.** A gate checks every prompt for a fan's details before it's sent. Qloo and the models only see counts by neighborhood.

**The model: the part we trust least.** Free OpenRouter models, tried in order, with a cache and a rules fallback that says when it's answering. Because facts come from context and safety comes from the harness, the model is the easiest part to swap. His phone voice is a Fish Audio voice.

**Traces and evals.** Every Qloo call is kept, and each answer carries the lookups behind it. Our evals say what good looks like: the right lookup, a fitting next step, plain words, and no deposit without your yes on the exact terms. The stand-in venues and test money mean every eval runs the real loop end to end.

**Around it:** a Next.js 16 web app and an Expo iPhone app on the same TypeScript server, libSQL on Turso, MapLibre and deck.gl for the map, story posters drawn with satori and resvg, and an MCP server so Gus works inside Claude and ChatGPT.

### Challenges we ran into

- **Big cities.** Raw heatmap scores just rank the biggest cities first. Comparing each city against a panel of other acts is what made the sleepers show up.
- **Made-up venues.** Early on, the model confidently named venues that don't exist. That's why the grounding check is strict. Our eval shows the problem: only 46% of a plain chatbot's venues held up against Qloo, and some had closed for good.
- **Evals found real bugs.** "Portland Maine" resolved to Oregon. Gus didn't know a poster needs fifty signatures. He'd offer to ask a venue with no button to do it.
- **Cards in Claude.** Gus's cards in Claude sat on "Looking it up" for a while. The card introduced itself with the wrong field name, so Claude never sent it the answer. A new address, and a card that asks Gus directly if the answer never arrives, fixed it.
- **Free model limits.** Running the graded eval used up a day's free quota on every key we had. Gus now falls back to rules and says so, and the eval skips those answers instead of grading them.

### Accomplishments that we're proud of

- The first screen shows Gus already working: a call in progress, an offer waiting, a show booked. You didn't start any of it.
- Every place Gus names came back from a Qloo lookup, so he can't make one up.
- The money path is boring on purpose. The model can't approve anything, and a changed offer voids the yes.
- It reads like an app for musicians. Every screen gives one number and a sentence.

### What we learned

Taste data matters most where a general model is most confident: which neighborhood, and which venue. An LLM will name the famous venue in a city. Qloo knows whether your crowd goes there. We also learned where an agent's quality lives: every fix our evals asked for landed in the harness or the context, never in the model. We also learned that an agent that asks less gets trusted more, which is why Gus saves the phone call for when something is about to run out.

### What's next for Wanted

- **TestFlight** for the iPhone app.
- **Thirty acts, onboarded by hand.** Folk, indie rock and singer-songwriters with 5k to 80k listeners in the Northeast and Midwest, found on Bandcamp and Instagram. Gus runs as a concierge for their first tour, with a person checking his work.
- **Real paper posters** in two cities, put up ourselves.
- **Five partner venues** that answer Gus directly.
- Then real replies, real deposits, and the number that matters most: whether the shows sell.

## Built with

qloo, typescript, next.js, react, expo, openrouter, fish-audio, libsql, turso, maplibre, deck.gl, satori, stripe, mcp, vercel

## Try it out

- https://trywanted.vercel.app/a/maya-ortiz?tour=1
- https://github.com/wafflebytes/wanted
- Gus in Claude or ChatGPT: add `https://trywanted.vercel.app/api/mcp` as a custom connector, no sign-in

## About me

Most of what I listen to comes from artists with a few thousand monthly listeners, the ones you find three clicks deep on Bandcamp. I'm building this from India, for musicians in the US, so I started by listening to them too. Over a few weeks I talked to independent artists on calls and in DMs, and read every firsthand account of DIY touring I could find. One story stuck with me. A four-piece sold out a 200-person venue in one city and played to eleven people two hours down the road, on the same tour. Same band, same songs. The only difference was where their fans happened to live, and nobody had a way to know that before booking the night. Wanted is the tool they should have had: ask the fans first, then book the venue.

Chaitanya Jha. Product and design, AI-native (IIT Patna '27, previously IBY Tokyo). I designed and built Wanted end to end: the research, the product, Gus's character and voice, the web and iPhone apps, and the agent underneath.

## Image gallery

Upload [docs/gallery](gallery) in order: `0-cover.jpg` as the thumbnail (Gus standing in front of the app, on Wanted orange), then cards 1 to 12. They're 3:2 and move between orange, cream and dark. Each screen appears once. Cards 3, 5 and 7 are real iPhone Safari screenshots of trywanted.vercel.app from the iOS Simulator, and card 11 is the Claude iPhone app (`claude.png`, taken by hand). Card 2 draws the US from the live map's 3,000 Qloo heatmap cells, with the top sleeper cities marked. Cards 1, 4 and 6 draw the surfaces Gus talks through in code from the app's own styles and the demo's real numbers: the Dynamic Island, an offer waiting on your OK, and Tap to talk. Cards 8 to 10 explain how Gus works, why taste data matters and the loop that pays the band, and card 12 has a QR code for the live demo.

The same script draws four more cards for the README in [docs/readme](readme): grounding, memory, money and how Gus reaches you. They can go at the end of the gallery too.

`node scripts/gallery-refresh.mjs` retakes the screenshots and rebuilds every card; `ONLY=4 node scripts/gallery-cards.mjs .data/gallery docs/gallery` rebuilds one card, and `ONLY=r-` rebuilds the README cards.
