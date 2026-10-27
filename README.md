# Wanted

**Find out where you're wanted.** Gus is the tour manager indie musicians and comedians can't afford. He reads Qloo's taste graph to find where an act's crowd actually lives, block by block, puts a WANTED poster up in those cities, and when enough fans sign, he books the room and starts selling the show. Built for the Qloo Agentic Hackathon, "Agents, but with taste."

**Live demo:** https://wanted-qloo.vercel.app (web, works on a phone). The same app runs natively on iPhone from this repo.

## Booking desk: the focused workflow

From **Fan Mail**, open **Who should share the bill?** Or use `/a/maya-ortiz/desk` locally.

Gus compares the same four illustrative candidates against your sound and an example scene, explains the trade-off, and brings back the artist, date and support fee for your exact OK. Nothing is sent until the separate **Save to test inbox** step. No real artist is contacted and no money moves.

Change the scene from left-field to indie/folk without changing the roster or budget. In the tested case, the choice changes from Thundercat to Lucy Dacus. The optional sound-reference check also exposes sensitivity instead of manufacturing confidence. These are taste comparisons, not ticket-sales validation.

**Work through a booker’s reply** lets you paste a redacted excerpt, review a suggested date/support budget, correct it and apply only the chosen fields to the practice show. The pasted text stays on the device; only reviewed fields and a fingerprint are posted. This is not verified inbox identity or real booking authority.

Optional practice controls simulate a changed date/budget or a lost send result. Old approvals stop; the original receipt can be recovered without another message. **Updates** shows the saved record in plain words; technical evidence is available separately. See [the audience/UX decisions](docs/ARTIST-UX.md).

`npm run typecheck`, `npm test`, and `npm run desk:smoke` verify the contracts and live local API. `npm run test:e2e` contains phone-sized browser coverage, but Chrome launch is currently blocked in this local environment. Run `npm run build:web` for the production export.

## Gus can own the bill job

From the booking desk, choose **Let Gus handle the bill**. He qualifies the supplied list, compares your sound with the scene, prepares an exact request, and waits. Pause or resume the job without losing work. Changed dates block on availability; budget changes replan or ask for a choice. Your OK and saving to the test inbox remain separate. Saved requests that later change stop for follow-up rather than being silently replaced.

`npm run agent:smoke` exercises the live local API with isolated cases. `npm run gauntlet -- --integration` runs typecheck, contract/state tests, production export, both API workflows and Qloo signal-sensitivity. None of those gates measures real operator preference or ticket uplift.

Gus now uses a real, bounded OpenRouter tool loop: inspect the show, compare the qualified bill, prepare, recover or establish a justified wait. Qualification, bill-policy selection and exact authorization remain server-enforced, not model guesses. Technical evidence identifies the responding models, cache status, accepted/rejected steps and any fallback. The planner has a 90-second parent deadline and checks its current lease/version between steps.

`npm run eval:llm -- --extended --strict-policy` runs 12 named uncached model scenarios; rules fallback fails that gate. The latest run passed all 12 with zero rejected tool calls, 30 OpenRouter HTTP requests and no new Qloo HTTP requests (existing Qloo caches). That is one fixture run, not human preference, real draw or ticket-demand validation. An operator-supplied credential pool is private/deduplicated; limited or invalid slots back off, and all slots limited means honest unavailability. No paid model upgrade is automatic. Earlier failed runs stay private. `npm run eval:report` publishes only allowlisted counts/labels to `evals/report.md` and the local `/evals` screen.

The human wait now commits a generation/version-scoped internal attention outbox. Restart/concurrent drains save one inbox notice; pause/changes cancel stale notices and reply waits do not nag. Phone calls store the exact offer they spoke, reserve the active/weekly budget transactionally and refuse delayed answers to changed terms. Unknown local hour suppresses new ringing.

Voice tries **OpenRouter's free Fish S2.1 Pro speech route** first, then direct Fish if available. `npm run eval:voice` returned an uncached 200,201-byte MP3 in about 9 seconds. The direct Fish rail returned HTTP 402, insufficient API credit. Canonical call speech reads server-stored current text and does not silently truncate the decision. Human pronunciation/prosody/native playback remain untested.

Legacy simulated venue-deposit decisions now require exact `{version, hash}` review. A persisted choice, provider idempotency key and separate original receipt prevent conflicting decisions or replacement payments. Receipt, held simulation and Bounty/promotion continuation commit together; failed continuation is retryable without another charge. Stripe remains test-only and was **not live-tested** in this increment because no test key is configured. A test PaymentIntent is not a venue transfer, counterparty agreement or settlement.

The integer-cent `showEconomics` engine models explicit guarantee, defined net split and greater-of versus scenarios, crediting advances without double counting. It accepts hypothetical ticket counts, not Qloo/signature demand forecasts. The optional local `/economics` scratchpad does not post financial entries to providers or the server. See [the backend ambition/gate map](docs/research/16-SYSTEMS-AMBITIONS-AND-GATES.md) and PRD §17.

A persisted lease/generation/retry budget protects each bounded run. `npm run jobs:drain` resumes queued, interrupted and due work. For deployment, configure an external scheduler to call `GET /api/cron/gus` with `Authorization: Bearer $CRON_SECRET` (32+ characters); the endpoint denies missing/weak authorization. A hosted schedule is not configured by this code change. No raw provider/fan data belongs in public reports.

The full research-to-build audit and ordered next gaps are in [docs/BUILD-AUDIT.md](docs/BUILD-AUDIT.md). Current operating facts and the inbox remain fictional/local-only. Real operator authority, qualified real roster and a permitted delivery connector remain the next gates.

## Try it in two minutes

1. Open the demo and tap **Skip** (or go through the four intro cards). You land on Maya Ortiz's map, a demo act. The heat is Qloo's prediction of where her crowd lives.
2. Tap any city to see the neighborhoods, the rooms Qloo ranks for her taste, and who her fans are.
3. Go to **Fan Mail**. The top card, **Watch Gus work on his own**, plays fans signing Burlington's poster until it fills. Then Gus takes over without being asked: he finds venues, skips the ones closed that night, asks three for a hold, and brings back the best offer.
4. Tap **Have Gus call me about it**. Gus rings, says the offer out loud, and you say yes or no. The deposit is paid in test mode.
5. Tap **See how he fills the room**. Gus has already told the fans who signed, and picked poster spots in the neighborhoods where the crowd hangs out. He asks before he pitches a podcast those fans listen to, invites an opener who shares the crowd, or spends on ads.
6. Tap **See Burlington's poster as a fan** to see the other side: the signers get first dibs on tickets, and one of them wins a meet-up at soundcheck.
7. Open **Gus's Logbook** (Fan Mail) for everything he did, in plain words, and the few things he may do without asking.

You can also type in any act on the first screen to get your own map.

## What makes it Qloo-powered

Without Qloo, Gus is guessing. Each city sheet has a **Without Qloo** switch that shows what a plain LLM says for the same question, marked against Qloo's answer.

| What Gus does | Qloo call |
|---|---|
| Finds the acts you sound like | `/search`, entities by ID |
| Ranks every US city for your crowd, against a panel of 20 other acts | `/v2/insights` with `filter.type=urn:heatmap` |
| Finds the neighborhoods inside a city | `urn:heatmap` scoped to the city |
| Ranks music and comedy rooms for your taste, with the reason | `urn:entity:place` + `feature.explainability` |
| Picks poster spots where your crowd hangs out | `urn:entity:place` in the top neighborhoods, hang-out tags |
| Learns who your fans are | `urn:demographics`; cross-domain `tv_show`, `movie`, `brand`, `podcast`; `urn:tag` |
| Finds an opener who shares your crowd | `urn:entity:artist` / `person` with a popularity cap, then `/v2/analysis/compare` |
| Aims ads at the right people | demographics + cross-domain shows |

## The agent pattern

**Predict → Prove → Act → Escalate → Remember.**

- **Predict:** Qloo says where demand should be, so the map is full on day one.
- **Prove:** fans sign a poster. A signature is consent-based proof, and it checks the prediction.
- **Act:** Gus books inside limits the artist sets: biggest deposit, smallest cut of the door. Every payment uses a one-time pass for an exact amount, payee and deadline.
- **Escalate:** he reaches the artist in proportion to the stakes: a Logbook line, a note, a question, a review card, and rarely a phone call. He respects quiet hours.
- **Remember:** every action and outcome goes in the Logbook.

Privacy: fans' neighborhoods and contacts never go to Qloo or any AI model. Gus only queries Qloo with the act's taste and Qloo's own neighborhood names.

## Run it locally

```bash
npm install
cp .env.example .env   # add QLOO_API_KEY; the others are optional
npm run seed           # demo act and cached Qloo data
npm run web            # http://localhost:8081
```

iPhone: `npx expo prebuild -p ios`, then `npm run ios` (a Debug build, so it loads JS from Metro).

Environment:

- `QLOO_API_KEY` (required)
- `OPENROUTER_API_KEY` / `OPENROUTER_API_KEYS` (Gus’s tool planning and lines; explicitly labeled rules/template fallback)
- `FISH_AUDIO_API_KEY` (optional direct voice rail; OpenRouter free Fish speech is first)
- `STRIPE_SECRET_KEY` (test key only; live keys are refused)
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` (hosted database; defaults to a local file)

Stack: Expo SDK 57 (one codebase for web and iOS), Expo Router API routes, libSQL/Turso, MapLibre + deck.gl, Reanimated.

Test mode: no real money moves, and Gus's notes to podcasts and openers aren't really sent. Demo signatures are labeled as demo data everywhere.

## License

MIT. See [LICENSE](LICENSE).
