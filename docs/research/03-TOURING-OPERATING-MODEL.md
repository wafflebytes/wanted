# 03. Touring as an operating system

## Roles are not interchangeable

An artist manager tends to the career and overall business/creative interests. A booking agent develops and negotiates performance opportunities. A promoter or talent buyer programs/produces shows and deals with venue and ticket risk. A tour manager coordinates the run and daily delivery. Production, house crew, driver and merch roles have additional responsibilities. In small tours several roles are combined. [V6](12-SOURCES.md#v6), [V8](12-SOURCES.md#v8), [C10](12-SOURCES.md#c10)

Wanted should not call a venue's general phone number a verified booker or equate a rental salesperson with the concert talent buyer. Ownership and authority must be explicit.

## Lifecycle and the data Gus needs

### 1. Decide whether and why to run dates

Triggers: release, festival/anchor gig, support opportunity, return-market development or a fixed availability window. Determine who is traveling, which dates are locked, goals, maximum downside and cash available.

Qloo contributes potential cultural fit when an act lacks market history. It does not establish a performable live set, willingness to travel, money or people availability.

Useful artifact: run brief with objective, constraints, confidence and missing information. Alternative outcomes include a weekender, support slot, local residency, off day or not touring now. [V1](12-SOURCES.md#v1), [V2](12-SOURCES.md#v2)

### 2. Select anchors and draft routing

Use real commitments first, then examine practical gaps and reachable opportunities. Avoid a national leaderboard becoming a geographically absurd route. Travel mode matters: Eli Winter tours by public transport as well as with a band, so driving is not universal. [V3](12-SOURCES.md#v3)

Store local dates with time zone, confirmed vs tentative state, travel buffers, people constraints and cancellation exposure. Distance is not travel time. A route suggestion must not silently change a confirmed show.

### 3. Qualify scenes, rooms and bills

Check actual format, scale, geography, relevant recent bills, booking contact/guidelines, existing relationships and cultural fit. A room may suit a listening performance, dancing, comedy or a mixed program; capability and configuration matter. [V8](12-SOURCES.md#v8)

Start from inventory you or a booker trusts. Use Qloo to rank it. Label unresolved Qloo mappings and missing locality. Global popularity is not local draw or live quality.

### 4. Request and negotiate

Lead times vary. Miss Eaves and Max Narotzky recommend four to six months for their DIY contexts. That is not a universal SLA, but it contradicts designing all market discovery around instant booking. [V1](12-SOURCES.md#v1), [V2](12-SOURCES.md#v2)

A qualified request contains specific feasible dates, EPK/live evidence, honest draw, appropriate bill/room context and relevant terms. Follow the counterparty's prescribed channel. No automated repetitive spam or invented relationship.

Gus's high-value task is interpreting an actual reply: changed date, hold priority, payment terms, production gap or request for information. Prepare a delta and next action. Do not have two LLM stand-ins negotiate a fictional price and call that a real venue offer.

### 5. Holds, challenges and confirmation

A hold is not a contract, and multiple ranked holds may exist. First Avenue's historical account describes first/second/etc. holds and challenges, with a response deadline in that particular process. [V8](12-SOURCES.md#v8)

Store hold priority, counterparty, source, expiry, challenge status and current offer version. Never hardcode all holds as a universal 48-hour first-priority reservation. The artist's approval may authorize acceptance of a specific version, not bind a venue that has not agreed.

### 6. Announce and promote

Agree promotional responsibilities and announcement timing, embargoes, assets, ticket link, format and approvals. [I6](12-SOURCES.md#i6)

Do not block all announcements until every tour date is finalized if the operator intends to announce in tranches. Model announcement groups and versions. A date/venue change invalidates affected scheduled posts, fan notices, ad assets and media pitches.

Qloo informs cultural candidates/themes. Verified local contacts, partner permission and channel data determine execution. Spotify/Bandsintown/Songkick distribution can be more useful than asking every fan to install Wanted. [F4](12-SOURCES.md#f4), [C5](12-SOURCES.md#c5)

### 7. Advance the show

Confirm technical rider, stage plot/input list, backline, load-in/parking, soundcheck, set times, curfew, guest list, contacts, hospitality, access, accommodation and settlement process. Separate the booking inbox from the actual production contact. [I6](12-SOURCES.md#i6), [C11](12-SOURCES.md#c11)

Shared backline is a concrete cost/load reduction when confirmed; Careful Gaze describes reducing gear and trailer burden by arranging it. [I1](12-SOURCES.md#i1)

Gus should detect unresolved requirements and send the correct question to the correct authorized contact. Do not treat a rider attachment sent as a requirement acknowledged.

### 8. Travel and perform

Provide the latest offline-readable day sheet, essential contact/address, approved schedule and unresolved items. Keep private hotel/crew data off public fan pages.

Road Care can resolve an actual meal/time gap. Crew matter too. Actual sleep, access, allergy and safety constraints must come from the person/party, not demographic/taste inference. [V5](12-SOURCES.md#v5), [R4](12-SOURCES.md#r4)

Travel disruption, illness or safety concerns can require human escalation, rerouting or cancellation. Gus must not pressure a driver to continue to satisfy a route score.

### 9. Settle and reconcile

Record contracted fee calculation, actual ticket reports, approved deductions, already-paid advances/deposits, merch, expenses and balance owed. A written agreement is critical because a headline percentage alone is ambiguous. [I6](12-SOURCES.md#i6), [I7](12-SOURCES.md#i7)

PaymentIntent success in a test environment is not settlement with a venue. A real payment would still require verified payee, currency, authority, current offer and reconciliation.

### 10. Learn and return

Retain the useful, consented operational record: final terms, turnout/report source, promo work done, ticket activity, problems, helpful contacts and when returning might make sense. Do not learn personal/sensitive fan attributes from aggregates.

A repeat-market relationship can reduce the costly first-booking process. That is a stronger long-term loop than resetting the map each time. [V1](12-SOURCES.md#v1), [V7](12-SOURCES.md#v7)

## Critical correction: deal type and direction of money

Your local demo models an artist-paid deposit plus artist door share. That can represent venue hire or a particular risk-sharing arrangement. It is not a universal musician booking model.

Careful Gaze says most of its punk/bar shows do not require an artist deposit, and the band usually avoids those that do. MU featured-artist guidance instead recommends obtaining advance payment from a new promoter. The Current describes promoter rental and artist guarantees/door splits. [I1](12-SOURCES.md#i1), [I7](12-SOURCES.md#i7), [V8](12-SOURCES.md#v8)

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

Merch manufacturing, transport rental and accommodations can require upfront cash. Revenue may arrive after performance. Net merch contribution subtracts production/inventory cost, venue cuts and payment fees; it is not the whole merch till. [I1](12-SOURCES.md#i1), [V1](12-SOURCES.md#v1)

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
