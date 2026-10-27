# 08. Local implementation audit and build order

## Baseline and caveat

I inspected the local /Users/chaitanya/wanted project, not just committed GitHub main. The earlier review compared 213 source/docs/script files and found 26 local changes/additions. This is not a complete Git-status audit: macOS Git access was blocked. No application code was changed, no dependencies installed and no existing application tests were run.

The local README and MIT license exist. The local post-booking show plan exists. Do not rebuild those features based on the earlier incomplete committed-main assessment.

## Observed strengths to preserve

- Expo/React Native web/iOS implementation and distinctive visual/voice identity.
- Artist/reference resolution, geographic heat/score and city detail.
- Rooms, openers, crowd/cross-domain context and receipts.
- Fan poster/signature/referral/bounty mechanics and Logbook.
- Watcher-triggered action, deal simulation and exact approved test-payment shape.
- Grounded templates/lite fallback and number/name checks.
- Existing Filling the room flow: first dibs, poster selections, approval-gated podcast/opener/ads steps and show UI.
- Explicit test/demo labeling in README and parts of the flow.

The live hosted map's successful cached Qloo receipt was inspected. Local work may differ from the deployed app; deploy/commit parity remains a submission task.

## Concrete gaps and existing files

### 1. Interest semantics, not ticket proof

Relevant files: src/server/claims.ts, config.ts, watcher.ts, service.ts and score.ts.

Observed proof ratio: city share of all artist signatures divided by city heat share. The configured trigger is at least 50 signatures and ratio at least 1.5. This is an interest-over-index heuristic, not a signed-versus-predicted attendance count or calibrated demand confidence.

A campaign promoted more heavily can over-index without stronger organic demand; other cities' signatures alter the denominator. Separate exposure/traffic, date-specific intent, ticket clicks/purchases and attendance. Preserve consent/referral tracking, but call the trigger readiness for research/escalation, not automatic commercial viability.

### 2. Qualification before room/roster ranking

Relevant files: src/server/qloo/api.ts, city.ts, crowd.ts, service.ts and Gus tools.

The adapter has discovery/openers/compare, but not a supplied verified-candidate ranking interface. Popularity caps do not establish locality or draw. Add an inventory layer with Qloo mapping, current location/scene association, contact/guidelines, scale, availability and evidence timestamps.

The live candidate-filter test passed for known artist inputs. It is not proof of emerging-local-artist coverage. Unknown mappings must not become guessed names or zero-fit scores.

### 3. Deal model truth

Relevant files: src/server/deals.ts and autobook.ts.

Observed: house terms are stand-ins, with size-band capacity/fee constants, artist door share and artist-paid deposit. Preserve transparent simulation. Add deal type and money direction before calling it a general booking operator. Real venue offers must come from an authorized counterparty, not Qloo-derived pricing.

Both primary guidance and a named current band contradict treating artist deposits as universal. [I1](12-SOURCES.md#i1), [I6](12-SOURCES.md#i6), [I7](12-SOURCES.md#i7)

### 4. Prepared vs delivered vs acknowledged

Relevant files: src/server/showplan.ts, outbound.ts and logbook.ts.

Observed show-plan first-dibs step uses done/Told language; poster selection is done research; approvals mark steps done or skipped. The code explicitly records podcast notes as saved/not really sent and ads as test mode. These are useful demo boundaries, but done conflates different outcomes.

Add preparation, authorization, provider acceptance, recipient acknowledgment, completion, failure and uncertain states. Change unsubstantiated statements such as same crowd so room fills earlier and broad podcast-audience claims. Explain cultural compatibility and unknown operational effect instead.

### 5. Durable watcher/action chain

Relevant files: src/server/watcher.ts, autobook.ts, deals.ts and showplan.ts.

Observed normal watcher path starts autoBook with a catch and only awaits it when awaitChain is requested. A lost background chain was **not reproduced**. It is nevertheless a concrete serverless/process-lifetime risk to address with durable jobs, dedupe and replay-safe effects.

Do not rely on UI animation or a caught Promise as operational completion. Implement one event-to-wait-to-resume chain first.

### 6. Source/type/status grounding

Relevant files: src/server/gus/grounding.ts, agent.ts, baseline.ts, without-qloo.ts and evaluation/logging.

Number/name checks are valuable, including existing false-positive fixes recorded in evals/LOG.md. They do not verify semantic entailment, time freshness or an action outcome. A number present in evidence can still be attached to a false crowd/availability claim.

Use structured evidence and state fields; grade the resulting business record/action, not only prose. Fair comparison keeps factual inventory, model and constraints equal.

### 7. Evaluation/reproducibility entry points

Observed at inspection: package.json references tests/*.test.ts, evals/gauntlet.ts, scripts/qloo-smoke.ts and scripts/migrate.ts, but the tests directory and those three files were absent. evals contains LOG.md. This is a reproducibility gap, not proof all local testing is absent or that runtime tests failed.

Add the referenced tests/scripts or update the commands. Include source/unit/status tests, Qloo contract fixtures, recovery cases and a real recorded holdout run. Verify in a clean install before submission.

## First build priorities

### P0: make the current story credible

1. Define evidence/status/deal-type contracts.
2. Reword interest/affinity/availability and promotion claims.
3. Add a tiny verified local inventory and candidate-ranking tool.
4. Ship one actual reply-driven agent workflow with exact approval and durable resumption.
5. Make action receipts truthful, including all simulation/test boundaries.
6. Add fair ablations and outcome-based tests.
7. Ensure hosted app, public repo, README/license and run instructions match.

### P1: one distinctive capability

Artist/scene cultural pressure test on the same verified candidate roster. It should expose a trade-off and produce one usable action. Keep the direct venue-signal experiment marked unsupported/inconclusive.

If data rights/coverage are ready, add a small actual-calendar conflict case; otherwise defer it rather than fake a comprehensive events API.

### P2: one practical lateral

A compact day sheet and one food-window resolution, or the existing local-campaign qualification. Choose whichever the first real operator accepts. Do not build both broadly before core reliability.

## Time-boxed plan from October 25

- **Oct 25:** evidence/deal/action contracts, existing copy corrections, select one circuit/roster and prototype Qloo pressure test.
- **Oct 26:** bounded reply workflow, exact approval/version checks and durable runtime spike.
- **Oct 27:** truthful outbound/test receipts, campaign dependencies, failure/recovery tests.
- **Oct 28:** user/operator task sessions, compare against current method and fair baseline; narrow based on rejection/corrections.
- **Oct 29:** complete one lateral if core is stable, clean install, fix deployment/state-reset and publish measured evals.
- **Oct 30:** freeze scope, verify public repo/license/assets and judge access, submit well before deadline.

This is a proposed plan, not work already performed. If you have less build time, cut P2, then P1 scope, but keep truth/recovery/reproducibility.

## A real venue case that proves why qualification matters

Wanted's Columbus sheet includes The Basement, Wexner and Newport. The Newport concert page says 1,400 capacity; the rental page says 1,700. Wexner varies from 150–250 floor seats to up to 500 standing. The Basement rental description mentions a combined 350-capacity context. [R8](12-SOURCES.md#r8), [R13](12-SOURCES.md#r13), [R9](12-SOURCES.md#r9), [R10](12-SOURCES.md#r10)

Do not replace missing capacity with the demo size-band constant and call it verified. A primary-source mismatch is a review item. General office/gallery hours should not decide stage availability. This is a stronger demo of trustworthy intelligence than confidently choosing a famous room.

## Definition of done

One specific operator can use an end-to-end flow. Qloo changes a real decision over the same feasible inventory. Gus responds to feedback/change, waits and resumes correctly, never claims a simulated external agreement is real, and preserves approval boundaries. Clean commands and hosted behavior match the description. More screens do not compensate for failure here.
