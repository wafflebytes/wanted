# Operator-owned preparation brief

Built October 25, 2026. Local workflow: `/a/maya-ortiz/brief`, also linked from the booking desk as **Use my own show and shortlist**.

## What changed

Gus can now work from a user-supplied, redacted show and shortlist rather than only the fixed Burlington fixture. The public demo act remains the sandbox account. This is **not authenticated real-artist authority**.

The operator supplies a date, circuit, capacity ceiling, support budget, sound/scene references, and up to eight candidate acts. Qloo search offers disambiguation; the person selects the entity. The server re-fetches canonical artist identities before accepting a brief. Unresolved candidates can remain on the list but cannot become qualified recommendations.

Operational fields are explicitly operator assertions: circuit membership, live suitability, room scale, fee, date availability and possession of a private intake route. They are not independently verified. Unknown evidence stays null; no private address or raw correspondence is requested. Scene context has an explicit source label and seven-day evidence expiry.

The existing leased/version-fenced worker inspects, qualifies, compares the same feasible Qloo pool and prepares exact terms or establishes a justified wait. There is no second agent runtime. Editing a committed brief atomically invalidates older preparation and wakes the existing job; it never unpauses a paused job. Editing a date clears the old availability answers in the form.

## Authority and freshness

- Records use `mode: operator`, never pretend that supplied facts are fixture or primary evidence.
- Separate HttpOnly case cookie and server-enforced brief namespace isolate records.
- The brief API has no approve, execute, send or pay operation.
- Existing approve/execute services reject operator-mode preparation. Dedicated tests assert HTTP-style 403 denial and zero effect records.
- Export rechecks current eligibility, scene evidence, exact version and a current same-pool cultural selection. Culture older than 24 hours cannot make a current export.
- An explicit stale-culture recheck invalidates old preparation and creates a new revision/business key. It does not renew operational assertion timestamps.
- Identical save retries do not create revisions, extend evidence or duplicate preparation.
- Fractional cents, malformed dates, duplicate roster entities, missing consent and private contact strings are rejected.
- Operator preparation does not emit fixture-inbox approval/send attention. No contact or payment action is exposed.

## Outcome

**Copy reviewed preparation** produces a server-derived Markdown preparation pack: show revision, date, budget, cultural references, eligibility/missing facts and exact proposed terms. It states that nothing is sent, booked, approved or paid. The person can review it before using their own authorized tools. Copying is not delivery or a confirmed agreement.

The live local browser check used explicitly illustrative operating assertions, real Qloo identities/taste, and real model-directed tools. The job first stopped on unknown availability. After a reviewed test correction, the same job prepared Lucy Dacus for November 21, 2026 at $120 USD from a Lucy Dacus/Thundercat supplied roster with Phoebe Bridgers sound and Bon Iver scene references. This is mechanism evidence, not an actual quote, real local roster, booking or demand result.

The 393 × 852 iframe check confirmed the current date including year, fee, revision and copied-without-sending outcome. It is a web-layout test, not native Safari/accessibility validation. The completed full local suite at this pass was 217 passing tests; 16 are the dedicated operator-brief cases. Typecheck and production export passed. Deployment of this feature is not claimed.

## Run checks

```sh
npm run typecheck
node --import tsx --test tests/operator-brief.test.ts
npm test
npm run build:web
# Against an already running server containing the new route:
WANTED_TEST_ORIGIN=http://localhost:8083 npx tsx scripts/operator-brief-smoke.ts
# Optional extra live provider run, clearly separate from uncached strict model evals:
WANTED_TEST_ORIGIN=http://localhost:8083 npx tsx scripts/operator-brief-smoke.ts --agent
```

The default live smoke verifies Qloo resolution, cookie isolation, missing-fact export, private-contact denial, absent effect APIs, no-op retries and stale write denial. The optional `--agent` path also exercises a missing-availability wait, a corrected-brief preparation and paused-revision behavior. It reports whether the worker used a model or fallback; it is not an uncached strict model gate. The latest smoke summary is private in `.data/operator-brief-smoke-latest.json`; do not publish Qloo caches.

## Next build order

1. **Show Advance Agent:** turn a genuinely confirmed show into an operator-reviewed day sheet: load-in, soundcheck, set/curfew, technical/hospitality needs, transport and missing obligations. Unknown time/authority must remain a blocker. Export a usable packet before adding another connector.
2. **One permitted intake connector:** authenticate the operator and counterparty/thread, ingest structured changes with source evidence, enforce version/idempotency/privacy and reconcile uncertainty. Do not add unrestricted autonomous outreach.
3. **Qloo-informed promotion with feedback:** use supplied local channel/partner inventory and Qloo's cross-domain taste to propose an explicitly measured campaign. Keep taste affinity separate from impressions, clicks, ticket sales and uplift. First test with three real consenting self-booking operators.

This follows the research-to-build audit's operator-owned input gate. Real customer evidence, verified counterparties, connector authority, production publication and operator-outcome validation remain open.
