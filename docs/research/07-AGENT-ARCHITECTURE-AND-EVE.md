# 07. Gus architecture and the Eve decision

## Opinionated recommendation

**Use a focused Eve adoption spike for one durable reply/approval workflow, not a full-app rewrite. Preserve Expo and Turso. If integration consumes the build budget, use AI SDK WorkflowAgent plus Workflow SDK, or keep the existing loop while making the business state/outbox reliable.**

Eve is a fit for long-running conversations waiting on people. It is not a prerequisite for eligibility, and its feature count is not a proxy for judge score. [H1](12-SOURCES.md#h1), [A5](12-SOURCES.md#a5)

I have not installed Eve, benchmarked it in Wanted or verified native Expo integration. Browser React/client support and peer-service routing are documented; that is not a tested one-line drop-in. [A9](12-SOURCES.md#a9), [A10](12-SOURCES.md#a10)

## Workflows around focused agent loops

AI Engineer/Anthropic guidance supports simpler deterministic workflows around small loops where judgment is necessary. [A1](12-SOURCES.md#a1), [A2](12-SOURCES.md#a2), [A4](12-SOURCES.md#a4)

Use deterministic code for budget arithmetic, permissions, date conflicts, expiry, approval scope, state transitions, dedupe and dependency invalidation.

Use model judgment for interpreting messy requests/replies, deciding what evidence to retrieve, comparing feasible options, explaining trade-offs and adapting after rejection/change.

Use domain procedures/skills for opportunity qualification, offer/hold reading, advancing, local campaign preparation, disruption replanning and food-window handling. One Gus can load the relevant procedure; multiple personalities are unnecessary. [A3](12-SOURCES.md#a3)

Do not make the model choose the exact same campaign checklist on every run. Do not give it arbitrary SQL, HTTP, shell or payment capability merely because Eve supports them.

## Recommended components

- **Expo UI:** existing map, Fan Mail, Logbook, offer/approval cards, native/web interactions.
- **Turso/application database:** authoritative records, versions, permissions, actions and receipts.
- **Agent runtime:** bounded plan/execute/observe loops and durable waiting.
- **Qloo adapter:** typed data retrieval, private cache, provenance and contract checks.
- **Operational connectors:** inventory/calendar import, actual permitted email/delivery, publication, test payment.
- **Action executor/outbox:** policy enforcement, idempotency and reconciliation.

Conversation memory is not a booking ledger. Session storage is not a substitute for owner-authorized business state.

## Example bounded workflow

1. Receive verified venue reply.
2. Identify the opportunity/show and retrieve current version.
3. Parse changed terms/date, preserving the source message.
4. Compute deterministic conflicts, cost and expiry checks.
5. If alternatives are needed, rank qualified candidates with Qloo.
6. Produce a delta, evidence and a proposed next action.
7. Ask a clarifying question or exact approval if required.
8. Persist waiting state and exit; do not hold an HTTP request open for days.
9. Resume after an authenticated decision/event.
10. Revalidate the current version and policy before execution.
11. Execute idempotently; store provider receipt or uncertainty.
12. Update affected dependencies and notify only authorized parties.

A changed offer after approval requires reapproval. A rejected/expired hold should not trigger a deposit or announcement.

## Business state and versioning

Use separate opportunity states: discovered, qualified, request prepared, sent, replied, hold, challenged, offered, accepted pending counterparty confirmation, contracted/confirmed, declined, expired and canceled. Tailor to actual deal processes rather than imposing all states everywhere.

Use action states: selected, prepared, approval pending, approved, executing, provider accepted, recipient acknowledged, completed, failed, uncertain and canceled. An email provider's acceptance does not mean the venue agreed.

Record an action intent with tenant/act, show, offer/content version, exact target, budget/amount/currency, approval reference, expiry, business dedupe key and receipt. Do not use a conversation-wide once() as authorization for subsequent payments or new recipients.

## What Eve supplies

Documented durable sessions/steps, channels/client routes, event streaming, tools/skills, approvals/questions, sandbox and eval facilities. [A5](12-SOURCES.md#a5), [A7](12-SOURCES.md#a7), [A8](12-SOURCES.md#a8), [A11](12-SOURCES.md#a11)

What Wanted still owns: the meaning of a booking, tenant/artist permissions, business state, exact financial authority, external action idempotency, data consent, recipient qualification and proof of outcome.

Eve tool implementations run in the trusted app runtime with secrets/network access. Sandboxed shell isolation does not automatically make your custom charge/send tool safe. [A6](12-SOURCES.md#a6)

Omitted tool approval defaults to never requiring approval. always() gates each invocation; once() only gates initially; auto() delegates classification to a decision model and sends its input to that provider. Explicit policy/approval is required for sensitive effects. [A8](12-SOURCES.md#a8)

## Durability is not exactly-once action

A request can succeed externally and the process fail before recording success. A resumed/retried step may repeat it. Use stable service-enforced idempotency and database uniqueness on the **business action**, not only workflow step ID. Separate runs have different step IDs. [A7](12-SOURCES.md#a7), [A12](12-SOURCES.md#a12)

For email/publication when the provider lacks idempotency: claim a unique outbox action, reconcile uncertain status using provider IDs, and do not blind-resend. If double delivery cannot be safely ruled out, surface uncertainty and ask for review.

Concurrency: serialize effects per opportunity/show version where needed. Duplicate signatures/replies should not create duplicate booking chains. Do not assume event delivery order is globally FIFO.

Deployment changes: inspect Eve/Workflow's pinning/handoff/version rules. Old runs can resume with older external schema assumptions; keep storage/contracts compatible and plan migration/cancel/restart carefully.

## Minimal safe tool surface

Read tools: get_run, get_show, resolve_candidates, rank_roster, get_calendar, retrieve_guidelines, get_offer, get_policy.

Prepare tools: prepare_request, prepare_counteroffer, prepare_announcement, prepare_advance_question, prepare_meal_options.

Effect tools: send_approved_message, publish_approved_asset, apply_approved_change, pay_exact_test_intent. Each must enforce current authorization server-side.

Tool results contain canonical IDs, source references, metrics/units, uncertainty and action state. Use structured errors: invalid input, missing evidence, expired state, unauthorized, rate-limited, temporary service failure. Do not leak secrets in error bodies or traces.

## Context and prompt-injection boundaries

External websites, venue emails and model-generated text are data, not instructions. A reply cannot override budget, change the payee or demand private data. Verify inbound signatures/tokens and derive identity from trusted context, not a body-supplied artistId/principal. [A6](12-SOURCES.md#a6)

Keep prompts focused on the current task, relevant state and selected evidence. The existing numeric/name grounding checker is useful but not semantic proof: a supported number can be attached to a false claim. Add source/type/status checks and action assertions. [A14](12-SOURCES.md#a14)

## Migration spike and go/no-go

Time-box the integration spike, for example to half a focused day, not the entire hackathon.

Pass criteria:

- Existing Expo web can start/stream/resume a Gus session.
- Authenticated approval bound to one action/version works.
- A restart while waiting does not lose the task.
- Duplicate reply/approval does not duplicate the effect.
- Qloo tool errors preserve truthful fallback/unknown state.
- Native transport limitations are identified without rewriting the UI.

If pass, move one reply chain and then the watcher onto durable execution. If fail, use the narrower WorkflowAgent option or retain the existing loop with durable jobs. Record the trade-off honestly. Do not install every channel/sandbox feature for a showcase.

## Cost and observability

Measure latency, model/tool steps, retries, cached vs cold Qloo work, workflow cost and operator correction time. Store outcome metrics and redacted receipts rather than logging private full inboxes. Limit loops and recoverable retry budgets.

Trace: task ID, act/run/show version, input/output evidence IDs, tools, approval scope, effect/receipt, fallback and final state. Show a plain-language Logbook to users; do not expose hidden chain-of-thought.

## Framework decision summary

Eve is my leading bundled runtime candidate because durable conversations/approvals fit booking. WorkflowAgent is the narrower fallback. A custom loop is still valid if it owns state/recovery properly. The key architecture is **observable, authorized, resumable work**, not the framework logo.


## Current implementation decision, later on October 25

The earlier Eve-first recommendation is a proposed spike, not the current implementation. The current tested job retains the narrow Expo/Turso runtime with version/lease fencing, state-scoped model tools, durable attention and exact call/commerce scopes. Eve must pass those same business gates in a separate pinned/world-backed spike before replacing orchestration. The freshly read durability guide confirms that interrupted steps can rerun effects and that world/deployment-version compatibility matters; a framework does not remove Wanted’s identity, receipt or approval obligations. See chapter 16 for the ordered next ambitions and setup gates.
