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

Documented /search and entity lookup let you resolve names to IDs. [Q7](12-SOURCES.md#q7), [Q11](12-SOURCES.md#q11)

**Verified:** recognized artists resolved in live tests. Searching The Basement produced multiple rooms in different cities; the Columbus match required address disambiguation.

**Not verified:** every emerging local act, comedian or house venue. Store unresolved entries and let a human supply references rather than inventing an ID.

### Supplied-candidate ranking

Documented filter.results.entities restricts results to known entity IDs, including artist/person/place categories. [Q2](12-SOURCES.md#q2), [Q3](12-SOURCES.md#q3)

**Verified:** a Phoebe Bridgers signal ranked a supplied two-artist set; all returned IDs belonged to that pool. A control without the filter included an outside candidate. A later four-artist pool changed ordering when the artist signals changed.

**Product value:** rank the operator's roster/inventory while keeping their contacts, availability and history authoritative. This is not implemented by the existing adapter's candidate interface yet.

**Not verified:** complete local coverage, local draw or response probability. Recognized artists in the diagnostic were illustrative, not proposed local openers.

### Heatmaps

Documented urn:heatmap gives geospatial affinity, affinity_rank and popularity. [Q4](12-SOURCES.md#q4)

**Observed live app:** the cached receipt for Phoebe Bridgers/Japanese Breakfast contained 8,578 cells aggregated into 194 metros in the earlier inspection. This verifies that flow, not that those cells are individual fans.

The local Wanted score blends heat and lift percentiles, with a chosen comparator panel. It is a product ranking heuristic. The panel is not automatically a representative typical act. Cell aggregation, boundaries, comparator choice and signal weights can alter rankings. Disclose them and evaluate stability.

Do not convert a heat value or normalized share into predicted ticket count without an outcome-calibrated model.

### Places

Documented location, tags, popularity, business/rating attributes, hotel class, price-tier and weekday opening filters support practical recommendations. [Q2](12-SOURCES.md#q2), [Q3](12-SOURCES.md#q3)

**Verified:** a Columbus place query with two artist signals returned localized entities and explainability. The unconstrained result included university buildings, demonstrating why generic place output is not a room shortlist.

Use correct place-category tags and a trusted inventory/qualification layer. Check the right facility/configuration. Wexner has several capacity configurations; The Basement's rental page discusses combined space; Newport source capacities differ. [R8](12-SOURCES.md#r8), [R9](12-SOURCES.md#r9), [R10](12-SOURCES.md#r10)

A venue's general opening hours are not performance-date availability. A blank public calendar is not proof it is free. A business rating is not production suitability. A restaurant price tier is not tonight's bill; dietary tags are not allergen assurances.

### Demographics

**Verified:** live age/gender values include negative numbers. They are signed skews/affinities, not audience shares. [Q5](12-SOURCES.md#q5)

Your current local demographics adapter already preserves that distinction and describes skews, not shares. Keep it. Do not softmax these into purported attendance percentages or infer a person's identity.

Use aggregate broad context carefully; do not build protected-trait targeting or pretend audience composition identifies actual local attendees.

### Explainability

The inspected documentation/schema describes input influence and can return warnings when unavailable. The localized place diagnostic returned per-result explainability. [Q6](12-SOURCES.md#q6)

Show what input contributed to the recommendation, not why a real booker will accept or what fraction of a venue's customers are fans. Missing explainability is unknown, not an opportunity to invent a rationale.

### Cross-domain interests

Documented artist/place/brand/movie/TV/podcast/book/etc. recommendations support cultural discovery. Your local adapter already queries several domains. [Q7](12-SOURCES.md#q7), [Q10](12-SOURCES.md#q10)

Possible uses: locally qualified cultural partners, campaign context, poster candidates, optional dining/experience. Qualify operational eligibility separately: local presence, editorial fit, contact, permission, deadline and cost.

A popular podcast is not guaranteed local reach, coverage, sponsorship interest or an ad audience you can buy. A place recommendation is not permission to poster its window.

### Artist recommendations using a venue signal

**Semantic failure in diagnostics:** venue-only artist ranking returned the supplied entities but no affinity fields. Adding the same venue to the artist signal left the observed two-candidate scores unchanged from artist-only.

This does not prove the API never supports place-to-artist relationships. It proves we must not claim this exact request works merely because it returned 200. Use artist-based scene anchors until supported behavior is confirmed. [15-CLEVER-QLOO-EXPERIMENTS.md](15-CLEVER-QLOO-EXPERIMENTS.md)

### Analysis/compare and trends

The supporting API documents comparisons and trend endpoints. The current adapter already exposes compare. [Q7](12-SOURCES.md#q7), [Q8](12-SOURCES.md#q8)

Before using it to label crowd overlap, verify the actual result field/unit and meaning. A cultural similarity/affinity is not audience-set intersection or an additional-ticket count. Do not multiply it by an arbitrary default crowd size and present the result as measured people.

### On-device capabilities

Qloo markets compact supported inference on-device. [Q10](12-SOURCES.md#q10)

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

The hackathon guide states: use hackathon.api.qloo.com, X-Api-Key, valid documented tags/types and exact endpoints. Invalid parameters can be silently ignored. /search and insights have different type contracts. [Q1](12-SOURCES.md#q1)

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

Do not send fan names, emails, phone numbers, device IDs or precise personal locations to Qloo or model prompts. Your local privacy design already avoids fan contacts/neighborhoods going into Qloo; preserve it during any feedback loop. [Q9](12-SOURCES.md#q9)

The hackathon guide allows private server-side caching without a stated time limit but says not to put Qloo response data in a public repository. Keys remain active through judging and are deactivated afterward; production terms/pricing are not established. [Q1](12-SOURCES.md#q1)

This pack records protocol/semantic findings, not raw provider payloads. Do not publish the private diagnostic cache. Keep operational retention/deletion/access controls separate from Qloo's no-PII positioning.
