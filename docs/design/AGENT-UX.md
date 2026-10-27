# Gus drives the app

How an agent should feel inside Wanted: not a chat window beside the product, but a tour
manager who reaches into it, does the work where you can see it, and hands you the decisions.
This is a product spec first. The tech notes at the end say what each piece needs, so the
agent can catch up with the design.

Status markers: **Built** is live on the web app; **Next** is designed here and not built.

---

## 1. Principles

1. **Do it where it lives.** When Gus changes something, the change happens on the real
   screen, in the real control, while you watch. Never "Done! I updated your settings" in a
   bubble while the settings sit unchanged somewhere else.
2. **Show the state, fold the story.** Lead with where things stand (one number and a
   sentence, a line that moves). The steps and letters that got there are one tap below.
3. **Ask with the thing itself.** When Gus needs a yes, he brings the actual control: the
   deposit with a slide to pay, the city as a token you can swap, a slider set to his
   suggestion. Not "Should I? Yes / No".
4. **Every act is undoable, or asks first.** Cheap and reversible: Gus does it and says
   so, with Undo for a few seconds. Costly or outward-facing (money, messages to venues or
   fans): he prepares it and you commit with a hold or a slide.
5. **Steer, don't restart.** Anything Gus is doing for a while (a call with a venue, a
   route plan) accepts a nudge in flight: "hold out for 75%", "skip Tuesdays".
6. **Voice first, eyes optional.** Every answer is speakable. The screen adds the thing you
   can touch; it never holds the only copy of what Gus meant.

---

## 2. The approvals ladder

What Gus may do, from freest to most guarded. The rung decides the interaction.

| Rung | Examples | What you see | How you commit |
|---|---|---|---|
| 0. Look | Open a city, show the route, read the mail | The screen moves there | Nothing to commit |
| 1. Arrange | Pin a poster spot, reorder tour stops, draft a pitch | The change, in place, with "Gus did this · Undo" | Nothing; Undo for 6 s, then it's in the logbook |
| 2. Speak for you | Ask a venue, tell fans a date, post a poster | A filled sentence with tokens you can swap | **Hold** the key (700 ms) |
| 3. Spend | Pay a deposit | The exact amount, payee, date and expiry | **Slide** to pay; voids itself if terms change |

Limits in Settings move rungs 1 and 2 (Gus talks to venues on his own when a city fills).
Rung 3 never moves: money always needs your hand.

---

## 3. Surfaces

### 3.1 The island (Built)

Gus's one line at the top. It says what he's doing now ("Asking The Flynn"), turns amber
when he needs you, and flashes what he just did ("Opened Ithaca"). Tap: the tray.

**Next:** after a rung-1 act, the island grows a second segment: `Pinned 3 spots · Undo`.
It shrinks back after 6 s. Undo plays the change backwards on the same screen.

### 3.2 The voice card (Built)

Talk-first. Tap the Gus key and speak; hold to talk while held. Captions light word by word
as he speaks. His short asides ("Checking the rooms in Ithaca") appear while he works, and
each lookup is a step you can open.

Answers end in a **proposal**: an editable sentence, not a fixed button.

> Write the pitch for **[Ithaca ▾]**

Tap the token and the other strong cities slide in; pick one and the sentence rewrites
itself. A proposal that commits (asking a venue) is a **hold** key.

### 3.3 The deal room (Built)

A full-height sheet: Gus on the phone with a venue.

- **Tug lines.** Two tracks, your cut of the door and the deposit. On each: your line (the
  limit you set), Gus's ask (orange) and the venue's offer. Your side of the line is tinted,
  so an offer sliding into it reads as good news before any words do. The gap between them
  is hatched; it closes as letters land. When they agree the two marks become one check.
- **One sentence.** "Ten points apart on the door, and $50 apart on the deposit."
- **The conversation, folded.** Each letter is one line with its numbers pulled out; Gus's
  checks between letters fold into one quiet line. The latest three show.
- **Steer chips.** "Hold out for 75%", "Go up to $825", "65% is fine", Pause. Your note
  lands in the thread and the next letter follows it.
- **The yes, in place.** When they agree, a slim approval rises: one sentence and a slide.
  Once paid, the room stamps itself held and offers the next move: tell the fans.

Opens from the tray, the map card, Fan Mail, and any link with `?deal=<id>`.

### 3.4 Gus puts posters up (Next)

The ask: "Put Burlington's poster up near the colleges."

1. The voice card shrinks to a pill at the bottom; the screen goes to **Posters**, on
   Burlington.
2. A spotlight rings the poster. Gus's face rides along the edge of the ring (the Arc call
   pattern: motion around the subject, captions apart).
3. On the city map below, pins drop one by one where he'd put it ("Radio Bean, Muddy
   Waters, the UVM library"), each with a soft tick.
4. The island: `Pinned 3 spots · Undo`. Nothing left the app, so this is rung 1.
5. If you asked him to **send** it (to a venue, to fans), the last step is a filled
   sentence with a hold key instead: rung 2.

The same choreography works for any rung-1 job: reorder the tour ("move Ithaca to Friday"),
lock a night, pick the draw winner.

### 3.5 Controls Gus hands you (Next, genUI)

Wanted has few knobs, so this is a short catalogue, and that's the point: Gus brings the
control only when it's the fastest way to say yes.

| You say | Gus brings | Why not just do it |
|---|---|---|
| "Let him go higher on deposits" | The Biggest deposit slider, already at his pick ($300), with the old value ghosted | It's your limit; one drag confirms or adjusts |
| "Don't call me so late" | The two quiet-hours wheels, set to his read of your week | Two values at once; easier to see than say |
| "Which night in Ithaca?" | Three day chips, best first, with how many signers can make each | A choice, not a fact |
| "Swap Albany" | The route with two candidate cities as ghosts on the line | Spatial; you see the detour |
| "Who wins the draw?" | The ticket stub with a hold to draw | It's a promise to a fan |

Rules for these: the control is the real one (same component, same limits); changing it in
the card changes it everywhere at once; the card says where it lives ("This is in
Settings") so you learn the app while Gus drives it.

### 3.6 Show day (Built, fixture marked)

`/a/<act>/show/<deal>`. The day sheet for one held date, kept by Gus. Opens from the home card
("Your next show"), a held stop on Tour, and the deal room once a room is held ("Plan the day
with Gus"). Why this one: the research pack's strongest evidence (04, tour managers and crew;
16 D, advance desk) is that the advance-to-day-sheet handoff is where touring people lose hours
and where things break on the night.

- **The day** is a timeline. Each time has a dot for who set it: blue, the room confirmed it
  (tap: who said so, and when); orange, Gus picked it; hollow amber, asked and waiting. Unknowns
  stay visible; nothing pretends to be settled.
- **The room writes to change something.** An amber card brings the letter, then Gus's one-line
  read of what it costs ("Dinner gets shorter, so I'll find a quicker place"), then a hold key
  (rung 2: he answers for you). Hold, and only what depends on it moves: soundcheck slides,
  dinner's window shrinks, the dinner pick changes, both rows wash orange with a Moved tag.
  Gus says it in one sentence and ends with "Nothing else moved." That last clause is the
  judge-facing proof (research 15, Idea D; 16 D gate).
- **Least-worst dinner for the whole band.** Tap the dinner row: the party with each person's
  needs (vegetarian, gluten-free), then the places, the ones that no longer fit struck through
  with "Needs 59 min, you have 30".
- **The advance** as a fraction and nine dots (6/9), the questions and answers, and the emails
  one tap down.
- **Fans:** invite the signers to the place Qloo says this crowd already goes (real: Radio Bean
  for Burlington), and post that it's booked (real story image).
- **Who opens:** Qloo openers who share your tags (real). Suggesting one is the room's call.
- **What you take home** is a control: drag the crowd, watch the number; a heavier tick when
  you cross the break-even line. "You're even at 24 people."
- **Getting there:** the drive from the previous tour stop, the room for the night, and the
  word-of-mouth piece: signers who offered a couch ("Gus checks they're real and close").

**Real today:** the deal (room, date, split, capacity), signer count, Qloo hang spot and
openers, the previous tour stop, the story image. **Fixture (labelled in `web/lib/showday.ts`):**
the advance thread and answers, times, party, dinner places, costs, ticket price, hotel, couch
offers, the venue's change letter. Tech pass: an advance desk (email thread per deal, parsed
answers with source), places from Qloo ranked per person with hard filters, a settle-up check
against the door count.

### 3.6b The road (built)

`/a/[artist]/road/[stop]`, from the Tour hero ("18 h to Asheville. Gus found a better way.") and from any drive of 8 h or more in the run list. One long leg, three honest ways, each as the nights between the two shows and one number for what it does to your money:

- **Play the city on the way** (usually Gus's pick). Off the tour, 25–75% along the leg, within ~140 km of the line, the city that loves your sound most (Qloo city score; signers count double). On the demo tour: Burlington to Asheville, 18 h, 4 dark nights. Gus picks Harrisonburg, VA: 1 h out of the way, splits the 12 h first drive, about 80 people at the door. Hold to ask rooms there (real: `deals.ask`, the same agent loop as the map). Shows where that crowd hangs (Qloo places) and an opener with the same crowd.
- **Drive it**: two days of 9 h, a room halfway.
- **Fly**: three fares plus borrowed backline, and the honest catch when the van is needed at the next stop ("The van stays in Burlington, and you need it in Charlottesville on Sun."). Struck through, never hidden.

Real: tour dates, km and hours, the city pick and its score, hang spots, openers, the ask. Fixture until wired (labelled on screen as Gus's guesses): fares and flight times, gas price, room rate, the door guess. Tech pass: a fares API for the fly lane, a room-booking hold for the drive lane, door guess from the room's real capacity and the city's signers.

### 3.6c Settle up (built)

`/a/[artist]/show/[deal]/settle`, from the "Settle up" row on Show day. After the set Gus reads three counts, one by one: the room's door sheet, the ticket scanner, your guest list. If they agree it's one line and the money. If not, an amber card: how many people paid and weren't counted ("11 people paid and weren't counted. That's $142 of yours. They came in between 10:05 and 10:40"), the receipt (scanned, minus your guests, paid at $18, your 72%, the room's sheet), and the note to the room already written with the scan log attached. Hold to send. When the room fixes it the room's count turns to 123, the total rolls to $1,594 and the sheet gets a Settled stamp.

Real: the deal (room, date, your split). Fixture until wired, and labelled on screen: door sheet, scan log, guest list, the room's reply. Tech pass: scanner export (Eventbrite / DICE / Square check-ins), the room's sheet parsed from the settlement email, the note sent on the deal thread, payout tracked in the ledger.

### 3.7 Next jobs for Gus, by demo value

Ranked by how much real friction they remove times how well they show in two minutes.

| Job | What it looks like | Qloo's part | Rung |
|---|---|---|---|
| ~~Fly or drive~~ (built as 3.6b, with a third lane: play the city on the way) | A long leg shows two lanes: 11 h in the van vs $214 flight + van shuttle, with what each does to the next day's load-in | none; honest | 0, then 3 to buy |
| ~~Settle up~~ (built, 3.6c) | After the set: the room's count vs the ticket scanner vs your split, one line if it matches, an amber card if not | none | 0 |
| Guest list and rider | The four names and the rider go to the room; "sent" is not "acknowledged" until the room says so | none | 2 |
| Conflict radar | "A Sour Widows show is two blocks away that night": same-night shows that share your crowd, not every show | taste similarity of the other bill | 0 |
| Merch that fits the city | Which shirt to bring more of, from what this crowd also loves | cross-domain brands | 1 |
| Couch offers | Signers can offer a place to stay; Gus checks distance and that it's real | none; fan data stays local | 2 |

---

## 4. Loops: where the product grows itself

Each one is a moment the musician already wants to post or say, with the next fan's way in
attached. Built ones are marked.

1. **The poster** (Built): every city's link unfurls as a WANTED poster with the live count.
   A fan shares it to get to fifty.
2. **"I signed #43"** (Built): the fan's receipt after signing, made to send to two friends.
3. **The draw winner** (Built): a story with the poster, the stamp and "#43 from South End,
   you won." Every fan checks their number; the pill says "Your city next? Sign a poster."
4. **Booked** (Built): "Burlington, you did it", the date, and "51 of you signed for this".
   Proof to the next city that signing works. From Posters, the deal room and Show day.
5. **Meet the signers after** (Built, fixture send): the after-show hang at a place the crowd
   already loves. Turns a show into a night fans talk about.
6. **Couch offers** (Built, fixture): the most DIY form of fandom, and a reason to sign.
7. **Next:** the tour poster (all held dates on one image), the thank-you story the morning
   after with the room's count, and first-dibs tickets as the revenue edge: signers buy first,
   Wanted takes a small fee from the room, not the fan.

---

### 3.8 Progressive disclosure (Built in part)

- **Map**: on the tour tab the heat goes quiet and only the route shows. On the country
  view, labels only for your top cities; the rest appear as you zoom.
- **Logbook**: milestones fold into one row; each entry's detail folds to two lines.
- **Deal room**: state first, letters folded.
- **Next:** Fan Mail cards fold older notes from the same city into one stack ("3 more from
  Burlington"); the city sheet leads with one sentence and folds rooms and neighbourhoods.

---

## 5. Motion and feel

- Every Gus act has one motion that points at its subject: a ring (spotlight), a pin drop,
  a tug line sliding. Never confetti.
- Durations stay Apple-quiet: 120 to 520 ms on `cubic-bezier(0.22, 1, 0.36, 1)`.
- Haptics are punctuation: `tick` on a token swap or detent, `commit` when a hold or slide
  lands, `success` when a room is held, `warn` when Gus needs you. One per act.
- Reduce Motion: rings and slides become cross-fades; the order of events stays.

---

## 6. What the agent needs (tech notes)

Each pattern is a contract the model can fill:

- **In-place acts** need an action vocabulary beyond today's
  `city | pitch | deal | tab | link`: `pin_spots`, `move_stop`, `set_limit`, `draw`. Each
  returns `{ target, change, undo }` so the client can spotlight `target`, play `change` and
  keep `undo` for the island.
- **Steering** is a small server verb on long jobs. Deals have it: `{ deal, steer }` moves
  that deal's limits mid-talk and writes your note into the thread.
- **genUI** is the same: the model names a control and a proposed value
  (`{ control: 'maxDeposit', value: 300 }`); the client renders the real component. The
  model never draws UI.
- **Grounding** stays: replies are checked against what the tools returned, and a last
  filter swaps internal words (sleeper, proof threshold, score, market) for musician ones.
