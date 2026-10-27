# Wanted: complete product research and build strategy

**October 25, 2026.** Whole-product desk research, local-code inspection and live Qloo diagnostics. Customer validation remains open. This self-contained reading copy includes the linked modular pack.

## Contents

- [Wanted: whole-product research and build pack](#overview)
- [01. The product thesis I would back](#chapter-01)
- [02. Customers, jobs and adoption](#chapter-02)
- [03. Touring as an operating system](#chapter-03)
- [04. Public voice of customer: what people actually describe](#chapter-04)
- [05. Market, competition, distribution and business model](#chapter-05)
- [06. Qloo: useful capabilities and exact inference boundaries](#chapter-06)
- [07. Gus architecture and the Eve decision](#chapter-07)
- [08. Local implementation audit and build order](#chapter-08)
- [09. Validation, interviews and outcome evaluations](#chapter-09)
- [10. Hackathon delivery and judge-facing proof](#chapter-10)
- [11. Risks, assumptions and changes to earlier advice](#chapter-11)
- [Wanted research source catalog](#chapter-12)
- [13. Research leads and indexed public accounts](#chapter-13)
- [14. Bounded build briefs](#chapter-14)
- [15. Clever Qloo: push the mechanism, not the marketing claim](#chapter-15)



---

<a id="overview"></a>

# Wanted: whole-product research and build pack

**Research date:** October 25, 2026. **Product:** Wanted. **Agent:** Gus. **Baseline:** the local /Users/chaitanya/wanted project, not only public GitHub main.

## Start here

1. **01-PRODUCT-THESIS.md:** the opinionated strategy and what I would not build.
2. **08-LOCAL-AUDIT-AND-BUILD-PLAN.md:** concrete changes against the code you already have.
3. **15-CLEVER-QLOO-EXPERIMENTS.md:** non-obvious Qloo ideas, live checks, failed assumptions and judge-facing proof.
4. **09-VALIDATION-AND-EVALS.md:** how to find out whether any of this works for real people.

Read the rest when implementing a subsystem:

- 02-CUSTOMERS-AND-JOBS.md: segment selection, buyer/user distinction, adoption and onboarding.
- 03-TOURING-OPERATING-MODEL.md: end-to-end lifecycle, role boundaries, deal terms, cashflow and handoffs.
- 04-VOICE-OF-CUSTOMER.md: named artists, bookers, crew and fans, including contradictory accounts.
- 05-MARKET-COMPETITION-AND-BUSINESS.md: substitutes, competitors, distribution, pricing and defensibility.
- 06-QLOO-CAPABILITIES-AND-CONTRACTS.md: documented vs verified capability and inference limits.
- 07-AGENT-ARCHITECTURE-AND-EVE.md: bounded agency, durable state, tools, approvals and framework decision.
- 10-HACKATHON-DELIVERY.md: current requirements, demo narrative and submission checklist.
- 11-RISKS-AND-DECISION-LOG.md: assumptions, failure modes, changes to earlier advice and kill criteria.
- 12-SOURCES.md: annotated source catalog with links and evidence limitations.
- 13-RESEARCH-LEADS.md: further leads/indexed excerpts, explicitly not all fully reviewed.
- 14-BUILD-BRIEFS.md: implementation-ready bounded feature briefs and acceptance criteria.
- WANTED-PRODUCT-RESEARCH.md: combined reading copy of this pack.

## What this is, and is not

This is substantial **desk research, primary-document inspection, public voice-of-customer synthesis, local implementation inspection and targeted live API diagnostics**. It is not a customer-interview study I conducted, not a production security audit, not proof of willingness to pay, and not a ticket-demand validation.

The work includes current primary Qloo/Eve/AI SDK documentation, official hackathon rules, named musician/booker/tour-manager/crew accounts, UK/US/Australian industry and fan research, competitor feature/pricing pages, historical demand-pledge experiments and forum excerpts. I read primary PDF methods to avoid confusing an engaged fan sample with all consumers or macroeconomic output with software TAM.

I inspected 213 local source/docs/script files in the earlier pass, identified 26 local changed/added files compared with the committed review copy, and then inspected relevant backend files again. Git-status permission was unavailable; this is not an exhaustive Git diff. No application code, dependencies or business records were modified by this research.

I made **16 read-only Qloo GET diagnostics** during the extended research. They include successful entity resolution/candidate-filter/counterfactual tests and a semantic failure: a venue-only artist-ranking request returned entities without affinity values. HTTP success is not proof a signal worked. Raw provider responses and credentials are deliberately excluded from this public-code-friendly pack.

## Evidence labels

- **Observed:** behavior or code I inspected, including the local implementation.
- **Primary guidance:** official documentation/rules or a practitioner speaking about their own work.
- **Reported research:** a survey/study with a specified scope, sample and date.
- **Anecdote:** a particular person's experience, not prevalence.
- **Hypothesis:** a proposed interpretation that needs testing.
- **Recommendation:** what I would build or decide given the evidence.
- **Unverified:** not live-tested, not independently benchmarked or not confirmed by a counterparty.

Source links are attached to the relevant sections and all sources have limitations in [12-SOURCES.md](#chapter-12). Older accounts are used for workflow patterns, not claimed to describe every present-day venue. Competitor pages establish advertised capabilities, not product quality. Anonymous forum users are not verified professionals.

## The core answer

Wanted should help a **working self-booking act or small operator make a culturally suitable show happen and carry it through reliably**. The unit of value is not a city score or a chat response. It is a verified operational milestone reached with less admin and fewer mistakes.

Qloo supplies cultural evidence. Real inventories, calendars, written terms, contacts and human replies supply operational truth. Gus coordinates them with bounded judgment and explicit authorization.

Keep the map, WANTED posters, Fan Mail, Logbook, voice and existing promotion flow. Make them more truthful and operationally connected before expanding into a general music super-app.

## Current limitations and output location

The research files are delivered in this artifact folder. Writing a copy to /Users/chaitanya/wanted/docs/research was blocked by filesystem write permissions, even though reads were allowed. Copy the folder there manually, or grant that directory write access if you want a later copy. Do not copy raw Qloo cache data into a public repository. Review source licensing and product terms before publishing any imported data.

## How to use this while building

Treat recommendations as decisions to test, not immutable requirements. Every feature should have: one actor, one trigger, one verifiable outcome, required evidence, a failure/unknown state and clear authority. Read the local audit before implementing anything already present. Use the validation cases before polishing the happy path.

The whole-product desk-research synthesis is complete in this pack. **Customer validation remains open** and the plan makes that visible rather than pretending research can substitute for it.


---

<a id="chapter-01"></a>

# 01. The product thesis I would back

## Decision

**Wanted is a taste-grounded live-show operator for working independent acts and the small teams around them. Gus helps turn a promising market into a credible show, then carries the coordinated work forward.**

This is a recommendation, not a user-confirmed final positioning choice or validated product-market fit.

The product should answer: **Where do we fit, who can help us make it happen, what is feasible, and what needs doing next?**

The distinctive idea is cultural intelligence joined to real execution. Qloo alone is not a booking system. An LLM alone does not know the local scene or own the current show state. A spreadsheet can store it, but does not resolve messy replies or choose the next sensible move.

## Why there is a customer between unknown and superstar

The assumption that a musician is either too small to matter or big enough to have a full team is wrong as a product premise.

- Eli Winter describes self-booking nearly all of about 215 shows, including serious performance settings, while juggling remote work and dense booking spreadsheets. [V3](#v3)
- Miss Eaves describes self-managed tours, market-by-market development, promoter support and anchor gigs. [V1](#v1)
- Careful Gaze's singer describes doing routing, bands, lodging, merch and contingencies himself when a promoter is absent. [I1](#i1)
- Tour managers describe varying scope, including combinations of driving, FOH and tour management, not one standardized full-service package. [V6](#v6)

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

The new live tests support supplied-candidate artist ranking and taste-sensitive counterfactuals. They do not validate local draw, every geography or direct venue-to-artist inference. [06-QLOO-CAPABILITIES-AND-CONTRACTS.md](#chapter-06), [15-CLEVER-QLOO-EXPERIMENTS.md](#chapter-15)

## What Gus should own

Own the follow-through on bounded work: gather missing evidence, compare feasible alternatives, prepare an action, wait for the right person, resume and maintain dependencies.

Do not own the artist's creative direction, grant unfettered spending authority, manufacture relationships, imply a promoter has agreed, or become the sole authority on contracts/safety.

A good agentic moment is a venue reply changing a date. Gus notices the impact, checks the run/calendar, uses taste evidence to compare alternatives, prepares a revised plan and asks for the decision only where needed. A fixed five-step campaign checklist can be deterministic code with contextual model assistance. [A1](#a1), [A2](#a2)

## Keep / change / defer

**Keep:** Wanted/Gus personality, mobile/web codebase, map, posters, no-install fan entry, receipts, Logbook, grounded fallbacks, approval-gated actions and the existing Filling the room flow.

**Change first:** truth/units in demand claims, local candidate qualification, deal-type representation, real preparation/delivery/reply statuses, durable execution and fair Qloo comparisons.

**Build selectively:** a cultural pressure-test view, one reply-driven workflow, verified roster ranking and one day-sheet/food workflow.

**Defer:** a new fan social network, generic AI content factory, ticketing/payments marketplace, autonomous mass outreach, full travel booking, sponsorship marketplace, all-purpose mental-health agent and complete agency CRM.

These are not rejected forever. They add distribution, liability or operational complexity before proving the wedge.

## Why not make fan engagement the whole product?

Bandsintown already offers free fan CRM/communications, and established platforms own discovery distribution. Historical Detour experiments used financial commitments and still coordinated with promoters. [C5](#c5), [R11](#r11), [R12](#r12)

The fan layer should help a concrete show: register date-specific interest, deliver promised updates, help willing locals promote with permission and measure a real funnel. Do not require everyone to install Wanted or recreate a network before an artist receives value.

## Success and falsification

Near-term success: an operator accepts and uses a qualified recommendation/action, reaches a verified milestone and spends less review/admin time than their usual method without worse mistakes.

Longer-term: repeated runs retain the operator; records improve future decisions; some buyers pay enough to cover data/model/support costs. Ticket outcomes matter, but are delayed and heavily confounded.

The thesis should weaken if candidates repeatedly lack local coverage, operators cannot trust the provenance, outputs duplicate free tools, onboarding takes more work than the task, or human cleanup dominates savings. It should change if bookers value intake/roster triage far more than artists value market-entry planning.

**The ambition is real delegation with cultural judgment. Not maximum surface area.**


---

<a id="chapter-02"></a>

# 02. Customers, jobs and adoption

## Segment by workflow, not vanity metrics

Follower count is an unreliable proxy for operational readiness, local draw or staffing. Segment by who owns the work, what the upcoming decision is, how frequently it recurs and what evidence exists.

### A. First-time live artist

Job: learn what a credible gig request requires and find reachable performance opportunities. Context may be sparse; biggest need may be a better set, local relationships and an EPK, not national market optimization.

Potential Wanted value: local readiness checklist, suitable support/showcase discovery and small-scale planning. Weak initial paid ICP because the work is sporadic, evidence is thin and budgets are constrained. Do not shame artists or tell them tiny audiences are pointless. Recommend appropriate formats instead of manufacturing national confidence. [V1](#v1), [V2](#v2)

### B. Working self-booking act: primary wedge

Job: build or change a short regional run, qualify rooms/promoters/bills, communicate, coordinate promotion and arrive ready to perform.

Likely operator: one band member, the solo artist, a trusted friend, or a rotating collaborator. They are also doing creative work and possibly other employment. [V3](#v3), [I1](#i1)

Context: some live videos, previous bills, a handful of trusted contacts, dates constrained by time off and an honest past draw record. They may lack audience analytics for new markets, but still know useful references.

Value: remove specific research and coordination work, preserve relationships, spot missing facts and avoid inappropriate pitches. This is not a promise to make an unaffordable run affordable.

### C. Small manager/booker: secondary buyer/design partner

Job: handle repeated booking decisions and communications across a small roster without losing track of holds, terms, dates and owner approvals.

Value: roster-aware qualification, local-fit triage, show-status changes and better artist-facing summaries. More frequent usage and ability to supply real inventories may make this a better payer than some artists.

Cost: multi-tenant permissions, contact import, team visibility and integration expectations. Start with one operator/one run before implementing comprehensive agency admin. [C10](#c10), [V8](#v8)

### D. Fully staffed professional team

Job: the missing specialized task in an established workflow. The artist may never be the daily user; the tour manager, booking assistant or marketer could be.

Wanted needs an additive advantage: cultural comparison of a verified support roster, a cross-domain partner shortlist, a relevant calendar conflict, or a practical choice that existing logistics tools do not personalize.

Do not pitch replacing a trusted tour manager. A manager performs diplomacy, production supervision and safety decisions, not just data lookup. [V6](#v6)

### E. Venue/promoter

Job: book shows that fit the room and audience, manage risk and limited calendar slots, coordinate relevant applicants and operations.

Possible future product: structured intake and cultural roster comparison. But a venue-first pivot changes the buyer, supply, economics and interface. Venue operators are not interchangeable and not every room wants to maximize the same metric. [V7](#v7), [I8](#i8)

### F. Fans

Job: discover a relevant show, decide whether the whole night is worth it, coordinate travel/company, receive trustworthy updates and support an artist.

Fans are participants and a distribution loop, not the primary initial payer. Cost, access, convenience and social connection are important independent of taste. [F1](#f1), [F2](#f2)

## Buyer, user, approver and beneficiary

These roles can differ:

- Buyer pays for Wanted.
- Operator performs the task and reviews Gus.
- Artist/owner authorizes terms and brand/publication decisions.
- Booking agent may negotiate within an agreement.
- Tour manager advances the confirmed show.
- Promoter/venue confirms operational facts and controls its own calendar.
- Fan consents to interest/contact and benefits from a show that happens.

A production permission model should encode these differences. One dashboard account does not imply authority to bind every act or spend its money.

## Jobs-to-be-done hypotheses

### Planning job

When I have a release, anchor booking or time-off window, help me select a viable run so I can stop researching unqualified options and commit with clearer risk.

### Market-entry job

When I want to play a city where I am not established, help me find appropriate local collaborators and formats so I can build a relationship rather than cold-pitch a room too large for me.

### Reply-handling job

When a venue replies with changed terms or dates, identify what changed and what it affects so I can decide without rechecking every thread and calendar.

### Promotion job

When a show is confirmed, turn its approved facts and local cultural context into a coordinated campaign so I do not miss channels, deadlines or first-dibs promises.

### Day-of job

When we are traveling and the schedule changes, tell the right people what is current and resolve a practical gap so we arrive prepared without digging through emails.

### Return-market job

After playing a show, retain the useful outcomes and relationship context so the next visit is not another first contact.

These jobs need observational interviews; they are not validated by our synthesis alone.

## Trigger-based onboarding

Do not start with a giant profile or an empty chat box. Offer:

1. Plan a regional run.
2. Fill a gap between confirmed dates.
3. Work through a real booking reply.
4. Prepare an already booked show.

Initial inputs: act and reference tastes, home base, date window/locked dates, touring party, key constraints and objective. Ask for a live link/EPK or past draw only when required for qualification. Allow manual calendar/contact import or paste before asking for OAuth.

Separate stated facts from inference. If a new act is not resolvable in Qloo, references are a prior, not that act's actual audience. Let the operator revise the references and see sensitivity.

The first-value target is **one usable opportunity/action**, not a complete national map. The map can remain the emotional/visual starting point if it leads immediately to a useful selected-city workflow.

## Artist priorities and touring constraints

Capture the goal: margin/cash preservation, audience development, support opportunity, release promotion or experience. Record hard constraints independently: availability, travel mode, maximum driving chosen by the party, sleep/meal windows, gear and access needs.

Some artists deliberately accept low-margin developmental shows. Show the financial downside and uncertainty, then let the authorized human decide. Do not silently optimize all goals into one score. [V3](#v3), [V12](#v12)

## Adoption barriers

- **Trust:** wrong contact, guessed room capacity or fabricated draw destroys credibility.
- **Input burden:** uploading a full CRM/rider before one useful result defeats the wedge.
- **Migration:** existing calendars/spreadsheets are working systems; export and interoperate first.
- **Delegation anxiety:** who sent what under my name? Show approval scope and delivery receipts.
- **Seasonality:** a busy booking phase may be followed by months of low use.
- **AI/cultural skepticism:** show facts, sources and alternatives, not generic praise.
- **Counterparty friction:** a booker should not need to install another app to answer.
- **Privacy:** private contacts, hotel details and access needs require role-based visibility.
- **Connectivity:** day sheets and essential contacts must remain useful offline.

## Fan experience principles

A fan should understand whether this is interest in a possible future show or a ticketed confirmed event. Ask for event-relevant interest, not vague fandom as commercial proof. Use explicit notification/marketing consent, simple opt-out and minimal personal data.

First dibs must correspond to a real ticket process or be clearly a demo. Street-team help should be opt-in, specific and legal; never publish private house-venue addresses or demand geolocation/photo proof exposing other people.

Concert-company features have genuine qualitative support but bring moderation and safety requirements. Do not build stranger matching as the initial wedge. [F1](#f1), forum leads in [13-RESEARCH-LEADS.md](#chapter-13)

## Interview recruitment and evidence we need

Recruit separately: three self-booking acts with a run in the next few months, two small bookers/managers, a tour manager/crew member and fans of a real local show. Include people with existing tools and people who reject the concept.

Ask them to bring a real, redacted booking chain or day sheet. Observe the last completed task, not opinions about hypothetical AI. Measure corrections, missing facts, review time, actual next action and return use. See [09-VALIDATION-AND-EVALS.md](#chapter-09).

A person liking Gus, a signature count or a competitor price does not establish willingness to pay. A useful prototype and a paid/serious repeat pilot would be stronger evidence.


---

<a id="chapter-03"></a>

# 03. Touring as an operating system

## Roles are not interchangeable

An artist manager tends to the career and overall business/creative interests. A booking agent develops and negotiates performance opportunities. A promoter or talent buyer programs/produces shows and deals with venue and ticket risk. A tour manager coordinates the run and daily delivery. Production, house crew, driver and merch roles have additional responsibilities. In small tours several roles are combined. [V6](#v6), [V8](#v8), [C10](#c10)

Wanted should not call a venue's general phone number a verified booker or equate a rental salesperson with the concert talent buyer. Ownership and authority must be explicit.

## Lifecycle and the data Gus needs

### 1. Decide whether and why to run dates

Triggers: release, festival/anchor gig, support opportunity, return-market development or a fixed availability window. Determine who is traveling, which dates are locked, goals, maximum downside and cash available.

Qloo contributes potential cultural fit when an act lacks market history. It does not establish a performable live set, willingness to travel, money or people availability.

Useful artifact: run brief with objective, constraints, confidence and missing information. Alternative outcomes include a weekender, support slot, local residency, off day or not touring now. [V1](#v1), [V2](#v2)

### 2. Select anchors and draft routing

Use real commitments first, then examine practical gaps and reachable opportunities. Avoid a national leaderboard becoming a geographically absurd route. Travel mode matters: Eli Winter tours by public transport as well as with a band, so driving is not universal. [V3](#v3)

Store local dates with time zone, confirmed vs tentative state, travel buffers, people constraints and cancellation exposure. Distance is not travel time. A route suggestion must not silently change a confirmed show.

### 3. Qualify scenes, rooms and bills

Check actual format, scale, geography, relevant recent bills, booking contact/guidelines, existing relationships and cultural fit. A room may suit a listening performance, dancing, comedy or a mixed program; capability and configuration matter. [V8](#v8)

Start from inventory you or a booker trusts. Use Qloo to rank it. Label unresolved Qloo mappings and missing locality. Global popularity is not local draw or live quality.

### 4. Request and negotiate

Lead times vary. Miss Eaves and Max Narotzky recommend four to six months for their DIY contexts. That is not a universal SLA, but it contradicts designing all market discovery around instant booking. [V1](#v1), [V2](#v2)

A qualified request contains specific feasible dates, EPK/live evidence, honest draw, appropriate bill/room context and relevant terms. Follow the counterparty's prescribed channel. No automated repetitive spam or invented relationship.

Gus's high-value task is interpreting an actual reply: changed date, hold priority, payment terms, production gap or request for information. Prepare a delta and next action. Do not have two LLM stand-ins negotiate a fictional price and call that a real venue offer.

### 5. Holds, challenges and confirmation

A hold is not a contract, and multiple ranked holds may exist. First Avenue's historical account describes first/second/etc. holds and challenges, with a response deadline in that particular process. [V8](#v8)

Store hold priority, counterparty, source, expiry, challenge status and current offer version. Never hardcode all holds as a universal 48-hour first-priority reservation. The artist's approval may authorize acceptance of a specific version, not bind a venue that has not agreed.

### 6. Announce and promote

Agree promotional responsibilities and announcement timing, embargoes, assets, ticket link, format and approvals. [I6](#i6)

Do not block all announcements until every tour date is finalized if the operator intends to announce in tranches. Model announcement groups and versions. A date/venue change invalidates affected scheduled posts, fan notices, ad assets and media pitches.

Qloo informs cultural candidates/themes. Verified local contacts, partner permission and channel data determine execution. Spotify/Bandsintown/Songkick distribution can be more useful than asking every fan to install Wanted. [F4](#f4), [C5](#c5)

### 7. Advance the show

Confirm technical rider, stage plot/input list, backline, load-in/parking, soundcheck, set times, curfew, guest list, contacts, hospitality, access, accommodation and settlement process. Separate the booking inbox from the actual production contact. [I6](#i6), [C11](#c11)

Shared backline is a concrete cost/load reduction when confirmed; Careful Gaze describes reducing gear and trailer burden by arranging it. [I1](#i1)

Gus should detect unresolved requirements and send the correct question to the correct authorized contact. Do not treat a rider attachment sent as a requirement acknowledged.

### 8. Travel and perform

Provide the latest offline-readable day sheet, essential contact/address, approved schedule and unresolved items. Keep private hotel/crew data off public fan pages.

Road Care can resolve an actual meal/time gap. Crew matter too. Actual sleep, access, allergy and safety constraints must come from the person/party, not demographic/taste inference. [V5](#v5), [R4](#r4)

Travel disruption, illness or safety concerns can require human escalation, rerouting or cancellation. Gus must not pressure a driver to continue to satisfy a route score.

### 9. Settle and reconcile

Record contracted fee calculation, actual ticket reports, approved deductions, already-paid advances/deposits, merch, expenses and balance owed. A written agreement is critical because a headline percentage alone is ambiguous. [I6](#i6), [I7](#i7)

PaymentIntent success in a test environment is not settlement with a venue. A real payment would still require verified payee, currency, authority, current offer and reconciliation.

### 10. Learn and return

Retain the useful, consented operational record: final terms, turnout/report source, promo work done, ticket activity, problems, helpful contacts and when returning might make sense. Do not learn personal/sensitive fan attributes from aggregates.

A repeat-market relationship can reduce the costly first-booking process. That is a stronger long-term loop than resetting the map each time. [V1](#v1), [V7](#v7)

## Critical correction: deal type and direction of money

Your local demo models an artist-paid deposit plus artist door share. That can represent venue hire or a particular risk-sharing arrangement. It is not a universal musician booking model.

Careful Gaze says most of its punk/bar shows do not require an artist deposit, and the band usually avoids those that do. MU featured-artist guidance instead recommends obtaining advance payment from a new promoter. The Current describes promoter rental and artist guarantees/door splits. [I1](#i1), [I7](#i7), [V8](#v8)

Represent separately:

- **Guarantee:** artist receives a defined contracted fee.
- **Door split:** artist receives a share of a precisely defined ticket pool.
- **Versus/backend arrangements:** explicitly model contractual comparison or additional upside; do not assume guarantee plus percentage.
- **Artist/promoter venue hire:** renter bears room cost and defined event risk.
- **Support fee/co-bill:** artist role, compensation and other cost obligations differ.

Record who pays whom, payer/payee, currency, fee base, permitted deductions/caps, comp/refund/tax treatment, deposit direction, settlement date, cancellation and production obligations. Legal/contract treatment requires qualified review for the jurisdiction.

## Illustrative economics, not an industry estimate

Suppose a constructed door deal has $15 tickets, 80 paid tickets, $200 agreed deductions, and a 70% artist share. The ticket pool is $1,200; distributable base $1,000; artist gross $700. If the artist incurs $550 of travel/people/lodging costs, show contribution is $150 before other obligations. A 70% split tells you little without the base and costs.

If 40 tickets sell instead, the same constructed calculation gives ($600 - $200) × 70% = $280; $550 costs imply a $270 loss. A $200 artist-paid venue deposit may be prepaid cost or refundable security, not necessarily a second expense. Avoid double-counting. A promoter-paid artist advance is part of artist payment, not additional income.

Use explicit low/base/high scenarios with the operator's evidence. Do not turn Qloo affinity or signatures into invented ticket counts.

## Cashflow is not profit

Merch manufacturing, transport rental and accommodations can require upfront cash. Revenue may arrive after performance. Net merch contribution subtracts production/inventory cost, venue cuts and payment fees; it is not the whole merch till. [I1](#i1), [V1](#v1)

Track daily starting cash, committed outflows, expected receipts with timing/confidence and a chosen reserve floor. A tour can look profitable but still run out of cash. Do not prescribe borrowing or financial investments; the product helps surface obligations and scenarios.

## Minimal canonical records

- Act and its authorized operators.
- Run brief, route and locked dates.
- Candidate inventory with sources/mappings/verification state.
- Contact and relationship record.
- Opportunity, hold and versioned offer.
- Show and agreed responsibilities.
- Advance requirements and acknowledgments.
- Campaign action, approval, external delivery and cancellation dependency.
- Payment/settlement/expense records.
- Consented fan-interest and attributed activity aggregates.

Chats are supporting context; these records are authoritative. The same show changing date must update all affected work, not just Gus's latest message.


---

<a id="chapter-04"></a>

# 04. Public voice of customer: what people actually describe

**Method:** These are public firsthand accounts, named interviews, research participants and indexed forum excerpts. I did not conduct these interviews. They support workflow hypotheses, not representative prevalence or proven demand for Wanted. Dates and scope are kept visible.

## Artists and artist-operators

### Careful Gaze / Gabe Reasoner, US hardcore band, 2026

Describes owning booking/routing, local bands, lodging, merchandise and backup plans without a proper promoter. Upfront costs include merch and transport. Usually avoids venues requiring artists to pay a deposit. Describes downsizing the live setup and coordinating shared backline to reduce trailer/gas burden. [I1](#i1)

**Product implication:** treat cost and practical production as part of booking readiness. Model artist-paid hire separately. A backline confirmation can have more tangible value than an extra audience card.

**Limit:** one band/scene; not every touring contract.

### Miss Eaves / Shanthony Exum, historical DIY guide

Describes self-managed tours, four to six months of booking lead time, specific date requests, checking calendars, similar-level artists' rooms, realistic draw and supportive local bands/promoters. Repeated visits build a market. Promotion is ongoing and often local/on-the-ground; one social post is not a campaign. Anchor fees can underpin a run. Preferences include privacy/alone time, practical food, laundry and flexible lodging. [V1](#v1)

**Product implication:** progressive regional growth, qualified dates and partners, truthful past-draw evidence, coordinated promotion and optional Road Care.

**Limit:** older platform/visa advice cannot be copied as current instructions. Her stated listeners/draw heuristics are personal practice, not a validated universal conversion.

### Ultra Deluxe / Max Narotzky, DIY artist and booker

Describes two paths: a promoter handles room/locals/flyer, or the band coordinates them. Time-off constrains tour length. If several relevant requests fail, a nearby city, off day, shorter run or visiting a show to build relationships can be better than endless outreach. Show swaps are mutual community help, not enforceable favors. [V2](#v2)

**Product implication:** let Gus choose a sensible fallback instead of blindly maximizing booked nights. Preserve local relationships and authority; do not automate promises of reciprocal gigs.

### Eli Winter, solo instrumental artist, 2023

Self-booked nearly all of about 215 shows over seven and a half years, worked remotely on the road, used trains/buses and sometimes a band, and struggled with information-dense booking spreadsheets. Describes meaningful tours that make modest money rather than fame as the objective. [V3](#v3)

**Product implication:** the middle customer exists; do not assume no manager means no meaningful career. Support different travel modes, low overhead and operator priorities. Save tedious coordination without flattening the artistic goal.

**Limit:** unusually lean solo production; his economics are not a generic band budget.

### Vanessa Silberman and other selected DIY artists, Audiofemme 2017

The interviews describe intimate fan connection alongside self-booking, driving, marketing and personal-life strain. Silberman's van breakdown required replacement transport and reordering performance arrangements to continue. [V4](#v4)

**Product implication:** retain contingency information and changed obligations; an agent must handle more than the happy path. Do not normalize unsafe breakdown continuation as a routing target.

**Limit:** a curated network-based list explicitly described as non-definitive; old accounts.

### Adam Neely / Sungazer, saved firsthand video transcript

Describes the trade-offs between musical experience, extra personnel, tour economics and rescheduling when circumstances/personnel changed. [V12](#v12)

**Product implication:** support creative goals within explicit costs and constraints; preserve commitments and ask the authorized human which trade-off matters.

**Limit:** one disrupted run, not an industry cost model.


### English Teacher, Nubiyan Twist, Japanese Television and artist managers, Guardian 2024

Named reporting and 12 confidential budget sheets show why apparent success does not imply a well-funded touring operation. English Teacher described label/press success alongside financial precarity; Nubiyan Twist described paying the band while retaining thin margins; Japanese Television described expensive gaps after dates were removed. Manager Dan Potts describes artist-funded staffing/production costs. [I9](#i9)

**Implication:** having representation or a larger room does not erase admin/cost trade-offs. Assist the actual operator and preserve creative/people constraints. Gap-filling can be useful, but not at the expense of bad shows or unsafe routing.

**Limit:** selected UK/international cases and forecasts, not an audited representative 2026 profit rate.

## Bookers and promoters

### Fredonia Opera House / Rick Davis; Caffe Lena / Sarah Craig; Cooperstown / Jim Hill

Dave Ruch's named historical interviews describe substantial inquiry load. Fredonia counted 53 email inquiries in one example week, typically 50–60. Caffe Lena describes detailed guidelines reducing irrelevant applications and rejecting obvious bulk/genre mismatches. Cooperstown flags pitches outside its price range. [V7](#v7)

**Product implication:** qualification and useful specificity beat outreach volume. Gus should check guidelines, format, budget and contact; a relevant rejection is a meaningful outcome, not an excuse to send more.

**Limit:** specific older venues; do not repeat article sales folklore as a statistically validated follow-up rule.

### First Avenue / Eli Flasher; Cedar / Grace Evenson; Sue McLean & Associates / Tamsen Preston, 2016

Describe buyer/agent/venue roles, room size/vibe, co-presents, long-term artist development, ranked holds/challenges and presenting a few local support options to the artist/agent. Some promoters rent another room when their own calendar or scale does not fit. [V8](#v8)

**Product implication:** inventory supplied by a buyer is a credible starting set for Qloo ranking. A hold has priority/source/deadline, not a universal meaning. The opener shortlist remains an artist/manager decision.

**Limit:** historical Twin Cities practices; confirm current rules and facts.

### Great Highway / Sarah Morgan and booker Jonathan Ben-Menachem, Bay Area reporting

Prior captured passages describe three distinct bill concerns: compatible music/audience, strong live performance and local draw. They also describe audience loss between poorly matched sets and discovering culturally overlapping shows after committing a date. [V9](#v9)

**Product implication:** do not equate Qloo affinity with live quality or local attendance. A taste-aware conflict radar is a hypothesis worth testing with an actual calendar.

**Limit:** fresh full retrieval failed; use the captured passages narrowly. No ticket-loss coefficient was measured.

### Regional South Australian venues, published 2025 / fieldwork 2020–2021

Peer-reviewed research uses 11 regional operator interviews from a broader 26-interview study. Describes volunteer/nonprofit models, burnout, community responsibilities and differences from metropolitan venues. [I8](#i8)

**Product implication:** local scenes are social infrastructure, not just demand-maximization endpoints. Do not impose one venue success metric or add a heavy intake burden to already stretched operators.

**Limit:** pandemic-era regional Australia; not current national prevalence.

## Tour managers and crew

### Larry McClain II and Matt Clery, Spotify interviews, 2018

Describe months of preparation, advancing, production, artist trust, day-of adaptation, safety escalation, guest lists, merchandise and settlement. Scope ranges from van/FOH/driver combinations to executive touring management. [V6](#v6)

**Product implication:** assist the operator and free creative attention; do not promise an AI replaces all physical/diplomatic work. A fully staffed artist may benefit through a team member rather than use Gus directly.

### Six touring techs interviewed by SoundGirls, 2015

Loopy describes irregular/poor meals and sleep. Dave Clark describes riders/plots not reaching actual show-day workers. Eric Stecki emphasizes communication with changing house crews and also making time to enjoy the road. Jenny Douglas describes familiar food/coffee spots as comfort. Other interviewees value private downtime, showers, Wi-Fi and clear shared workload. [V5](#v5)

**Product implication:** the advance-to-day-sheet handoff and correct contact are high-friction jobs. Road Care should include crew, familiar preferences and rest, not just trendy dining.

**Limit:** selected qualitative accounts, not medical guidance or a current prevalence estimate.

## Food: evidence and counterevidence

### Robin Pecknold, 2024 book excerpt about early Fleet Foxes years

Food discovery can create bonding and make repetitive touring feel worthwhile. He describes difficulty in the late 2000s, then explicitly says contemporary vegan touring options improved. [V10](#v10)

### Pete Wright, James Hunt, Andrew Cream and Conor Bond, Chris Rookie interviews

Describe vegan touring as manageable with prepared food, accommodating promoters, supermarket fallback and basic planning. Some enjoy restaurant research. [V11](#v11)

**Joint implication:** the need is contextual. Gus should resolve a real meal gap and respect stated preferences. Do not assume everybody is stranded, or remove enjoyable discovery from people who like it.

## Fans and demand

Creative Australia finds social connection/emotional value, cost, awareness and access all matter, within Australian music-engaged respondents. Music Fans Voice surveys 8,108 engaged UK venue visitors, emphasizing promotion channels, value, access and grassroots community. Spotify's platform analytics show substantial notification/contextual ticket discovery. [F1](#f1), [F3](#f3), [F4](#f4)

**Implication:** fandom is not the whole attendance decision. Make date/price/location/access transparent and distribution native to where fans already are.

## Forums: use as hypothesis generators

Indexed r/musicians accounts describe unanswered booking emails and, conversely, self-booking successfully after dropping an agent. r/musicindustry includes a booking-software request and an anonymous talent-buyer AMA. Concert discussions describe lack of companions, rural travel burden, scattered discovery and price limits.

The direct Reddit fetches in this pass failed. The pack retains the indexed excerpts/links in [13-RESEARCH-LEADS.md](#chapter-13), marked as anonymous and not independently verified. I do not infer an industry response rate, software adoption rate or universal preference from them.

**What to ask real users:** is their problem contact quality, outreach credibility, timing, follow-through, available supply, personal relationships or the live product itself? Those require different products.

## Synthesis without overgeneralizing

Recurring jobs supported across sources: qualified booking, relationship continuity, context-specific dates/terms, correct operational handoffs, promotion follow-through, day-of preparedness and sustainable touring-party needs.

Not established: paid demand for Wanted, ticket uplift from Qloo, universal demand for meal automation, a particular signature conversion rate, or a need to replace all existing touring software. Those remain testable assumptions.


---

<a id="chapter-05"></a>

# 05. Market, competition, distribution and business model

## Industry distress does not automatically validate our product

NIVA's 2025 report says 64% of independent US stages were unprofitable in 2024. MVT's 2025 report release says 53% of UK grassroots venues showed no profit and average margins were 2.5%. Ditto surveyed 1,500 independent artists and reported 82.1% could not afford touring, but 74.8% had never toured. [I2](#i2), [I3](#i3), [I5](#i5)

These are different populations, countries and methods. Do not combine percentages. NIVA includes venues/promoters/festivals/PACs and some large stages; its modeled economic output is not software TAM. Ditto's broad unsigned sample is not a census of our working-act wedge.

Financial pressure explains why mistakes/cashflow matter, and why customers may not pay much. It also means software cannot repair rent, policy, staffing shortages, disposable income or an unready live set.

## The real substitute stack

The competitor is often a combination:

- Existing relationships and scene knowledge.
- Email/DM/phone.
- Spreadsheet with dates, terms and contacts.
- Shared calendar and maps.
- EPK/website and cloud rider files.
- Ticket provider reports.
- Social posting, mailing list and gig-alert platforms.
- Expense/settlement sheets and human operator memory.

Do not force migration from this stack before giving value. A booking reply should be answerable by ordinary email. Provide exportable records/day sheets and retain operator data ownership.

## Advertised competitors: where they already win

### Gigwell

Artist Essentials advertises EPKs, venue discovery, contact CRM, booking, contracts/e-sign, payments, calendars and travel/offline access. The Essentials page lists $49/month; the general pricing page lists different products from $33 for Discover and $39 for Book, with billing/setup variations. [C1](#c1), [C2](#c2)

**Lesson:** venue discovery, itineraries and booking admin are not empty market gaps. Do not clone them. The plausible wedge is cultural decision-making and reliable action across an artist's actual context, not the first venue directory.

### Master Tour

Professional planning is $64.99/month paid annually or $74.99 monthly on the inspected page. Access-only mobile users are free. It advertises routing, schedules/day sheets, guest lists, crew, file sharing, notifications and offline access. [C3](#c3)

**Lesson:** artists already paying for touring operations may value an assistant to this system, not a replacement. Offline utility and visibility controls are baseline expectations.

### GigLogic

Advertises offer profit checks, costs, splits, tour financials and settlement. Core $19.99/month; Touring $39.99/month; a limited free tier. Headliner forecasting/reconciliation features are marked waitlist. [C4](#c4)

**Lesson:** generic gig profitability is already being productized. Wanted can expose a simple downside/cashflow check, but should not make a full finance suite the central differentiator.

### Bandsintown

Free Fan Manager includes contacts/import/export and communications; first-party contact access requires opt-in. [C5](#c5)

**Lesson:** a paid generic fan CRM is a weak opening. Use the no-install poster for show-specific interest and follow-through, interoperating with existing reach.

### Songkick

Official support advertises tracker geography, city growth, affinities, notification reach and event views/clicks. Eligibility text is inconsistent between 3,000 and 3,500 trackers. [C6](#c6)

**Lesson:** fan maps are not new. A Qloo prior for low-data acts is potentially useful, but must be labeled potential cultural fit, not actual existing fans.

### Chartmetric / Flow AI

Advertises artist live history, venues/capacities, co-performers, lineups, city calendars and market exploration. Current pricing lists Manager $40/month payable yearly, Premium $117/yearly-month, and Flow AI $60/month with credits; MCP is included per page. [C7](#c7), [C8](#c8)

**Lesson:** do not position against only a dumb LLM. AI-assisted music analytics already exists. Compare against factual data plus a competent model, and show execution/trust advantages.

### SystemOne / Stage Portal / broader booking systems

The inspected educational pages reinforce role distinctions and centralized advance/booking operations. Their broader products and other leads such as Prism are relevant for later hands-on comparison. [C10](#c10), [C11](#c11)

**Limit across all competitor sections:** these are advertised features/prices, not trials or verified customer satisfaction. No claim that Wanted is cheaper/better based only on a landing page.

## Positioning whitespace, as a hypothesis

Wanted could own **taste-informed show decisions with accountable follow-through** for a working operator who cannot justify heavy software or still has gaps across the stack.

Specific distinctions to test:

1. New-market cultural priors without needing a mature streaming fanbase.
2. Rank a trusted local roster rather than discover unqualified stars.
3. Compare artist fit and scene fit, not simply genre/popularity.
4. Use that evidence in an actual reply/booking/promotion workflow.
5. Keep provenance, approvals, dependencies and recovery visible.

If these add no accepted operator value over existing data/tools, the position is not defensible merely because we use Qloo.

## Distribution

### Initial acquisition

Founder-assisted design-partner cohort: one circuit, three acts with real upcoming runs, two small operators/bookers. Ask for a redacted task, not a data migration or agency partnership upfront.

Possible introduction channels: local venues/promoters, rehearsal spaces, artist collectives, DIY communities and existing artist collaborators. Source-informed community channels are leads, not permission to mass-post or extract contacts. [V2](#v2)

### Product-led surface

A shareable, no-install WANTED poster can reach fans and collaborating artists. It should link to a real opportunity/event, clear status and consent. A correct, useful day sheet or booking packet may be a stronger operator-to-operator referral than a viral map screenshot.

### Interoperability as adoption

Export calendar entries, a structured packet/day sheet, approved creative assets and contact notes. Integrate one normal workflow before asking every counterparty to join Wanted. Respect external API/data terms. [R1](#r1)

## Retention and seasonality

Tour preparation is bursty. A calendar-month subscription can feel wasteful between runs. Relationship continuity, repeated local shows and a small multi-act operator can improve repeat utility; this is unvalidated.

Measure return to a second real task/run, not daily chat activity. Do not invent weekly engagement solely to drive retention.

## Pricing hypotheses, not a recommendation from measured WTP

Test two structures:

- A low-friction **run pass** for self-booking acts, for a defined period/task scope.
- An **operator subscription** for repeated multi-act work after demonstrating value.

An illustrative pilot pricing test might compare $29–59 per run with $19–39 per month for an operator. These are experiments, not market facts, and must be revised against actual savings, usage and costs. Competitor prices are anchors only.

Avoid initially taking a percentage of bookings or holding ticket/artist money. That adds trust, agency/contract/payment and regulatory complexity before proving the workflow. Avoid recommendation incentives that prioritize affiliate commission over fit; disclose conflicts if introduced later.

## Unit economics and costs to measure

Cost per accepted milestone = data calls + model calls + workflow/storage + delivery + support/correction time. Repeated retries and support can dominate nominal model cost.

Measure cold start vs cached execution, per-run call counts, latency, failure handling and manual qualification. Cache appropriate server-side data privately; do not rescan the whole country and comparator panel on each chat. Qloo production pricing and post-hackathon access are not established. [Q1](#q1)

A bottom-up market model needs reachable qualifying operators, frequency of paid runs, adoption and price. Until validated, use an explicit formula instead of a fake total:

reachable qualified operators × adopted fraction × paid tasks/runs per year × realized price.

## Defensibility

Qloo is infrastructure others can access, not an exclusive moat. A distinctive UI or prompt is also copyable.

Potential durable advantages: consented operator-owned relationship context, trusted local inventory, versioned show knowledge, verified outcomes, eval cases and fast trustworthy workflow integration. Do not imply ownership of venue contacts, private fan data or Qloo's graph. These advantages only arise if real operators repeatedly use the system.

## Business decision gates

Continue if operators use the recommendation/action, corrections are low, repeat value appears and costs can be covered. Shift toward operator/venue intake if that is where repeated willingness to pay appears. Narrow geography/genre if coverage fails. Reject a fan-first social pivot until there is evidence people want a new network and will safely adopt it.


---

<a id="chapter-06"></a>

# 06. Qloo: useful capabilities and exact inference boundaries

## Working mental model

Qloo gives structured cultural correlations, entity metadata and contextual rankings. Gus combines them with operational evidence. A useful response can establish potential fit; it cannot establish a contract, ticket sales, an available date, an actual individual fan or a safe meal.

Use three separate taste contexts:

1. **Potential audience/act:** market, room, bill and promotion fit.
2. **Scene:** verified recent performer references or local booker's curated context.
3. **Touring party:** explicitly chosen preferences for meals/experience.

An artist's audience profile is not the band's personal preference profile. A scene profile is not everyone in the city's actual taste.

## Documented vs verified vs unverified

### Entity resolution

Documented /search and entity lookup let you resolve names to IDs. [Q7](#q7), [Q11](#q11)

**Verified:** recognized artists resolved in live tests. Searching The Basement produced multiple rooms in different cities; the Columbus match required address disambiguation.

**Not verified:** every emerging local act, comedian or house venue. Store unresolved entries and let a human supply references rather than inventing an ID.

### Supplied-candidate ranking

Documented filter.results.entities restricts results to known entity IDs, including artist/person/place categories. [Q2](#q2), [Q3](#q3)

**Verified:** a Phoebe Bridgers signal ranked a supplied two-artist set; all returned IDs belonged to that pool. A control without the filter included an outside candidate. A later four-artist pool changed ordering when the artist signals changed.

**Product value:** rank the operator's roster/inventory while keeping their contacts, availability and history authoritative. This is not implemented by the existing adapter's candidate interface yet.

**Not verified:** complete local coverage, local draw or response probability. Recognized artists in the diagnostic were illustrative, not proposed local openers.

### Heatmaps

Documented urn:heatmap gives geospatial affinity, affinity_rank and popularity. [Q4](#q4)

**Observed live app:** the cached receipt for Phoebe Bridgers/Japanese Breakfast contained 8,578 cells aggregated into 194 metros in the earlier inspection. This verifies that flow, not that those cells are individual fans.

The local Wanted score blends heat and lift percentiles, with a chosen comparator panel. It is a product ranking heuristic. The panel is not automatically a representative typical act. Cell aggregation, boundaries, comparator choice and signal weights can alter rankings. Disclose them and evaluate stability.

Do not convert a heat value or normalized share into predicted ticket count without an outcome-calibrated model.

### Places

Documented location, tags, popularity, business/rating attributes, hotel class, price-tier and weekday opening filters support practical recommendations. [Q2](#q2), [Q3](#q3)

**Verified:** a Columbus place query with two artist signals returned localized entities and explainability. The unconstrained result included university buildings, demonstrating why generic place output is not a room shortlist.

Use correct place-category tags and a trusted inventory/qualification layer. Check the right facility/configuration. Wexner has several capacity configurations; The Basement's rental page discusses combined space; Newport source capacities differ. [R8](#r8), [R9](#r9), [R10](#r10)

A venue's general opening hours are not performance-date availability. A blank public calendar is not proof it is free. A business rating is not production suitability. A restaurant price tier is not tonight's bill; dietary tags are not allergen assurances.

### Demographics

**Verified:** live age/gender values include negative numbers. They are signed skews/affinities, not audience shares. [Q5](#q5)

Your current local demographics adapter already preserves that distinction and describes skews, not shares. Keep it. Do not softmax these into purported attendance percentages or infer a person's identity.

Use aggregate broad context carefully; do not build protected-trait targeting or pretend audience composition identifies actual local attendees.

### Explainability

The inspected documentation/schema describes input influence and can return warnings when unavailable. The localized place diagnostic returned per-result explainability. [Q6](#q6)

Show what input contributed to the recommendation, not why a real booker will accept or what fraction of a venue's customers are fans. Missing explainability is unknown, not an opportunity to invent a rationale.

### Cross-domain interests

Documented artist/place/brand/movie/TV/podcast/book/etc. recommendations support cultural discovery. Your local adapter already queries several domains. [Q7](#q7), [Q10](#q10)

Possible uses: locally qualified cultural partners, campaign context, poster candidates, optional dining/experience. Qualify operational eligibility separately: local presence, editorial fit, contact, permission, deadline and cost.

A popular podcast is not guaranteed local reach, coverage, sponsorship interest or an ad audience you can buy. A place recommendation is not permission to poster its window.

### Artist recommendations using a venue signal

**Semantic failure in diagnostics:** venue-only artist ranking returned the supplied entities but no affinity fields. Adding the same venue to the artist signal left the observed two-candidate scores unchanged from artist-only.

This does not prove the API never supports place-to-artist relationships. It proves we must not claim this exact request works merely because it returned 200. Use artist-based scene anchors until supported behavior is confirmed. [15-CLEVER-QLOO-EXPERIMENTS.md](#chapter-15)

### Analysis/compare and trends

The supporting API documents comparisons and trend endpoints. The current adapter already exposes compare. [Q7](#q7), [Q8](#q8)

Before using it to label crowd overlap, verify the actual result field/unit and meaning. A cultural similarity/affinity is not audience-set intersection or an additional-ticket count. Do not multiply it by an arbitrary default crowd size and present the result as measured people.

### On-device capabilities

Qloo markets compact supported inference on-device. [Q10](#q10)

Availability/licensing/SDK fit under hackathon access is unverified. Do not promise native offline Qloo inference. An offline day sheet/private cached recommendations are useful independent of an on-device model.

## Minimal candidate-ranking recipe

~~~ts
// Conceptual request shape; resolve valid IDs first, keep credentials server-side.
const params = new URLSearchParams({
  'filter.type': 'urn:entity:artist',
  'signal.interests.entities': actReferenceIds.join(','),
  'filter.results.entities': verifiedCandidateIds.join(','),
  take: String(verifiedCandidateIds.length),
});
// GET https://hackathon.api.qloo.com/v2/insights?{params}
// Header: X-Api-Key, injected on trusted server, never in URL/client/logs.
~~~

Assert: successful status, nonempty expected structure, every returned ID in the supplied pool, required affinity fields, no unresolved mappings and no silent fallback being described as measured taste. Compare with a control and a changed signal. Do not hardcode endpoint/type combinations from generic examples without validation.

For places, use valid place IDs, supported location/tag constraints and confirm returned locality. For artists, current entity-type tables do not list the same geographic filters as places. **Verify locality in your own roster; do not rely on an artist location filter not documented for that category.**

## API/environment gotchas

The hackathon guide states: use hackathon.api.qloo.com, X-Api-Key, valid documented tags/types and exact endpoints. Invalid parameters can be silently ignored. /search and insights have different type contracts. [Q1](#q1)

The local weighted adapter supports unequal entity weights via a POST body; generic docs and hackathon troubleshooting are not fully aligned about methods. The extended diagnostic used GET equal-weight signals. Contract-test weighted behavior before using it as a new feature; do not silently substitute arbitrary weights or assume a 200 proves effect.

A high popularity cap such as 0.98 still admits much of the catalog. It does not mean small/local. Query-specific affinity normalization is not calibrated probability, and arbitrary differences between requests are not causal lift.

## Evidence contract for Gus

Every returned recommendation should carry:

- Canonical/internal ID and Qloo mapping status.
- Cultural query inputs, filter type, pool and timestamp/cache status.
- Raw metric type/units preserved internally; display-friendly interpretation.
- Operational facts with separate source and verification timestamp.
- Availability/contact/permission status, not inferred from affinity.
- Missing fields/warnings and fallback reason.
- Permitted action scope and required approval.

Keep Qloo receipts and operational receipts separate. A Qloo success receipt proves data retrieval; an email delivery receipt proves an attempt accepted by the provider; a venue acknowledgment proves the recipient response, not necessarily a signed booking.

## Privacy, caching and licensing

Do not send fan names, emails, phone numbers, device IDs or precise personal locations to Qloo or model prompts. Your local privacy design already avoids fan contacts/neighborhoods going into Qloo; preserve it during any feedback loop. [Q9](#q9)

The hackathon guide allows private server-side caching without a stated time limit but says not to put Qloo response data in a public repository. Keys remain active through judging and are deactivated afterward; production terms/pricing are not established. [Q1](#q1)

This pack records protocol/semantic findings, not raw provider payloads. Do not publish the private diagnostic cache. Keep operational retention/deletion/access controls separate from Qloo's no-PII positioning.


---

<a id="chapter-07"></a>

# 07. Gus architecture and the Eve decision

## Opinionated recommendation

**Use a focused Eve adoption spike for one durable reply/approval workflow, not a full-app rewrite. Preserve Expo and Turso. If integration consumes the build budget, use AI SDK WorkflowAgent plus Workflow SDK, or keep the existing loop while making the business state/outbox reliable.**

Eve is a fit for long-running conversations waiting on people. It is not a prerequisite for eligibility, and its feature count is not a proxy for judge score. [H1](#h1), [A5](#a5)

I have not installed Eve, benchmarked it in Wanted or verified native Expo integration. Browser React/client support and peer-service routing are documented; that is not a tested one-line drop-in. [A9](#a9), [A10](#a10)

## Workflows around focused agent loops

AI Engineer/Anthropic guidance supports simpler deterministic workflows around small loops where judgment is necessary. [A1](#a1), [A2](#a2), [A4](#a4)

Use deterministic code for budget arithmetic, permissions, date conflicts, expiry, approval scope, state transitions, dedupe and dependency invalidation.

Use model judgment for interpreting messy requests/replies, deciding what evidence to retrieve, comparing feasible options, explaining trade-offs and adapting after rejection/change.

Use domain procedures/skills for opportunity qualification, offer/hold reading, advancing, local campaign preparation, disruption replanning and food-window handling. One Gus can load the relevant procedure; multiple personalities are unnecessary. [A3](#a3)

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

Documented durable sessions/steps, channels/client routes, event streaming, tools/skills, approvals/questions, sandbox and eval facilities. [A5](#a5), [A7](#a7), [A8](#a8), [A11](#a11)

What Wanted still owns: the meaning of a booking, tenant/artist permissions, business state, exact financial authority, external action idempotency, data consent, recipient qualification and proof of outcome.

Eve tool implementations run in the trusted app runtime with secrets/network access. Sandboxed shell isolation does not automatically make your custom charge/send tool safe. [A6](#a6)

Omitted tool approval defaults to never requiring approval. always() gates each invocation; once() only gates initially; auto() delegates classification to a decision model and sends its input to that provider. Explicit policy/approval is required for sensitive effects. [A8](#a8)

## Durability is not exactly-once action

A request can succeed externally and the process fail before recording success. A resumed/retried step may repeat it. Use stable service-enforced idempotency and database uniqueness on the **business action**, not only workflow step ID. Separate runs have different step IDs. [A7](#a7), [A12](#a12)

For email/publication when the provider lacks idempotency: claim a unique outbox action, reconcile uncertain status using provider IDs, and do not blind-resend. If double delivery cannot be safely ruled out, surface uncertainty and ask for review.

Concurrency: serialize effects per opportunity/show version where needed. Duplicate signatures/replies should not create duplicate booking chains. Do not assume event delivery order is globally FIFO.

Deployment changes: inspect Eve/Workflow's pinning/handoff/version rules. Old runs can resume with older external schema assumptions; keep storage/contracts compatible and plan migration/cancel/restart carefully.

## Minimal safe tool surface

Read tools: get_run, get_show, resolve_candidates, rank_roster, get_calendar, retrieve_guidelines, get_offer, get_policy.

Prepare tools: prepare_request, prepare_counteroffer, prepare_announcement, prepare_advance_question, prepare_meal_options.

Effect tools: send_approved_message, publish_approved_asset, apply_approved_change, pay_exact_test_intent. Each must enforce current authorization server-side.

Tool results contain canonical IDs, source references, metrics/units, uncertainty and action state. Use structured errors: invalid input, missing evidence, expired state, unauthorized, rate-limited, temporary service failure. Do not leak secrets in error bodies or traces.

## Context and prompt-injection boundaries

External websites, venue emails and model-generated text are data, not instructions. A reply cannot override budget, change the payee or demand private data. Verify inbound signatures/tokens and derive identity from trusted context, not a body-supplied artistId/principal. [A6](#a6)

Keep prompts focused on the current task, relevant state and selected evidence. The existing numeric/name grounding checker is useful but not semantic proof: a supported number can be attached to a false claim. Add source/type/status checks and action assertions. [A14](#a14)

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


---

<a id="chapter-08"></a>

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

Both primary guidance and a named current band contradict treating artist deposits as universal. [I1](#i1), [I6](#i6), [I7](#i7)

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

Wanted's Columbus sheet includes The Basement, Wexner and Newport. The Newport concert page says 1,400 capacity; the rental page says 1,700. Wexner varies from 150–250 floor seats to up to 500 standing. The Basement rental description mentions a combined 350-capacity context. [R8](#r8), [R13](#r13), [R9](#r9), [R10](#r10)

Do not replace missing capacity with the demo size-band constant and call it verified. A primary-source mismatch is a review item. General office/gallery hours should not decide stage availability. This is a stronger demo of trustworthy intelligence than confidently choosing a famous room.

## Definition of done

One specific operator can use an end-to-end flow. Qloo changes a real decision over the same feasible inventory. Gus responds to feedback/change, waits and resumes correctly, never claims a simulated external agreement is real, and preserves approval boundaries. Clean commands and hosted behavior match the description. More screens do not compensate for failure here.


---

<a id="chapter-09"></a>

# 09. Validation, interviews and outcome evaluations

## Do not confuse four kinds of proof

1. **API validity:** correct parameters produced the expected structure.
2. **Recommendation quality:** an operator accepts the choice for the stated job.
3. **Workflow reliability:** approved work completed correctly and survived interruptions.
4. **Business value:** repeat use and payment/savings justify the product.

Our research establishes some of 1 and public evidence of underlying workflows. It does not establish 2–4 for Wanted.

## Design-partner pilot

Recruit three self-booking acts with a real upcoming run, two small bookers/managers, and one crew/tour-manager perspective. Include people with existing tools and people skeptical of AI. Do not recruit only friends who already love the concept.

Ask for a redacted real task, not unrestricted inbox/account access. Start with one city/date decision or a real reply. Obtain consent for recording, data use and external actions. An API demo/fictional artist is not a user session.

## Interview protocol

### Artist/operator: past behavior

- Walk me through the last run you booked, from first idea to settlement.
- Show how you selected this city/venue/date and what alternatives you rejected.
- Who helped? What did you do yourself and what was somebody else's responsibility?
- What evidence made you think the room/bill would work? What surprised you?
- Show a booking thread where date/terms changed. What did you recheck?
- What was the last avoidable mistake or time-consuming handoff?
- What was already known from relationships that no data tool could tell you?
- Which tools did you actually use, pay for, abandon or work around?
- What did promotion involve, and who did what locally?
- How did you handle food/gear/lodging and settlement?
- What would you refuse to let Gus do under your name?

### Booker/manager

- Show an appropriate request you accepted and one you rejected.
- Which facts made the request credible or unsuitable?
- Who controls holds, challenges, production and announcement permissions?
- How do you choose local support and verify draw/live quality?
- What is your real intake channel? What behavior looks spammy?
- Where does information become stale or fail to reach the right person?
- Would cultural ranking of your roster help? What missing context reverses it?

### Crew/tour manager

- Show an advance/day sheet and where it differed from what happened.
- Which essential requirement was last unresolved?
- Who needs a meal/break and who arranges it?
- What must work offline? What must remain private?
- What can software prepare, and what needs physical/human judgment?

### Fan

- Tell me about the last show you wanted to attend but did not.
- How did you discover it, who were you going with and what stopped you?
- What does a signature/RSVP mean to you?
- What date/price/access/travel information do you need before committing?
- Would you help with a local show? With which privacy limits?

Avoid leading questions such as would you use an amazing AI tour manager. Do not count compliments as adoption.

## Observed task test

Give one authentic task. Have the operator show their current method, then use Wanted. Compare time to a **usable** action including input/review/correction; facts corrected/missing; rejection reasons; whether the actual next action is used; evidence-based confidence; and return for another task.

Do not send outreach/spend money during testing without exact approval and a permitted target. Begin with drafts/test inboxes and transparent fixtures.

## Fair Qloo evaluation

Same model, prompts, operational inventory, calendars, budget and source freshness:

- **B0:** competent model + factual inventory + geography/genre/history rules, no Qloo cultural signals.
- **B1:** B0 plus Qloo rank/explainability.
- **B2:** B1 plus two-context scene pressure test/uncertainty procedure.

Optionally compare to current operator method. A bare uninformed LLM is a secondary illustration, not the only baseline. Do not grade against Qloo as the sole gold label and call it real-world quality.

Use held-out real tasks/rosters, blind/randomized output order, independent operator ratings and repeated trials. Report n, task scope, mocks, failures, latency/cost and review time. Small pilot results should not become broad statistical claims.

## Scoring rubric

Hard constraints; provenance/freshness/unknowns; cultural usefulness as assessed by operators; relationship/contact fit; current-version exact action; recovery/dedupe; and low review burden.

Use deterministic graders for state/action constraints, qualified humans for live/bill usefulness and LLM judges only as supplementary semantic review. [A14](#a14)

## Minimum automated cases

1. Unknown act: asks for references, no fabricated Qloo ID.
2. Same-name venue: disambiguates address/city.
3. Supplied roster: no outside candidate silently recommended.
4. Empty result: truthful unknown/fallback.
5. Ineffective signal: missing affinity fails despite HTTP 200.
6. Rate limit/timeout: bounded retry and observable fallback.
7. Fit but wrong format/capacity: not qualified.
8. Business hours vs performance availability: distinction preserved.
9. Missing locality: not described as local.
10. Signed demographic value: not audience share.
11. Affinity/overlap: no predicted-ticket conversion.
12. Signature ratio: no attendance-proof claim.
13. Changed date: old scheduled actions invalidated.
14. Hold/challenge: correct deadline/source and human decision.
15. Offer expired/changed after approval: reapproval, no execution.
16. Duplicate signature/reply: one business chain/action.
17. Restart while waiting: resumes recorded state.
18. External success/lost acknowledgment: reconcile, no blind resend.
19. Unauthenticated/cross-act approval: rejected.
20. External email requests secret/payee change: not obeyed as instruction.
21. Payment amount/payee/currency outside scope: rejected server-side.
22. Test payment: not live venue settlement.
23. Prepared message/post: not sent/published.
24. Confirmed catering: no forced restaurant expense.
25. Shortened meal window/access/allergy: preserves hard requirements.
26. Canceled show: dependent promotion stops.
27. Private fan/hotel/access data: absent from public/model/Qloo outputs.
28. No viable bridge: another format/date or human question, not false optimum.

These are proposed cases, not completed test results. Use deterministic fixtures and repeated model-path trials.

## Metrics and funnel

Operator leading metric: accepted usable milestone/action per task plus review minutes/corrections. Reliability: current-state effects, duplicates, forbidden effects, uncertain/failure handling and resume success.

Fan funnel: attributable exposure → consented interest → date-specific intent → ticket click → verified purchase where permitted → attendance where available. Track channel/date/price context; distinguish comps and missing reports.

Tickets/attendance are not attributable to Qloo from a simple before/after run. Bill, promotion, schedule, venue and external demand confound them. Do not claim causal uplift without an appropriate experiment/sample.

## Decision gates

For a small pilot, a useful go signal might be most tasks produce an action used, review time improves, no critical authority/duplicate failures and at least one repeat request. Set thresholds before results. With n=3, report cases rather than grand percentages.

Negative signals: missing local coverage, ignored recommendations, high correction burden, no repeat need or rejection because free tools solve it. Change the wedge, not the success-story wording.

## Evidence handling and judge proof

Store consent, redaction, task source, condition, output, corrections, tool/action trace and final state. Keep private inbox/fan data out of public eval artifacts; publish aggregate/synthetic fixtures within provider terms.

Show a same-inventory ablation, recovery/approval test, operator correction and API semantic failure caught. State sample and simulation boundaries. Do not present an unrecorded holdout as a measured pass rate.


---

<a id="chapter-10"></a>

# 10. Hackathon delivery and judge-facing proof

## Current official requirements, checked October 25, 2026

Deadline: **October 30, 2026, 11:45 PM Eastern**, equivalent to **October 31, 2026, 9:15 AM Asia/Calcutta**. Treat the official timezone as authoritative and submit early. [H1](#h1)

Required: working Qloo-integrated application that is an agentic tool, uses an agent framework, or integrates into an existing agent; externally hosted functional demo; public source repository with needed source/assets/instructions; open-source license visible/detectable in the repository About area; text description. The main page says a demo video is **not required**. [H1](#h1), [H2](#h2)

A framework is an option, not a requirement to rewrite Wanted. The application should run as described and remain accessible/free for judges through judging. Respect all third-party API/data/assets licenses. The existing-project rules text has an apparent wording defect; if eligibility depends on a borderline case, confirm with the organizer rather than interpreting the typo. [H1](#h1)

The fresh page/rules now state a November 5 final/live finalist event. Earlier captures/search snippets showed later judging/winner dates. **Use fresh official pages**, and recheck before submission. The top three must be available for the appearance/preparation if selected. The extra $25,000 investment announcement is not an additional guaranteed cash prize for every winner. [H2](#h2)

## Criteria are equally weighted

1. Technological implementation: nontrivial, skillful working Qloo use.
2. Design: complete coherent product, not only proof of concept.
3. Potential impact: specific real audience/problem supported by demonstration.
4. Idea quality: creative, non-obvious cultural intelligence and domain understanding.

No official requirement to maximize endpoint count, use multiple agents, or automate real payments. [H1](#h1), [H2](#h2)

## My recommended demonstration

### Act 1: real operator context

A working act has an upcoming regional run, a locked anchor and one uncertain date. Show actual constraints and a small operator-verified roster/venue inventory. If the act, calendar or replies are fixtures, label them. Do not pretend Maya's demo fan counts are real traction.

### Act 2: Qloo makes a different decision

Run the artist/scene cultural pressure test over the same candidate inventory. Compare to a geography/genre/factual baseline, not only an uninformed LLM. Explain the trade-off, source and unknowns. Show why the choice is usable and what would change with a different taste context.

### Act 3: an actual change, not scripted agreement

A reply changes the proposed date/terms or availability. Gus retrieves current state, checks constraints, reranks when appropriate, prepares a delta/action and seeks exact approval. The model chooses a sensible next step rather than just narrating a fixed film.

For a demo, use a clearly labeled venue-response fixture or test inbox. Do not describe two LLM stand-ins as real counterparties.

### Act 4: wait, resume, follow through

Show approved execution with truthful test/provider status, a receipt and the current business record. Demonstrate a restart/duplicate event or expired-offer case. The Logbook should show why no stale/duplicate effect occurred.

### Act 5: existing promotion and optional lateral

Reuse Filling the room with qualified local candidates and precise prepared/approved/sent states. Optionally resolve one practical food window/day-sheet gap. Do not add six unrelated recommendation screens in a short demo.

## What proves we pushed Qloo

- Candidate restrictions on trusted inventory.
- Two-sided cultural comparison and a meaningful counterfactual.
- Cross-domain evidence tied to a qualified action.
- Correct units, uncertainty and semantic checks.
- Clear difference when cultural data is absent.

A semantic failure caught is good engineering evidence: a venue-only input returned entities without affinities, so the product did not call it measured fit.

## Judge sandbox checklist

- Public HTTPS URL works on desktop and phone, without private deployment protection.
- Fixture/demo state is obvious and can be reset per session without corrupting another visitor.
- No live money, public spam or accidental publication.
- Existing app remains usable on Qloo/model timeout via labeled fallback.
- Cache status/time and real-vs-demo fan data are visible.
- Approval cards name exact target/action/version/amount and expiry.
- A counterparty reply does not require installing Wanted.
- Essential interactions work, not only animations/screenshots.

## Repository checklist

Commit/deploy the local work intentionally. Local README/LICENSE existence does not prove the public submitted branch contains them. Ensure reproducible scripts, dependency lockfile, required assets and environment-variable instructions without secrets. Referenced test/gauntlet/smoke files must exist or commands must be corrected.

Do not commit .env files, private fan/contact records, raw Qloo response/cache data, unlicensed asset dumps or real inbox transcripts. Provide synthetic permitted fixtures and private server-side cache. [Q1](#q1)

## Description checklist

Explain who operates Wanted, the exact workflow, why Qloo changes the choice, where judgment occurs, what remains deterministic/human-controlled, and which integrations are simulated. Report measured tests with n and limits. Do not claim ticket uplift, production readiness, real bookings or direct interviews that were not performed.

## Final freeze

Protect time for clean install, hosted test, reset/concurrency, timeout/fallback, source/license and submission fields. More features late in the week are lower value than reliability and truth. No research document can guarantee a win; this plan aligns the demonstrated work with the actual criteria.


---

<a id="chapter-11"></a>

# 11. Risks, assumptions and changes to earlier advice

## What changed after deeper research

1. **Local implementation correction:** uncommitted README/license and Filling the room exist. Earlier committed-main gaps must not be applied to local work.
2. **Customer framing:** meaningful artists can still self-book or have partial teams; popularity and staffing are not binary. Eli Winter and English Teacher/reporting support that distinction. [V3](#v3), [I9](#i9)
3. **Deposit correction:** artist-paid venue hire is not the universal booking model. [I1](#i1), [I7](#i7)
4. **Qloo candidate ranking:** moved from documented/promising to live mechanism-tested for known artists.
5. **Direct venue signal:** attempted, HTTP-successful but semantically unsupported/inconclusive; do not ship the earlier intuition as a fact.
6. **Demographics:** live skews verified; local adapter already handles them correctly.
7. **Framework:** Eve is a time-boxed execution spike, not a full rewrite or mandatory eligibility step.
8. **Competition:** Chartmetric AI/live intelligence and established free/paid tools make a generic analytics/chat/CRM wedge weak.
9. **Food:** real contextual job, with counterevidence to blanket pain assumptions; preserve enjoyable discovery and crew needs.
10. **Detour:** historical conditional pledges and promoter coordination; no substantiated causal claim that its fate was due to lacking Qloo.
11. **Official schedule:** fresh November 5 finalist/judging details supersede older captures.

## Risk register and mitigations

### Coverage and entity mapping

Emerging local acts/DIY rooms may not be well covered. Test the actual circuit and roster early. Track unresolved rate and human correction. Narrow geography/genre or use clearly labeled references rather than fabricate data.

### Cultural affinity presented as demand

No live ticket forecast was validated. Preserve metric units, separate interest/exposure/tickets/attendance and avoid demographic shares or audience-union arithmetic. A signature trigger should start research/escalation, not commit money.

### Commercial/operational facts guessed

Room capacity, dates, contact roles and fees can be missing/conflicting. Keep first-party sources, exact facility/configuration and verification timestamps. No guess becomes confirmed inventory.

### Relationship damage/spam

Over-automation can harm artist credibility and burden bookers. Check guidelines, qualification, frequency and permitted contacts; require approval for external outreach and honor opt-outs. No invented prior connection or draw.

### Wrong authority or stale version

Bind approval to act/owner/action/recipient/content/offer version/currency/amount/expiry. Recheck at execution. Reject cross-act/unauthenticated decisions. A stale approval does not cover changed terms.

### Duplicate/uncertain external effects

Durability does not mean exactly once. Use business-level unique keys, outbox states and service reconciliation. Never blind-resend after ambiguous provider success. [A12](#a12)

### Privacy and safety

Keep fan contacts, device IDs, exact personal location, hotel and access needs outside Qloo/model/public outputs. Access needs are self-disclosed and minimally shared, not inferred. Do not publish private house-show addresses or unsafe meetup data. [Q9](#q9), [R4](#r4)

### Data/API rights

Bandsintown API terms restrict commercial use, scraping, transfers and caching; free artist tools do not grant data integration rights. Qloo guide forbids public response-data repositories. Use operator-owned/approved/licensed data and confirm production access. [R1](#r1), [Q1](#q1)

### Legal/financial scope

Contracts, taxes, talent procurement, payments, contests and communications can have jurisdiction-specific obligations. California regulator guidance raises talent-agency/talent-service questions; applicability to Wanted software has not been determined. Get qualified counsel before production brokerage/commission or money custody. [R3](#r3)

US commercial-email/B2B obligations require compliance review; this is not legal advice. [R2](#r2)

Your bounty/referral draw may need eligibility/rules/prize/minor review. Cryptographic fairness does not establish legal compliance. Keep it clearly a demo until production policy is reviewed; early access is simpler than expanding prize mechanics.

### Touring-party wellbeing

Do not optimize away sleep, safe travel, breaks or access to satisfy score/budget. Do not give medical advice, guarantee allergen safety or infer protected traits. Escalate safety-impacting decisions to humans.

### Seasonal usage/WTP

Artists may not need monthly software between runs or pay for what free tools solve. Test run passes vs operator subscriptions, repeat tasks and total correction/support cost. Do not use competitor prices as proof of willingness to pay.

### Hackathon access expiration

Hackathon keys are temporary. Preserve judge access through the current judging period and plan a production access/fallback path. Cached public-payload dumps are not an acceptable substitute. [Q1](#q1)

## Open assumptions and disconfirming evidence

- Working operators will use a culturally ranked local shortlist: disconfirmed if outputs are rejected as obvious/unqualified.
- A scene pressure test changes a useful decision: disconfirmed if rankings move but operators see no benefit.
- Gus saves admin time: disconfirmed if import/review/corrections cost more.
- The fan poster helps show-specific conversion: disconfirmed if interest never becomes useful commitments/activity.
- Road Care is wanted: disconfirmed if catering/preparation already solve it or users enjoy independent discovery.
- Small operators pay: disconfirmed by repeated refusal despite demonstrated use/value.
- Eve reduces execution work: disconfirmed by integration/version complexity exceeding the narrow workflow benefit.

## Kill/narrow criteria

Stop promising an automated feature if authority cannot be enforced, locality is unverified, key API fields are ineffective or a provider cannot safely reconcile effects. Narrow the market if coverage repeatedly fails. Change the payer/wedge if real usage clusters elsewhere. Cut lateral scope before sacrificing truthful core execution.

## Confidence

High confidence in documented/retrieved workflow distinctions, local code observations and the specific live API diagnostics. Moderate confidence in the working-act/operator wedge and cultural-pressure-test usefulness. Low/unvalidated confidence in market size, price, ticket uplift, sustained retention and real-world local coverage.

This is deliberately not the claim that we got everything right forever. It is a grounded decision base with falsifiable assumptions.


---

<a id="chapter-12"></a>

# Wanted research source catalog

Observed/recovered during this conversation and checked through October 25, 2026. These are sources used in the synthesis, not a claim that every source is equally reliable. Prices, APIs and event rules can change. New full-page retrievals, saved transcripts, primary PDF extracts, prior captured passages and indexed excerpts are distinguished below.

Source IDs are used throughout the pack. Linked search-only research leads live in 13-RESEARCH-LEADS.md. No private credentials, fan contacts, raw provider responses or unrelated browsing history are included.

## H1

**Official hackathon rules**

- Link: https://qloo.devpost.com/rules
- Evidence type: Primary rules, fetched October 25, 2026
- Used for: Deadline, eligibility, code/demo/license/testing and equally weighted criteria.
- Limitations: Fresh page supersedes older captures; existing-project wording contains an apparent text defect, so ask organizer if relying on it.

## H2

**Official hackathon landing page**

- Link: https://qloo.devpost.com/
- Evidence type: Primary event page, fetched October 25, 2026
- Used for: No mandatory video; hosted working demo; November 5 live finalist announcement; judging and prizes.
- Limitations: Prize/investment and live appearance details are organizer-controlled and can change.

## Q1

**Qloo hackathon developer guide**

- Link: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- Evidence type: Primary API documentation, fetched October 25, 2026
- Used for: Correct host/auth, silently ignored parameters, caching and post-hackathon key limitations.
- Limitations: Some general docs show methods/types differently; validate exact combinations.

## Q2

**Entity-type parameter guide**

- Link: https://docs.qloo.com/reference/available-parameters-by-entity-type
- Evidence type: Primary API documentation
- Used for: Supported candidate lists, location and place filters, artist/person differences.
- Limitations: A listed feature is not proof of coverage for your exact inventory.

## Q3

**Parameter reference**

- Link: https://docs.qloo.com/reference/parameters
- Evidence type: Primary API documentation
- Used for: Candidate entity filters, popularity percentile and opening-day semantics.
- Limitations: Examples and compatibility tables can disagree; contract-test adapter behavior.

## Q4

**Heatmap guide**

- Link: https://docs.qloo.com/reference/heatmaps-use-case
- Evidence type: Primary API documentation
- Used for: Affinity, affinity rank, popularity and geography.
- Limitations: These are not audience counts or calibrated ticket demand.

## Q5

**Demographics guide**

- Link: https://docs.qloo.com/reference/demographics-use-case
- Evidence type: Primary documentation, also live-tested
- Used for: Signed age/gender affinity skews.
- Limitations: Page introduction says distributions, but sample and live response use signed skews; do not convert to headcounts.

## Q6

**Insights deep dive**

- Link: https://docs.qloo.com/reference/insights-api-deep-dive
- Evidence type: Primary documentation and inspected public schema
- Used for: Explainability, input/output shape and supported parameters.
- Limitations: Rendered page sometimes omits schema; use schema plus live checks.

## Q7

**API overview**

- Link: https://docs.qloo.com/reference/api-overview
- Evidence type: Primary API documentation
- Used for: Lookup, tags, audiences, comparison and insights roles.
- Limitations: API endpoint lists do not establish booking/event inventory.

## Q8

**Public Qloo docs repository**

- Link: https://github.com/qloo/docs-public
- Evidence type: Primary documentation repository inspected locally
- Used for: Read reference docs, recipes and schema for implementation details.
- Limitations: Cached checkout is supporting evidence, not guaranteed latest API behavior.

## Q9

**Qloo privacy policy**

- Link: https://www.qloo.com/legal/privacy
- Evidence type: Primary policy, last updated December 19, 2024
- Used for: API input is anonymized entity/attribute data; no fan PII should enter Qloo.
- Limitations: Wanted still has its own privacy and processor obligations.

## Q10

**Qloo capabilities**

- Link: https://www.qloo.com/capabilities
- Evidence type: Primary product claims, fetched October 25, 2026
- Used for: Contextual combination, cross-domain enrichment, ranking and on-device claims.
- Limitations: Illustrative timings are not our benchmarks; on-device availability under hackathon access not established.

## Q11

**Entity search**

- Link: https://docs.qloo.com/reference/get-search
- Evidence type: Primary API documentation and live-tested
- Used for: Entity resolution and type-sensitive lookup.
- Limitations: Disambiguate same-name rooms by address/city, not first result.

## I1

**Careful Gaze touring economics interview**

- Link: https://www.marketplace.org/story/2026/07/09/how-the-economics-of-touring-have-changed-for-indie-bands
- Evidence type: Named artist interview, July 9, 2026
- Used for: Gabe Reasoner on self-booking, cost, venue deposits, merch and shared backline.
- Limitations: One US hardcore band; not every deal type or genre.

## I2

**Ditto unsigned artist survey**

- Link: https://press.dittomusic.com/82-of-independent-artists-cant-afford-to-tour-in-2025
- Evidence type: Vendor-sponsored survey release, January 24, 2025
- Used for: 1,500 independent artists; 82.1% unaffordable, 74.8% never toured, savings dependence.
- Limitations: Not a representative census of working touring acts; cannot use 82.1% as Wanted TAM.

## I3

**Music Venue Trust 2025 annual report release**

- Link: https://www.musicvenuetrust.com/2026/01/music-venue-trust-annual-report-2025
- Evidence type: UK charity/trade-body report release, January 20, 2026
- Used for: 53% no profit, 2.5% average margins, circuit contraction and intervention programs.
- Limitations: UK grassroots scope; structural problems software alone cannot fix.

## I4

**NIVA State of Live**

- Link: https://www.nivassoc.org/stateoflive
- Evidence type: US trade-body primary report landing page, 2025
- Used for: Independent venues, promoters, festivals and performing arts centers; financial fragility.
- Limitations: Includes large independent stages; not a count of DIY artists or software buyers.

## I5

**NIVA full national report**

- Link: https://www.nivassoc.org/s/2025-NIVA-State-of-Live-Report.pdf
- Evidence type: Primary report PDF, extracted and methods read
- Used for: 2024 economic activity, 64% unprofitable, survey/partner data/IMPLAN methodology.
- Limitations: Advocacy-sponsored modeled economic output is not revenue accessible to Wanted.

## I6

**MU booking guidance for unsigned/emerging artists**

- Link: https://musiciansunion.org.uk/working-performing/gigs-and-live-performances/engagement-booking-for-unsigned-and-emerging-artists
- Evidence type: Primary union guidance
- Used for: Fees, permitted deductions, rider, gear-sharing, contracts, promotion and consent.
- Limitations: UK guidance; legal applicability and actual commercial terms vary.

## I7

**MU performing/touring with featured artists**

- Link: https://musiciansunion.org.uk/working-performing/gigs-and-live-performances/performing-and-touring-with-featured-artists
- Evidence type: Primary union guidance
- Used for: Written contracts, promoter-to-artist deposits, expenses, international logistics and royalties.
- Limitations: Featured-artist/international context; not a universal DIY touring contract.

## I8

**Regional venue ecology and burnout research**

- Link: https://www.tandfonline.com/doi/full/10.1080/03007766.2025.2455302
- Evidence type: Peer-reviewed qualitative paper, published 2025
- Used for: 11 regional South Australian venue interviews within 26 interviews; community obligations and operator burden.
- Limitations: Fieldwork 2020–2021; regional/pandemic context, not current US prevalence.

## V1

**Miss Eaves DIY tour guide**

- Link: https://thecreativeindependent.com/tips/how-to-book-a-diy-tour/
- Evidence type: Named firsthand artist guide, historical
- Used for: Regional expansion, relevant rooms, promoter relationships, realistic draw, promotion, food/rest and anchor shows.
- Limitations: Dated platform/ad/visa advice must not be treated as current law or API behavior.

## V2

**Max Narotzky DIY booking guide**

- Link: https://www.ienjoymusic.net/how-to-book-a-diy-tour-max-narotzky
- Evidence type: Named firsthand artist/booker guide, 2024-era examples
- Used for: 4–6 months, time-off constraints, promoter vs self-booking, show swaps, off days and community.
- Limitations: Personal method and DIY scenes, not universal conversion rates.

## V3

**Eli Winter: Love Labor**

- Link: https://lareviewofbooks.org/article/love-labor-on-touring-as-an-independent-musician/
- Evidence type: Named firsthand essay, February 13, 2023
- Used for: Self-booking 215 shows, dense spreadsheets, remote work, alternative travel and mixed financial/creative goals.
- Limitations: A solo instrumental artist with unusually lean production; not a generic band cost template.

## V4

**Audiofemme hardest-working DIY bands**

- Link: https://www.audiofemme.com/af-2017-hardest-working-diy-bands
- Evidence type: Named artist interviews, 2017
- Used for: Self-booking, promotion, personal-life strain, breakdown recovery and intimate fan connection.
- Limitations: Selected by author/network, explicitly not definitive; old accounts.

## V5

**SoundGirls: life on tour**

- Link: https://soundgirls.org/life-on-tour-your-emotional-and-physical-well-being/
- Evidence type: Named interviews with six touring techs, 2015
- Used for: Food, sleep, handoff failures, familiar spots, human communication and crew needs.
- Limitations: Historical qualitative evidence; not medical advice or current prevalence.

## V6

**Spotify: tour managers**

- Link: https://artists.spotify.com/en/blog/tour-managers-your-key-to-life-on-the-road
- Evidence type: Named tour-manager interviews, September 6, 2018
- Used for: Role scope, advance, production, safety, settlement, touring scale and payment arrangements.
- Limitations: Platform editorial and professional examples; older workflow account.

## V7

**Dave Ruch: why venues do not reply**

- Link: https://daveruch.com/advice/how-to-reach-out-for-a-gig-booking/
- Evidence type: Named venue-booker interviews, page dated 2021
- Used for: Fredonia, Caffe Lena and Cooperstown on inquiry load, fit and budget.
- Limitations: Historical selected venues; sales-stat rules elsewhere in the article are not independently validated here.

## V8

**The Current: who plays where**

- Link: https://www.thecurrent.org/feature/2016/07/01/who-plays-where-when-and-why-explaining-the-mysteries-of-live-music-booking
- Evidence type: Named booker interviews, July 1, 2016
- Used for: Buyer/agent/venue separation, fit/size, development, holds/challenges, local support and bar economics.
- Limitations: Twin Cities examples from 2016; hold rules must come from current counterparties.

## V9

**Bay Area booking challenges**

- Link: https://brokeassstuart.com/p/bay-area-music-scene-challenges
- Evidence type: Named local reporting, December 18, 2024; prior captured excerpts
- Used for: Sarah Morgan on bill fit/live quality/draw and Jonathan Ben-Menachem on scheduling conflicts.
- Limitations: Fresh full retrieval failed; earlier captured passages support limited claims, not a fresh market-wide conclusion.

## V10

**Robin Pecknold: eating on tour**

- Link: https://www.rollingstone.com/music/music-features/fleet-foxes-robin-pecknold-vegan-food-1235103391
- Evidence type: Firsthand book excerpt, copyright 2024
- Used for: Food as connection and relief; explicitly notes vegan landscape improved since early touring.
- Limitations: Historical early-career narrative, not evidence all vegans struggle today.

## V11

**Chris Rookie: vegan touring interviews**

- Link: https://medium.com/@chris_79346/how-to-survive-tour-as-a-vegan-musician-f339ae4feff7
- Evidence type: Named interviews, publication date not reliably established
- Used for: Prepared food, accommodating promoters, supermarket fallback and enjoyable discovery.
- Limitations: Small selected network; some meal/product details may be old.

## V12

**Adam Neely / Sungazer tour account**

- Link: https://www.youtube.com/watch?v=3qXLYtvbIOg
- Evidence type: Firsthand video; saved transcript read
- Used for: Economic, personnel, musical-quality and rescheduling trade-offs.
- Limitations: One disrupted tour; do not generalize its balance sheet.

## F1

**Creative Australia live music audience release**

- Link: https://creative.gov.au/news-events/news/strong-audience-demand-live-music-lives-despite-cost-living-pressures
- Evidence type: Primary research release, April 29, 2025
- Used for: Social/emotional value, cost/access barriers, later tickets and 51% local-gig discovery gap.
- Limitations: Australia and music-engaged respondents; not all consumers or US conversion forecast.

## F2

**Music Fans Voice results**

- Link: https://musicfansvoice.uk/results-2025
- Evidence type: Primary UK fan-survey results, 2025
- Used for: Promotion channels, access, declining visits, value, safety and grassroots support.
- Limitations: Highly engaged fan sample.

## F3

**Music Fans Voice full executive summary**

- Link: https://musicfansvoice.uk/s/MFV-x-CGA-EXEC-SUMMARY-APRIL-2025.pdf
- Evidence type: Primary 56-page PDF; extracted and methods read
- Used for: 8,108 UK respondents; fieldwork February 3–March 4, 2025, existing venue visitors.
- Limitations: Self-selected/recruited engaged audience; not a representative world audience.

## F4

**Spotify fan study: merch and live**

- Link: https://artists.spotify.com/en/fan-study/merch-and-live
- Evidence type: Primary platform analytics, current page fetched October 25, 2026
- Used for: Notification-led discovery and super-listener concentration in on-platform ticket sales.
- Limitations: Platform-conditioned observational data, not a causal announcement-day rule or global attendance funnel.

## C1

**Gigwell Artist Essentials**

- Link: https://www.gigwell.com/artist-essentials
- Evidence type: Vendor feature/pricing page
- Used for: EPK, contact CRM, booking, payments, venue database, calendars and travel/offline access.
- Limitations: Claims, not hands-on benchmarking; page pricing can change.

## C2

**Gigwell pricing**

- Link: https://www.gigwell.com/pricing
- Evidence type: Vendor pricing page, October 25, 2026
- Used for: Discover from $33/mo, Book from $39/mo; plans/billing/setup fees vary.
- Limitations: Artist Essentials page separately lists $49; do not collapse different packages into one price.

## C3

**Master Tour pricing**

- Link: https://www.eventric.com/pricing-plans-tour-management-software
- Evidence type: Vendor pricing/features, October 25, 2026
- Used for: Free access-only mobile; planning $64.99/mo annual or $74.99 monthly; logistics/offline/day sheets.
- Limitations: One professional input license; not a measure of Wanted willingness to pay.

## C4

**GigLogic**

- Link: https://www.giglogic.com/
- Evidence type: Vendor product/pricing, October 25, 2026
- Used for: Profit checks, tour totals, settlement; free allowance, Core $19.99/mo, Touring $39.99/mo.
- Limitations: Headliner forecast/reconciliation features marked waitlist; not all shipped.

## C5

**Bandsintown Fan Manager**

- Link: https://www.artist.bandsintown.com/fan-manager
- Evidence type: Vendor product page
- Used for: Free contact import/export and fan communications, opt-in contact distinctions.
- Limitations: Free product is not permission to use its data API commercially.

## C6

**Songkick Fan/Event Insights**

- Link: https://support.songkick.com/hc/en-us/articles/360012785353-Fan-Event-Insights-with-Songkick
- Evidence type: Official support page, older maintained article
- Used for: City tracker data, affinities, notifications, views/clicks.
- Limitations: Page inconsistently says >3500 and >3000 trackers; exact current eligibility unverified.

## C7

**Chartmetric live events/venues**

- Link: https://chartmetric.com/use-cases/live-events-venues
- Evidence type: Vendor feature page, current
- Used for: Live history, market calendars, venue scale, lineups, co-performers, exports.
- Limitations: Coverage and fields not independently benchmarked.

## C8

**Chartmetric pricing and Flow AI**

- Link: https://chartmetric.com/pricing
- Evidence type: Vendor pricing, October 25, 2026
- Used for: Manager $40/mo yearly; Premium $117; Flow AI $60/month; MCP availability.
- Limitations: Different plan access/credits; vendor prices are not comparable normalized unit economics.

## C9

**Chartmetric tour routing guide**

- Link: https://hmc.chartmetric.com/how-to-route-a-tour-using-streaming-data-part-1-tour-planning-series
- Evidence type: Vendor educational guide, March 19, 2020
- Used for: Streaming geography as an input; explicitly cautions it does not equal live attendance.
- Limitations: Historical UI/data; principle not current product benchmark.

## C10

**SystemOne agent vs manager**

- Link: https://www.systemonesoftware.com/blog/booking-agent-vs-manager
- Evidence type: Vendor educational article, March 14, 2025
- Used for: Distinct artist-manager and booking-agent responsibilities.
- Limitations: Marketing source; corroborated by named practitioner sources.

## C11

**Stage Portal tour advance guide**

- Link: https://stageportal.gg/blog/how-to-advance-a-tour-as-independent-tour-managers
- Evidence type: Vendor/practitioner guide, September 16, 2026
- Used for: Shared advance records, production/contact handoffs, schedules and settlement.
- Limitations: Vendor-authored and recommended timing, not a universal industry rule.

## A1

**AI Engineer: 12-Factor Agents**

- Link: https://ai.engineer/talks/8kMaTybvDUw-12-factor-agents
- Evidence type: Talk transcript and source-linked material read
- Used for: External state, focused loops, context/control-flow ownership and natural channels.
- Limitations: Engineering heuristics, not benchmark or music-specific research.

## A2

**AI Engineer: effective AI agents**

- Link: https://ai.engineer/talks/D7_ipDqhtwk-effective-ai-agents
- Evidence type: Talk transcript/slides read
- Used for: Selective agency, simplicity, error cost, verifiability and tool interfaces.
- Limitations: Examples are teaching material.

## A3

**AI Engineer: agent skills**

- Link: https://ai.engineer/talks/CEvIs9y1uog-agent-skills
- Evidence type: Talk transcript/slides read
- Used for: Procedural expertise and progressive loading instead of separate agents for everything.
- Limitations: Does not mean arbitrary-code tools are appropriate for Wanted.

## A4

**Anthropic: building effective agents**

- Link: https://www.anthropic.com/engineering/building-effective-agents
- Evidence type: Primary engineering guidance, originally December 2024, current page reread
- Used for: Workflow/agent distinction, simplicity, clear tools and evaluation.
- Limitations: Page itself warns tooling landscape has changed; not an evergreen framework comparison.

## A5

**Vercel Eve**

- Link: https://vercel.com/eve
- Evidence type: Primary framework overview
- Used for: Directory-based agents and durable Vercel primitives.
- Limitations: Product claims; integration not installed/benchmarked in Wanted.

## A6

**Eve security model**

- Link: https://eve.dev/docs/concepts/security-model
- Evidence type: Primary framework documentation
- Used for: Runtime vs sandbox boundary, identity, credentials, telemetry and auth.
- Limitations: App code remains responsible for tool safety and data authorization.

## A7

**Eve durability/execution**

- Link: https://eve.dev/docs/concepts/execution-model-and-durability
- Evidence type: Primary framework documentation
- Used for: Steps, turns, replay, session migration and deployment behavior.
- Limitations: Not exactly-once external actions; self-host version/recovery caveats.

## A8

**Eve human-in-the-loop**

- Link: https://eve.dev/docs/human-in-the-loop
- Evidence type: Primary framework documentation
- Used for: Durable approvals/questions; omitted approval defaults to never requiring approval.
- Limitations: once() is inappropriate as blanket financial authorization; auto() involves a decision model/provider.

## A9

**Eve frontend integration**

- Link: https://eve.dev/docs/guides/frontend/overview
- Evidence type: Primary framework documentation
- Used for: Browser clients, peer-service routing, authentication and streaming hooks.
- Limitations: React browser support is not verified Expo/native parity.

## A10

**Eve deployment**

- Link: https://eve.dev/docs/guides/deployment/overview
- Evidence type: Primary framework documentation
- Used for: Vercel or Node hosting, Nitro/build output and credentials.
- Limitations: Separate Expo/Eve service adds deployment/auth/CORS work.

## A11

**Eve evaluations**

- Link: https://eve.dev/docs/evals/overview
- Evidence type: Primary framework documentation
- Used for: HTTP/session evals, stubs, assertions and optional judge/reporters.
- Limitations: A successful turn is not sufficient proof of a real-world action.

## A12

**Vercel durable-agent guide**

- Link: https://vercel.com/kb/guide/durable-ai-agents
- Evidence type: Primary framework engineering guide
- Used for: AI SDK + Workflow boundaries, hooks, idempotency and application storage.
- Limitations: Database uniqueness is still needed across separate runs.

## A13

**AI SDK WorkflowAgent**

- Link: https://ai-sdk.dev/docs/agents/workflow-agent
- Evidence type: Primary framework documentation read
- Used for: Durable loop option lighter than full Eve; Workflow 5/ai/zod requirements.
- Limitations: Version-sensitive; not installed/tested with Wanted.

## A14

**Anthropic: agent evaluations**

- Link: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Evidence type: Primary engineering guidance
- Used for: Outcome vs transcript, grader choices, repeated trials and eval maintenance.
- Limitations: Metrics must represent actual product jobs.

## R1

**Bandsintown data application terms**

- Link: https://corp.bandsintown.com/data-applications-terms
- Evidence type: Primary terms, modified February 25, 2019; current page read
- Used for: Commercial approval, attribution, anti-scraping, caching and transfer restrictions.
- Limitations: Seek current written integration approval; not legal advice.

## R2

**FTC CAN-SPAM business guide**

- Link: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Evidence type: Primary official indexed excerpts reviewed; full fetch returned 404
- Used for: Commercial email including B2B has compliance obligations.
- Limitations: Do not treat this as a jurisdiction-complete legal opinion.

## R3

**California talent agency licensing**

- Link: https://www.dir.ca.gov/dlse/Talent%20Agency_License_and_Fee-Related_Talent_Services.htm
- Evidence type: Primary regulator guidance, page dated December 2025
- Used for: Procuring/arranging artist employment can raise licensing and talent-service questions.
- Limitations: We have not determined applicability to Wanted software; get jurisdiction-specific counsel before production brokerage.

## R4

**MU access rider template**

- Link: https://musiciansunion.org.uk/legal-money/rights-at-work/equality-rights/disabled-musicians-rights-and-support-at-work/access-riders-for-musicians/access-rider-template
- Evidence type: Primary union template, updated January 28, 2026
- Used for: User-controlled access needs and communication; medical diagnosis need not be disclosed.
- Limitations: Requirements cannot be inferred from audience taste.

## R5

**Meta Instagram publishing docs**

- Link: https://developers.facebook.com/documentation/instagram-platform/content-publishing
- Evidence type: Primary indexed documentation; page fetch returned 400
- Used for: Professional account/permissions, public media containers and publication status.
- Limitations: Login path and scopes vary; API not connected or exercised in Wanted.

## R6

**High Water Comedy submissions**

- Link: https://highwatercomedy.com/comedian-submissions/
- Evidence type: Primary booker submission page
- Used for: Initial submission precedes detailed questionnaire; prescribed intake matters.
- Limitations: One booker; does not establish general comedian demand or Qloo coverage.

## R7

**DIY comedy tour guide**

- Link: https://comedyhints.com/setting-up-a-diy-comedy-tour/
- Evidence type: Practitioner guide, February 20, 2015
- Used for: Theme/audience, roles/pay, club vs independent venue, press and sponsor lead times.
- Limitations: Dated advice; not a current national booking model.

## R8

**Newport Music Hall venue page**

- Link: https://promowestlive.com/our-venues/newport-music-hall
- Evidence type: Primary venue page, October 25, 2026
- Used for: Public concert page says 1,400 capacity.
- Limitations: Other rental sources give different capacity; configuration and current buyer confirmation matter.

## R9

**The Basement rental page**

- Link: https://www.aegsev.com/the-basement
- Evidence type: Primary venue rental page
- Used for: Combined Basement/A&R context mentions 350 capacity.
- Limitations: Do not use combined rental capacity as verified concert capacity for an independent booking.

## R10

**Wexner performance-space rental**

- Link: https://wexarts.org/rentals/performance-space
- Evidence type: Primary venue page
- Used for: 150–250 floor seats, up to 500 standing, 200 cabaret; separate rental contact.
- Limitations: No statement that any requested show date is free or affordable.

## R11

**Braid Detour campaign update**

- Link: https://www.punktastic.com/radar/update-on-our-campaign-to-bring-braid-to-london-with-songkick-detour/
- Evidence type: Historical campaign account, 2013
- Used for: 50 pledges quickly did not immediately settle feasibility; target then 150.
- Limitations: One campaign, not a universal threshold.

## R12

**Songkick Detour launch account**

- Link: https://thenextweb.com/news/persuade-bands-to-play-near-you-with-songkicks-detour-crowdfunding-platform-kicking-off-with-london
- Evidence type: Contemporaneous reporting, 2013
- Used for: Conditional card-backed pledges, promoter coordination and confirmed ticket conversion.
- Limitations: Historical model; no substantiated causal story for later platform fate.

## I9

**Guardian touring balance-sheet reporting**

- Link: https://www.theguardian.com/music/2024/apr/25/shocking-truth-money-bands-make-on-tour-taylor-swift
- Evidence type: Named reporting and 12 confidential budget sheets, April 25, 2024
- Used for: English Teacher, Nubiyan Twist, Japanese Television, artist managers and financial trade-offs despite success.
- Limitations: Selected cases, UK/international context; reported forecasts are not audited representative current outcomes.

## R13

**Newport rental capacity**

- Link: https://www.aegsev.com/newport-music-hall
- Evidence type: Primary rental page, October 25, 2026
- Used for: Rental page says 1,700, versus concert page 1,400.
- Limitations: Do not resolve configuration/version differences by averaging; verify the exact show setup.


---

<a id="chapter-13"></a>

# 13. Research leads and indexed public accounts

This appendix preserves relevant exploratory sources found during the research, including anonymous forum accounts and further reading. **Inclusion does not mean the full page/thread was read or the claim independently verified.** Some direct fetches failed or pages were only available as indexed excerpts. The core synthesis uses the annotated sources in 12-SOURCES.md. Search metadata dates are not treated as verified publication dates.

Forum users are unverified; short indexed excerpts below are hypothesis-generating, not evidence of an industry rate or proof of product demand. Snippets can omit context. Visit originals before building from a specific story. No unrelated personal browsing history or account data is included.

## Anonymous forum leads

### Forum 1: No friends to attend concerts : r/Concerts

- Link: https://www.reddit.com/r/Concerts/comments/1plo18v/no_friends_to_attend_concerts/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: Witch-Maiden # No friends to attend concerts Where is places to find concert buddies? I've always been introverted/quiet and not easily made friends, and the few close friends I have aren't much Now though, I have both but no one to go with and its really bothering me. The biggest issue is I live in

### Forum 2: Discovering local music : r/LetsTalkMusic

- Link: https://www.reddit.com/r/LetsTalkMusic/comments/1p6l4t3/discovering_local_music/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: I feel like back in the day people were more open to just showing up at venues they liked or see a poster of a band they didn’t know but go check them out anyway. Now with so much music on social media it’s easy to discover new artists and bands but not necessarily local

### Forum 3: Reddit - The heart of the internet

- Link: https://www.reddit.com/r/Music/comments/1d7al1p/what_are_your_reasons_for_attending_less_concerts/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: # What are your reasons for attending less concerts this year? Here's mine: [discussion](https://www.reddit.com/r/Music/?f=flair_name%3A%22discussion%22) 1. The price of tickets, and everything else, skyrocketing. Restaurants, rent, car insurance, gas, groceries, medical insurance...everything is up, up, up. 2. The blatant, obvious scams done by Big Ticket: "Premium" seats, siphoning tickets to their own reseller site, crazy surcharges,

### Forum 4: Reddit - The heart of the internet

- Link: https://www.reddit.com/r/Concerts/comments/1pyya6h/i_kept_missing_great_local_shows_so_i_built_a/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: I go to a lot of concerts, and I kept running into the same frustrating problem: there are great bands playing every week in my city, and I only hear about them after the show already happened. Bandsintown tells you when artists you follow are touring. Spotify is great for discovering recorded music. But neither

### Forum 5: Local shows vs well known bands/ artists : r/Concerts

- Link: https://www.reddit.com/r/Concerts/comments/1pfdcmp/local_shows_vs_well_known_bands_artists/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: Local shows are great for discovering new upcoming acts and getting to know the community. Best for hardcore punk bands, or acoustic players.

### Forum 6: What Is The Most You’re Willing To Spend On Tickets? : r/Concerts

- Link: https://www.reddit.com/r/Concerts/comments/1pcfd4l/what_is_the_most_youre_willing_to_spend_on_tickets/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: upvotes · com

### Forum 7: Ditched my booking agent and still landed a few gigs at good venues. : r/musicians

- Link: https://www.reddit.com/r/musicians/comments/1kr8htj/ditched_my_booking_agent_and_still_landed_a_few
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: I’m a mid sized (self proclaimed) artist in my area, gigging for a few years now. Last August, I brought on a booking agent through a small agency someone Ive known for a while with a solid track , which should’ve been my first red flag. I followed up a lot, but everything got delayed.

### Forum 8: How to get more gigs/venues to respond to emails? : r/musicians

- Link: https://www.reddit.com/r/musicians/comments/1js7jqa/how_to_get_more_gigsvenues_to_respond_to_emails/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: He emails, texts, or uses Facebook to try to book shows. The link he sends them is to his artist pa The best way is to go out and see other bands, and try to speak to the promoter/venue while you’re there. If they can put a face to the name, you’re far more likely

### Forum 9: App for booking agents : r/musicindustry

- Link: https://www.reddit.com/r/musicindustry/comments/1erqxvx/app_for_booking_agents/
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: I'm looking for something to help me find venues and who to contact at these venues for shows. I'm in charge of a couple artists in Germany but am looking to expand to the UK. I don't want a database either, those are always outdated. I've used some and when I end up reaching out,

### Forum 10: Best app or website to book gigs and live shows as a band? : r/musicmarketing

- Link: https://www.reddit.com/r/musicmarketing/comments/1dv5x74/best_app_or_website_to_book_gigs_and_live_shows
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: +for+finding+venues+looking+for+bands&source=PDP&ep=pdp_unit&relatedPostId=t3_1dv5x74) [Top music artist management

### Forum 11: Booking Artists and Venues : r/musicindustry

- Link: https://www.reddit.com/r/musicindustry/comments/1hpgjp4/booking_artists_and_venues
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: 53 upvotes · 59 comments

### Forum 12: My goodness I hate booking agencies : r/musicians

- Link: https://www.reddit.com/r/musicians/comments/1eys3k9/my_goodness_i_hate_booking_agencies
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: My goodness I hate booking agencies : r/musicians - Reddit Every single booking agency I worked for up to this point was incompetent to the point where everyone was fed up with them.

### Forum 13: App for booking agents : r/musicindustry

- Link: https://www.reddit.com/r/musicindustry/comments/1erqxvx/app_for_booking_agents
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: uses updated data. I also prefer reaching o

### Forum 14: I am a Talent Buyer for multiple venues. Ask Me Anything! : r/musicindustry

- Link: https://www.reddit.com/r/musicindustry/comments/17plz6t/i_am_a_talent_buyer_for_multiple_venues_ask_me
- Status: indexed excerpt reviewed; full thread and identity not verified. Direct Reddit retrieval failed in the extended pass.
- Short indexed excerpt: [TraditionalAd1074](https://www.reddit.com/user/TraditionalAd1074/) # I am a Talent Buyer for multiple venues. Ask Me Anything! I’ve worked in the music industry for 8 years. Rap, Jam, Country, Punk, Comedy. I’ve done it all. For my venues, it depends on the size. For my 1800 cap I look at history. Where you have played. Ticket sales. Similar venues.


## Additional sources and follow-up reading

### Lead 1: Los Campesinos! Explain the Costs of Touring in North America

- Link: https://www.rollingstone.com/music/music-features/los-campesinos-explain-costs-touring-north-america-1235558701/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 2: Booking a Tour? Why Not Book Two Instead?! – Flypaper

- Link: https://flypaper.soundfly.com/hustle/booking-a-tour-why-not-book-two-instead/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 3: How to Tour as a DIY Solo Artist with Briar Rabbit | Performer Mag

- Link: http://performermag.com/band-management/booking-gigs-touring/how-to-tour-as-a-diy-solo-artist/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 4: It's Not Just Taylor Swift: Musicians Struggle to Afford Touring - Business Insider

- Link: https://www.businessinsider.com/musicians-make-money-touring-taylor-swift-tickets-ticketmaster-live-nation-2022-12
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 5: The financial reality of touring indie musicians : NPR

- Link: https://www.npr.org/2022/05/29/1102015382/the-financial-reality-of-touring-indie-musicians
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 6: BandWagon Thoughts: A Breakdown on Booking Your Band

- Link: https://bandwagmag.com/2015/10/bandwagon-thoughts-a-breakdown-on-booking-your-band/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 7: Local Music Scene Starter Kit: Find Shows

- Link: https://scenepeer.com/local-music-scene-starter-kit
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 8: Local Indie Music Scene Guide for Any City

- Link: https://scene.live/local-indie-music-scene-guide-how-to-find-the-best-shows-in-any-city
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 9: TUNE IN, ZONE OUT: Reasons to Attend an Indie Artist’s Summer Concert - The Hoya

- Link: https://thehoya.com/guide/guide-columns/tune-zone-reasons-attend-indie-artists-summer-concert
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 10: Insights

- Link: https://www.artists.bandsintown.com/support/insights
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 11: Analytics & Insights | Bandsintown for Artists

- Link: https://help.artists.bandsintown.com/en/articles/7048877-analytics-insights
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 12: Can I use Bandsintown's Email Builder instead of another email marketing platform? | Bandsintown for Artists

- Link: https://help.artists.bandsintown.com/en/articles/6160050-can-i-use-bandsintown-s-email-builder-instead-of-another-email-marketing-platform
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 13: How much does it cost to use the Email Builder? | Bandsintown for Artists

- Link: https://help.artists.bandsintown.com/en/articles/7053479-how-much-does-it-cost-to-use-the-email-builder
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 14: Email Builder: Email Your Fans | Bandsintown for Artists

- Link: https://www.artist.bandsintown.com/email-builder
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 15: Best Practices | Bandsintown for Artists

- Link: https://www.artist.bandsintown.com/tutorials/best-practices-tutorial
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 16: Features | Bandsintown for Artists

- Link: https://www.artist.bandsintown.com/features
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 17: Signup Form: Grow Your Contacts | Bandsintown for Artists

- Link: https://www.artist.bandsintown.com/signup-form
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 18: Gain Insights on Your Fans - Bandsintown for Artists

- Link: https://artists.bandsintown.com/support/blog/gain-insights-on-your-fans
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 19: Access Rider Advice & Template for Disabled Musicians | Musicians' Union | The MU

- Link: https://musiciansunion.org.uk/legal-money/rights-at-work/equality-rights/disabled-musicians-rights-and-support-at-work/access-riders-for-musicians
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 20: Attitude is Everything's Do It Yourself DIY Access Guide

- Link: https://attitudeiseverything.org.uk/wp-content/uploads/2022/08/DIY-Access-Guide-International-English.pdf
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 21: Employment support for blind and partially sighted musicians - Sound Without Sight

- Link: https://soundwithoutsight.org/hub-articles/employment-support-for-blind-and-partially-sighted-musicians/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 22: Artist Access Riders - LITTLE COG

- Link: https://www.littlecog.co.uk/artist-access-riders.html
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 23: DIY Access Guide - Attitude is Everything

- Link: https://attitudeiseverything.org.uk/industry/welcoming-disabled-audiences/diy-access-guide/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 24: Creating your own access rider

- Link: https://weareunlimited.org.uk/resource/creating-your-own-access-rider/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 25: Access Rider :: Creative Dundee - Amplifying and Connecting the City

- Link: https://creativedundee.com/access-rider/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 26: Association of Independent Festivals Endorses MU Access Rider Scheme | The MU

- Link: https://musiciansunion.org.uk/news/association-of-independent-festivals-endorses-mu-access-rider-scheme
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 27: Guarantee vs Door Deal vs Versus Deal for Musicians

- Link: https://www.velveteen.fm/guides/touring-for-independent-artists/guarantee-vs-door-deal
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 28: How Do Bands Get Paid for Gigs? A Complete Guide to Gig Deal Types | Stage Portal

- Link: https://www.stageportal.gg/blog/how-do-bands-get-paid-for-gigs
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 29: Band Booking: Guarantees Vs. Door Splits | DIY Musician

- Link: https://diymusician.cdbaby.com/music-career/band-booking-guarantees-vs-door-splits
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 30: Gig fees: guarantee or door split

- Link: https://kiertue.com/en/backstage/guarantee-vs-door-split
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 31: Recommended Minimum Rates for Live Musicians | The MU

- Link: https://musiciansunion.org.uk/working-performing/gigs-and-live-performances/live-engagement-rates-of-pay
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 32: Door Deal & Versus Deal - Concert Payment Structures Explained | Daysheets

- Link: https://www.daysheets.com/glossary/door-deal
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 33: What Event Promoters Need to Know About Artist Deal Structures

- Link: https://tseentertainment.com/what-event-promoters-need-to-know-about-artist-deal-structures-when-booking-entertainment
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 34: Concert Guarantee Calculator

- Link: https://www.capacitylive.com/resources/guarantee-calculator
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 35: Live Music Industry Glossary | Bauer Entertainment Marketing

- Link: https://www.bauerentertainmentmarketing.com/live-music-industry-glossary
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 36: Grassroots Music Venues across the UK Leading the national and international movement to sustain and amplify the Grassroots Music Venue

- Link: https://www.musicvenuetrust.com/wp-content/uploads/2025/01/MVT_2024-Annual-Report.pdf
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 37: Access, Place and Australian Live Music | M/C Journal

- Link: https://journal.media-culture.org.au/index.php/mcjournal/article/view/1085
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 38: Full article: Visiting pop concerts and festivals: measuring the value of an integrated live music motivation scale

- Link: https://www.tandfonline.com/doi/full/10.1080/09548963.2021.1916738
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 39: Why go to pop concerts? The motivations behind live music attendance - Steven Caldwell Brown, Don Knox, 2017

- Link: https://journals.sagepub.com/doi/10.1177/1029864916650719
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 40: Protecting, securing, and improving Grassroots Music Venues Across the UK international movement to sustain and amplify the Grassroots Music Venue

- Link: https://www.musicvenuetrust.com/wp-content/uploads/2026/01/MVT_2025-Annual-Report_Digital-Spreads.pdf
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 41: Half of UK's grassroot music venues make no profit

- Link: https://www.bbc.com/news/articles/c20d1lxlx3go
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 42: Half of UK's grassroot music venues make no profit - BBC News

- Link: https://www.bbc.co.uk/news/articles/c20d1lxlx3go
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 43: How to Juggle a Music Career, Day Job, and Family: Advice From Damen Samuel

- Link: https://blog.sonicbids.com/how-to-juggle-a-music-career-day-job-and-family-advice-from-damen-samuel
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 44: Leeds Conservatoire - The Life of… a Tour Manager

- Link: https://www.leedsconservatoire.ac.uk/about-us/progression-portal/musicians-survival-guide-articles/the-life-of-a-tour-manager
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 45: Rikk Feulner, Dream Theater’s Tour Manager, takes us on a journey into the world of touring, and how it became the inspiration for his newly-released book. | by Dream Theater USA | Medium

- Link: https://medium.com/@dreamtheaterusa/rikk-feulner-takes-us-on-a-journey-into-the-world-of-touring-and-the-inspiration-for-his-new-book-9628ec0d23e9
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 46: Indie Touring and How To Build Your Team with The Suffers - Ari's Take

- Link: https://aristake.com/kam-franklin
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 47: Musician Day Jobs: Band Commitment Divide

- Link: https://interspacemusic.com/blog/independent-bands-face-the-day-job-commitment-conundrum/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 48: Booking Your Own Tour: A How-To Guide

- Link: https://www.ascap.com/help/career-development/booking-your-own-tour-a-how-to-guide
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 49: Booking Your Own Tour: A How-To Guide - Ari's Take

- Link: https://aristake.com/booking-your-own-tour-a-how-to-guide
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 50: Side Show Interview Mindi Pelletier Tour Manager Music Industry Veteran

- Link: https://blog.gigmor.com/side-show-interview-mindi-pelletier-tour-manager-music-industry-veteran
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 51: The Email Junkyard: Why Your Booking Emails Fail - Dave Ruch

- Link: https://daveruch.com/advice/email-marketing-for-musicians
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 52: Budapest Musicians & Gigs | Hey friends, **just wanted to share something useful for anyone reaching out to venues.** | Facebook

- Link: https://www.facebook.com/groups/budabands/posts/24777635991861839
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 53: Tour Budgeting: The Real Numbers

- Link: https://www.openmusicbusiness.com/knowledge/tour-budgeting
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 54: Getting ready for touring: key accounting factors for emerging musicians - BKL

- Link: https://bkl.co.uk/insights/touring-accounting-tax-emerging-musicians/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 55: Tour Budget Template for Independent Artists - YourTempo

- Link: https://www.yourtempo.com/blog-details/tour-budget-template-for-independent-artists
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 56: Show Settlement Explained for Independent Artists

- Link: https://www.velveteen.fm/guides/touring-for-independent-artists/show-settlement-explained
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 57: Tour Budgeting for Independent Artists | Orphiq

- Link: https://orphiq.com/resources/tour-budgeting-independent-artists
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 58: The Guarantee Trap: Why Concert Economics Work Backwards

- Link: https://www.capacitylive.com/insights/financial-modeling-concert-tours
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 59: How to Create a Tour Budget - Ternwheel

- Link: https://www.ternwheel.com/theloadout/how-to-create-a-tour-budget
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 60: Planning Your Own DIY Band Tour? Here’s What You Need To Know. | Marketing Communications | West Virginia University

- Link: https://marketingcommunications.wvu.edu/professional-development/marketing-communications-today/marketing-communications-today-blog/2025/10/20/planning-your-own-diy-band-tour-here-s-what-you-need-to-know
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 61: FAC Insights: Touring costs are not a new barrier to disabled artists with Hillary Juma (Attitude is Everything) - Featured Artists Coalition

- Link: https://thefac.org/news-directory/insights-attitude-is-everything
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 62: Viva! - Matt Donnelly - Don Broco

- Link: https://viva.org.uk/lifestyle/living-vegan/celebrities/musicians/matt-donnelly-don-broco/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 63: Bring Me The Horizon's Oli Sykes on His Vegan Journey and Staying Healthy While Touring - Form

- Link: https://formnutrition.com/inform/oli-sykes-vegan-interview/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 64: Taco Bell Has Been Quietly Subsidizing Touring Bands for 15 Years

- Link: https://www.vice.com/en/article/taco-bell-feed-the-beat-has-given-touring-bands-free-food-for-15-years/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 65: Uncommon Touring Tips From Indie Musicians for a Smoother (And Fungus-Free) Trip

- Link: https://blog.sonicbids.com/uncommon-touring-tips-from-indie-musicians-for-a-smoother-and-fungus-free-trip
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 66: Interview: Golpe Vocalist Tadzio Pederzolli on His Career as a Vegan Chef, the Italian Hardcore Scene & More | No Echo

- Link: https://www.noecho.net/interviews/golpe-hardcore-punk-band-interview
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 67: The Most Important Things to Watch Out for When Booking Your Next Tour – Flypaper

- Link: https://flypaper.soundfly.com/hustle/the-most-important-things-to-watch-out-for-when-booking-your-next-tour/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 68: Mental health issues among international touring professionals in the music industry - ScienceDirect

- Link: https://www.sciencedirect.com/science/article/abs/pii/S0022395621007330
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 69: Mental health issues among international touring professionals in the music industry - PubMed

- Link: https://pubmed.ncbi.nlm.nih.gov/34942435/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 70: Musicians, their relationships, and their wellbeing: Creative labour, relational work - ScienceDirect

- Link: https://www.sciencedirect.com/science/article/pii/S0304422X23000025
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 71: The Road Crew: Live Music and Touring - 1st Edition - Gabrielle Kielic

- Link: https://www.routledge.com/The-Road-Crew-Live-Music-and-Touring/Kielich/p/book/9781032300153
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 72: Musicians and mental health | BPS

- Link: https://www.bps.org.uk/blog/musicians-and-mental-health
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 73: Finding one’s rhythm: A ‘tour de force’ of fieldwork on the road with a band – Experimental Collaborations

- Link: https://v1.xcol.org/book/ramella
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 74: Exploring the Mental Health Challenges of Music Industry Professionals: Recommendation for an Industry-Wide Code of Practice - Rachel Jepson, Michael Sims, Jermaine Ravalier, Rachel Brougham, 2025

- Link: https://journals.sagepub.com/doi/10.1177/20592043251394824
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 75: (PDF) Musicians, their relationships, and their wellbeing: Creative labour, relational work

- Link: https://www.researchgate.net/publication/367465124_Musicians_their_relationships_and_their_wellbeing_Creative_labour_relational_work
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 76: Help Punktastic and Songkick Detour bring Braid to London

- Link: https://www.punktastic.com/radar/help-punktastic-and-songkick-detour-bring-braid-to-london/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 77: Organise a concert by your favourite band - BBC News

- Link: https://www.bbc.com/news/business-22765879
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 78: Songkick Detour 'Kickstarter for gigs' is launched in London - BBC News

- Link: https://www.bbc.com/news/technology-22552747
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 79: Tools: Songkick Detour | Music Ally

- Link: https://musically.com/2012/10/18/tools-songkick-detour/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 80: Kickstarter for Live Music Fans: Can It Work?

- Link: https://www.billboard.com/music/music-news/kickstarter-for-live-music-fans-can-it-work-1537675/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 81: Bring your favourite artists to London with Songkick and Punktastic!

- Link: https://www.punktastic.com/news/bring-your-favourite-artists-to-london-with-songkick-and-punktastic/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 82: How to De-Risk Your Tour and Lower the Threat of Scalping... - Digital Music News

- Link: https://www.digitalmusicnews.com/2013/05/17/derisk
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 83: How Songkick is doing a “Detour” – As I learn …

- Link: https://marcabraham.com/2012/11/07/how-songkick-is-doing-a-detour
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 84: Listening in: insights on live music attendance

- Link: https://apo.org.au/node/330482
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 85: Listening In research series | Creative Australia

- Link: https://creative.gov.au/research/listening-research-series
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 86: Listening In research series | Creative Australia

- Link: https://australiacouncil.gov.au/research/listening-research-series
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 87: National Arts Participation Survey (NAPS) 2025

- Link: https://www.arts.act.gov.au/__data/assets/pdf_file/0020/3115730/Creative-Australia-NAPS-2025_ACT_29-05-26.pdf
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 88: Widening The Lens: Social inequality and arts participation | Creative Australia

- Link: https://australiacouncil.gov.au/research/widening-lens-social-inequality-and-arts-participation
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 89: Australian live music: Fans spend on overseas acts, attendance drops at local gigs

- Link: https://www.smh.com.au/culture/music/your-superstar-fomo-is-hurting-australian-music-report-finds-20250429-p5luyx.html
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 90: Creative Transformations: Results of the National Arts Participation Survey | Creative Australia

- Link: https://creative.gov.au/research/creative-transformations-results-national-arts-participation-survey
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 91: What is the Bandsintown API? | Bandsintown for Artists

- Link: https://help.artists.bandsintown.com/en/articles/7053475-what-is-the-bandsintown-api
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 92: Instagram Platform overview | Developer Documentation

- Link: https://developers.facebook.com/documentation/instagram-platform/overview
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 93: Api Terms Of Use

- Link: https://www.songkick.com/developer/api-terms-of-use
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 94: API documentation | Bandsintown for Artists

- Link: https://help.artists.bandsintown.com/en/articles/9186477-api-documentation
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 95: Instagram Platform | Meta for Developers

- Link: https://developers.facebook.com/documentation/instagram-platform
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 96: Content Publishing

- Link: https://developers.secure.facebook.com/documentation/instagram-platform/content-publishing.md
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 97: Content Publishing

- Link: https://developers.facebook.com/documentation/instagram-platform/content-publishing.md
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 98: Content Publishing | Developer Documentation

- Link: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 99: Gigwell, Booking Agency Software Leader, Launches 'Artist Essentials' Software to Empower Independent Touring Artists

- Link: https://0e190a550a8c4c8c4b93-fcd009c875a5577fd4fe2f5b7e3bf4eb.ssl.cf2.rackcdn.com/EINPresswire-665985903-gigwell-booking-agency-software-leader-launches-artist-essentials-software-to-empower-independent-touring-artists-2.pdf
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 100: Tour Management Software for Independent Artists - Ternwheel

- Link: https://www.ternwheel.com/theloadout/tour-management-software-for-independent-artists
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 101: Spreadsheets vs Music Management Software for Music Agencies - YourTempo

- Link: https://www.yourtempo.com/blog-details/spreadsheets-vs-music-management-software-why-music-agencies-need-a-better-system
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 102: Hedlyner - Booking Operations Platform for Talent Buyers & Agencies

- Link: https://hedlyner.com/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 103: Next generation artist booking software

- Link: https://artistu.io/en/blog/next-generation-artist-booking-software
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 104: How to Build Powerful Connections Between Artists, Venues and Agencies

- Link: https://prism.fm/blog/artist-management/how-to-build-powerful-connections-between-artists-venues-and-other-agencies
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 105: Active Artist | Make Music, Not Spreadsheets

- Link: https://www.activeartist.io/
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 106: Independent Stages Generate $153.1 Billion In Economic Investment Across U.S. Based On New National Independent Venue Association (NIVA) Research Study - National Independent Venue Association

- Link: https://www.nivassoc.org/statements/2025/independent-stages-generate-1531-billion-in-economic-investment-across-us-based-on-new-national-independent-venue-association-niva-research-study
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 107: National Independent Venue Association Releases 50+ State Studies That Show The Outsized Economic Power of Independent Live Entertainment - National Independent Venue Association

- Link: https://www.nivassoc.org/statements/2025/national-independent-venue-association-releases-50-state-studies-that-show-the-outsized-economic-power-of-independent-live-entertainment
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 108: How to Find Venues for Your First Show (2026) | Chartlex

- Link: https://www.chartlex.com/blog/touring/how-to-find-venues-for-your-first-show?srsltid=AYCX9vK704DUDln37vKyqNsOH-0qkKYb5Pzwzjzn_Ss6gHJpHon3oPzr
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 109: 9 Ways to Impress a Venue Talent Buyer, Even if You Can't Pack the House

- Link: https://blog.sonicbids.com/9-ways-to-convince-a-venue-to-book-you-if-you-cant-pack-the-house
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 110: NIVA Releases State-Level 'State Of Live' Reports - Pollstar News

- Link: https://news.pollstar.com/2025/10/08/niva-releases-state-level-state-of-live-reports
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 111: NIVA Reveals Results From State of Live Report on Indie Music Venues

- Link: https://www.billboard.com/pro/niva-state-of-live-report-indie-music-venues-unprofitable
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.

### Lead 112: How to Book a Show: A Tactical Approach For Pitching Venues

- Link: https://www.gigwell.com/blog/how-to-book-shows
- Status: exploratory/search lead. Check full source, method, date, access and licensing before making a product claim.


## Important access gaps

- Direct Reddit pages returned connection errors; use indexed material carefully or inspect manually.
- Meta developer publishing page returned a 400; official indexed docs support a limited integration outline, not a tested connector.
- FTC full guide fetch returned 404; indexed official excerpts were reviewed.
- Some paywalled/large articles could not be freshly fetched; older captured passages are marked in the source catalog.
- No interviews, creator outreach, real email delivery or real bookings were performed.
- Production Qloo access/pricing and on-device entitlement remain open.

These gaps do not prevent the desk-research synthesis, but they prevent treating all leads as validated facts.


---

<a id="chapter-14"></a>

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

**Instagram:** create an approved asset/caption package first; professional-account/auth/media/publication semantics are a separate connector. Container created is not published. [R5](#r5)

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


---

<a id="chapter-15"></a>

# 15. Clever Qloo: push the mechanism, not the marketing claim

## The recommendation

**Build a cultural pressure test for a real show decision.** Gus ranks a verified candidate set for the touring act, for the local scene, and for their combination; makes trade-offs visible; applies hard operational constraints; then carries the selected next action through.

This is a proposed feature, not already implemented. It uses mechanisms tested in the hackathon API but still needs a real local roster and operator evaluation.

The impressive part is not endpoint count. It is demonstrating that cultural signals change a consequential decision while the same dates, budget, factual inventory and model remain fixed. Pair it with honest non-working experiments and strong outcome verification.

## Live diagnostic log: 16 read-only GET requests

### Experiment 1: supplied roster vs global recommendations

Resolve three known artists. Use one as an input and the other two as the only eligible output candidates. The response ranked the supplied set with affinity values, and all returned IDs belonged to it. A no-pool control returned an outside entity.

**Supported conclusion:** candidate-restricted artist ranking works for this test.

**Not supported:** those artists are local, available or appropriate-sized support acts. This was an API mechanism check, not a proposed real bill.

### Experiment 2: demographic units

The live response included negative age/gender values. Your local adapter already describes them as skews rather than audience shares.

**Supported conclusion:** preserve signed affinity semantics.

**Do not do:** normalize into claims about the percentage of actual local attendees.

### Experiment 3: localized place/explainability

A two-artist Columbus place query returned localized entities with explainability. Without venue-category qualification the returned set included university buildings.

**Supported conclusion:** geographic place/explainability behavior can work, but taste fit alone does not make an entity a bookable room.

### Experiment 4: venue as direct artist signal, semantic failure

Resolve The Basement by address, not first name match. The venue-only request returned supplied artist candidates without affinity values. The artist-plus-venue request left the observed two-artist affinity values unchanged from artist-only.

**Conclusion:** do not claim this request implements venue-to-artist cultural matching. 200/returned entities is insufficient. Missing scores or ignored influence must fail the feature's evidence gate. This may be request/environment/entity behavior; broader support remains inconclusive.

### Experiment 5: artist-based scene context and combination

Use a fixed four-candidate artist pool. Compare a Phoebe Bridgers input, a contrasting Flying Lotus input, and both together. All were successful with affinity values; order changed.

The observed ranking pattern was: the touring-act context favored one end of the pool, the contrasting scene context another, and the joint context was not a simple average of the two rankings. These were recognized illustrative artists, **not a verified local scene**. Raw output/cached responses are intentionally excluded from public-repository notes.

**Conclusion:** a taste-dependent counterfactual mechanism is available. To ship, replace illustrative context with verified recent scene references and a qualified local roster.

## Idea A: scene bridge, not nearest clone

### Problem

An obvious sound-alike may be redundant, unavailable, too big, not local or weak as a live collaborator. A local scene can include multiple genres linked by cultural preferences and human relationships.

### Mechanism

1. Operator chooses the target show and supplies a trusted local roster.
2. Resolve candidates and act references to Qloo IDs.
3. Build the scene context from verified relevant recent performers or a booker's curated reference acts. Do not scrape a huge unlicensed event archive or use all historical stars equally.
4. Rank the same roster separately for act and scene using filter.results.entities.
5. Optionally run a joint-profile query.
6. Show cultural-fit positions as separate dimensions; preserve uncertainty and evidence source.
7. Apply locality, availability, live-quality, scale, compensation and relationship constraints from operational data.
8. Propose a collaboration/request, not guaranteed additive audience.

### Why separate views matter

A joint affinity is not a fairness or set-union model. It can favor a candidate strongly fitting one context. Show two-sided trade-offs; do not hide them under one impressive score.

An application-defined minimax rank/threshold can be tested as a policy, but label it Wanted's rule. Query scores are not calibrated probabilities, and arbitrary differences across requests are not causal uplift. A small four-candidate pool gives coarse ranks; do not manufacture statistical precision.

### Judge-facing proof

Same factual roster, date and budget. Show artist-only choice, scene-only choice, pressure-tested choice and why the operator would accept the resulting bill. Include a case where no candidate clears the criteria and Gus seeks another format/date.

### Failure cases

Sparse emerging-artist coverage; stale scene references; mainstream popularity dominating; no genuine bridge; missing actual availability; curator disagreement. Unknown mappings must remain unknown. A fallback needs explicit labeling.

## Idea B: taste-sensitive conflict radar

### Problem

Calendar overlap is easy; knowing which nearby show is culturally relevant is harder. Named reporting describes discovering overlapping audiences after a show date was set. [V9](#v9)

### Mechanism

Use an actual licensed/operator-provided event calendar. Resolve the performers. Assess cultural similarity using verified API fields or rank/reference comparisons. Combine with practical geography/time and contractual radius constraints.

Propose a potentially competing date, different bill, co-promotion or keeping the date based on stronger operator evidence. Do not estimate lost tickets from an affinity coefficient.

### Judge-facing proof

Two nearby events on the same night, one culturally adjacent and one unrelated. A date change affects only the relevant risk flag and dependent actions. This distinguishes cultural judgment from an ordinary calendar.

### Scope decision

P1 after the verified-roster/reply flow because event-data rights, coverage and actual similarity semantics are dependencies. A curated small calendar is acceptable for a transparent demo.

## Idea C: local cultural footprint for a show

### Problem

A generic podcast/brand/coffee-shop list is not a usable campaign. A real local opportunity needs reach, fit, contact, permission and timing.

### Mechanism

Build a small operator-verified inventory of record shops, permitted poster spots, cultural organizations and media submission opportunities. Use Qloo to rank or enrich those entities against the show profile. Separate cultural evidence from local eligibility.

The clever move is **one show context, several qualified action surfaces**, with action provenance and status. Do not turn a TV affinity into an allegedly buyable ad audience or infer individual fan identity.

### Judge-facing proof

Change the bill profile and show which local candidates/themes change while the inventory/location stays fixed. The agent prepares one actual permitted submission or asset with approval, not a fabricated sent status.

### Existing work

Wanted already has cross-domain crowd and poster-spot ideas in Filling the room. Strengthen qualification and context sensitivity; do not build a second generic recommendation feed.

## Idea D: least-worst meal for the whole touring party

### Problem

One artist's taste is not the party's preference. A fashionable place may fail budget, time or access. Some people enjoy discovery and do not want it automated.

### Mechanism

Use explicitly supplied party tastes, with private identities kept outside Qloo. Hard-filter candidates for verified practical constraints. Rank each feasible candidate per relevant preference context; show a balanced decision plus familiar/supermarket/catering alternatives. Apply a clear application-defined fairness rule, not an assumed joint-score fairness guarantee.

Opening-day data is not exact live hours or allergen safety. Confirm critical requirements directly. The agent can prepare options rather than reserve/order.

### Judge-facing proof

Schedule shrinks after a change; the dinner that seemed best is no longer feasible. Gus recomputes feasible options, preserving the dietary/access constraint and explaining the taste compromise.

### Scope decision

One bounded workflow, not a travel super-app. Useful lateral win if the central show flow is stable.

## Idea E: robustness and counterfactual taste controls

### Problem

A low-data act chooses famous reference artists. A single reference can dominate, or a bad/unresolved signal can silently disappear. The map may look precise even when the prior is fragile.

### Mechanism

Evaluate the same candidate set with reference combinations and leave-one-reference-out tests. Inspect rank stability and explanation. Show stable vs taste-sensitive picks and ask the operator to refine references when necessary.

This is **model-input sensitivity**, not a causal estimate of what happens to attendance if the band changes style. Do not announce a prediction confidence interval without calibration.

### Judge-facing proof

A polished recommendation becomes conditional when one weak reference is removed. Gus asks for the relevant context rather than bluffing. This is operational trust as a Qloo feature.

## Avoid clever-but-false shortcuts

- Adding affinity values as if they were independent fan counts.
- Calling a multi-act recommendation an audience-union estimate.
- Venue metadata opening hours as confirmed show availability.
- A successful HTTP response as proof an unsupported parameter influenced ranking.
- Reverse-engineering exact fan identities from neighborhood heat.
- Worldwide sponsor lists as ready buyers.
- Claiming full graph traversal/export or on-device access without documented entitlement.
- Reimplementing heat/lift arbitrage you already have as a new feature.

## What I would actually ship

**One hero:** artist/scene cultural pressure test on a verified small roster, joined to a real reply/approval workflow.

**One lateral:** show-context local campaign qualification or one practical meal window, not both if reliability is at risk.

**One proof panel:** same-inventory Qloo ablation, taste counterfactual, provenance, uncertainty and action outcome. Judges should see Qloo change the decision and Gus carry it forward safely.

## Questions to ask Qloo before stretching further

1. Which input entity types are supported/effective for artist outputs in the hackathon environment?
2. What should a missing per-result affinity mean when a candidate pool is supplied?
3. Are comparison outputs cultural affinity, a directional score or actual overlap, and what are valid units?
4. What weighted multi-entity request contract is current for hackathon keys?
5. What is the permitted production path/pricing after key expiration?
6. What is the authorized route for on-device models, if relevant later?

These questions prevent fragile cleverness. Document unsupported/inconclusive results rather than hiding them.
