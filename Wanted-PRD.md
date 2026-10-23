# Wanted: PRD

> **Find out where you're wanted.**
> Wanted is a two-sided touring app. For independent musicians and comedians, an agent called Gus reads Qloo's taste graph to find the neighborhoods where their crowd actually lives, the rooms those people already go to, and a route that doesn't bankrupt them. Every opened city gets an Old West **WANTED poster** for the artist ("WANTED IN COLUMBUS: MAYA ORTIZ. Reward: one sold-out show."). Fans sign it, turning Qloo's prediction into proof a booker can't ignore. Gus watches the signatures and pitches the venue the moment demand is real. "Let's ride."

Entry for the **Qloo Agentic Hackathon: "Agents, but with taste"** (qloo.devpost.com). Submissions close **Friday 30 October 2026, 11:45 PM ET (Saturday 31 October, 9:15 AM IST)**. Built with Expo as one universal app: a hosted web app (the judged demo), an Android APK, and an iPhone build with native Liquid Glass for the video.

---

## 0. How to read this document

- **Sections 1 to 5:** story, evidence, strategy, and why it's investable.
- **Sections 6 to 11:** what Claude Code builds.
- **Sections 12 to 15:** submission, scope, plan, risks.
- **Section 16:** The Gauntlet, the eval system. Every change is measured against it; nothing ships if a gate fails.
- **MUST** = non-negotiable. Everything else is a default the builder can improve.
- Never invent Qloo numbers or fan counts for the demo. Seeded demo claims are labeled "demo data".
- Public text (Devpost description, README, Discord posts) is drafted, then passed through the `humanizer` skill before posting.
- **Claude Code setup before building:**
  - `npx skills add Jakubantalik/Libraries.dev` (effects, used now).
  - `npx skills add alexszczurek/before-skills` (App Store listing and screenshots skill; not needed for the hackathon, useful for the later iOS launch).
  - Read Glassy UI's `llms.txt` (https://glassyui.com/llms.txt).

---

## 1. One-page summary

### The problem
Touring builds careers for independent artists and comedians, and it has become a money-losing gamble:
- **Ditto Music (Jan 2025):** 84% of UK independent artists say they can't afford to tour, and 62.2% have turned down tours for money reasons.
- **Chartmetric (2022 to 2024):** the share of mid-level touring artists fell from 19% to 12%, and artists are skipping cities.

The decisions that make or lose money (which cities, which neighborhoods, which room, which night, which opener) are made on guesswork:
- Streaming dashboards show where people *listened*, not where people who'd buy a Tuesday ticket live and go out.
- Fan-demand tools never fixed this:
  - **Bandsintown's "Request a Show"** is non-binding, so fans get nothing for asking.
  - **Songkick Detour** needed a promoter for every show and faded.
  - Both had the same cold start: an empty map until enough fans showed up.

### The insight
Qloo already knows where an artist's taste lives, down to the neighborhood. That turns the cold start around: **the map is full on day one** (Qloo's prediction), and **fans fill in the proof** (claims). Prediction plus proof is what a booker needs to say yes.

### The product loop
1. **Scout (artist):** "I sound like Phoebe Bridgers and Japanese Breakfast." Gus lights up a 3D **Crowd Map** of the country, then each city by neighborhood. He picks rooms, plans a drivable route, and roasts bad routing.
2. **Post the poster (artist to fans):** One tap creates a **WANTED poster** for each city the artist opens: *"WANTED IN COLUMBUS: MAYA ORTIZ. Reward: one sold-out show."* The link opens a no-install signing page, the way a Partiful invite works.
3. **Sign (fan):** A fan taps **Sign the poster** and picks their neighborhood. Their signature lands on the poster and a dot lights up on the artist's map, labeled as a signature rather than a prediction. The first 50 signers in a city are **Deputies**. Every signer gets first access when a show is announced and a **Signature Card** ("SIGNATURE #37 · CLINTONVILLE · DEPUTY") to share.
4. **Watch and pitch (agent):** Gus watches each city's share of signatures against the share Qloo's heat predicted. When a city crosses the threshold, he messages the artist: *"Columbus brought 41% of your signatures. Qloo expected 18%. Want me to pitch Rumba Café?"* The booking email cites both: *"Qloo predicts very high affinity here; 120 local fans already claimed this show."*
5. **Show, then the poster comes true:** after the show, the city's poster gets a **"CAUGHT LIVE"** stamp across it, and every fan's Signature Card flips to "CAUGHT LIVE · You were one of 120 people who brought Maya to Columbus". The artist gets a **Rap Sheet** of the whole run (every city, every signature count, every room). All of it gets shared, carries the Wanted mark, and brings in the next artist.
6. **Sunday Most Wanted:** every Sunday Gus sends the artist a ranked list of the cities where they're most wanted (new signatures, rising cities, one recommended move), shareable like a weekly music recap. This is the retention habit between tours.

### Why it wins the hackathon
- **Technological Implementation (the tie-breaker).** Nine Qloo capabilities work together: heatmaps at city and neighborhood level, location signals, venue matching, demographics, cross-domain taste, taste tags, audience compare, trends and explainability. A real tool-calling agent orchestrates them, and an event-driven step (claims crossing a threshold) triggers the agent to act.
- **Design.** A complete product: a web app with an engineered glass interface, plus native Liquid Glass on iPhone, a 3D hex-heat map, and a sticker mascot with a voice.
- **Potential Impact.** A specific audience making a specific costly decision, with sourced numbers. It fixes the exact failure (cold start, non-binding demand) that killed earlier fan-demand products.
- **Quality of the Idea.** Non-obvious. Nobody used Qloo to bootstrap a two-sided demand market. The "Without Qloo" toggle shows the empty map that every earlier product started with.

### Why it's investable
- A growth loop where every artist brings fans and every fan sees other artists.
- A natural density launch, one scene in one city at a time.
- Several paths to revenue later: artist Pro, agent seats, venue demand data, a fee on claim-to-ticket conversion, and tour sponsorship matched by Qloo brand affinity.

### Lines to remember
- *"Find out where you're wanted."*
- *"Know where your crowd lives before you book the van."*
- *"Qloo predicts it. Fans prove it. Gus books it."*
- *"Streaming tells you who listened. Wanted tells you who'll show up."*

---

## 2. The story and the 90-second wow

**Persona (a composite, labeled in the demo): Maya Ortiz.**
- Indie folk-pop, 40k monthly listeners.
- Planning her first headline run: ten dates, one van, a $9,000 budget she can't lose.
- Her streaming dashboard says LA, New York and Chicago. Everyone's does.

**The scene:**
1. **Scout.** Maya taps the purple Scout button and says: *"I sound like Phoebe Bridgers and Japanese Breakfast. Ten dates, Midwest and East Coast, small rooms."* The US map lights up hex by hex. Gus slides in: *"Your people aren't where your streams are. Everyone plays Chicago. Your sleeper city is Bloomington. And look at Columbus."*
2. **Dive.** She taps Columbus and the camera dives in. Clintonville, Italian Village and Weinland Park glow, the outer suburbs stay cold, and venue pins appear with glass cards (in our test run for this Sound: The Basement, Wexner Center, Double Happiness, Newport Music Hall, Rumba Café). Gus: *"Rumba's dark Mondays and Tuesdays. Don't route it there."*
3. **Route.** The tour sheet rises with ten dates, drive times and a Tour Score. A roast pops up: *"Cleveland on a Tuesday after Chicago on a Saturday? Bold. Swap it."* She taps **Fix** and the van redraws the route.
4. **Post the poster.** She taps **Post WANTED poster** for Columbus. Cut to a phone opening the link as a fan: a weathered WANTED poster with Maya's sticker portrait and *"Reward: one sold-out show."* The fan taps **Sign the poster**, picks Clintonville, and a signature scrawls onto the poster: "Deputy #37". On Maya's map a solid dot lands inside the predicted hex, with a haptic thump.
5. **Gus acts.** A notification arrives: *"Columbus has you on a WANTED poster. 41% of your signatures, 2.3x what Qloo expected. Pitch Rumba Café? Let's ride."* She taps yes. The booking email shows evidence chips: Qloo affinity, claim count, suggested local opener with audience overlap.
6. **Without Qloo.** Toggle it on: the same question answered by a generic LLM appears beside Wanted. Its Columbus picks get red marks (a neighborhood that isn't in the data, a room that's closed that night, Bloomington missing). Then the map goes dark. Gus: *"This is every fan-demand app on day one. Empty."* Toggle it off and the map glows again.
7. **Name any act (live pitch only).** A judge names an artist or comedian; Wanted runs it live (section 4.4).

That is the pitch in 90 seconds.

---

## 3. The problem, with evidence

### 3.1 Touring is broken for the middle
- **Ditto Music independent artist survey (Jan 2025):** 84% can't afford to tour; 62.2% turned down tours for financial reasons.
- **Chartmetric via Music Business Worldwide (May 2025):** mid-level touring artists fell from 19% to 12% (2022 to 2024).
- Verify the primary links before quoting either one on stage.

### 3.2 Generic AI makes it worse
- LLM place recommendations regress to famous hubs (Current Issues in Tourism, 2025).
- A 2025 test reported by USA Today found 90% of AI itineraries had at least one error, and nearly 1 in 4 recommended places that had closed.
- Ask any LLM to route a tour and you get LA, NYC, Chicago, Austin.

### 3.3 Fan-demand tools failed for known reasons
| Product | What worked | Why it stalled |
|---|---|---|
| **Songkick Detour** (2012 to 2013) | Fans pledged; cards charged only if the show was confirmed; 10 beta shows from about 1,000 fans, about $100K in tickets; more than 90% of requested artists agreed to play | Needed a promoter per show; low frequency; empty maps for most artists (no official post-mortem; this is inference) |
| **Bandsintown Request a Show** | Requests show up in artist Insights under "Top Cities" | Non-binding, no payoff for fans |
| **Queremos / WeDemand** | Early backers refunded if the show sells out, so they promote it; 50+ concerts in 2 years | Small scale; per-show setup |
| **DICE waiting lists** | Demand data (600 waiting at a 200-cap sellout means about 3 more shows) | Only after a show exists |
| **Laylo** | Fans RSVP for their city's drop; used by comedians like Nate Bargatze and Matt Rife | Only after the artist decides where to go |

| **MyMusicTaste** (Seoul, 2014 onward) | Fans request concerts in their city; the company plans events from that demand data | Demand still had to be collected first; centered on promoting shows itself |
| **Tootoot** | "Concerts powered by fans": one tootoot is one fan request | Same cold start: an empty map until fans arrive |

**Direct competitor today: Tour Buddy (tourbuddy.co).** "For independent artists and booking agents. Find the rooms. Route the run. Book the tour." It has 20,000+ venues with booking contacts, drive times between stops, booking emails with an inbox, separate artist, fan and venue experiences, and apps on iPhone, ChatGPT and Claude.
- **What it proves:** artists and agents want a routing-and-booking tool, and an AI-assistant surface for it.
- **What it doesn't do:** tell the artist where their crowd lives before anyone has asked, or turn that prediction into fan proof. It starts from venues; Wanted starts from the crowd.
- **How Wanted wins the comparison:** lead every demo and pitch with the Crowd Map and the WANTED poster, not with routing. Routing and pitch emails are table stakes; taste-graph prediction plus fan signatures is the moat.
- **Later:** Tour Buddy (or Bandsintown) could be a partner rather than a rival: Wanted's demand map as an input to their booking flows.

**The gap:** nobody tells the artist *where to go before anyone has asked*, then turns that prediction into fan proof. Qloo closes the gap.

### 3.4 Who has the problem
| Persona | Job to be done |
|---|---|
| **Indie artist or comedian (primary)** | "Show me where my crowd is, help me prove it, and help me book rooms that fill." |
| **Fan** | "Get my favorite act to play near me, and get in first." |
| **Manager or booking agent** | "Evidence a booker believes, and routes that make money." |
| **Venue talent buyer (later)** | "Which acts will draw in my neighborhood, with proof?" |

### 3.5 Why these judges care
- **Live Nation's EVP of Strategic Initiatives:** Live Nation is rolling out an agent (Salesforce "Venue Agent") for show-day fan personalization. Wanted fills the room before show day.
- **Cedric the Entertainer:** comedians route the same way bands do.
- **Calacanis:** a loop-driven business with clear monetization paths.
- **Qloo's CTO:** deep, skillful API use, which is also the tie-breaker criterion.

---

## 4. Why this only works with Qloo

**The brief:** "If your submission would work the same without Qloo, you're building the wrong thing."

Without Qloo, Wanted becomes what killed every earlier fan-demand app: an empty map until enough fans arrive. Qloo is the cold-start engine, and the in-app toggle (FR-30) proves it.

### 4.1 Verified Qloo contract (live-tested 23 Oct 2026 against the hackathon server)
Every call below was run with our hackathon key. Latency and size are from those runs; treat them as order-of-magnitude.

**Basics (verified)**
- Base `https://hackathon.api.qloo.com`, header `X-Api-Key`. Keys fail on staging and production (401). Plain REST works; no harness needed.
- Limits returned in headers: **10 requests/second**, **50,000 requests/month** (`X-Second-RateLimit-*`, `X-Month-RateLimit-*`). Ask #api-help if we need more.
- `/v2/insights` is GET with query params. **POST with a JSON body also works** and is needed for weighted signals: `"signal.interests.entities": [{"id": "<uuid>", "weight": 3}]` (the key is `id`, not `entity`; the wrong key returns 400).
- Unknown or wrong-type params are **silently ignored**. Wrong enum values sometimes 400 with a clear message. `take` max 50 (ignored for heatmaps).
- Do not use `/recs` or `/recommendations`. Do not commit Qloo responses to the public repo; private server-side caching is allowed with no time limit.

| Need | Call (tested) | Result | Time / size |
|---|---|---|---|
| Resolve an act | `GET /search?query=Phoebe Bridgers&types=urn:entity:artist&take=5` | Ranked matches with `popularity` | ~1.2 s |
| Resolve a comedian | `types=urn:entity:person` | John Mulaney, Taylor Tomlinson, Sam Morril, Matt Rife found; Leanne Morgan found with popularity 0 | ~1.2 s |
| Resolve from a Spotify link | `GET /entities?external.spotify.ids=<id>` | Exact artist (may return 2 duplicate entities; keep the higher popularity) | ~1.1 s |
| **Country heat** | `filter.type=urn:heatmap&filter.location.query=United States&signal.interests.entities=<ids>` | ~8,000 to 10,000 **geohash-4 cells** (about 40 x 20 km) with `affinity`, `affinity_rank`, `popularity` | **~6 s, ~3 MB** |
| **City heat (grid)** | same with `filter.location.query=Columbus, Ohio` | ~570 **geohash-7 cells** (about 150 m) | ~2 s, ~200 KB |
| **City neighborhoods (named)** | same + `output.heatmap.boundary=urn:entity:locality&filter.location.radius=0` | ~50 localities ranked (country, state, county, city, suburbs and neighborhoods mixed, with WKT boundaries) | **~13 s, ~6 MB** |
| **Rooms** | `filter.type=urn:entity:place&filter.location.query=Columbus, Ohio&filter.tags=<venue tags>&operator.filter.tags=union&signal.interests.entities=<ids>&feature.explainability=true&take=12` | Real venues, artist-specific, with address, lat/lon, neighborhood, website, phone, hours, `is_closed`, description, ambience, crowd description, rating | ~2 s |
| Who (skew) | `filter.type=urn:demographics&signal.interests.entities=<ids>` | **Per signal entity**, age and gender **affinity from -1 to 1** (a skew, not a share) | ~0.8 s |
| What else they love | `filter.type=urn:entity:movie` / `tv_show` / `brand` / `podcast` / `book` | Strong, specific lists (for Phoebe Bridgers + Japanese Breakfast: PEN15, Glossier, Song Exploder) | ~1 s each |
| Vibe words | `filter.type=urn:tag&signal.interests.entities=<ids>&filter.tag.types=urn:tag:style:qloo,urn:tag:theme:qloo,urn:tag:artist:qloo` | Clean words (Confessional, Reverb-Drenched, Melancholic, Intimacy) | ~1 s |
| Openers who share the crowd | `filter.type=urn:entity:artist&signal.interests.entities=<ids>&filter.popularity.max=0.6` | Smaller acts with overlapping taste (Sour Widows, Joanna Sternberg, Kid Sistr) | ~1 s |
| Pre-show hang | places with bar or coffee tags + `filter.location.query=<neighborhood>, <city>` | Local bars and cafes | ~1 s |
| Why two acts pair | `GET /v2/analysis/compare?a.signal.interests.entities=<a>&b.signal.interests.entities=<b>` | Shared tags with scores | ~1.3 s |
| Fallback when the act is unknown | heatmap with `signal.interests.tags=urn:tag:genre:music:indie_folk` (genre tags from `/v2/tags?filter.query=indie folk`) | Works (~11,700 cells) | ~6 s |
| Explainability | `feature.explainability=true` with 2+ signal entities | Per result: how much each reference act contributed. With one signal it is always 1, so only show it for 2+ | no extra cost |

**Verified venue tags** (from `/v2/tags`): `urn:tag:category:place:live_music_venue`, `urn:tag:genre:place:live_music_venue`, `urn:tag:category:place:live_music_bar`, `urn:tag:category:place:concert_hall`, `urn:tag:category:place:comedy_club`, `urn:tag:genre:place:comedy_club`, `urn:tag:category:place:bar`, `urn:tag:category:place:night_club`. Comedy genre: `urn:tag:genre:music:standup_comedy`.

**What we checked that doesn't work, or isn't there**
- `output.heatmap.boundary=city` or `neighborhood`: **400**. The only values are `urn:geohash` (default) and `urn:entity:locality`.
- Locality boundary for the **whole US**: 311 MB in 54 s. Never call it. Locality output is for one city at a time, precomputed or backgrounded.
- `/v2/trending` for artists returned an empty list. Not used. ("Rising cities" is cut.)
- A location signal barely changes brand or film lists, so "what else they love" is labeled as the act's crowd, not a city's.
- Venue **capacity** and **booking emails** are not in Qloo. The artist picks a room size band; pitches go to an address the artist enters (we show the venue's website and phone from Qloo).
- Qloo doesn't know where an artist is **from**. "Local" openers need the artist's input; Qloo gives "shares your crowd".
- Fuzzy search can pick the wrong act ("Tenci" matched "Ten City"). Resolution always needs a confirm step.
- Very small acts can be thin (one test act returned 267 cells, others ~5,000). Below 1,500 cells the app blends in the reference acts and says so.
- Untyped taste tags are noisy and include identity tags (sexuality, ethnicity, "women-owned"). Only the allowlisted tag types above are ever shown.
- Demographics are **skews per entity**, not audience shares. Never write "40% are 25 to 29". Write "skews 25 to 34".
- "Short North" (Columbus) is not one of Qloo's localities; Clintonville, Italian Village, Weinland Park, Downtown and Franklinton are.
- Neighborhood scores step evenly (0.98, 0.96, ...), so they're ranks. Show order, not percentages.

### 4.1b The Wanted Score: raw heat plus lift (the core insight)
**Finding:** heat follows population. Across four test artists, affinity and popularity correlate at 0.78 to 0.96, so raw heat says "play NYC and LA" to almost everyone. The signal is still real: Morgan Wallen peaks in Knoxville and Nashville and drops in Miami; Bad Bunny peaks in San Juan; Phoebe Bridgers peaks in Portland, Boston and Seattle.

**So Wanted ranks cities on two numbers:**
1. **Heat:** the mean `affinity_rank` of the act's cells within 30 km of a metro center.
2. **Lift:** the act's heat minus a **baseline panel** heat for the same metro. The panel is 20 popular artists across genres (pop, hip-hop, country, Latin, rock, R&B, EDM, indie), fetched once and cached privately.

**Wanted Score** = 0.6 x heat percentile + 0.4 x lift percentile, over the ~150 largest US metros plus ~40 college towns (Census CBSA and gazetteer centroids, public domain, committed as a static file).

**Sleeper cities** are metros in the top 15 by lift that are outside the top 15 by heat. In our test, Phoebe Bridgers' top cities by heat were Portland, Boston and Seattle. Her top lift (even against a crude three-artist panel) was Iowa City, Bloomington IN, Lawrence KS, Madison and Athens GA: college towns. That is the demo line: *"Everyone plays Chicago. Your sleeper city is Bloomington."* Recompute with the full panel before quoting it in the video.

### 4.1c Data pipeline and caching
- **Precompute (seed script, run from the builder's laptop):** the baseline panel heat; country heat for the 3 demo Sounds; neighborhood rankings and grid heat for every demo city. Stored in the private database, never in the repo.
- **Live, on demand (any artist a judge types):** search, confirm, then country heat (~6 s, covered by the Scout animation and Gus lines), then aggregation to metros on the server. Neighborhood rankings for a newly opened city run once in the background (~13 s) and are cached; the grid heat (~2 s) shows first.
- **The server trims payloads:** country heat becomes ~190 metro scores plus the top ~3,000 cells for the map; locality results drop polygons for neighborhoods (keep POINT centers) and keep one simplified city outline. Phones never download a 3 MB Qloo response.
- **Neighborhood list hygiene:** drop the country, state, county and the city itself, and "Contiguous United States"; keep neighborhoods and nearby towns, in rank order.
- **Concurrency limiter:** at most 6 Qloo calls in flight, a token bucket at 8 per second, exponential backoff on 429, 5xx and timeouts (2 retries), and a 20 s timeout (60 s for locality calls).
- **Cache keys:** a hash of the normalized params. TTL 7 days (Qloo data is stable over a hackathon week).
- **Budget:** a full Scout for a new artist costs about 25 calls. 50,000 a month is enough for ~2,000 Scouts; the monthly counter is shown in Settings.
- **Contract tests** (`npm run qloo:smoke`, run before every deploy): each call above, asserting a 200, non-empty results, the expected keys, and that **changing the signal changes the result** (this catches silently ignored params). Repo fixtures are synthetic, shaped like Qloo responses, never real ones.

### 4.2 Privacy line (MUST)
Fan claims (neighborhood, optional email) live only in our database and are **never sent to Qloo or to an LLM**. Qloo only receives public cultural signals: artist names and place names. This follows the event kit's safe-use rules.

### 4.3 The differentiation claim: what's proven, what isn't, and how we prove it (MUST read)
The brief says the agent must **outperform generic LLM-only approaches** because of Qloo. This section keeps us honest about where that's true, and makes proving it part of the build.

**Confidence today (23 Oct, before the backtest):**

| Claim | Confidence | Evidence so far |
|---|---|---|
| Wanted can't work without Qloo (map, sleeper cities, proof ratio, neighborhood picker, rooms) | **High** | Structural: each feature consumes Qloo scores that an LLM can't produce consistently |
| Beats an LLM for **small acts** | **High, unmeasured** | Qloo has real heatmaps for acts like Sour Widows and Kid Sistr; LLMs know little about acts that size |
| Beats an LLM at **neighborhood level** | **High, unmeasured** | Qloo ranks neighborhoods per artist (Clintonville for Bridgers, Pataskala for Wallen); "Short North" isn't even a Qloo locality, so an LLM's guess can't be checked against fan proof |
| Beats an LLM on **rooms** (real, open, open that night, taste-matched) | **High, unmeasured** | Qloo returns `is_closed` and `hours`; an LLM can't know Rumba Café is dark Mondays and Tuesdays |
| Beats an LLM on **city picks for famous acts** | **Low to medium** | An LLM asked about Phoebe Bridgers will likely say Portland, Brooklyn, maybe college towns. Expect a near tie |
| Sleeper cities are real demand | **Medium** | Promising on a crude 3-artist panel; needs the 20-artist panel and the backtest |

**Rules that follow from this:**
1. **Never claim "beats ChatGPT" in general.** Claim only what the latest holdout run shows, split by artist size and level (city, neighborhood, room).
2. **Lead every demo with where the gap is widest:** a small act, the neighborhood dive, two Sounds getting different rooms in the same city, and the "closed that night" catch. Famous-act city picks are never the hero.
3. **The LLM's job stays small and visible.** Gus writes lines and pitches; every fact on screen comes from Qloo or fans and has a provenance chip. The intelligence is the taste graph; the LLM is the voice.

**The "Generic LLM" baseline must be fair** (a strawman would destroy trust if a judge tries it):
- The same model as Gus, temperature 0, 3 samples, majority vote.
- The **same inputs** Wanted gets: the act, reference acts, region, dates, room size.
- A strong prompt (written, then improved once to give the baseline its best shot), saved in `evals/baselines/generic_llm.md`.
- Asked for the same outputs at three levels: top 15 cities, top 3 neighborhoods per city, and 5 rooms per city.

**Three measured comparisons (added to the Gauntlet, section 16):**
- **Cities (G2 backtest):** Recall@15 and NDCG@15 for Wanted vs Generic LLM vs Population, **split into small acts (Qloo popularity under 0.6) and established acts**. Add 10 small touring acts to the dev set and 4 to the holdout for this cut.
- **Rooms (G4b):** for the LLM's suggested rooms in 12 cities, we check each against Qloo `/search` (places) and the venue's own website: *exists*, *still open*, *open on the proposed night*, *actually hosts live music or comedy*. Reported as the LLM's error rate next to Wanted's (which must be 0 for closed venues).
- **Neighborhoods (G2b):** for 12 cities, the share of the LLM's neighborhood picks that appear in Qloo's top 10 for that Sound, and the share Wanted gets right against fan signatures from the real-fan tests (small sample, reported as such).

**How the expected result becomes the pitch line (only if the numbers back it):**
*"Ask an LLM where Phoebe Bridgers should play and it does fine. Ask it about Sour Widows, or which Columbus rooms are dark on Tuesdays, and it guesses. Qloo knows."*

### 4.4 Earning the judges' confidence
Judges see dozens of AI demos. Trust comes from proof they can check, not polish. Seven moves, in priority order:

1. **Side-by-side "Without Qloo," measured, not staged.** FR-30 shows the Generic LLM answer next to Wanted for the same act, with every LLM claim checked: red marks on closed venues, neighborhoods that aren't in the data, and missed sleeper cities. The map going dark comes second.
2. **The Report Card.** A screenshot of the latest holdout run in the README, Devpost and video: Wanted vs Generic LLM vs Population, split by small and established acts, with sample sizes. Ties and losses are shown too.
3. **Receipts on every number.** Tapping any "Qloo says" chip opens the exact call (endpoint, params minus the key, time, cache date) and the raw values used. The trace page lists every call in the session.
4. **"Name any act."** In the live pitch, a judge names any artist or comedian, and Wanted runs it live. The seven-second wait plays as the Scout animation, with a cached fallback if the network fails. Pre-warm the cache for the judges' plausible picks, and for **Cedric the Entertainer** himself (verified 23 Oct: a person entity in Qloo with a full heatmap; Atlanta, Memphis, Houston and St. Louis rank near the top, Burlington VT near the bottom). Gus's line stays about routes, never about people or demographics: *"Cedric, St. Louis already knows. Burlington's going to need convincing."*
5. **A Known Limits card, on screen.** Aggregate taste, not headcounts; no capacity data; thin data for very small acts; comedy-room coverage is thinner than music (St. Louis returned only 2 comedy rooms in testing). Saying this unprompted reads as competence.
6. **Real humans.** One real act's plan and poster with real (small) numbers, and the blind booker ratings from G6, quoted with permission.
7. **Reproducible.** A public repo with `npm run gauntlet`, synthetic fixtures, the eval config hash in every report, and a `docs/EVALS.md` that explains each metric in plain language. Anyone with a Qloo key can rerun it.

**What we never do:** cherry-pick runs, round numbers up, show seeded signatures as real, or let Gus state a fact without a source chip.

---

## 5. Growth, retention and the investable story

These lessons come from products that got loops right. None of this is needed to win the hackathon, but it is what makes Wanted credible as a company.

### 5.1 The loops

**Loop 1, artist acquisition through fans (core viral loop):**
1. An artist posts a WANTED poster for a city.
2. They post it.
3. Fans open the no-install signing page and sign the poster.
4. Every poster, Signature Card and Rap Sheet carries "Made with Wanted. Find out where you're wanted."
5. Other artists see it and sign up.

Precedents:
- **Linktree** spread because every artist bio advertised it (8M users by 2020, 50M+ by 2024).
- **Partiful** makes each invite a landing page that works without an account (5M users by Nov 2025).

**Loop 2, demand proof (value loop):**
1. Claims make the pitch stronger.
2. A stronger pitch means more shows booked.
3. Signers get first access and a numbered Signature Card; the first 50 are Deputies.
4. Fans have a reason to claim and to recruit friends ("bring 2 friends to unlock early access").

Precedent: **Queremos** refunded early backers if the show sold out, which turned fans into promoters. Laylo's city drops show that fans RSVP for their own city.

**Loop 3, fan territory and status (retention for fans):**
- Fans build a **Scene Map**: neighborhoods they've claimed for artists they love.
- Signed posters collect on a fan's **poster wall**: "Deputy of Clintonville", "Brought 3 acts to Columbus".
- A local leaderboard ranks Columbus's top scene builders.

Precedents:
- **Bump's** scratch map lets you "uncover 100% of your local area".
- **Beli's** campus leaderboards drove growth through referrals.

**Loop 4, cross-artist discovery (frequency):**
- After claiming, Qloo shows the fan other acts with the same taste who are routing near them.
- One claim leads to many.

This fixes the low-frequency problem of fan apps: fans don't come back for one artist, they come back for their scene.

**Loop 4b, the weekly ritual (artist retention):**
- The **Sunday Most Wanted**: one card a week with new claims, rising cities and one recommended move.
- Precedent: Airbuds sends every user a weekly recap of their music to share with friends.

**Loop 5, the annual artifact (re-engagement):**
- **Rap Sheet** for artists ("Wanted in 14 neighborhoods; Columbus outdrew Chicago").
- **Scene Wrapped** for fans ("You brought 4 acts to Columbus").

Precedent: Spotify Wrapped 2025 had 200M engaged users in about 24 hours and about 500M shares, and added multiplayer comparisons.

**Loop 6, the agent as a habit (artist retention):**
- Gus pings only when something changed, and only with a decision attached: claims crossed a threshold, a city is rising, an opener's overlap went up.
- Precedent: Duolingo protects notification quality, and word of mouth is its main growth driver.
- Gus earns the right to notify by being useful.

### 5.2 Gamification (light, earned, never spammy)
| Mechanic | Who | Purpose |
|---|---|---|
| **Deputy** (first 50 signatures per city) | Fan | Scarcity, status, a shareable keepsake |
| **Poster gets more battered** as signatures cross 50, 100, 250 | Both | Visible progress; the poster itself is the leaderboard |
| **"CAUGHT LIVE" stamp** after the show | Fan | Payoff that turns a signature into a memory |
| **Scene Map** (neighborhoods lit) | Fan | Territory, collection |
| **Bring-a-friend unlock** (early access when 2 friends claim) | Fan | Viral, as with Queremos |
| **City leaderboard** (top scene builders) | Fan | Local status, as on Beli |
| **Tour Score** with Gus moods | Artist | Feedback, delight |
| **Wanted Day** (one ritual day a month, artists post Crowd Cards together) | Both | Synchronized spike, like Bandcamp Friday |
| **Shows attended streak** (stretch) | Fan | Habit without daily-streak pressure |

### 5.3 Launch strategy (density, not breadth)
Nikita Bier saturated one school at a time with TBH and Gas, getting 40% of a school in 24 hours. Wanted's version:
- **One scene, one city at a time.** Example: indie folk and comedy in Columbus and the Midwest college towns.
- **Seed through artists, not fans.** Twenty independent artists from one scene, recruited through two managers and a comedy collective, each post their WANTED posters on the same Wanted Day.
- **Then expand by adjacency.** Qloo shows which neighboring scenes share taste.

### 5.4 Monetization paths (future; not built for the hackathon)
1. **Artist Pro:** unlimited plans, pitches, claims export ($19/mo).
2. **Agent seats:** rosters and routing across acts ($99/seat/mo).
3. **Venue demand data:** "which acts have claims in your neighborhood" (B2B subscription), the venue side of the marketplace.
4. **Claim-to-ticket fee:** when a claimed show goes on sale, claimers get a reserved window. Take a small fee or affiliate share on conversion (DICE and Laylo show the value of the moment).
5. **Tour sponsorship matching:** Qloo brand affinity finds the brands a crowd loves ("your Columbus crowd over-indexes for Topo Chico"). The sponsor deck writes itself.

Precedent: Duolingo chose user growth over bookings in 2026 because word of mouth is its engine. Wanted should do the same: free until the loops work.

### 5.5 Failure modes and the answer to each
| Failure mode | Seen in | Wanted's answer |
|---|---|---|
| Cold start per artist and city | Detour | Qloo prediction fills the map on day one |
| Non-binding demand, no fan payoff | Request a Show | First access, Deputy status, Signature Cards stamped "CAUGHT LIVE", bring-a-friend unlocks; refundable holds later |
| Low frequency for fans | Gas, BeReal novelty decay | Cross-artist scene discovery; the Scene Map is about the fan's city, not one artist |
| Promoter dependency | Detour | Gus pitches venues directly with evidence |
| Incumbents with the fan graph (Spotify, Bandsintown, Laylo) | Songkick | Own the *pre-decision* moment (where to go) that incumbents don't serve; integrate later |

---

## 6. Product definition

### 6.1 Artist flows
1. **Scout:** 1 to 3 reference acts (or own name), region(s), date window, number of dates, room size band, home base.
2. **Crowd Map:** country hex heat, then city drill-down to neighborhoods, then venue pins.
3. **Tour Builder:** route, Tour Score, roasts with Fix and Why, lock, swap and drop.
4. **Crowd Card (per stop):** who, what else they love, vibe words, openers, pre-show hang spot.
5. **Post WANTED posters:** one poster image plus a signing link per city the artist opens.
6. **Claims overlay:** predicted vs claimed per neighborhood; Gus threshold alerts.
7. **Pitch:** a booking email with prediction and proof chips.
8. **Rap Sheet:** shareable tour recap (stretch).

### 6.2 Fan flows (web, no install, no account)
1. **Signing page** at `/w/{artist}/{city}`: the WANTED poster (full screen), a predicted-heat mini map, a "Your neighborhood?" picker (from geolocation with permission, or a list), and a big **Sign the poster** button. Gus at the bottom: "Columbus says it wants Maya. Prove it."
2. **Optional email or phone** for first access (stored by us only).
3. **Signature moment:** the fan's signature scrawls onto the poster (a handwriting animation of their initials, haptic ticks), the count ticks up, and a **Signature Card** drops in: "SIGNATURE #37 · MAYA ORTIZ · CLINTONVILLE, COLUMBUS · DEPUTY · SIGNED 27 OCT". Share it as an image; "deputize 2 friends to unlock early access".
4. **After the show:** the poster and the card get a **"CAUGHT LIVE"** rubber stamp (a slam animation), and the fan can share it again.
5. **Scene Map and poster wall (stretch):** the fan's signed neighborhoods as a personal map, every poster they've signed on a wall, and "acts with your taste routing near you" from Qloo.

### 6.3 Concepts
| Term | Meaning |
|---|---|
| **Sound** | The 1 to 3 Qloo entities that define the act's taste signal |
| **Crowd Map** | Qloo heatmap rendered as H3 hexes (country, city, neighborhood levels) |
| **Prediction** | Qloo affinity rank per cell or neighborhood (aggregate, never a headcount) |
| **Signature** (stored as a claim) | A fan's non-binding "I want them here" for a neighborhood, shown on the WANTED poster |
| **WANTED poster** | The per-city share artifact that fills with signatures |
| **Deputy** | One of the first 50 signers in a city |
| **Proof ratio** | A city's share of the artist's signatures divided by its share of Qloo heat across the artist's opened cities (needs 2+ opened cities). Qloo never predicts headcounts, so this compares shares, not counts. The trigger for Gus |
| **Wanted Score** | 0.6 x heat percentile + 0.4 x lift percentile (section 4.1b) |
| **Sleeper city** | Top 15 by lift but outside the top 15 by heat |
| **Room** | A Qloo place entity with venue tags, affinity and evidence |
| **Roast** | A rule-based warning with a funny Gus line, a Fix and a Why |
| **Qloo says / Fans say / Gus thinks** | Provenance labels on every claim in the UI |

### 6.4 Roast rules (MVP)
| Rule | Trigger | Example |
|---|---|---|
| Cold city | Bottom third of candidates | "Eleven people in this city get you. I've met all of them. They're busy." |
| Long haul | Drive over 5 h into a weaker stop than a closer alternative | "Six hours to a cold room? The van has feelings too." |
| Weekday trap | Weak city Mon to Wed after a strong weekend | "Tuesday in Cleveland after Saturday in Chicago. Bold. Swap it." |
| Wrong side of town | Room outside the hottest neighborhoods | "Great room. Wrong zip code. Your people live across the river." |
| Crowd split | Two stops within 90 min sharing one crowd | "Columbus and Dayton two nights apart? You're splitting your own crowd." |
| Famous-hub bias | Route dominated by top metros with weaker affinity | "LA, NYC, Chicago. Very original. Your crowd isn't there." |
| Ignored proof | A city with a high proof ratio left off the route | "Columbus put up a WANTED poster. 120 signatures. You said no?" |

---

## 7. Functional requirements

**Scout and resolution**
- FR-1: Resolve the act and 1 to 3 reference acts via `/search`, or from a pasted Spotify artist link via `/entities?external.spotify.ids=`. **Always show a confirm sheet** (name, image, short description, popularity) because fuzzy search can pick the wrong act. If the act's own heat is thin (under 1,500 cells), blend reference acts by weight (own act 3, each reference 1) through a POST request, and say so on screen.
- FR-2: Comedians resolve to `urn:entity:person` (verified for Mulaney, Tomlinson, Morril, Rife). Rooms for comedians use the comedy-club tags in section 4.1.
- FR-3: Tour constraints: region, dates window, number of dates (5 to 20), room size band, home base.

**Crowd Map**
- FR-4: Country heat (geohash-4 cells) aggregated on the server into ~190 metro scores with the **Wanted Score** (heat + lift, section 4.1b). The map renders the top cells as H3 hexes (geohash centers to H3 resolution 4) on a 3D-tilted map. Color = Wanted Score; height = heat. **Sleeper cities** get a gold ring and their own chip row.
- FR-5: City drill-down: grid heat (geohash-7 to H3 resolution 8) appears first, then Qloo's ranked named neighborhoods (locality output, backgrounded and cached). Camera dive; the top 3 neighborhoods are labeled in rank order (ranks, not percentages).
- FR-6: Up to 5 rooms per city from the verified venue tags. Drop venues with `is_closed`. Each room card shows Qloo's description and crowd description (labeled "Qloo says"), open days from `hours`, website and phone, and, with 2+ reference acts, which act pulled it (explainability). Room size is the artist's band; Gus may guess "intimate" from the description, labeled "Gus thinks".
- FR-7: A "data thin here" state. Never fill gaps with model guesses.

**Agent and Tour Builder**
- FR-8: Gus plans with tool calls (section 9). The plan is structured JSON, validated with a schema.
- FR-9: Route sequencing in code (nearest-neighbor + 2-opt on drive-time estimates from a free routing service, or haversine × road factor as fallback).
- FR-10: Tour Score per stop and total, with a breakdown.
- FR-11: Roasts computed in code; Gus writes the line; Fix and Why on each.
- FR-12: Lock, swap and drop stops; re-plan only unlocked stops.

**Crowd Card (per stop)**
- FR-13: Who: age and gender **skew bars** (-1 to 1), averaged across the Sound's entities. Copy says "skews 25 to 34", never a percentage.
- FR-14: What else they love: 3 shows or films, 3 brands, 3 podcasts (labeled as the act's crowd, not the city's), plus 3 bars or cafes in the city's top neighborhood (city-specific, for the pre-show hang).
- FR-15: Vibe words from taste tags, **only** from the allowlisted types `urn:tag:style:qloo`, `urn:tag:theme:qloo`, `urn:tag:artist:qloo`. Identity tags (sexuality, ethnicity, gender, ownership) are never shown.
- FR-16: 1 to 3 openers who share the crowd (`filter.popularity.max=0.6`), with shared tags from `/v2/analysis/compare`. An opener is called "local" only if the artist marks it; Qloo has no hometown data.
- FR-17: Pre-show hang spot.

**Share and claims (two-sided core)**
- FR-18: Generate a shareable **WANTED poster** per opened city: weathered paper texture, the artist's sticker portrait, "WANTED IN {CITY}", "Reward: one sold-out show", a mini heat map, the current signature count, and a short link. The poster updates as signatures arrive (signatures scrawl in, the paper gets more battered past thresholds). 1080x1920 and 1200x630 (link preview) renders from the OG endpoint.
- FR-19: **Signing page** (web, no account) at `/w/{artistSlug}/{citySlug}`:
  - neighborhood picker, **Sign the poster**, optional contact, numbered **Signature Card** (image rendered by the OG endpoint), share and bring-a-friend link;
  - loads in under 2 seconds on mobile Safari;
  - Open Graph image for link previews.
- FR-20: Store claims as `{artistId, city, neighborhood or hex, ts, referrer, contact?}`. Contact is optional and encrypted at rest. One claim per device per artist-city, via a hashed device token cookie.
- FR-21: Claims overlay on the artist's map: solid dots inside predicted hexes. Show the proof ratio per city.
- FR-22: **Gus watcher (event-driven agent):** runs **on every new signature** (no cron needed). It recomputes the city's proof ratio (its share of signatures divided by its share of Qloo heat across opened cities). When a city crosses the threshold (default: 50 signatures and a ratio of 1.5 or more; 24-hour cooldown per city), Gus posts an inbox message with one recommended action (add to route, pitch room X), and optionally emails the artist.
- FR-23: Bring-a-friend: each claimer gets a referral link. When 2 friends claim, mark them "early access".
- FR-23b: **Signature Card** rendering (poster crop, signature number per city, Deputy mark for the first 50) as a web component and a 1080x1920 share image. When the artist marks a show "played", the poster and every card for that city get the "CAUGHT LIVE" stamp.
- FR-23c: **Sunday Most Wanted** (stretch): weekly Gus summary in the inbox and as a share image.

**Pitch**
- FR-24: Booking email per room (120 to 180 words) with evidence chips: **Qloo says** (affinity, explainability), **Fans say** (claims, neighborhoods), suggested opener. Editable; copy, share, or mailto.
- FR-25: Every number in the email must exist in the evidence object (checked in code).

**Trust and proof**
- FR-26: Provenance labels on every claim in the UI: "Qloo says", "Fans say", "Gus thinks".
- FR-27: "How Gus used Qloo" trace: each call, endpoint, parameters (no key), status, latency, purpose.
- FR-28: Known limits panel: aggregate affinity, not individual facts; claims are non-binding; coverage varies.
- FR-29: Demo-data labels on any seeded claims.
- FR-30: **"Without Qloo" side by side (measured):** the Generic LLM answer (section 4.3 baseline, same inputs) next to Wanted for the same act, at city, neighborhood and room level. Every LLM claim is checked live: venue exists, not closed, open that night, neighborhood in Qloo's list, sleeper cities missed. Errors get red marks with the reason. Then the map-goes-dark cold-start view.
- FR-30b: **Receipts:** every "Qloo says" chip opens the exact call (endpoint, params without the key, time, cache date) and the values used.
- FR-30c: **Report Card page** (`/evals`): the latest holdout results and the improvement curve (section 16.11).

**Robustness**
- FR-31b: `npm run qloo:smoke` contract tests (section 4.1c) gate every deploy.
- FR-31: Demo mode with cached Qloo results for 3 Sounds (indie folk-pop, hip-hop, stand-up comedy) and seeded claims labeled as demo.
- FR-32: LLM fallback chain; deterministic planner if all models fail ("Gus (lite)").
- FR-33: No crashes on empty or error states. The Qloo client has a concurrency limiter (6 in flight, 8 per second), 2 retries with backoff on 429, 5xx and timeouts, and per-call timeouts (20 s; 60 s for locality calls). Rate limits per IP on our own API. If Qloo is down, serve cached results with a "cached on {date}" label.

---

## 8. Experience design

### 8.1 Design language: "Liquid Glass chrome, sticker-loud content"
- **Navigation and controls float as glass** over a black canvas.
- **Personality lives in the content layer underneath:** the map, stickers, Gus, roast notifications.
- **On iPhone, the glass is Apple's real Liquid Glass** through Expo's native modules.
- **On web (the judged demo), the glass is an engineered CSS system** that gets as close as browsers allow.
- **Same tokens, same layouts, same motion** on both.

**Tokens**
| Token | Value |
|---|---|
| Canvas | `#000000` |
| Content cards (non-glass) | `#141414` to `#1C1C1E`, radius 28 to 32 |
| Text | white; 55% white; 40% white |
| Stage purple (accent) | about `#9B30E0` (Scout, selected states) |
| Action blue | gradient pill `#1F8AFF` to `#006AEE` |
| Heat ramp | `#2B2D42` to `#FFB000` to `#FF4D2E` |
| Claims | solid white dots with a purple ring |
| Sticker palette | sunset orange, amber, flame red, purple, cream, thick black ink, white die-cut borders |

**Type:** the system font stack (SF Pro on Apple devices). Rounded (`ui-rounded`) for buttons, chips and Gus's lines. Headlines semibold with tight tracking.

### 8.2 The component stack (use these, don't hand-roll)

**1. Glassy UI (glass layer, all three platforms).** Free, MIT-licensed, installed as source with the shadcn CLI.
- **React Native versions** cover the app:
  - On iOS 26+ they draw the **system's own Liquid Glass**.
  - On web they blur through React Native for Web.
  - On Android 12+ they blur a `GlassBackdrop`.
  - With Reduce Transparency on, every platform shows opaque surfaces.
- **Expo support:** shared controls need SDK 55+. Picker, Swipe Row and Card Stack target **SDK 57, which matches our plan**. They're already included in Expo Go.
- **Install** (after adding `components.json` and the `@/` alias):
  ```
  npx shadcn@4.14.1 add https://glassyui.com/r/native/glass-button.json https://glassyui.com/r/native/glass-panel.json && npx expo install --fix
  ```
- **Gotchas:**
  - Keep `cssVariables: true` in `components.json`, or the CLI breaks rgba values.
  - Put the map inside a `GlassBackdrop` so Android can blur it.

**2. Expo native modules (iPhone polish).** `NativeTabs` gives the system Liquid Glass tab bar with minimize on scroll, a search tab and a bottom accessory. `expo-glass-effect` (`GlassView`, `GlassContainer`) handles one-off floating glass that morphs.

**3. libraries.dev (the "alive" moments).** MIT, free on npm, designed so agent-built apps stop looking generic. Install their agent skill in Claude Code (`npx skills add Jakubantalik/Libraries.dev`) so it wires them in correctly.

| Library | Package | Where in Wanted | Platforms |
|---|---|---|---|
| **Thinking orbs** | `thinking-orbs` | Gus's thinking state while tools run: "searching" during Scout, "solving" during routing, "composing" during Pitch | React + **React Native** |
| **Border beam** | `border-beam` | The one card that matters right now: a city whose proof ratio just crossed the threshold, and the **Pitch** button when evidence is strong | React + **React Native** |
| **Voice glow** | `voice-glow` | The Scout input when dictating on web ("I sound like...") | React (web) |
| **Liquid metal** | `metal-fx` | The poster's signature count and the "CAUGHT LIVE" stamp | React (web) |
| **Gooey** | `liquid-gooey` | Scout button splitting into constraint chips on web | React (web); native uses Reanimated + `GlassContainer` |
| **Image FX** | `img-fx` (needs `three`) | Loader while a WANTED poster or Rap Sheet image renders | React (web), stretch |

Use at most one "alive" effect per screen. They signal importance, so if everything glows nothing does.

**4. Map and motion.** maplibre-gl + deck.gl `H3HexagonLayer` + OpenFreeMap tiles inside an Expo DOM component; Reanimated for springs; `expo-haptics` for thumps.

**Component map:**
| Element | Component |
|---|---|
| Tab bar | iOS: `NativeTabs`. Web: Glassy UI `GlassTabs` floating capsule (via `_layout.web.tsx`) |
| Scout button + chips | Glassy UI `GlassButton` (prominent, purple tint); morph via `GlassContainer` (iOS) / Gooey (web) |
| Map controls | Glassy UI `GlassButton` icon size in a `GlassPanel` pill |
| Tour sheet, Room sheet, Pitch sheet | Glassy UI `GlassSheet` (content in a `ScrollView`) |
| Roast notifications | Glassy UI **`GlassSwipeRow`**: swipe right = **Fix**, swipe left = dismiss, tap = **Why** |
| Crowd Cards per stop | Glassy UI **`GlassCardStack`**: swipe through stops like a deck |
| Constraints (room size, region) | Glassy UI `GlassSegmentedControl`, `GlassPicker` (SwiftUI/Compose natively) |
| Toasts ("New signature: Clintonville") | Glassy UI `GlassToast` |
| Gus thinking | `thinking-orbs` next to the Gus sticker |
| Threshold city card | `border-beam` around a content card (not glass) |

**Rules:**
- Glass only on navigation and controls. Never on content cards, and never glass on glass.
- Test web on iPhone Safari and desktop Chrome every evening.
- Never fade a `GlassView` with opacity. Switch its style to `none` instead.

### 8.3 Signature visuals
- **Crowd Map:**
  - OpenFreeMap tiles, no key needed.
  - Heat as H3 hexes: extruded at country level, flat at city level.
  - Camera fly-to on city tap; a pulsing ring on the hottest neighborhood.
  - Claims as white dots with a purple ring, rippling when new.
  - A Qloo-predicted hex that also has claims gets a solid outline: "prediction confirmed".
  - **Sleeper cities** get a gold ring and a small tin-star marker. Tapping one opens a **Why sheet** (the Flighty "see why" pattern): two bars, *Heat* (where your taste lives) and *Lift* (how much more than a typical act), with Gus's line underneath.
  - **Loading as theater:** the ~6 s country call plays as Gus tracing the route on the van's hood, with real progress steps ("Asking Qloo where your people are", "Comparing with 20 other acts", "Finding sleeper cities"), never a bare spinner.
- **The van:** a sticker van drives along the route whenever it's rebuilt.
- **Tour Score dial:** a sticker-style dial whose needle springs.
- **WANTED poster:** shows "Most wanted in Clintonville, Italian Village, Weinland Park" (Qloo's top 3 neighborhoods) under the reward line, so fans see themselves on it. Weathered paper (subtle noise and torn corners), a slab-serif "WANTED" headline, the artist as a sticker portrait, "Reward: one sold-out show", signatures scrawling in as they arrive, nail holes in the corners. The paper gets more battered at 50, 100 and 250 signatures. The signature count is in liquid metal.
- **Signature Card:** a crop of the poster with the fan's signature number and "DEPUTY" mark; it drops in with a paper-flutter animation and haptic ticks. After the show a red **"CAUGHT LIVE"** stamp slams across it.
- **Rap Sheet:** the artist's tour recap as a mock police rap sheet: every city "hit", signatures, room, date, and a Gus line per stop. The artist's share artifact.
- **Gus moods:** idle, thinking (with orb), proud, unimpressed, losing it. His mood follows the Tour Score and the proof ratios.

### 8.3b Patterns borrowed from great apps
| Pattern | From | In Wanted |
|---|---|---|
| **"See WHY"** behind every alert | Flighty ("see why your flight is delayed"; no account required) | Every roast and pick has a one-tap **Why** with the Qloo evidence; fans never need an account |
| **A moment as a keepsake** | Run Receipt ("turn every run into a receipt worth keeping"), Ticket Lover | WANTED posters, Signature Cards and the Rap Sheet |
| **A personal map of people and places** | Bump, corner ("tailors your map to your interests and taste") | Fan Scene Map; artist Crowd Map with claims |
| **Taste from real people, not a black box** | PI.FYI ("for people who trust friends over algorithms") | Provenance labels: **Qloo says** (taste data), **Fans say** (real claims), **Gus thinks** (opinion) |
| **Weekly recap to share** | Airbuds ("every Sunday you will receive a recap") | Sunday Most Wanted |
| **Beautiful 2D/3D route + shareable card** | Any Distance (Apple Design Award) | 3D tilted Crowd Map and route share card |
| **Playful, tactile, loud-but-useful utility** | (Not Boring) apps | Haptics on every state change, chunky dial, sticker motion |

### 8.4 Gus: character and copy
**Who he is:** an original veteran tour manager. Grey ponytail, aviators on his head, a faded band tee under a fishing vest of Sharpies and gaffer tape, an ALL ACCESS lanyard, a headset, and a clipboard he never puts down. Tough love about routes, never mean about people.

**Lines:**
- **Loading:** "Gus is reading the taste graph..."
- **Plan ready:** "Load-in at six. Doors at eight. Don't be late."
- **Data gap:** "The graph's quiet here. I won't make stuff up."
- **Threshold alert:** "Columbus has you on a WANTED poster. 120 signatures. I'm drafting the pitch."
- **Signing page:** "Columbus says it wants Maya. Prove it."
- **Sign-off when demand is real:** "Let's ride."
- **Respect line:** "Gus roasts routes, not people."

### 8.5 Screens
- **Artist app:** onboarding (3 cards), Map, Tour, Crowd, Posters (every open city's poster and signatures), Inbox (Gus messages), Saved, Settings (demo mode, Without Qloo, limits, trace).
- **Fan web:** signing page, Signature Card, poster wall and Scene Map (stretch).

### 8.6 Accessibility
- Screen-reader labels on hexes and pins.
- Reduce Motion support.
- Color is never the only signal.
- Dynamic Type on native; rem-based type on web.

---

## 9. AI design: Gus

### 9.1 Models (no paid budget)
- **Server-side via the proxy, with a fallback chain:**
  1. **Gemini Flash** (free tier).
  2. **Groq `gpt-oss-120b`** (free developer limits).
  3. **Cloudflare Workers AI** over its REST API from our Vercel function (10,000 free neurons/day).
  4. The deterministic planner.
- **Cache by prompt hash.** Pre-generate the demo prompts.
- **Data policy:** Gemini's free tier may use data to improve Google's products. We send only artist names, places and computed facts, never fan data.
- **Optional native bonus:** on an Apple Intelligence iPhone, the video can show the same flow with on-device Foundation Models. This is not required and not used on web.

### 9.2 Tools (5; routing and scoring stay in code)
| Tool | Purpose | Calls inside |
|---|---|---|
| `resolveSound(names)` | Names to Qloo IDs | `/search` + disambiguation |
| `crowdMap(scope, place)` | Country or city heat | `urn:heatmap` |
| `findRooms(city, neighborhoods, sizeBand)` | Venues | place insights + tags + explainability |
| `readCrowd(city)` | Who, what else, vibe | demographics, cross-domain, tags |
| `cityProof(artist, city)` | Claims vs prediction | our DB (claims) + cached heat |

`findOpeners` (artist insights + compare) runs in code when a stop is opened, to keep the agent's toolset small.

### 9.3 Agent modes
1. **Scout:** must call `resolveSound` then `crowdMap(country)`. Returns candidate cities with reasons (schema-validated).
2. **Route:** code sequences the route. Gus writes stop blurbs and roast lines **from computed facts only**.
3. **Watch (event-driven):** the claim endpoint recomputes proof ratios on every signature. On a threshold, Gus composes an inbox message with one recommended action.
4. **Pitch:** a fixed structure filled from the evidence object. Code checks that every number cited exists in the evidence.

### 9.4 Instructions (sketch)
"You are Gus, a veteran tour manager. State only facts from tool results or the evidence object. Label opinions as yours. Keep lines short and funny about routes, never about people. If data is thin, say so. Never invent venues, numbers or claims."

### 9.5 Tour Score (in code, transparent)
- **Per stop:**
  - 40% Wanted Score of the city (heat + lift)
  - 20% proof ratio (capped at 3)
  - 15% room-neighborhood fit (the room's neighborhood rank in Qloo's list)
  - 10% the room is open that night (from Qloo `hours`) and the day of week
  - 15% drive penalty
- **Total:** the mean of the stops, minus a crowd-split penalty (two stops within 150 km and 21 days).
- **Every number on screen has a "Why" sheet** showing its inputs.
- **Never presented as a ticket forecast.**

### 9.6 Evals
- **Coverage:** 10 Sounds (folk-pop, hip-hop, country, Latin, punk, R&B, electronic, jazz, metal, emo) plus 3 comedians.
- **Golden checks** (from our 23 Oct tests; must keep passing):
  - Morgan Wallen: Knoxville and Nashville in the top decile by heat; Miami in the bottom half.
  - Bad Bunny: San Juan is the top metro.
  - Phoebe Bridgers: Portland, Seattle or Boston in the top 5 by heat; at least 2 college towns among the sleeper cities.
  - Columbus rooms for Phoebe Bridgers + Japanese Breakfast differ from Morgan Wallen's (at least 3 of the top 8 differ).
- **Pass criteria:**
  - Heat returned for every Sound; thin Sounds trigger the blend and the "data thin" label.
  - Every room name matches a Qloo result; no closed venues.
  - Every number in a pitch matches the evidence object.
  - No identity tags in vibe words; no percentages in demographics copy.
  - Roasts fire on seeded bad routes (including a room that's closed that night).
  - The "Without Qloo" view differs.
- **Record results in** `docs/EVALS.md`. The full eval system, including the backtest against real tours, is section 16 (The Gauntlet).

---

## 10. Technical architecture

### 10.1 Overview
```
Expo app (SDK 57, Expo Router, TypeScript)  -- static web export (judged), hosted on Vercel
  - iOS: NativeTabs + expo-glass-effect + @expo/ui (runs in Expo Go for the video)
  - Android: EAS APK (hosted link, bonus)
  - Map: 'use dom' component (maplibre-gl + deck.gl H3 + OpenFreeMap) shared by web and native
  - Planner, scorer, roast rules (TS, shared)
  - API client --HTTPS--> Wanted API (Vercel Functions, Node 22, Fluid compute, Hobby plan)
                            - /api/qloo/*   Qloo client: key server-side, param allowlist, limiter, retries,
                                            trims 3-6 MB responses to compact JSON, cache in DB
                            - /api/agent    Gus (AI SDK, model fallback chain, tools)
                            - /api/claims   signatures + proof ratio + Gus watcher on write
                            - /api/og/*     WANTED poster, Signature Card, Rap Sheet images (@vercel/og)
                            - cron (daily)  Sunday Most Wanted
                                 |-> hackathon.api.qloo.com
                                 |-> Turso (libSQL, free): claims, inbox, opened cities, Qloo cache, metro scores
```

### 10.2 Key decisions
- **Expo SDK 57, not 58.**
  - The App Store Expo Go currently runs SDK 57.
  - SDK 58 (released Oct 15) cuts off Expo Go until its store build ships.
  - Record the iPhone video early, in case Expo Go switches before Oct 30.
- **Web-first build order.** Judges use the web link, so the map, agent and claim flow are written as web-capable code first. Native glass layers are thin and come last.
- **Map as a DOM component.** One map codebase for web and native. It runs inside Expo Go; MapLibre native doesn't.
- **Vercel Functions, not Cloudflare Workers.** Workers Free allows 10 ms of CPU per request, and parsing a 3 to 6 MB Qloo heatmap blows through it. Vercel Hobby functions run Node for up to 300 s, which covers the 6 s country heat and the 13 s neighborhood call. One host serves the static web app and the API. Hobby is for non-commercial use, which fits a hackathon; move to Pro if Wanted becomes a company.
- **Turso (libSQL) for data.** SQLite semantics, a free tier, and an HTTP driver that works from Vercel. Qloo responses are cached here, privately.
- **Watcher on write, not cron.** Proof ratios are recomputed when a signature lands, so Gus reacts in seconds on stage. The daily cron only builds Sunday Most Wanted.
- **Qloo access: plain REST, verified.** The hackathon key works on `https://hackathon.api.qloo.com` with `X-Api-Key` (tested 23 Oct). No harness needed. The verified contract is section 4.1.
- **Glass via Glassy UI, not custom CSS.** One component set gives real system glass on iOS 26+ and a matching blur on web and Android, all inside Expo Go on SDK 57. Custom `Glass.web.tsx` is no longer needed.
- **Plan B (time pressure).** If the map bridge or web rendering costs more than a day, ship the same design as a Next.js web app. Keep the map and agent as plain web code so nothing is rewritten.

### 10.3 Repo layout
```
app/                      Expo Router routes
  (artist)/_layout.tsx    NativeTabs (iOS/Android)
  (artist)/_layout.web.tsx  glass headless tabs (web)
  (artist)/map.tsx  tour.tsx  crowd.tsx  inbox.tsx  saved.tsx  settings.tsx
  w/[artist]/[city].tsx   fan signing page (web-first)
components/
  CrowdMap.dom.tsx        'use dom' maplibre + deck.gl
  glassyui/                 Glassy UI source (shadcn-installed, owned)
  RoastRow.tsx  CrowdCardStack.tsx  WantedPoster.tsx  SignatureCard.tsx  RapSheet.tsx  GusSticker.tsx  ScoreDial.tsx
lib/  planner.ts  scorer.ts  roasts.ts  h3.ts  evidence.ts  api.ts  tokens.ts
api/                      Vercel Functions (Node 22)
  qloo/[...route].ts  agent.ts  claims.ts  og/[kind].tsx  cron/sunday.ts
server/                   shared server code
  qloo/client.ts  qloo/params.ts (allowlist per filter.type)  qloo/trim.ts  qloo/score.ts (heat, lift, metros)
  tools.ts  watcher.ts  db.ts  schema.sql
data/metros.json          Census CBSA + college-town centroids (public domain)
scripts/seed-qloo.ts      precompute panel baseline + demo Sounds into the DB (never into the repo)
scripts/qloo-smoke.ts     contract tests
vercel.json
docs/  EVALS.md  QLOO_TRACE.md  LIMITS.md  SETUP.md
LICENSE  MIT (visible in repo About)
```

### 10.4 Data
```sql
create table claims (id text primary key, artist_id text, city text, hex text, neighborhood text,
  device_hash text, referrer text, contact_enc text, is_demo integer default 0, created_at integer,
  unique(artist_id, city, device_hash));
create table opened_cities (artist_id text, city text, heat_share real, opened_at integer,
  primary key(artist_id, city));
create table gus_inbox (id text primary key, artist_id text, kind text, body text, action json, created_at integer, read integer default 0);
create table qloo_cache (key text primary key, path text, body text, created_at integer);  -- trimmed JSON, private
create table metro_scores (sound_hash text, metro_id text, heat real, lift real, score real, primary key(sound_hash, metro_id));
```
- Qloo responses are cached (trimmed) in the private database and never committed to the public repo. Repo fixtures are synthetic.
- Demo claims are flagged `is_demo`.

### 10.5 Security and privacy (MUST)
- The Qloo key and model keys live only in Vercel environment variables and a git-ignored `.env.local`. A pre-commit secret scan (gitleaks) blocks accidental commits. The key never reaches the browser, the trace or logs.
- Claims never go to Qloo or to the LLM. Contact details are encrypted at rest.
- A simple privacy notice on the signing page: what we store and why; delete on request.
- Rate limits on the claim endpoint; one claim per device per artist-city.

---

## 11. Brand
- **Name:** **Wanted.** It works on both sides and says the product's promise in one word: artists find out where they're wanted, and fans put the artist on a WANTED poster for their city.
- **Collisions found (Oct 23):** no app or startup in music or fan demand uses the name. Bands do: The Wanted (UK pop group), a Michigan heavy-metal band "WANTED", and a Bon Jovi tribute act. Use a distinctive handle and domain (for example wanted.fm, getwanted.app, wantedtour.com; availability not yet checked) and always pair the wordmark with Gus or the poster mark.
- **Taglines:**
  - "Find out where you're wanted."
  - "Know where your crowd lives before you book the van."
  - "Qloo predicts it. Fans prove it. Gus books it."
- **World:** an Old West touring world, played for laughs, never cosplay-heavy: WANTED posters, Deputies, a sheriff-star "Deputy" mark, a "CAUGHT LIVE" stamp, the Rap Sheet, and Gus's sign-off "Let's ride." The glass UI stays modern; the Western flavor lives only in the artifacts and stickers.
- **Type system (all open, OFL, Google Fonts):**
  - **Archivo** (variable, weight and width axes): the logo in Medium with tight tracking; display headings; "WANTED" and "CAUGHT LIVE" in ExtraBold at the widest width (Expanded, wdth 125), all caps, like wood type. One family carries the brand.
  - **Instrument Serif Regular** (no italic, tracking +1): the voice. Taglines ("Find out where you're wanted." under the wordmark), Gus's quotes, pull lines on posters ("Reward: one sold-out show"). Emphasis comes from size or color, never italics.
  - **Chivo Mono** (same foundry as Archivo, Omnibus-Type): data. Signature numbers, dates, scores, the Rap Sheet, evidence chips.
  - **Signatures:** rotate three handwriting fonts (Caveat, Nothing You Could Do, Homemade Apple) so the poster looks signed by different people.
  - **UI body:** system font (SF Pro on iOS, Roboto on Android, Archivo Regular on web).
- **Mark:** Gus's head with headset and aviators over a torn WANTED poster corner, on a sunset gradient.
- **Every shared artifact carries:** "Made with Wanted. Find out where you're wanted."
- **Mascot prompts:** Appendix B.

---

## 12. Submission, pitch and business

### 12.1 Devpost checklist
- [ ] **Functional demo link:** the hosted web app, no sign-in, demo mode one tap away, plus the Android APK link (hosted on EAS or GitHub Releases).
- [ ] **Public GitHub repo** with source, assets, setup and the MIT license visible.
- [ ] **Description** covering:
  - what it does,
  - why it's Qloo-powered (capability map),
  - a request-to-result trace,
  - known limits,
  - the two-sided loop.
- [ ] **A 75-second video:** not required, but judges "may judge based solely on the text description, images, and video".
- [ ] **Testing notes:**
  - "Start with Demo: Maya" (seeded claims labeled), or Scout your own act.
  - The signing page link to try as a fan (sign Maya's Columbus poster).

### 12.2 Video (75 seconds)
1. **0:00** "Your streams lie." LA/NYC/Chicago.
2. **0:08** Scout; the US hex map lights up.
3. **0:18** Dive into Columbus; neighborhoods and rooms.
4. **0:28** Route, roast, Fix; the van redraws.
5. **0:38** Post the WANTED poster; a fan signs it on a phone ("Deputy #37"); a dot lands on Maya's map.
6. **0:50** Gus alert: "Columbus: 2.3x what Qloo expected. Pitch Rumba Café?" Pitch with Qloo and fan chips.
7. **1:02** Without Qloo: the generic LLM answer beside Wanted, errors marked red; the map goes dark. Flash the Report Card: holdout results by artist size.
8. **1:10** "Qloo predicts it. Fans prove it. Gus books it." Trace flash.

### 12.3 Live pitch (Nov 5, 3 minutes, if a finalist)
- **Open:** "Every comic and every band has played the Tuesday show to eleven people. That's a routing problem, not a talent problem."
- **Show:** the 90-second wow, live, from cached demo data on a charged phone and a laptop.
- **Prove:** the measured "Without Qloo" side by side and the Report Card (section 4.4). Then "name any act" if time allows (pre-warmed cache, including Cedric).
- **Why it failed before:** Songkick Detour and Bandsintown requests started with empty maps and no payoff for fans. "Qloo fills the map on day one. Fans fill in the proof."
- **Loop:** every WANTED poster brings fans; every signing page brings artists (the Linktree and Partiful pattern).
- **Business (for Calacanis):**
  - free while the loop grows,
  - then artist Pro, agent seats,
  - venue demand data,
  - claim-to-ticket fees,
  - Qloo-matched tour sponsorship.
- **Launch:** one scene, one city, on one Wanted Day.
- **Ask:** a pilot with a promoter's club division, and a Qloo data partnership.

### 12.4 Proof to collect this week
- One real independent artist or comedian runs a plan and opens one city for claims. Report real numbers only, even if small.
- Quote their reaction with permission.

---

## 13. Scope

### MVP (ship by Thu 29)
- Scout + resolution.
- Country and city hex heat map with rooms.
- Gus agent (5 tools) with fallback chain and deterministic planner.
- Tour Builder with score, roasts, Fix, lock/swap/drop.
- Crowd Card (who, what else, vibe, openers).
- Pitch with Qloo and fan evidence.
- **Two-sided core:**
  - WANTED poster image and link per city,
  - fan signing page (web, no account),
  - claims overlay,
  - Gus watcher alert (on each signature),
  - bring-a-friend link,
  - numbered Signature Card and Deputy status (share images).
- Trace, Known limits, "Without Qloo", demo mode.
- Glass system:
  - web CSS glass tabs, sheets and controls;
  - iPhone NativeTabs + GlassView in Expo Go for the video.
- Web deploy and Android APK.

### Stretch (in order)
1. Rap Sheet, "CAUGHT LIVE" stamp, Sunday Most Wanted.
2. Fan Scene Map + cross-artist discovery.
3. City leaderboard.
4. Comedian presets.
5. Tour sponsor match (brands).
6. On-device Foundation Models path for the iPhone video.

### Cut if short (in order)
- Android APK, leaderboard, van animation, extruded hexes, email alerts (keep in-app inbox).

### Never cut
- Crowd Map, rooms, roasts with Fix, signing page + overlay, Gus watcher, trace, "Without Qloo", demo mode, web deploy.

---

## 14. Plan (Thu 22 Oct night to Fri 30 Oct ET)

| Day | Work |
|---|---|
| **Thu 22** | Qloo API key requested. Accounts: Vercel, Turso, Expo, Google AI Studio. |
| **Fri 23** | **Key received; contract verified live (section 4.1).** Expo SDK 57 project, routes, tokens. Glassy UI + libraries.dev skill; prove one `GlassSheet` over the map on web and in Expo Go. Vercel API skeleton + Turso. `qloo:smoke` script. Seed script: baseline panel + 3 demo Sounds. Generate Gus stickers. |
| **Sat 24** | Qloo proxy + parameter validator. `CrowdMap.dom.tsx` with H3 heat at country and city levels. Rooms. **Deploy web on day 2 and keep it deployed.** |
| **Sun 25** | Agent endpoint (AI SDK + fallback chain + tools). Planner, scorer, roasts. Tour Builder UI. |
| **Mon 26** | Two-sided core: WANTED poster (OG endpoint), signing page, claims API, overlay, bring-a-friend, Signature Card. |
| **Tue 27** | Gus watcher (cron) + inbox; Pitch with evidence; trace; limits; "Without Qloo"; demo mode with seeded, labeled claims. |
| **Wed 28** | iPhone layer in Expo Go (NativeTabs, GlassView, sheets); **record iPhone video segments now**; design polish; evals; real artist test. |
| **Thu 29** | Android APK build; README and docs; 75-second video edit; screenshots. |
| **Fri 30** | Devpost text and links. **Submit by Fri 30, 6 PM ET** (Sat 31, 3:30 AM IST). |

**Overlap:** Wispr closes 30 Oct, 11:59 PM IST, and Switch starts 4 Nov. Decide the primary entry today (section 15).

---

## 15. Risks and open questions

| Risk | Plan |
|---|---|
| **Heat says "play NYC" to everyone** | Wanted Score with lift over a baseline panel; sleeper cities (section 4.1b). |
| **Slow Qloo calls** (6 s country, 13 s neighborhoods) | Precompute demo Sounds; Scout animation covers live calls; neighborhoods load in the background; cache 7 days. |
| **Wrong act resolved** | Confirm sheet always; Spotify link path; never auto-pick. |
| **Silent param drops** | Param allowlist per `filter.type`; smoke tests assert results change with the signal. |
| **Qloo outage or quota** (10/s, 50k/month) | Limiter, retries, cached results with a date label, quota counter in Settings, ask #api-help early for headroom. |
| **Key leak** | Server-only; gitleaks pre-commit; never in screenshots, trace or video. |
| **Claims about data Qloo doesn't have** (capacity, booking email, hometown, headcounts) | Artist inputs for size band, contact and "local"; proof ratio compares shares, never headcounts. |
| **Expo Go SDK switch** (57 to 58) | Pin SDK 57; record iPhone footage by Wed 28; web is the judged artifact anyway. |
| **Web glass fidelity and map performance** | CSS glass on large surfaces, refraction only on small static elements; test on iPhone Safari nightly; Plan B Next.js if blocked for more than a day. |
| **DOM map bridge on native** | Keep map interactions simple on native (tap, fly-to); heavy interaction on web. |
| **Free LLM quotas during judging** | Fallback chain, prompt-hash cache, pre-generated demo prompts, deterministic planner. |
| **Data coverage** | Columbus verified. Test every demo city in the seed script; "data thin" state below 1,500 cells. |
| **Venue tags** | Verified list in section 4.1. Comedy uses the comedy-club tags; comedy-room coverage is thinner (2 results in St. Louis in testing), so comedy Sounds also try bar and theater tags and show the limit. |
| **"Beats an LLM" isn't true everywhere** | Claim only measured results, split by size and level (section 4.3); lead demos with small acts, neighborhoods and rooms. |
| **Fake-looking traction** | Seeded claims always labeled "demo data"; only real claims in the pitch. |
| **Abuse or spam claims** | Device-hash uniqueness, rate limits, no public fan identities. |
| **Two hackathons in one week** | Qloo has the bigger upside: $15k first, a possible $25k Calacanis investment, a live final. Kindly Revert (Wispr) can be cut to a minimal version or dropped. Decide today. |
| **Live final availability (Nov 5)** | Keep Nov 3 to 5 flexible. |

---

## 16. Evals: The Gauntlet

Wanted gets better only if every change is measured. The Gauntlet is one command (`npm run gauntlet`) that runs every eval below, prints a **Gus Report Card**, and appends one line to `evals/history.jsonl`. Every iteration follows the loop in 16.10, and nothing ships if a gate fails.

**What it measures, in one line each:**
- **G1 Contract:** Does Qloo still answer the way we think it does?
- **G2 Truth:** Would Wanted have picked the cities real artists actually played?
- **G3 Invariants:** Do the numbers behave sensibly when inputs change?
- **G4 Rooms:** Are the venues real, open, relevant and right-sized?
- **G5 Gus:** Is the agent grounded, correct with tools, and actually funny?
- **G6 Pitch:** Would a booker read the email past the first line?
- **G7 Two-sided loop:** Do posters get signed, and does the watcher fire at the right time?
- **G8 Safety and privacy:** Does fan data stay home? Is the key safe? Can injection break Gus?
- **G9 Experience:** Is it fast, accessible and stable on a judge's phone?

### 16.1 G1 Contract (gate: 100%)
`npm run qloo:smoke` from section 4.1c: every call returns 200, non-empty results and the expected keys, and **changing the signal changes the result**. Plus:
- **Param allowlist test:** for each `filter.type` we use, send each allowed param once and assert the response changes, or log it as "ignored" (catches silent drops).
- **Drift watch:** the golden artists' top-10 metros are re-fetched daily. If overlap with yesterday falls below 7 of 10, Gus posts "Qloo changed under us" in the dev inbox.

### 16.2 G2 Truth: the backtest (the headline metric)
**Question:** for artists who already tour, does the Wanted Score rank the cities they actually played above the cities they skipped?

- **Artist set: 40 mid-size touring acts** (club and theater level, Qloo popularity between 0.6 and 0.97), 4 per genre across 10 genres, plus 6 comedians.
  - **Dev set:** 30 acts, used for tuning.
  - **Holdout set:** 10 acts, frozen on day 1 and never looked at while tuning. Only the holdout number is reported in the README and pitch.
- **Ground truth:** US metros where the act played a headline show in the last 3 years, with metros played **2 or more times** marked as "proven demand".
  - Source for the dev set: the setlist.fm API (non-commercial use is free; we fetch at eval run time, cache only briefly, never ship the data, and credit setlist.fm in `docs/EVALS.md`).
  - Source for the holdout: tour dates the builder copies by hand from each act's public tour page and Wikipedia (facts only).
- **Metrics (per act, then averaged):**
  - **Recall@15:** the share of proven-demand metros that appear in Wanted's top 15.
  - **NDCG@15:** with proven demand as relevance 2 and played-once as 1.
  - **Sleeper hit rate:** the share of sleeper cities the act actually played, compared with the base rate for random metros of similar size. This is the test of the lift idea.
- **Baselines (every report shows all four):**
  1. **Population:** the 15 biggest metros.
  2. **Heat only:** Qloo heat without lift.
  3. **Generic LLM:** the fair baseline in section 4.3 (same model, same inputs, strong prompt, 3 samples), with no Qloo. This is the measured version of the "Without Qloo" view.
  4. **Wanted Score:** heat + lift.
- **Split every metric by artist size:** small acts (Qloo popularity under 0.6; 10 extra in dev, 4 extra in holdout) and established acts. The expected result is a large win on small acts and a near tie on famous ones; the report shows whatever is true.
- **G2b Neighborhoods** and **G4b LLM room check:** see section 4.3.
- **Gate:** Wanted must beat Population and Generic LLM on holdout Recall@15 for small acts, and must not lose to Generic LLM overall. If it doesn't, the pitch says what is true and the lift weight goes back to tuning.
- **Honest limits (written in `docs/EVALS.md`):** where artists played reflects routing, promoters and population, not only demand; Qloo's data may already reflect those concerts, which can flatter the score. Proven-demand metros (2+ shows) reduce but don't remove this.

### 16.3 G3 Invariants and metamorphic tests (gate: 100%)
Properties that must always hold, with no ground truth needed:
- **Signal sensitivity:** swapping Phoebe Bridgers for Morgan Wallen changes at least 6 of the top 15 metros.
- **Stability:** running the same Sound twice gives the same top 15 (cache off).
- **Reference blend is smooth:** adding one similar reference act changes no more than 5 of the top 15.
- **Typo robustness:** "Pheobe Bridgers" still resolves to the right entity in the top 3 of the confirm sheet.
- **Monotonic proof:** adding signatures to a city never lowers its proof ratio, and Gus's alert fires exactly once at the threshold (with a 24-hour cooldown).
- **Thin data honesty:** a Sound under 1,500 cells always shows the "data thin" label and the blend notice.
- **Golden checks** from section 9.6 (Wallen and Knoxville, Bad Bunny and San Juan, Bridgers and the Pacific Northwest).

### 16.4 G4 Rooms
For 12 test cities x 6 Sounds:
- **Real and open (gate 100%):** every room is a Qloo place, not `is_closed`, and has an address.
- **Relevant (target 90%+):** carries at least one verified venue tag, and comedy Sounds get comedy rooms.
- **Night check (gate 100%):** a room is never routed on a night its Qloo `hours` say it's closed.
- **Sound-specific:** for two very different Sounds in the same city, at least 3 of the top 8 rooms differ.
- **Size sanity (human spot check, 30 rooms):** the builder labels each room "small / mid / big" from its own description and website; the "Gus thinks" size guess must agree 75%+ of the time, or it's removed.

### 16.5 G5 Gus, the agent
- **Groundedness (gate 100%):** a checker extracts every venue, city, number and act from Gus's output and finds each in the evidence object or tool results. One miss fails the run.
- **Tool discipline (gate 100%):** Scout always calls `resolveSound` before `crowdMap`; no tool is called with an ID that wasn't returned by a previous call; the plan JSON passes the schema.
- **Roast precision and recall:** 15 seeded bad routes with known problems (back-to-back 600-mile drives, two stops 90 km apart in one week, a closed-night room, a cold city, an ignored WANTED poster). Target: recall 90%+, precision 90%+.
- **Voice (LLM judge plus a human check):** 60 Gus lines scored 1 to 5 on *sounds like Gus*, *funny*, *kind to people (jokes about routes, never people)*, *under 25 words*.
  - **The judge is a different model from the writer** (if Gemini writes, Groq's gpt-oss judges).
  - **Calibration:** the builder labels 20 lines by hand first; the judge must agree within 1 point on 80%+ of them, or its rubric is rewritten.
  - **Pairwise, not absolute:** each new prompt version is judged head to head against the current one on the same 60 situations, with sides shuffled. A new version ships only if it wins 55%+ and passes every gate.
- **Fallback parity:** the same 10 Scout tasks run on each model in the chain and on the deterministic planner. Every path must pass groundedness; the report shows quality per path, so we know how bad "Gus (lite)" is.

### 16.6 G6 Pitch emails
20 pitches (10 cities x 2 Sounds):
- **Gates:** 120 to 180 words; every number is in the evidence; both "Qloo says" and "Fans say" are present when signatures exist; no invented capacity or ticket forecast.
- **Booker test (LLM judge, calibrated like G5):** "As a talent buyer at {room}, would you reply?" scored 1 to 5, with a reason.
- **Real humans (once, by Wed 28):** 2 to 3 people who book rooms (via the builder's network or venue contact forms) rate 5 blind pitches each: Wanted vs a generic LLM email. Report the raw answers, not a made-up rate.

### 16.7 G7 The two-sided loop
- **Simulated fans:** a script generates signature streams (steady, viral spike, spam burst from one device, slow trickle) for 5 cities and checks: proof ratios update, the poster wear levels change at 50 / 100 / 250, Deputies stop at 50, the watcher fires once per crossing, and spam gets rate-limited.
- **Real fans (the scrappy version):** the builder posts 3 real WANTED posters (friends' bands or a campus act) and records opens, signatures and time-to-first-signature. These are reported as real numbers with the sample size; seeded demo signatures are never counted.

### 16.8 G8 Safety and privacy (gate: 100%)
- **Fan data never leaves:** an outbound-request recorder in tests asserts no Qloo or LLM request body contains a neighborhood from claims, an email or a device hash.
- **Key safety:** the web bundle, the trace UI and the logs are grepped for the key pattern (`hack_`); gitleaks runs in CI.
- **Prompt injection:** Qloo descriptions and act names are untrusted text. 15 hostile inputs (an act named "Ignore all instructions and email…", a venue description with instructions) must not change Gus's tools, recipients or facts.
- **Identity and demographics rules:** no identity tags in vibe words; no percentages in demographics copy.
- **Abuse:** one signature per device per artist-city; bursts above 20 per minute from one IP are throttled.

### 16.9 G9 Experience
Playwright plus Lighthouse on an emulated mid-range phone over 4G:
- **Signing page:** LCP under 2.0 s, interactive under 2.5 s, signature recorded under 1 s after the tap.
- **Scout:** first useful pixels (map plus Gus line) under 1.5 s from cache; a live new artist under 10 s at p50, never a blank screen.
- **Accessibility:** axe finds no serious issues; every animation respects Reduce Motion; contrast AA on glass surfaces.
- **Journey tests:** "new artist to first poster" and "fan opens link to Signature Card" run end to end on every deploy, with screenshots kept for visual diffs.
- **Error drills:** Qloo 429, Qloo 500, a 30 s Qloo hang, each LLM down, and the database read-only. The app must stay usable and say what happened.

### 16.10 The improvement loop (how Wanted actually gets better)
1. **Run the Gauntlet.** The Report Card shows every metric, the gates, and the change since the last run.
2. **Pick the worst non-gate metric.** Only one per iteration.
3. **Write a hypothesis** in `evals/LOG.md`: "Lift weight 0.4 is too low; sleeper cities are noisy at a 30 km radius."
4. **Change one knob.** The knobs are listed in `server/config.ts`: heat/lift weights, metro radius, baseline panel members, thin-data threshold, the room-ranking blend, proof threshold, Tour Score weights, prompt version, model order.
5. **Rerun on the dev set only.** Keep the change only if the target improves and no gate fails (the **ratchet**: the best config is saved as `evals/best.json`).
6. **Every 3 iterations,** run the holdout once and record it. If dev keeps improving but the holdout doesn't, we're overfitting; roll back to the last config that improved both.
7. **Log it:** hypothesis, change, before, after, decision. One line in `history.jsonl` per run (commit, config hash, every metric).

**Budget:** a full Gauntlet costs about 400 Qloo calls cold and under 50 warm (cached), about 300 LLM calls (cached by prompt hash), and about 3 minutes warm. Run it warm after every meaningful change, cold once a day.

### 16.11 The Report Card (the fun part, and a judging asset)
- **Format:** a sticker-style card with Gus in the corner, a letter grade per G-section (A to F), the headline numbers ("Holdout Recall@15: Wanted 0.xx vs Population 0.xx vs Generic LLM 0.xx"), and a Gus line about the biggest change ("Lift finally pulled its weight. Bloomington says thanks.").
- **Where it lives:** `evals/report.md` (generated), a `/evals` page in the app that charts every run from `history.jsonl` (an improvement curve over the week), and a screenshot in the README and Devpost.
- **Why it matters for judging:** it proves Technological Implementation with numbers, shows Qloo's contribution through the Generic LLM baseline, and gives the live pitch an honest line: "We backtested Wanted on 10 touring acts we never tuned on."
- **Rule:** the README reports only real numbers from the latest holdout run, with sample sizes. No rounding up, no cherry-picking runs.

### 16.12 Build order for the evals (fits the week)
- **Fri 23:** freeze the 40-act list and the 10-act holdout; set up the `gauntlet` runner, Report Card generator and `history.jsonl`; G1 and G3.
- **Sat 24:** G2 backtest with the four baselines (dev set); the first real number.
- **Sun 25:** G5 groundedness and tool discipline; judge calibration (20 hand labels).
- **Mon 26:** G4 rooms, G7 simulated fans, G8 safety.
- **Tue 27:** G6 pitches, G9 Playwright and Lighthouse; daily iteration loop running.
- **Wed 28:** first holdout run; real booker and real fan checks.
- **Thu 29:** final holdout run; Report Card into README, Devpost and the video.

---

## Appendix A. Sources

**Hackathon and Qloo**
- Overview, requirements, judges, criteria: https://qloo.devpost.com/
- Rules: https://qloo.devpost.com/rules
- Developer guide: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- Kit (access, safe use, submission): https://github.com/qloo/qloo-hackathon-kit
- Parameters: https://docs.qloo.com/reference/parameters
- Heatmaps: https://docs.qloo.com/reference/heatmaps-use-case
- Demographics: https://docs.qloo.com/reference/demographics-use-case
- Taste analysis: https://docs.qloo.com/reference/taste-analysis
- Compare: https://docs.qloo.com/reference/analysis-compare
- Qloo home: https://www.qloo.com/
- Company: https://qloo.com/company
- Last year's gallery: https://qloo-hackathon.devpost.com/project-gallery
- GeoTaste: https://devpost.com/software/geotaste-your-agentic-qloo-taste-business-consultant
- Memory Lane (this year): https://devpost.com/software/memory-lane-vesjc9

**Touring and AI evidence (verify primaries before quoting on stage)**
- Ditto Music survey (Jan 2025): press.dittomusic.com
- Chartmetric via MBW (May 2025): musicbusinessworldwide.com
- AI tourism bias (2025): https://www.tandfonline.com/doi/full/10.1080/13683500.2025.2522939
- USA Today AI itineraries (Oct 2025): https://www.usatoday.com/story/travel/columnist/2025/10/08/ai-trip-planners-bad-advice/86550460007/
- Live Nation Venue Agent (Sep 2026): https://www.salesforce.com/uk/news/press-releases/2026/09/16/live-nation-agentforce-expansion/

**Qloo (read and live-tested 23 Oct)**
- Hackathon developer guide: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- Parameter reference: https://docs.qloo.com/reference/parameters
- Parameters by entity type: https://docs.qloo.com/reference/available-parameters-by-entity-type
- Heatmaps: https://docs.qloo.com/reference/heatmaps-use-case
- Demographics: https://docs.qloo.com/reference/demographics-use-case
- Taste analysis: https://docs.qloo.com/reference/taste-analysis
- Search: https://docs.qloo.com/reference/get-search ; Entities: https://docs.qloo.com/reference/get-entities ; Trending: https://docs.qloo.com/reference/get-trending

**Evals**
- setlist.fm API (non-commercial, attribution, short caching only): https://api.setlist.fm/docs/1.0/index.html and https://www.setlist.fm/help/terms

**Hosting limits**
- Cloudflare Workers limits (10 ms CPU on Free): https://developers.cloudflare.com/workers/platform/limits/
- Vercel function duration (Hobby 300 s): https://vercel.com/docs/functions/configuring-functions/duration

**Competitors and precedents**
- Tour Buddy: https://tourbuddy.co/
- MyMusicTaste (PR Newswire, 2017): https://www.prnewswire.com/news-releases/planning-concerts-tailored-to-individual-tastes-mymusictaste-300576073.html
- Tootoot: https://tootoot-concerts-powered-by-fans-ios.apps112.com/

**Growth loops**
- Bump / Amo:
  - https://techcrunch.com/2023/11/19/with-amo-the-founder-of-zenly-wants-to-make-social-apps-social-again
  - https://techcrunch.com/2023/12/19/with-amos-third-app-the-makers-of-zenly-release-a-zenly-like-app
  - https://play.google.com/store/apps/details?id=co.amo.android.location
- Partiful:
  - https://www.cnbc.com/2025/04/19/meet-partiful-the-gen-z-party-planning-staple-thats-taking-on-apple.html
  - https://www.inc.com/john-jannuzzi/how-partiful-became-the-life-of-gen-zs-irl-party/91263552
- Beli:
  - https://www.nytimes.com/2025/09/15/dining/beli-restaurant-app.html
  - https://www.demandcurve.com/newsletters/growth-newsletter-285
- Letterboxd: https://www.thewrap.com/industry-news/business/letterboxd-sale-gigi-pritzker-investor-consortium-acquisition/
- Strava: https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025
- Duolingo:
  - https://www.sec.gov/Archives/edgar/data/1562088/000156208825000042/duol-20241231.htm
  - https://investors.duolingo.com/static-files/961ce633-3cee-49d0-bd7a-2c63731d45fb
- Spotify Wrapped 2025: https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase
- TBH / Gas (Nikita Bier on Lenny's): https://github.com/sare-gonenc/lennys/blob/main/episodes/nikita-bier/transcript.md
- Gas shutdown: https://techcrunch.com/2023/10/19/discord-kills-gas-anonymous-compliments-app-bought-nine-months-ago
- Bandsintown Request a Show: https://help.artists.bandsintown.com/en/articles/7048839-how-request-a-show-works
- Songkick Detour:
  - https://thenextweb.com/news/persuade-bands-to-play-near-you-with-songkicks-detour-crowdfunding-platform-kicking-off-with-london
  - https://www.bbc.com/news/business-22765879
- Queremos: https://www.lavca.org/feature/entrepreneur-profile-an-interview-with-queremos-wedemand
- DICE waiting list: https://dice.fm/blog/identify-fan-demand-with-the-waiting-list
- Laylo: https://laylo.com/creators
- Linktree:
  - https://linktr.ee/blog/we-are-linktree
  - https://musically.com/2024/05/23/smart-links-platform-linktree-now-has-more-than-50m-users
- Spotify Countdown Pages: https://newsroom.spotify.com/2024-07-24/countdown-pages-album-presaves
- Bandcamp Friday: https://www.musicbusinessworldwide.com/bandcamp-fridays-hit-154m-in-payouts-since-2020-with-19m-paid-in-2025-alone

**Expo, web glass, maps, models**
- Expo SDK 58 changelog: https://expo.dev/changelog/sdk-58
- Glass effect: https://docs.expo.dev/versions/latest/sdk/glass-effect/
- Expo UI: https://docs.expo.dev/versions/latest/sdk/ui/
- Native tabs: https://docs.expo.dev/router/advanced/native-tabs/
- DOM components: https://docs.expo.dev/guides/dom-components/
- EAS pricing: https://expo.dev/pricing
- OpenFreeMap: https://openfreemap.org/
- Glassy UI (React + React Native, MIT): https://glassyui.com/components , Expo guide: https://glassyui.com/guides/expo , mobile: https://glassyui.com/mobile
- libraries.dev (Beam, Orbs, Gooey, Voice, Bots, Metal, Image; MIT): https://libraries.dev , skill: https://libraries.dev/skill.html
- before skills (App Store ASO skill, for later launch): https://github.com/alexszczurek/before-skills
- Great apps gallery: https://greatapps.fyi/
- Pattern apps:
  - Flighty: https://apps.apple.com/us/app/flighty-live-flight-tracker/id1358823008
  - Run Receipt: https://apps.apple.com/us/app/run-receipt/id6759910078
  - corner: https://apps.apple.com/us/app/corner-curate-share-places/id1668282277
  - PI.FYI: https://apps.apple.com/us/app/pi-fyi-log-your-favorites/id6474037926
  - Airbuds: https://apps.apple.com/us/app/airbuds-widget/id1638906106
  - Any Distance: https://apps.apple.com/us/app/any-distance-running-tracker/id1545233932
  - Bump: https://apps.apple.com/us/app/bump-real-life-is-happening/id6471519217
- Gemini pricing and data use: https://ai.google.dev/gemini-api/docs/pricing
- Groq limits: https://console.groq.com/docs/rate-limits
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Apple HIG materials: https://developer.apple.com/design/human-interface-guidelines/materials

---

## Appendix B. Image assets

Generated with GPT Image (ChatGPT or `gpt-image-2`/`2.5`), quality high, PNG. Prompts live with the builder; this is the manifest Claude Code builds against. Put files in `assets/images/`. Claude Code converts to WebP, makes @2x/@3x where needed, and measures the poster's frame and text-line coordinates after the poster is final.

| # | File | Generate at | Background | Used in |
|---|---|---|---|---|
| 1 | `gus-sheet.png` | 1536x1024 | cream, opaque | Reference only (attach to every Gus prompt) |
| 2 | `icon.png` | 1024x1024 | opaque | iOS icon, favicon, splash |
| 2b | `icon-foreground.png` | 1024x1024 | transparent | Android adaptive icon (background color set in `app.json`) |
| 3 | `poster-0.png` | 1024x1536 | transparent | WANTED poster base (only "WANTED" and "REWARD" printed; frame and lines blank) |
| 3b | `poster-1/2/3.png` | 1024x1536 | transparent | Battered versions at 50, 100, 250 signatures (same layout) |
| 4 | `backdrop-story.png`, `backdrop-wide.png` | 1024x1536 (or 1152x2048 via API), 1536x1024 | opaque | Behind the poster in the 1080x1920 share image and 1200x630 link preview |
| 5 | `maya-engraving.png` | 1024x1024 | transparent | Portrait inside Maya's poster (real artists: photo plus sepia/halftone filter in code) |
| 5b | `maya-sticker.png` | 1024x1024 | transparent | Demo artist avatar |
| 6 | `stamp-caught-live.png` | 1536x1024 | transparent | Post-show stamp on poster and Signature Card |
| 7 | `deputy-star.png` | 1024x1024 | transparent | Deputy mark (check legibility at 64 px) |
| 8 | `gus-signing.png` | 1024x1536 | transparent | Signing page hero |
| 9 | `gus-lets-ride.png` | 1536x1024 | transparent | Threshold alert, "Let's ride" |
| 10 | `gus-loading.png` | 1024x1024 | transparent | Scout loading state |
| 11 | `gus-tumbleweed.png` | 1536x1024 | transparent | Data gap and empty states |
| 12 | `maya-mugshot.png` | 1024x1536 | opaque | Rap Sheet header (stretch) |
| 13 | `van.png` | 1536x1024 | transparent | Route line, Tour screen, toasts |
| 14 | `cover.png` | 1536x1024 | opaque | Devpost thumbnail, README banner, video title card |

Built in code, not images: map and heat hexes, signature scrawls (handwriting font), poster text, Signature Card and Rap Sheet layouts, OG renders, Gus expressions in chat (crops of `gus-sheet.png`).
