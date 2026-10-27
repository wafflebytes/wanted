# A plain chatbot against Qloo: 46% of its rooms hold up

Recorded 2026-10-27, demo act (Maya Ortiz, indie folk), 8 cities. Run it with `npm run eval:chatbot`.

The question an artist would ask: where's my crowd in this city, and which rooms should I play on a Tuesday. A general model with no taste data answers it three times and the majority answer is kept. Then each claim is checked against Qloo: does the room exist, is it in that city, is it still open, is it open that night, does it put on shows, and does Qloo rank that neighborhood for this sound. The same check runs in the app behind "Ask a chatbot instead?" on every city sheet. Answers are kept for a day per city.

| | Chatbot |
|---|---|
| Rooms that hold up | 17 of 37 (46%) |
| Rooms that are wrong (closed, dark that night, another city) | 5 of 37 (14%) |
| Neighborhoods Qloo ranks in the top 10 for this sound | 5 of 24 (21%) |
| Cities it picked that are in Wanted's top 15 | 41 of 120 (34%) |
| Cities nobody plays yet that it never mentioned | 11: Eugene, OR; Corvallis, OR; Bellingham, WA; Ithaca, NY; Missoula, MT; Salem, OR |

| City | Rooms hold up | Wrong | Neighborhoods in Qloo's top 10 | Cities in top 15 |
|---|---|---|---|---|
| Burlington, VT | 4 of 5 | 0 | 3 of 3 | 6 of 15 |
| Columbus, OH | 4 of 5 | 1 | 1 of 3 | 3 of 15 |
| Portland, ME | 3 of 5 | 1 | 0 of 3 | 3 of 15 |
| Ithaca, NY | 1 of 5 | 1 | 0 of 3 | 6 of 15 |
| Poughkeepsie, NY | 1 of 5 | 0 | 1 of 3 | 6 of 15 |
| Santa Cruz, CA | 1 of 5 | 0 | 0 of 3 | 5 of 15 |
| Asheville, NC | 1 of 2 | 0 | 0 of 3 | 6 of 15 |
| Portland, OR | 2 of 5 | 2 | 0 of 3 | 6 of 15 |

## What the misses look like

- Burlington, VT: Nectar's: Qloo has no venue by that name in Burlington
- Columbus, OH: Ace of Cups: Closed on Tuesdays per Qloo's hours
- Portland, ME: Port City Music Hall: Qloo lists it as permanently closed
- Portland, ME: Empire Dine & Dance: Qloo has no venue by that name in Portland
- Ithaca, NY: The Haunt: Qloo places it at 42 W New York St Aurora, IL 60506, not in Ithaca
- Ithaca, NY: Castaways: Qloo has no venue by that name in Ithaca
- Poughkeepsie, NY: The Chance: Qloo has no venue by that name in Poughkeepsie
- Poughkeepsie, NY: The Mid-Hudson Civic Center: Qloo has no venue by that name in Poughkeepsie
- Santa Cruz, CA: The Crepe Place: Qloo has no venue by that name in Santa Cruz
- Santa Cruz, CA: Moore's Tavern: Qloo has no venue by that name in Santa Cruz

## How to read it

"Doesn't hold up" mostly means there's no evidence behind the claim, not that it's false. Some of those rooms are real and Qloo's place search just didn't find them, and a chatbot's neighborhoods are often real places that simply aren't where this sound's fans live. "Wrong" means Qloo contradicts it: closed for good, dark that night, or the only room by that name is in another state (that last one can also be a search miss). So read the numbers as how much of a chatbot's confident answer you could act on without checking it yourself. Wanted only names rooms and neighborhoods that came back from Qloo for this act, so the same check on Gus's answers holds by construction (`src/server/gus/ask.ts` drops any reply naming a room no lookup returned).

## Not measured

- Whether the chatbot's unchecked rooms would have worked out. Qloo's places data is the reference here, and it has gaps.
- Ticket sales. Neither side has them.
- Other acts. One act, 8 cities.
