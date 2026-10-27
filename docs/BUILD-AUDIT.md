# Wanted: research-to-build audit

Audit date: October 25, 2026. Baseline: current dirty local worktree, not committed main or the hosted deployment. The research pack describes earlier observations; they are not automatically current failures. No external source was freshly re-fetched during this audit.

## Decision

Keep Wanted’s map, posters, Gus, voice, Fan Mail and Logbook. Make one operator job reliable: **qualify → compare → prepare → wait → review → record → replan**. A persistent job, not a wider chat box or more fictional counterparties, is the next agentic layer.

The new `find-support` task owns research/preparation. It may not approve its own request, send real outreach, pay, infer availability, or claim a booking. Its business records remain the authority.

## Research coverage and current gaps

1. **Product thesis (01):** Working self-booking acts are a plausible wedge; map and fan interest are inputs, not the unit of value. The desk implements a useful decision path but operating facts are fictional. Real operator value and willingness to pay are unmeasured.
2. **Customers/jobs (02):** Reply handling, budget constraints and focused review are represented. Real operator onboarding, authorized roles, imported roster/calendar and observed user task sessions are missing. No customer interview or paid demand is claimed.
3. **Touring model (03):** Versioned support requests and scoped approvals exist. General holds, guarantees, versus/backend, venue hire, deal direction, contract obligations, advance/day sheet and settlement are not modeled comprehensively. Keep the legacy door-split/artist-paid-deposit flow a narrow simulation, not a universal booking model.
4. **Voice of customer (04):** Named accounts support admin, cashflow and relationship pain; they are not prevalence estimates. Prioritize low-friction exact review and fewer unnecessary interruptions. A no-profit tour survey cannot establish the fraction who employ a tour manager.
5. **Business/competition (05):** The real substitute is email, calendars, spreadsheets, existing relationships and established booking tools. No defensible paid-demand, retention, CAC/LTV or ticket-uplift result exists. Interoperable preparation/export is preferable to forcing every operator into a new dashboard.
6. **Qloo contracts (06):** Client/allowlists/cache/provenance, search, heat, places, demographics, cross-domain taste, supplied-roster ranking and comparison exist. Unknown/stale/incomplete scores fail closed in the desk. Qloo does not establish local draw, date availability, capacity, fee, recipient permission or audience-set union.
7. **Agent architecture (07):** Existing Scout/Ask loops and durable business actions are retained. This iteration adds a leased, event-woken booking goal with explicit waits and retries. Eve has not been installed/benchmarked; retaining the narrow custom runtime is a deliberate choice, not an Eve integration claim.
8. **Earlier local audit (08):** Its missing-test/script observations are now stale: tests, migration, gauntlet and smoke scripts exist. Venue capacity conflicts are represented separately; signature ratios are described as interest. Real inventory, real connectors and deployed scheduler configuration remain open.
9. **Validation (09):** Synthetic qualification, scope, version, expiry, duplicate/restart and receipt-recovery tests exist. Same-pool cultural counterfactual/sensitivity API checks run. Blind operator preference, local-roster coverage, real booking outcomes and demand calibration remain unmeasured.
10. **Delivery (10):** Repo has README/MIT license and local build commands; hosted/public-repo parity and judge availability were not reverified. A framework is not required to replace a working agentic tool. Deadline/rules are as reported by the October 25 research, not freshly checked here.
11. **Risks (11):** Exact scope/approval, fixture denial for real accounts, no raw pasted text, source freshness and receipt recovery are important existing controls. Production authentication, verified inbound identity, provider idempotency/permissions, data rights and commercial authority remain separate gates.
12. **Sources (12):** Annotated source catalog preserves method, age, locality and limitations. Vendor pages are advertised capability; anecdotes are workflow evidence; surveys have sample/geographic limits. Do not promote every catalog item into a product claim.
13. **Leads (13):** Forum/captured/unreviewed excerpts are leads, not customer validation. Failed retrievals and unreviewed links remain explicitly uncertain. No outreach or booking occurred in this audit.
14. **Build briefs (14):** Inventory/qualification and pressure-test contracts are implemented in a fixture; reply/version/approval recovery is implemented. The new runtime strengthens brief 3. Brief 4 promotion remains prepared/sandboxed; day sheet/Road Care and real connector work are deferred until core reliability and operator evidence justify them.
15. **Clever Qloo (15):** Separate act/scene/joint views, minimax policy, same roster and leave-one-out sensitivity exist. This iteration makes changed-signal sensitivity an actual smoke assertion. Venue-only artist signaling remains unsupported; no draw, attendance or union/fairness inference is introduced.

`WANTED-PRODUCT-RESEARCH.md` is the combined reading copy of these same chapters, not a second independent evidence source. The Downloads research and project copy were compared for parity in this pass.

## PRD mapping

- **§0–3 (story/evidence):** Keep the working-act story; correct UK qualifiers and remove the unsupported tour-manager prevalence figure from the main pitch. Signatures are consented interest, not ticket commitment. The original bigger vision is a roadmap, not current delivery evidence.
- **§4 (Qloo):** Implemented nontrivial use, with research’s inference boundaries. Actual metro heat uses popularity-weighted affinity, not the original saturated affinity-rank proposal; see `evals/LOG.md` iteration 1 and `src/server/score.ts`.
- **§5–8 (product/experience):** Core surfaces exist. No connected paid ticket path, verified local inventory, production roles or observed operator validation. Karl display + rounded fallback supersedes the older all-OFL typography specification.
- **§9–10 (agent/architecture):** Tool loops, scoped simulation, versioned business state and watcher queue exist. Durable desk goal is now implemented. External scheduler transport exists; a deployed schedule is not configured by this change. No new real sending/payment authority is added.
- **§11 (brand):** Western artifact/sticker identity remains. Karl ST Trial is user-supplied and not OFL; production/redistribution licensing must be resolved before public distribution. Printed poster fonts stay consistent with existing share renders.
- **§12–15 (delivery/scope/risks):** Working local commands are present; public commit/deploy/native proof are not implied. Keep freeze/rights/identity/connector gates explicit.
- **§16 (Gauntlet):** Current automated gates cover contracts, synthetic business outcomes and local API mechanisms, not the entire G1–G9 aspiration. No tour holdout, human voice judge, causal ticket lift, full native accessibility suite or self-improving playbook is claimed.
- **Appendices:** Source limitations come from the research catalog. Assets are largely mapped through `scripts/build-assets.ts`; separate PRD story/wide backdrop names drift from the shared backdrop pipeline.

## What this iteration builds

- One persistent `find-support` goal per artist/show (`src/lib/agent-task.ts`, `src/server/operations/task-store.ts`).
- Bounded worker with a lease, generation fencing, retry budget and independent restart recovery (`task-runner.ts`). A stale/paused worker cannot prepare a request.
- Business transactions atomically wake the goal on changed reply facts, scene/evidence changes, explicit choices, approval and save outcomes. No-op/duplicate replies do not wake or invalidate work.
- Qualify first, rank the feasible pool, prepare one exact request, then persist a human wait. Failed cultural evidence and policy ties become questions, not manufactured winners.
- Explicit pause/resume. Changes never unpause an operator’s job.
- Automatic reconciliation of a missing original local-inbox receipt. A changed already-saved request stops for follow-up; it is not silently replaced. Cancellation retains/reconciles historical receipts before stopping.
- Compact job status in the desk, with exact artist/date/year/fee visible before approval. Karl and SF Rounded glyph fallbacks are retained.
- `npm run agent:smoke`, extended `jobs:drain`, and a bearer-protected `/api/cron/gus` transport. An external scheduler still needs deployment configuration and a secret.
- Changed-signal Qloo sensitivity now fails on stale or identical scores/order; passing it is API-mechanism proof only.

## Acceptance and proof

Automated task cases cover concurrent workers, pause/change during ranking, lease expiry, retry exhaustion/resume, persisted waits in a separate process, exact approval without effects, automatic budget replan, choice preservation, missing cultural evidence, unchanged reply preservation, historical receipt recovery and follow-up/cancellation boundaries.

The live API smoke uses isolated cookie cases and real/cached Qloo rankings with fictional operating facts. Browser checks use a real 393 × 852 iframe layout viewport, not native iPhone/Safari validation. Standalone Playwright remains subject to the existing Chrome launch abort and is not claimed passed.

## Next build order

1. **Operator-owned input and authority:** one real, consented/redacted show + small supplied roster, explicit unknown fields, sourced current scene. Do not label imported text as verified counterparty identity. Start with local review/export if authentication/connectors are not ready.
2. **Actual economics/offer contract:** general payer/payee and deal types, hold/expiry/version, deductions/cancel/rider obligations. Do not deepen fictional negotiation first.
3. **One real authorized connector:** service-enforced business idempotency or honest uncertainty + reconciliation, permission/audit/privacy gates. No global agent “yes” as recipient/payment authority.
4. **Human outcome evaluation:** three self-booking acts on a real task, blind same-factual-inventory baseline, correction/time/next-action outcomes. Then one offline day sheet or qualified local campaign lateral.
5. **Release gates:** hosted/public parity, scheduler configuration, trial-font rights, clean install, native/VoiceOver testing and fresh official rules/judge-access check.

These are ordered gaps, not promises that every part is complete. The next unit of progress is one reliable operational milestone, not another feature count.

## Recorded run

`npm run gauntlet -- --integration` passed all six gates on this iteration, including 132 tests. The private summary is `.data/gauntlet-latest.json`; raw provider payloads are not public evidence. The phone-sized existing-browser path confirmed pause/resume, approve-without-save, date-change stop, evidence-update resumption and a new exact current-version request. No control inspected was below 44 pixels; artist/date/fee were visible before approval. External scheduler configuration, real operational input/auth/connector and native testing remain open.


## Actual LLM evidence, 25 Oct follow-up

The durable job now calls OpenRouter through a bounded model-directed tool loop. Server checks remain authoritative for qualification, the selected bill rule, scoped exact preparation, receipts and human waits. The LLM cannot approve, send or pay. Runtime records distinguish model responses/caches, rejected tools, an actual rules fallback and an unavailable strict model gate. A 90-second parent deadline and per-step lease/version checks bound model work. Provider 429/402 creates private backoff rather than quota-evading key/model rotation.

The final live eval observed six passing uncached model outcomes, six rejected premature comparisons that were corrected, and two quota-blocked cases. Thus the eight-case real-model gate is **not passed**. See the dated evidence and scheduled complete rerun in [evals/LOG.md](../evals/LOG.md). The 149 synthetic contract/state/transport tests are a separate verification class. This is not validation of free-form negotiation, operator usefulness or booking demand.


## Systems continuation, 25 Oct (newer than the preceding run)

The earlier six-of-eight quota-blocked model run is historical, not the current gate. The later strict extended run passed 12/12 outcomes with zero rejected tools, 30 OpenRouter requests and cached Qloo. The new scope-limited tools and stale-first handoff reduced guarded corrections on this specific suite; no broad reliability claim follows from one run.

Durable internal attention, exact call scope, bounded canonical speech, persisted commerce decisions/receipts and leased post-payment continuation are implemented. OpenRouter free Fish TTS succeeded (200,201-byte MP3, about 9 seconds); direct Fish is credit-blocked. Stripe live transport, real identities/contacts/terms, hosted scheduler, Eve adoption, operator usefulness and native voice remain unverified. Current architecture, source references and next prerequisite gates are in research chapter 16 and PRD §17.
