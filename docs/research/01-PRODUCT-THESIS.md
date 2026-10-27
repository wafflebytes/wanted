# 01. The product thesis I would back

## Decision

**Wanted is a taste-grounded live-show operator for working independent acts and the small teams around them. Gus helps turn a promising market into a credible show, then carries the coordinated work forward.**

This is a recommendation, not a user-confirmed final positioning choice or validated product-market fit.

The product should answer: **Where do we fit, who can help us make it happen, what is feasible, and what needs doing next?**

The distinctive idea is cultural intelligence joined to real execution. Qloo alone is not a booking system. An LLM alone does not know the local scene or own the current show state. A spreadsheet can store it, but does not resolve messy replies or choose the next sensible move.

## Why there is a customer between unknown and superstar

The assumption that a musician is either too small to matter or big enough to have a full team is wrong as a product premise.

- Eli Winter describes self-booking nearly all of about 215 shows, including serious performance settings, while juggling remote work and dense booking spreadsheets. [V3](12-SOURCES.md#v3)
- Miss Eaves describes self-managed tours, market-by-market development, promoter support and anchor gigs. [V1](12-SOURCES.md#v1)
- Careful Gaze's singer describes doing routing, bands, lodging, merch and contingencies himself when a promoter is absent. [I1](12-SOURCES.md#i1)
- Tour managers describe varying scope, including combinations of driving, FOH and tour management, not one standardized full-service package. [V6](12-SOURCES.md#v6)

Popularity, income, staffing, live capability and local draw are separate variables. Someone can be an excellent musician with a modest live business, or have a manager but no dedicated person for every run. Small shows can have real artistic and community value. The commercial question is whether our software meaningfully improves repeated work at a price a specific operator can justify.

Do not claim every musician needs Wanted. It is especially unattractive to people without a near-term show/routing decision, those with no live performance readiness, and fully staffed teams whose existing systems already solve the relevant job.

## Initial wedge

**A self-booking artist or band with an upcoming regional run, a real live set, some performance evidence and limited admin capacity.**

Secondary design partner: a small manager/booker who handles a few acts and can supply credible local contacts/inventory. This partner improves data quality and repeated usage, but should not silently turn the initial app into a full agency CRM.

Start in one reachable US circuit because the implementation already centers US metros. This is a practical implementation choice, not evidence that US artists are the best global market. If your first genuine design partners are elsewhere, validate Qloo coverage and booking practices before claiming equivalent regional fit.

Do not gate eligibility on a magical follower threshold. Ask whether the operator has a concrete upcoming problem, a performable act and enough verified context to evaluate it.

## The central job

When planning or changing a run, the operator wants to choose feasible, culturally suitable opportunities without rebuilding the local research, communication and execution trail from scratch.

The first product outcome should be a **qualified show opportunity and next action**. It should include:

1. A credible local venue/promoter/support possibility.
2. Cultural-fit evidence, including why the option surfaced.
3. Operational constraints and sources.
4. What is known, unconfirmed and inferred.
5. Relevant contact/relationship context.
6. A proposal or question that the operator can use.
7. Persisted follow-through after replies, approvals and changes.

Booking-readiness is not one heat threshold. Venue affinity is not venue willingness. A returned candidate is not a verified local opener.

## The product loop

**Fit → qualify → coordinate → confirm → mobilize → perform → learn.**

- **Fit:** use Qloo to identify cultural opportunity and rank relevant inventory.
- **Qualify:** confirm scale, geography, contact, format, dates and known history.
- **Coordinate:** prepare relevant requests, handle replies and compare alternatives.
- **Confirm:** record written terms and approvals; do not equate a hold or simulated offer with a contract.
- **Mobilize:** make truthful announcements, local promotion and first-dibs follow-through.
- **Perform:** give the touring party a reliable day sheet and resolve practical gaps.
- **Learn:** capture settlement, operational outcomes, ticket activity where authorized, relationship notes and return-market evidence.

Your existing Predict → Prove → Act → Escalate → Remember pattern is a good memorable abstraction. Change its interpretation: fan signatures indicate consent-based interest, not attendance proof; Act means authorized, truthful action rather than automatic venue commitment.

## What Qloo uniquely contributes

The strongest contribution is not a bigger list of rooms. It is context-sensitive cultural comparison of **already feasible choices** and discovery across categories that conventional music-only tools may not connect.

Examples:

- Rank a booker's real local roster for a visiting act, instead of returning globally famous sound-alikes.
- Build a scene profile from verified recent bills and inspect fit to both act and scene.
- Detect culturally relevant competing shows on an actual calendar, without inventing lost-ticket forecasts.
- Suggest local cultural partners or poster locations, then verify contact/permission.
- Match an explicitly stated touring-party taste profile to a workable meal window.

The new live tests support supplied-candidate artist ranking and taste-sensitive counterfactuals. They do not validate local draw, every geography or direct venue-to-artist inference. [06-QLOO-CAPABILITIES-AND-CONTRACTS.md](06-QLOO-CAPABILITIES-AND-CONTRACTS.md), [15-CLEVER-QLOO-EXPERIMENTS.md](15-CLEVER-QLOO-EXPERIMENTS.md)

## What Gus should own

Own the follow-through on bounded work: gather missing evidence, compare feasible alternatives, prepare an action, wait for the right person, resume and maintain dependencies.

Do not own the artist's creative direction, grant unfettered spending authority, manufacture relationships, imply a promoter has agreed, or become the sole authority on contracts/safety.

A good agentic moment is a venue reply changing a date. Gus notices the impact, checks the run/calendar, uses taste evidence to compare alternatives, prepares a revised plan and asks for the decision only where needed. A fixed five-step campaign checklist can be deterministic code with contextual model assistance. [A1](12-SOURCES.md#a1), [A2](12-SOURCES.md#a2)

## Keep / change / defer

**Keep:** Wanted/Gus personality, mobile/web codebase, map, posters, no-install fan entry, receipts, Logbook, grounded fallbacks, approval-gated actions and the existing Filling the room flow.

**Change first:** truth/units in demand claims, local candidate qualification, deal-type representation, real preparation/delivery/reply statuses, durable execution and fair Qloo comparisons.

**Build selectively:** a cultural pressure-test view, one reply-driven workflow, verified roster ranking and one day-sheet/food workflow.

**Defer:** a new fan social network, generic AI content factory, ticketing/payments marketplace, autonomous mass outreach, full travel booking, sponsorship marketplace, all-purpose mental-health agent and complete agency CRM.

These are not rejected forever. They add distribution, liability or operational complexity before proving the wedge.

## Why not make fan engagement the whole product?

Bandsintown already offers free fan CRM/communications, and established platforms own discovery distribution. Historical Detour experiments used financial commitments and still coordinated with promoters. [C5](12-SOURCES.md#c5), [R11](12-SOURCES.md#r11), [R12](12-SOURCES.md#r12)

The fan layer should help a concrete show: register date-specific interest, deliver promised updates, help willing locals promote with permission and measure a real funnel. Do not require everyone to install Wanted or recreate a network before an artist receives value.

## Success and falsification

Near-term success: an operator accepts and uses a qualified recommendation/action, reaches a verified milestone and spends less review/admin time than their usual method without worse mistakes.

Longer-term: repeated runs retain the operator; records improve future decisions; some buyers pay enough to cover data/model/support costs. Ticket outcomes matter, but are delayed and heavily confounded.

The thesis should weaken if candidates repeatedly lack local coverage, operators cannot trust the provenance, outputs duplicate free tools, onboarding takes more work than the task, or human cleanup dominates savings. It should change if bookers value intake/roster triage far more than artists value market-entry planning.

**The ambition is real delegation with cultural judgment. Not maximum surface area.**
