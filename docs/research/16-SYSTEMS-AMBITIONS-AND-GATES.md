# 16. From taste agent to reliable touring operator

Updated October 25, 2026. This chapter extends the research pack with implementation evidence from the dirty local worktree. It is not a second independent customer study or a claim of deployed functionality.

## North star

Gus should carry an operator-owned show from **cultural hypothesis → feasible bill → exact reviewed terms → permitted effect → receipt → advance → show → settlement → useful memory**. The value is a real milestone reached with fewer corrections and interruptions, not an impressive conversation or an ever-growing tool list.

Three different kinds of truth must remain separate:

1. **Qloo cultural evidence:** who/where may fit, with supplied-roster scores, source/cache status and sensitivity. Not availability, local draw or ticket sales.
2. **Operational evidence:** calendars, written offers, authorized contacts, capacity, riders and actual reports. An LLM may interpret evidence, not invent it.
3. **Authority/effects:** exact current human review, role/recipient/payment permissions, business idempotency and receipts. A provider accepted request is not a venue agreement.

## Implemented backend increment

- The real model sees state-scoped tools. Inspection precedes planning; only one tool call per completion is accepted. Wait/receipt/cancellation boundaries cannot be bypassed by tool batches.
- Expired scene evidence stops before a new cultural query. Comparison results explicitly return the justified next wait. Server qualification and minimax choice remain deterministic.
- The strict extended live-model suite has 12 named scenarios and requires uncached execution, responding-model evidence, exact expected candidate where applicable, exact effect counts, no prepared request on abstention and zero rejected calls. Missing/duplicate cases cannot be published as a pass.
- Latest strict rerun: 12/12 passed with zero rejected calls, 30 OpenRouter HTTP requests and zero new Qloo HTTP requests. Qloo used existing caches. Earlier failures remain private; this is one run, not a reliability confidence interval or model-quality benchmark.
- A task wait atomically queues generation/version-scoped internal attention. Restart/concurrent drain saves one notice; changed or paused tasks cancel stale notices. A reply wait does not repeatedly nag the artist. No push/SMS/outbound phone delivery is claimed.
- Calls reserve one active slot and the weekly budget transactionally. Unknown local hour suppresses new ringing. Stored scripts and exact offer snapshots survive restart; delayed answers cannot pay changed offers.
- Canonical call speech uses the server's stored current script, not supplied client text. Long decision text is not silently truncated. Voice calls have a bounded transport budget, MIME/length checks, cache honesty and credit-limit stopping.
- Exact commerce decisions persist before execution. Conflicting yes/no or changed scope is denied. Original payment receipts survive lost acknowledgment and changed offers. Stripe test retries use the same scope-specific idempotency key; expired/old uncertain intents require reconciliation rather than blind reposting.
- Payment receipt, simulated held state and post-payment continuation are committed together. Bounty/promotion continuation is a leased, bounded-retry queue, independent of payment execution. This is not a general real-inbox/delivery connector.
- Integer-cent economics supports fixed guarantee, defined after-deduction split and greater-of versus scenarios. Deposits are credited advances, not duplicate costs. Qloo/signatures do not supply attendance assumptions. General taxes, cancellation, rider and legal settlement semantics are still outside that calculator.

## The next ambitions, ordered by prerequisite

### A. One real operator-owned show

**Outcome:** import/review a small consented roster and written show facts, preserve sources/unknowns, and prepare one useful artifact without pretending the inbox is verified.

**Required:** authenticated owner/role, jurisdiction/currency, consented redacted input, explicit mapping/disambiguation, current availability and intake permission. Start with manual import/export, not automatic outreach.

**Gate:** three observed operator task sessions; record minutes, corrections, missing facts, unnecessary interruptions and whether the next milestone was genuinely useful. Use the same factual inventory for a blind baseline. Do not ask a model to grade its own usefulness.

### B. Cash-safe commerce, then a real permitted rail

**Outcome:** one current authorized amount/payee/currency/purpose, one permitted effect, one reconciled receipt.

**Required:** verified payer/payee and money direction; actual agreement; exact approval expiry/version; role authorization; suitable Stripe account/product configuration; permitted connected account/recipient where transfers are intended; webhook verification and business dedupe. A PaymentIntent charge alone does not transfer money to a room. A Qloo place ID is not a Stripe payee.

**Gate:** sandbox provider acceptance followed by timeout/restart/webhook replay; conflicting decisions; changed payee/currency; duplicate delivery; cancellation after acceptance; expired provider idempotency retention. Real money remains disabled until identity, terms, permissions and reconciliation are independently reviewed.

### C. Voice that conveys and preserves decisions

**Outcome:** a short exact brief, understandable audio plus matching caption, a clear correction/stop path, and the same current review as the card.

**Required:** Fish Audio API credit for the existing key; platform/app credit is not necessarily API credit. The direct Fish probe returned HTTP 402. A later OpenRouter speech probe succeeded: `fish-audio/s2.1-pro-free:free`, uncached MP3, 200,201 bytes, four credential attempts, about 9 seconds. The free speech model is discovered with `output_modalities=speech` and uses `/api/v1/audio/speech`. No human prosody/intelligibility/native-playback success is claimed. The default runtime now tries that free OpenRouter rail first, with separate private speech backoff and the existing explicit voice reference, then direct Fish if available.

Fresh primary references: https://openrouter.ai/docs/guides/overview/multimodal/tts and https://openrouter.ai/fish-audio/s2.1-pro-free:free . Free service availability/latency is not a production SLA; only free OpenRouter speech is allowlisted, not automatic paid model upgrades.

**Gate:** human intelligibility of room/date/year/amount/currency; quiet-hour behavior; barge-in/cancel; stale-call rejection; offline/audio failure caption parity; no decision inferred from ambiguous ASR. Spoken 'yes' is not blanket approval. Microphone input/ASR is a separate consented capability, not implemented here.

**Qloo connection:** taste informs the evidence in a brief and culturally appropriate campaign candidates. It should not infer a fan's accent, identity, allergy or sensitive preferences, or become voice-cloning permission.

### D. Advance desk and offline day sheet

**Outcome:** the current load-in/soundcheck/set/curfew, production/contact/location and unresolved questions survive poor connectivity.

**Required:** operator/crew roles, sourced local times/time zone, rider acknowledgments, actual production contact and offline privacy boundary.

**Gate:** date/time/venue change invalidates only affected dependencies; unknown is visible; sending a rider is not acknowledgment; lost connectivity cannot erase essentials. Then one actual Road Care window with explicit diet/access/safety constraints and real opening/availability checks, not a generalized restaurant recommendation.

### E. Ambient work with an attention budget

**Outcome:** the right work happens while the operator is away, and only genuinely blocked/high-stakes steps interrupt.

**Required:** hosted scheduler configuration and secret; permitted push/phone/email connector; persisted operator time zone/preferences; receipts for delivery; acknowledgment and timeout policy. Current internal inbox delivery is durable, but an app check-in is not an outbound phone call.

**Gate:** events out of order/duplicated; process dies during a wait; approval arrives after expiry; operator pauses for days; a call is missed; more work than a scheduler window can finish; no background model polling solely because a human hasn't answered.

### F. Outcome memory, not recursive self-hype

**Outcome:** source-backed show outcomes improve the next return date or operating procedure.

**Required:** consented settlement/attendance source, operator feedback, intervention/version trace and frozen holdout tasks. Personal fan records stay outside provider prompts.

**Gate:** every proposed policy change has a hypothesis, dev-only evaluation, explicit holdout gate and rollback. No self-issued broad permissions, automatic spending increases, silent prompt promotion or model-written 'success' labels.

## Eve migration: evidence and decision

I freshly read Eve's overview and durability guide on October 25:

- https://eve.dev
- https://eve.dev/docs/concepts/execution-model-and-durability

They document durable sessions/steps, parked human waits and Workflow worlds; the local world persists on disk, and self-hosted/deployment upgrades have compatibility/handoff caveats. Interrupted steps can rerun side effects, so application-owned business idempotency remains necessary. A session/compaction history is not the business ledger.

**Decision:** retain the now-tested narrow Expo/Turso runtime for the current job. Do not claim Eve adoption or native integration. The next Eve spike must use a separate service/package so the existing Expo build is not replaced merely to add a framework logo. It must pass the same exact approval, duplicate reply, crash-after-effect, pause/change fencing and deployment-version tests before migration. No subagents are required for that spike.

The migration should replace orchestration transport, not Qloo contracts, operator identity, exact scopes, receipts or approval arithmetic. Avoid optional arbitrary shell/network tools in the touring agent. Pin the tested Eve/Workflow versions and persist the chosen world; a process-only or ephemeral deployment filesystem is not production durability.

## What needs the user's setup, not more code

- Direct Fish Audio **API** credit if that rail is desired. OpenRouter free Fish speech now succeeds with the configured pool, but production availability/latency and human voice quality remain open.
- Stripe **test** key/account for an actual provider test. No key was configured during this increment; mocked transport is not a live Stripe pass.
- One real self-booking operator, consented show/roster and a permitted contact path.
- Deployment scheduler/secret and the chosen hosting/runtime/world configuration.
- Production auth/roles, delivery permissions and licensed fonts/assets before release.

Everything else can continue as bounded backend work. These gates are safeguards against pretending a fictional venue, test charge or taste score has accomplished a real show.


### Follow-on: playback cancellation is an execution boundary

Stopping voice must stop pending generation too. A canceled or superseded response is fenced from playback and onEnd, on both native/web; decision progression is not owned by an arbitrary old audio callback. Canonical calls revalidate persisted offer/status after synthesis and do not trust local audio caches for current authority. Bounded streaming audio reads prevent an oversized successful MIME response from becoming unbounded memory. The full stored 326-character call was synthesized uncached through the local HTTP API to 386,611 MP3 bytes in 12,329ms. This is transport evidence, not a human acoustic/prosody/device pass.

Next voice ambition: measure first audible/useful latency on a physical device, then a consented human preference/intelligibility set. Keep streaming/barge-in/ASR separate from payment authority; do not infer approval from an ambiguous transcript.


### Implemented extension: voice carries the taste preparation, not authority

The separate spoken-brief API bridges the supplied-roster Qloo planning job to Fish speech with deterministic, previewed facts. It explicitly says preparation only, operator assertions, cultural taste rather than demand, and nothing sent/approved/paid. A preview version/source digest is mandatory, cookie scope is checked, and changes during synthesis fail. Unknown availability/fee cannot become a confident proposal or free quote. This adds a useful agent capability without making an interface redesign or bypassing the real-authority gate.

A delayed synthetic provider test also broke and fixed call decline-versus-yes ordering: a transaction commits the selected call decision before execution, so later contradictory decisions cannot hide a paid original receipt. No outbound phone connector or live provider verification is implied.
