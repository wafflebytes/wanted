# Booking desk: artist-first UX

## Who it serves

A working self-booking act planning or changing a short regional run. Often the operator is a band member juggling creative work, employment, limited time off and existing relationships, not an analytics specialist.

Grounding: research pack `02-CUSTOMERS-AND-JOBS.md` sections B, jobs, adoption barriers and trigger-based onboarding; `04-VOICE-OF-CUSTOMER.md` accounts from Eli Winter, Ultra Deluxe, Miss Eaves and venue buyers; bounded briefs 1–3 and 6 in `14-BUILD-BRIEFS.md`.

The target is one usable decision/action, not a complete dashboard. This is a design hypothesis, not interview-validated usability or paid demand.

## Main path

1. **The bill:** who to ask, why this option rather than the closest musical clone, the show date, the support fee and the budget limit.
2. **Your OK:** one focused request, exact artist/date/year/fee, the approval boundary and an explicit separate practice-send step. Approval never claims delivery or authorizes money.
3. **Updates:** approvals, messages, recovered receipts and changed show facts, in plain language.

One bottom primary action, 44-point minimum controls, progressive disclosure, native system reading typography, continuous-radius content cards, restrained purple/amber, and Gus as a recognizable guide. Safe areas include the full-screen iOS modal's top and bottom insets. Larger native font scales stack navigation and scene controls and hide decorative Gus artwork. No new glass dashboard layer.

## Language changes

- “Fixture” becomes “practice show” in the main path. The notice remains visible and explains what is real versus made up.
- “Cultural pressure test” becomes “find a good bill.”
- “Affinity” becomes a ranked comparison of “your sound” and “this scene,” only when someone opens the reasoning.
- “Uncertain / reconcile” becomes “Did that go through? Check the original receipt.”
- “Invalidated” becomes “Your old OK stopped.”
- Endpoint names, provider receipt IDs, query latency, versions, minimax policy and SQLite/Turso details remain under an explicitly technical disclosure.

Simpler language does not remove the evidence boundary. The recognized artists are not a verified Burlington roster. Fees, dates and operating eligibility are fictional; scene references are examples, not local history. Qloo taste checks are live or cached real provider results. There is no ticket-uplift claim.

## Practical failure handling

- A structured booker change stores the old and new date, budget and show status. The UI does not infer those facts from generated prose.
- A missing send result remains recoverable even after the show changes or is canceled. Its original provider receipt is retrieved, never blindly resent.
- Expired approval brings the artist back to approving the exact terms again.
- Earlier requests are folded away, with explicit selection of the request being reviewed. Missing-receipt recovery takes precedence.
- Cancel/reset require an in-app confirmation. Practice fault injection is optional, separate from normal approval.
- A state-changing result returns the scroll view to the decision/result, not an offscreen banner. Important request status text is announced politely.
- Copyable request text is prominently watermarked as practice-only and includes the year. It is not real outreach.

## Verified here

- `npm run typecheck`
- `npm test`: contracts, workflow, artist-facing state language, exact reply deltas and dev-preview production denial.
- `npm run desk:smoke`: live local API, real/cached Qloo rankings, isolated cases, exact approval, deduplication, invalidation, receipt recovery, scene counterfactual and reference sensitivity.
- Existing-browser checks at a real 393 × 852 iframe viewport: bill, approval, missing result, date change and historical receipt recovery. Measured 393-pixel document width and no controls under 44 pixels in tested states.
- `npm run build:web`: production export. The development preview returns 404 in production, even though Expo includes its route bundle in the export.

Standalone Playwright's browser test remains blocked by Chrome launch aborting in this environment. Its API-only test runs. Do not report the browser suite as passing. A native iPhone build, VoiceOver and actual Dynamic Type/device testing are still needed; a desktop iframe is not native Safari or iOS validation.

## Next human evaluation

Give three self-booking acts a real redacted show/bill decision. Ask them to explain the recommendation, identify the support fee and approval scope, and handle one changed date without coaching. Measure corrections, review time, missing facts, actual next action and return use. Compare preference/reasons blind against the same factual cost-first roster, not a grade based solely on Qloo. Ask whether the taste references describe their act and observe which parts they ignore.

## Local reply review

The next artist job is “a booker replied; what changes?” **Work through a booker’s reply** opens a focused paste/review task, instead of making the operator use test buttons or an inbox integration.

- A short redacted excerpt stays in component memory on the device. It is not sent to Qloo, a model or the server. It is cleared on leaving or applying the task.
- A deliberately conservative local parser suggests explicit calendar dates and explicitly named USD support budgets. It surfaces omitted years, alternatives, negation, relative/slash dates, conditions, unsupported currencies and malformed amounts. Generic guarantees, deposits and support fees are not silently reinterpreted as a support budget.
- Cancellation is never inferred or applied by this parser. It remains a separate manually confirmed practice control.
- The operator can choose/correct the fields. Unselected fields are not shown as edit tasks and are not sent. Editing clears the prior review confirmation.
- Only a fingerprint of the excerpt, the reviewed structured fields and the expected version are posted. The fingerprint is a practice-case dedupe aid, not an authenticated email message ID or proof of booker identity.
- The server rechecks the version, records exact before/after facts, invalidates dependent approvals, and retains prior receipts. An unchanged reply records “no change” without bumping the version or invalidating approval. A repeated fingerprint does not apply the change twice.
- If the record changes while reviewing, applying is blocked. Refresh/rebase preserves the local excerpt so the operator does not need to paste it again.
- After a reply, the exact reviewed request remains in focus. Bulk-updated timestamps cannot make an older receipt displace it; older terms are folded away.

The parser is an extraction aid, not comprehensive email understanding. Unsupported language and ambiguous text need manual entry/review. This feature still updates the cookie-isolated fictional show only. Real operator authentication, verified inbound identity, connector permissions and a real local roster remain unimplemented.

Verification added: parser adversarial tests; field/amount validation; no-op reply approval preservation; operator-reviewed delta/version/approval tests; request-focus regression; API smoke checks for no-op, reviewed fields, dedupe and rejected raw-text fields. In the existing browser at 393 × 852, review made no desk mutation, editing a budget cleared confirmation, and a network audit showed one structured update with no pasted-text marker. Existing unrelated status polling continued. The full standalone browser suite remains launch-blocked, not passed.

## October 25 continuation: typography, copy and lost-response recovery

- Karl ST Trial Regular is the main display face, Medium is used for compact titles/emphasis, and Bold for the wordmark/hero numbers. Native system text remains the body pairing; SF Pro Rounded remains Gus's voice. Printed poster artwork retains Archivo to match existing server-generated shares.
- The three supplied trial TTFs have identical limited cmap coverage: basic Latin letters, digits, space/nonbreaking space, comma, hyphen and period. Shared text and animated display text split unsupported characters into inline rounded-system runs. This covers question marks, apostrophes, currency, arrows, accents and other scripts, rather than patching one title. Headings preserve their complete accessible labels.
- Main-flow practice/demo qualifiers were removed from actions and headings. One compact preview notice remains, with expanded evidence boundaries and an explicitly local test-inbox save step. Copy/export text stays marked as non-real outreach.
- A failed mutation response no longer claims the change failed. The primary action becomes refresh-current-show before any further mutation. Successful refresh clears the uncertainty; a changed version requires re-review, preserving the local excerpt.
- Verification: typecheck, 108 unit/contract tests and web production export passed. In the existing browser's 393 × 852 iframe, a main-world fault injection committed a reviewed budget update then dropped its response. The UI showed the unconfirmed state, refresh found the saved budget, re-review retained the excerpt, and no second submission was made. A question-mark heading was inspected with Karl Medium plus an inline rounded-system fallback; document width remained 393 pixels.
- A new standalone Playwright lost-response regression is checked in but remains launch-blocked by the existing Chrome SIGABRT issue. Do not report that suite as passed. Native iPhone and VoiceOver testing remain outstanding.
- Karl files are the user-supplied trial pack. No production or redistribution license was supplied; verify font licensing before public distribution.

## October 25: Gus owns one durable bill job

The primary bill action is now **Let Gus handle the bill**. Gus qualifies the current roster, compares cultural context, prepares a request and persists a human wait. The exact request is still reviewed and saved separately. A compact job strip on the approval screen leaves the artist, full date/year and fee visible at 393 × 852. Pause/resume remain explicit; changes preserve a pause except cancellation, which closes the job without new research or effects.

Committed reply/scene/evidence/decision events wake the job in the same transaction. A new date stops for date-specific availability; an unsent budget change reranks the feasible list; a policy tie asks the operator. Saved old requests wait for follow-up rather than silent replacement. Original missing local-inbox receipts can be recovered without a second effect. Expiring approvals/evidence have a persisted next-check deadline.

Verification: all six `npm run gauntlet -- --integration` gates passed: typecheck, 132 synthetic/contract tests, local production export, desk API, durable-task API and Qloo changed-signal sensitivity. Existing-browser checks confirmed pause/resume, approval without save, date-change invalidation/evidence wait, explicit evidence-update resumption and a new current-version request. At 393 × 852, width was exactly 393, visible artist/date/fee bounds were inside the viewport, and inspected buttons were at least 44 pixels. This is layout/browser proof, not native/VoiceOver or real booking proof. Standalone Playwright remains Chrome-launch-blocked. See `docs/BUILD-AUDIT.md`.
