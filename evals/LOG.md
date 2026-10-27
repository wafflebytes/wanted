# Gauntlet improvement log

One entry per iteration (PRD 16.10): hypothesis, the one knob changed, before, after, decision.

## 2026-10-23 · Iteration 1 · Heat field

- **Hypothesis:** the PRD's heat (mean `affinity_rank` within 30 km) can't separate metros, because `affinity_rank` is saturated near 1 in every populated cell.
- **Evidence:** across all US cells for Morgan Wallen, `affinity_rank` quantiles were p25 0.932, p50 0.982, p75 0.994. Columbus 0.99989 vs New York 0.99982. With rank-based heat, college towns were "sleepers" for every act (Laramie, Corvallis, Missoula for both Phoebe Bridgers and Morgan Wallen).
- **Change:** `config.score.heatField` from `r` (affinity_rank) to `a` (affinity, uniform 0..1), weighted by each cell's Qloo `popularity`.
- **Before (sleepers, rank heat):** Wallen: Laramie, Stillwater, Oxford, Missoula, Starkville, Corvallis, Pullman... Kendrick Lamar: Missoula, Auburn, Oxford, Corvallis, Hattiesburg, Bozeman...
- **After (sleepers, affinity heat):** Wallen: Starkville, Hattiesburg, Muncie, Athens GA, Oxford MS, Davenport, Mobile, Ames. Kendrick Lamar: New Orleans, Flint, Baltimore, Baton Rouge, Jackson... Bridgers + Japanese Breakfast: Eugene, Corvallis, Bellingham, Ithaca, Missoula, Salem, Albany, Charlottesville. Bad Bunny: Visalia, Killeen, Bakersfield, Fresno, Tucson.
- **Decision:** keep. Golden checks still hold (Wallen: Knoxville top heat; Bad Bunny: San Juan top heat; Bridgers: Portland top heat). Lift stays the PRD's simple "heat minus panel mean" since it is now artist-specific; z-score and panel-percentile variants were tried and were not clearly better.

## Iteration 2 (23 Oct): grounding loopholes and honest marks

- **Spelled-out numbers slipped past the check.** Route roasts came back as "Thirteen point one hours to Asheville when New York was four point one away." The number check only read digits, so a model could invent "twenty hours" in words and pass. `checkGrounded` now parses spelled numbers (`parseSpelled`: "thirteen point one" -> 13.1, "twenty-one" -> 21) and checks them like digits. The system prompt asks for digits. Prompt version gus-v1 -> gus-v2.
- **False positive on city names.** The pitch check matched case-insensitively, so "Thanks for reading." tripped on Reading, PA and every pitch fell back to Gus (lite). City names now match case-sensitively, and a short list of metros that are everyday words (Reading, Mobile, Normal, ...) is skipped at sentence start.
- **Without Qloo marks were too harsh to be credible.** A real neighborhood missing from Qloo's ranked list (Short North, German Village) was marked as wrong. Marks now have three levels: `ok`, `unverified` (no taste evidence behind it) and `wrong` (Qloo's data contradicts it: venue in another city, permanently closed, closed that night). Only `wrong` counts toward the error rate; `unverifiedRate` is reported separately.
- **County hygiene.** Upstate New York counties come back without the word "County" (Ulster, Dutchess, Orange, 2,100 to 3,000 km²). Localities over 1,200 km² are now dropped. Small neighborhoods come back as `POINT` boundaries, which the parser skipped, so fan dots stacked on the city center; `wktSummary` now reads points.

## 2026-10-25 · Durable bill ownership

- Hypothesis: one persisted qualify/compare/prepare/wait/replan job reduces repeated artist orchestration without broadening send/payment authority.
- Change: leased/generation-fenced find-support task with transaction-wakes, explicit pause/resume, due expiry checks, original-receipt reconciliation and follow-up abstention. Compact approval UI keeps exact terms visible.
- Evidence: 132 automated cases and local production export pass; desk API, durable-task API and same-pool Qloo signal-sensitivity gates pass. Browser layout verification at 393 × 852 passes for the inspected path.
- Decision: keep as the fixture runtime foundation. Operator usefulness/real roster/real delivery/native behavior are unmeasured. This is not a customer holdout, demand backtest, full G1–G9 report card or Eve adoption.


## 2026-10-25 · Actual LLM tool-use evaluation

- Correction to the earlier evidence: the original 132-test/API gauntlet verified contracts and Qloo mechanisms, not uncached model judgment.
- Change: real bounded model-directed inspect/compare/prepare/recover/wait loop, strict tool schemas, exact current-choice enforcement, fresh version/lease checks and a 90-second parent budget. Qualification and the minimax bill policy remain deterministic. The LLM does not approve, send or pay.
- Real evidence: the final live run made **22 OpenRouter HTTP requests** using Nemotron 3.5 Lightning free, with uncached responses. **Six of eight business-outcome scenarios passed**: valid bill → approval; approved-but-unsaved → save; lost original receipt → reply with one effect; historical receipt → follow-up without replacement; changed date → availability; no qualified bill → evidence. Qloo was served from existing provider caches in this run (zero new Qloo HTTP requests). Super VL was also exercised in preliminary uncached probes and preparation runs.
- Important diagnostic: six premature comparison tool calls were rejected by server gates and corrected by the model. Do not present the six eventual outcomes as six flawless first-attempt policy decisions. A preliminary receipt run exhausted its six-turn budget; returning the refreshed justified wait from recovery fixed the evidence handoff.
- **[blocked]** scene-counterfactual and two-context-abstention: HTTP 429, account-wide 50-request daily free-tier quota. No rules fallback is counted as an LLM pass. A complete rerun is scheduled for **26 Oct, 16:45 Asia/Calcutta**, more than 25h later. No paid credits or quota-evading key rotation is authorized.
- Additional verification: **149 synthetic contract/state/transport tests pass**, including model-facing boundaries, pause/change fencing, deadline abort, quota backoff, cache honesty and credential redaction. These mock-completion/HTTP tests are separate from the real-model outcomes. Final API/export verification is recorded separately.
- Private evidence: `.data/agent-llm-latest.json`; initial failure preserved in `.data/agent-llm-initial-failure.json`. Credentials, raw fan/contact fields and hidden reasoning are not report artifacts. The strict runner now distinguishes unavailable/failed model execution from an actually executed rules fallback.
- Decision: keep the bounded hybrid runtime; continue evaluating first-choice policy compliance and useful human outcomes. No operator holdout, real delivery, payment, local draw, ticket uplift, production scheduler, Eve adoption or native accessibility proof is claimed.


## 2026-10-25 · State-scoped model tools and stale-first evidence

- Hypothesis: a fixed full tool menu creates avoidable comparison/prepare guesses after authoritative waits. State-scoped capability plus an explicit next-wait handoff should reduce wasted model calls without changing authority.
- Before: pooled eight-case rerun passed all outcomes but only 2/8 had zero rejected calls (27 requests).
- First extended iteration: 11/12 strict passes; expired scene reached evidence only after a rejected choice wait. Preserve this failure instead of counting eventual correctness as flawless.
- Change: reject batches, offer only currently valid tools, inspect first, stale context before lookup, explicit comparison justifiedWait.
- After: 12/12 strict uncached outcomes, zero rejected calls, 30 requests, zero new Qloo calls. Operating records remain fictional. The new named assertions check exact expected bill choice/effect counts and no preparation on abstention.
- Decision: keep for this fixture runtime. Repeated model trials, independent human outcomes and demand calibration remain open. Private baselines: `.data/agent-llm-pool-baseline.json`, `.data/agent-llm-state-scoped-initial.json`.

## 2026-10-25 · Durable attention, exact call/commerce scope and voice

- Atomic internal attention survives restart/concurrent drains and cancels stale generations. No real push/phone delivery.
- Stored call scope blocks stale spoken answers; concurrent check-ins reserve one active call and weekly budget. Unknown local hour means no new ring.
- Scoped persisted commerce choices handle concurrent/conflicting decisions, lost receipts and changed offers. Receipt/held simulation/continuation queue commit together. Synthetic tests simulate Stripe idempotency and provider failure; no live Stripe key/test is claimed.
- Direct Fish voice returned 402. After inspecting the speech-specific OpenRouter catalog/docs, a real uncached free Fish synthesis returned 200,201 MP3 bytes in about 9 seconds across four attempts. No human pronunciation/prosody/native-playback grade. `eval:voice` reports transport separately.
- Final contract/API/export totals are recorded in the latest gauntlet, not inferred from earlier test counts.


## 2026-10-25 · Voice cancellation and canonical call integrity

- Broken case: stopping a voice while its fetch was pending did not abort/fence the response; a late clip could play after decline or supersession. Both native/web now use an abort + generation gate. Late onEnd cannot unlock a later decision. Native cache keys use SHA256 instead of a 32-bit digest.
- Canonical call clients never bypass current server validation through a local cache. The server validates exact offer and active call before and after synthesis, and serves canonical response no-store. Scope changes/decline/cancellation during synthesis reject even a cached clip.
- Provider audio now has a five-MiB declared/chunked byte envelope. Malformed MIME/non-audio remains a failure; no automatic false voice success.
- New focused voice/call/transport suite: 22 passing synthetic tests. Actual canonical HTTP probe: 326-character stored script, 386,611-byte MP3, 12,329ms, free Fish route, uncached. Supplied client text/mood cannot replace canonical speech. Isolated demo rows cleaned; no real ring/payment.
- Transport/model evidence is not acoustic accuracy, human voice preference or native device behavior. Samples are available for listening; those gates remain open.
- Repeated strict 12-case model run now also checks provider-reported IDs: 12/12, zero rejected calls, 31 HTTP requests, zero new Qloo. The earlier 30-request successful run remains a separate observation.


## 2026-10-25 · Qloo preparation speech and concurrent call decisions

- Added cookie-owned spoken preparation previews: deterministic stored facts, exact source/version hash, explicit preparation-only/operator-asserted labels and no booking/demand/contact/payment claims. POST requires that preview, not client text, and revalidates after TTS. Six tests break revision/source changes, expiry, canceled request, missing facts and cross-artist scope; no effects or approval tokens are created. New API is /api/artist/[id]/brief-voice, not an added UI screen.
- Exact canonical speech rejects control markup rather than silently removing an important name/decision fact.
- Broken race: a decline/no could arrive while an exact yes was executing and falsely leave a declined-but-paid call. The selected call decision is now stored transactionally before provider execution; conflicting decline/no fails, repeated same-scope choice can reconcile via existing commerce records. Synthetic delayed Stripe test asserts one payment and final done/yes. No live Stripe provider test.
- Client call sessions also fence late pickup, answer and timeout responses. Failed decline is not reported as closed; rejected pickup is not automatically converted into a captions approval flow. Passing on a simulation does not claim a real message was sent.
- Full current npm test: 226/226. Typecheck passed. Web/native export and refreshed integration results are separate gates, recorded after execution.
