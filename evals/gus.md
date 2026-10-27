# Asking Gus: 16 of 16 answers passed

Recorded 2026-10-27 against `localhost:3100`, demo act, live model (uncached) and live Qloo. Run it with `npm run eval:gus`.

Each question goes through the same route the app uses. A case passes when Gus ran the lookup the question needs, offered an action that fits (or none), kept to plain words and stayed under 45 words. Every city and room he names has to come back from a lookup first, or the reply is thrown out and a rules planner answers from the lookups instead.

| | Result |
|---|---|
| Passed | 16 of 16 (100%) |
| Ran the right lookup | 16 of 16 |
| Offered a fitting action | 16 of 16 |
| No internal words | 16 of 16 |
| Model answer kept (not the rules fallback) | 11 of 16 |
| Time to answer, median | 2.5 s |
| Time to answer, slowest 10% | 9.9 s |

| Job | Question | Lookups | Action | Pass |
|---|---|---|---|---|
| Where to play | Where should I play first? | city_fit | city | yes |
| Where to play | Which cities nobody plays would actually show up for me? | city_fit, top_cities, fan_proof | none | yes |
| One city | How is Ithaca for me? | city_fit | city | yes |
| One city | Is Columbus worth the drive? | city_fit, fan_proof, rooms | city | yes |
| Rooms | Which Burlington rooms are open on a Tuesday? | rooms, top_cities | deal | yes |
| Rooms | Find me a room in Portland Maine for about 200 people | rooms, book | deal | yes |
| Rooms | Book me somewhere in Poughkeepsie | rooms | deal | yes |
| Openers | Who should open for me? | openers, top_cities, fan_proof, rooms, city_fit | none | yes |
| Crowd | Who are my fans and what else do they love? | crowd | none | yes |
| Crowd | What podcasts does my crowd listen to? | crowd | none | yes |
| Signatures | Which poster is pulling hardest? | fan_proof, rooms | pitch | yes |
| Signatures | How many more signatures does Ithaca need? | fan_proof | city | yes |
| Limits | Never put down more than 300 dollars deposit | none | limit | yes |
| Limits | I want at least 70 percent of the door | none | limit | yes |
| Made-up place | How are things in Springfield Narnia? | city_fit | city | yes |
| Made-up place | Get me a show at the Silver Moonbeam Lounge in Burlington | rooms, book | deal | yes |

## Not measured

- Whether the advice is good for a real act's career. That needs real tours.
- Spoken answers. This is the typed path; voice adds transcription and speech on top.
- Questions outside these jobs.
