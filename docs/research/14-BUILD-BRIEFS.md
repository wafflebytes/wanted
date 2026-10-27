# 14. Bounded build briefs

These are proposed implementation briefs, not completed features. Existing components should be extended, not rebuilt. Every brief has one actor, trigger, verifiable outcome, evidence and failure/approval boundaries.

## Brief 1: verified local inventory and Qloo roster ranking

**Actor/trigger:** operator selects a city/date opportunity and imports/chooses a small local roster.

**Outcome:** qualified candidates ranked for stated cultural context, with sources and missing fields visible.

**Inputs:** act reference IDs, operator inventory, place/date, format, scale, known availability and relationship context. Keep contact data outside Qloo/model ranking input.

**Data contract:** internalCandidateId; QlooEntityId/mappingStatus; localityEvidence/source/time; liveEvidence; role; contact/guidelines; scale; availabilityStatus/source; fee/termsStatus; culturalQuery/ref; metrics/units; warning; operator notes.

**Steps:** resolve/disambiguate → hard-qualify → rank using filter.results.entities → validate pool/required affinity → present cultural vs operational evidence → operator chooses next action.

**Acceptance:** no outside candidate; unresolved mapping not silently invented; missing locality not called local; affinity not called draw; stale capacity/guideline surfaced. Live artist tests show mechanism, but actual local roster coverage must be tested.

## Brief 2: cultural pressure test

**Actor/trigger:** operator compares candidates for a show that must fit both act and scene.

**Outcome:** separate act-fit and scene-fit views, optional joint view, trade-offs and a defensible selected action.

**Scene evidence:** curated recent performer references from authorized calendar/history or booker, not an unweighted list of all famous artists who ever played a venue.

**Steps:** validate references → same-pool act ranking → same-pool scene ranking → optional joint ranking → apply transparent application policy/hard constraints → explain alternatives/unknowns → prepare request.

**Acceptance:** same inventory and factual context across views; missing score fails; joint affinity not called audience union/fairness; no viable option produces an honest abstention. Direct venue-to-artist signal remains inconclusive, so do not use it as measured evidence.

**Evaluation:** blind operator preference and reasons vs factual/genre baseline, plus leave-one-reference-out stability. No causal ticket forecasts.

## Brief 3: reply-to-replan with durable approval

**Actor/trigger:** verified incoming reply changes current opportunity/show terms or date.

**Outcome:** current delta/action prepared, approved precisely if needed, executed once with receipt and dependencies updated.

**Data:** sourceMessageId/authenticatedContact; show/offer version; changed fields; old/new state; conflict/cost results; proposal; approval scope/expiry; businessActionKey; provider receipt/uncertainty.

**Steps:** associate/parse → load latest record → deterministic checks → focused evidence/ranking loop if needed → prepare → approve/question → persist wait → revalidate on resume → execute/reconcile → invalidate dependent work.

**Acceptance:** duplicate reply does not duplicate chain; changed offer invalidates old approval; stale/expired/cross-act action denied; restart preserves task; external success/lost acknowledgment reconciled. Use an explicitly labeled fixture/test inbox for hackathon if real integration is absent.

## Brief 4: strengthen Filling the room

**Existing base:** showplan.ts and current promotion/show UI.

**Actor/trigger:** confirmed or clearly simulated show with approved announcement facts.

**Outcome:** a qualified plan and accurate per-action states, not fake completed outreach.

**Actions:** first-dibs via permitted actual channel or clearly prepared; poster candidate research with permission tasks; local media/podcast opportunity qualification; opener invitation; bounded test ads only.

**Dependencies:** show version, announcement group/embargo, ticket link/status, assets, owner approval, target permission, budget and deadline.

**Acceptance:** prepared is not sent; provider accepted is not recipient agreement; selecting spot is not distributing poster; changed/canceled show cancels stale assets/actions; no invented local reach/draw/ad targeting. Manual export remains valid when an integration is not connected.

**Instagram:** create an approved asset/caption package first; professional-account/auth/media/publication semantics are a separate connector. Container created is not published. [R5](12-SOURCES.md#r5)

## Brief 5: show day sheet and one Road Care meal window

**Actor/trigger:** touring operator is approaching a show, or schedule/hospitality changes.

**Outcome:** latest essential offline-readable day sheet and feasible meal options or a clearly unresolved requirement.

**Data:** local date/time zone; load-in/soundcheck/set/curfew; location/contact/parking; backline/rider acknowledgments; hospitality/buyout; party/time/budget; explicit taste/diet/access constraints; opening/menu source/freshness; fallback.

**Steps:** detect unresolved meal → check confirmed catering/prepared food → determine actual window → retrieve qualified options → culturally rank within feasible set → show verification needs → optional human selection. Do not order/reserve without exact authority.

**Acceptance:** includes crew; no inferred allergies/access needs; no forced restaurant if catering is solved; shortened schedule recomputes feasibility; uncertain safety needs remain unverified; essential contact/schedule remains offline. Sensitive hotel/access data is role-controlled, not public.

## Brief 6: evaluation and receipts surface

**Actor/trigger:** builder or judge runs a task/demo comparison.

**Outcome:** reproducible, truthful evidence of recommendation and action behavior.

**Data:** task ID/condition; input/source fixture permissions; model/version; candidate pool; Qloo query/cache status; tools/errors; approval/effect refs; final business state; operator grade; latency/cost/corrections.

**Acceptance:** current referenced test scripts exist; tests include 28 cases in validation guide; same factual inventory/model for Qloo ablation; no self-grading solely against Qloo; no invented holdout result; private data and raw provider payloads excluded from public artifacts.

## Minimal shared architecture

Use application records for business truth; runtime sessions for execution/context; effect/outbox services for authorized idempotent action. Persist source/type/status. Own mapping and evidence separately from prose.

Do not implement all briefs in parallel as independent products. Start with inventory/evidence and the reply workflow, then pressure-test view, then one lateral. Keep an escape route to manual prepared artifacts so reliability does not depend on every connector being live.
