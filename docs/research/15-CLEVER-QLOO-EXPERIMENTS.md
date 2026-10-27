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

Calendar overlap is easy; knowing which nearby show is culturally relevant is harder. Named reporting describes discovering overlapping audiences after a show date was set. [V9](12-SOURCES.md#v9)

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
