# Gauntlet improvement log

One entry per iteration (PRD 16.10): hypothesis, the one knob changed, before, after, decision.

## 2026-10-23 · Iteration 1 · Heat field

- **Hypothesis:** the PRD's heat (mean `affinity_rank` within 30 km) can't separate metros, because `affinity_rank` is saturated near 1 in every populated cell.
- **Evidence:** across all US cells for Morgan Wallen, `affinity_rank` quantiles were p25 0.932, p50 0.982, p75 0.994. Columbus 0.99989 vs New York 0.99982. With rank-based heat, college towns were "sleepers" for every act (Laramie, Corvallis, Missoula for both Phoebe Bridgers and Morgan Wallen).
- **Change:** `config.score.heatField` from `r` (affinity_rank) to `a` (affinity, uniform 0..1), weighted by each cell's Qloo `popularity`.
- **Before (sleepers, rank heat):** Wallen: Laramie, Stillwater, Oxford, Missoula, Starkville, Corvallis, Pullman... Kendrick Lamar: Missoula, Auburn, Oxford, Corvallis, Hattiesburg, Bozeman...
- **After (sleepers, affinity heat):** Wallen: Starkville, Hattiesburg, Muncie, Athens GA, Oxford MS, Davenport, Mobile, Ames. Kendrick Lamar: New Orleans, Flint, Baltimore, Baton Rouge, Jackson... Bridgers + Japanese Breakfast: Eugene, Corvallis, Bellingham, Ithaca, Missoula, Salem, Albany, Charlottesville. Bad Bunny: Visalia, Killeen, Bakersfield, Fresno, Tucson.
- **Decision:** keep. Golden checks still hold (Wallen: Knoxville top heat; Bad Bunny: San Juan top heat; Bridgers: Portland top heat). Lift stays the PRD's simple "heat minus panel mean" since it is now artist-specific; z-score and panel-percentile variants were tried and were not clearly better.

## Iteration 2 (23 Oct): grounding loopholes and honest marks

- **Spelled-out numbers slipped past the check.** Route roasts came back as "Thirteen point one hours to Asheville when New York was four point one away." The number check only read digits, so a model could invent "twenty hours" in words and pass. `checkGrounded` now parses spelled numbers (`parseSpelled`: "thirteen point one" -> 13.1, "twenty-one" -> 21) and checks them like digits. The system prompt asks for digits. Prompt version gus-v1 -> gus-v2.
- **False positive on city names.** The pitch check matched case-insensitively, so "Thanks for reading." tripped on Reading, PA and every pitch fell back to Gus (lite). City names now match case-sensitively, and a short list of metros that are everyday words (Reading, Mobile, Normal, ...) is skipped at sentence start.
- **Without Qloo marks were too harsh to be credible.** A real neighborhood missing from Qloo's ranked list (Short North, German Village) was marked as wrong. Marks now have three levels: `ok`, `unverified` (no taste evidence behind it) and `wrong` (Qloo's data contradicts it: venue in another city, permanently closed, closed that night). Only `wrong` counts toward the error rate; `unverifiedRate` is reported separately.
- **County hygiene.** Upstate New York counties come back without the word "County" (Ulster, Dutchess, Orange, 2,100 to 3,000 km²). Localities over 1,200 km² are now dropped. Small neighborhoods come back as `POINT` boundaries, which the parser skipped, so fan dots stacked on the city center; `wktSummary` now reads points.
