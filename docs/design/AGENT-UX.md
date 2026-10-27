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

### 3.6 Progressive disclosure (Built in part)

- **Map**: on the tour tab the heat goes quiet and only the route shows. On the country
  view, labels only for your top cities; the rest appear as you zoom.
- **Logbook**: milestones fold into one row; each entry's detail folds to two lines.
- **Deal room**: state first, letters folded.
- **Next:** Fan Mail cards fold older notes from the same city into one stack ("3 more from
  Burlington"); the city sheet leads with one sentence and folds rooms and neighbourhoods.

---

## 4. Motion and feel

- Every Gus act has one motion that points at its subject: a ring (spotlight), a pin drop,
  a tug line sliding. Never confetti.
- Durations stay Apple-quiet: 120 to 520 ms on `cubic-bezier(0.22, 1, 0.36, 1)`.
- Haptics are punctuation: `tick` on a token swap or detent, `commit` when a hold or slide
  lands, `success` when a room is held, `warn` when Gus needs you. One per act.
- Reduce Motion: rings and slides become cross-fades; the order of events stays.

---

## 5. What the agent needs (tech notes)

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
