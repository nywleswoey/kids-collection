# INCREMENT 25 — User Stories: Difficulty & Freshness

**Status**: **APPROVED 2026-08-08**
**Date**: 2026-08-08
**Source**: `increment25-difficulty-refresh-requirements.md` (APPROVED 2026-08-08, FR1–FR20 / NFR1–12)
**Personas**: reuses `personas.md` (P0 parent, P1 age 4, P2 age 7, P3 age 9) — **no new persona**
**Format**: As a / I want / so that + Given–When–Then. INVEST-compliant.
**Tags**: `[SEC]` security-sensitive · `[PBT]` property-based test required · `[a11y]` accessibility ·
`[NEW-UI]` the increment's only new child-facing UI

Generated because Q7=A: unlike Increments 23 and 24, this increment **changes the child's journey**
(free choice is removed) and **adds child-facing UI** (bar models).

---

## Persona relevance

| Epic | P0 Parent | P1 (4) | P2 (7) | P3 (9) |
|---|---|---|---|---|
| A — A harder pull | | ● | ● | **●** |
| B — Today's three topics | | | ● | **●** |
| C — Maths that changes shape | | | ● | ● |
| D — Fractions with pictures `[NEW-UI]` | | | ● | ● |
| E — Questions that stay fresh | | | ● | ● |
| F — Parent: history stays readable | **●** | | | |

**P1 (age 4, pre-reader) is deliberately absent from B–E.** Play & Learn is upper-primary and always has
been; the parent definition records read-aloud as **declined** ("pictures alone is sufficient"). Nothing
in this increment changes that, and no downstream stage should read the fractions pictures as a step
toward a pre-reader quiz. P1 is affected by Epic A only, as a puller.

**P3 (age 9) is the sharp edge throughout.** The parent definition notes P3 *"will notice unfair odds or
wrong duplicate handling"* — and is the persona with both the motive and the means to defeat the daily
topic limit (I25-B4).

---

## Epic A — A harder pull (P1/P2/P3) — FR1–FR3

### I25-A1 — Rarer top-tier cards `[PBT]`
**As a** child, **I want** epics and legendaries to be genuinely rare, **so that** pulling one is a story
worth telling.
- Given the pull odds, When many cards are drawn, Then rarities land at approximately 70 common / 21
  rare / 7 epic / 2 legendary per 100. `[PBT]`
- Given a rarity has been rolled, When the card is chosen, Then it is picked **uniformly** from that
  rarity — no bias toward cards I don't already own. `[PBT]`
- Given I pull a card I already own, When it resolves, Then it still stacks as a duplicate exactly as
  before — duplicate handling is unchanged.

### I25-A2 — Easter eggs get harder by the same amount `[PBT]`
**As a** child, **I want** the rare easter-egg offer to follow the same odds as a normal pull, **so
that** the game has one set of rules rather than two.
- Given an easter-egg offer is rolled, When its rarity is chosen, Then it uses the same weights as a
  normal pull. `[PBT]`
- Given the weights change, When either roll runs, Then both change together — there is one constant, not
  two.

### I25-A3 — Sacrifice and pick-tickets are untouched
**As a** child, **I want** my rarity-pick tickets and sacrifices to behave exactly as they did, **so
that** the tickets I already hold are worth what I was told.
- Given I hold a rarity-pick ticket, When I redeem it, Then the outcome is unchanged by this increment.
- Given I sacrifice duplicates, When the result is rolled, Then it is unchanged by this increment.

> **Accepted consequence, not a defect** (vision): a *specific* legendary goes from ~0.125% to ~0.083%
> per pull. Legendary set-completion gets materially longer for all 12 themes. Recorded so it is not
> re-raised as a bug.

---

## Epic B — Today's three topics (P2/P3) — FR7–FR10

### I25-B1 — Three topics, chosen for me
**As a** child, **I want** to be given three topics each day, **so that** I meet the hard ones instead of
picking the three easiest.
- Given I open Play & Learn, When it loads, Then exactly three topics are shown, drawn from the ten.
- Given the three are drawn, When I look at them, Then **at least one is a maths topic**. `[PBT]`
- Given my sibling opens Play & Learn on the same day, When their three are drawn, Then they are drawn
  independently of mine. `[PBT]`
- Given I passed a topic today, When I return to the picker, Then it still shows the existing "earned
  today" ✓ marker.

### I25-B2 — The same three all day `[PBT]`
**As a** child, **I want** my three topics to stay the same until tomorrow, **so that** I can come back
and finish them.
- Given I have seen today's three, When I refresh or reopen the app any number of times, Then the same
  three appear. `[PBT]`
- Given the SGT day rolls over at midnight, When I next open the picker, Then a new three is drawn.
- Given today's three, When tomorrow's three are drawn, Then **none of today's three appears in them**.
  `[PBT]`

### I25-B3 — The other seven are genuinely unavailable
**As a** child, **I want** the day's limit to be real, **so that** the game is the same for me and my
siblings.
- Given a topic is not in today's three, When I navigate directly to its URL, Then I am returned to the
  picker.

### I25-B4 — The limit holds even against the back door `[SEC]`
**As the** system, **I want** the day's three enforced where the child identity is resolved, **so that**
the limit cannot be stepped around by anyone who can open dev tools.
- Given a topic outside today's three, When a quiz is requested for it **directly**, bypassing the
  picker and the page, Then no quiz is built, no offer is signed, and no completion is recorded. `[SEC]`
- Given a topic **inside** today's three, When a quiz is requested for it by any route, Then it is built
  normally.

> This is Finding A. The route redirect (I25-B3) is convenience; **this** story is the boundary. Both
> feature documents specified only I25-B3.

### I25-B5 — Replaying a topic I already passed
**As a** child, **I want** to retake a topic I have already passed today, **so that** I can keep playing
after I have earned my tickets.
- Given I passed a topic today and it is in today's three, When I take it again, Then the quiz runs
  normally and **no ticket is granted**, with the existing friendly "already earned this one today"
  message.
- Given I have earned three tickets today, When I pass a fourth quiz, Then the existing daily-cap message
  shows and no ticket is granted.
- Given replay, When the award is decided, Then **no new award logic runs** — the existing cap behaviour
  is unchanged.

> **Explicitly not in scope** (vision Features OUT): a "topics reset in Xh" countdown. The child is not
> told when the next draw happens.

---

## Epic C — Maths that changes shape (P2/P3) — FR4–FR6

### I25-C1 — The missing number moves `[PBT]`
**As a** child, **I want** times-table questions to ask for different parts of the sum, **so that** I
have to think rather than recite.
- Given a multiplication quiz, When questions are generated, Then they include `a × b = ?`, `a × ? = p`
  and `? × b = p`. `[PBT]`
- Given a division quiz, When questions are generated, Then they include `d ÷ v = ?`, `d ÷ ? = q` and
  `? ÷ v = q`. `[PBT]`
- Given any shape, When the answer is produced, Then it is **computed, never authored**, and is correct.
  `[PBT]`
- Given I answer, When the "why" is shown, Then it reads correctly for that shape — e.g. `7 × ? = 56`
  explains as `7 × 8 = 56`. `[PBT]`
- Given the topic titles say "within 100", When any question is generated, Then that remains true.

### I25-C2 — Number Bonds to 1000 `[PBT]`
**As a** child, **I want** a harder bonds topic, **so that** the trick I learned for 100 is not enough.
- Given the bonds topic, When a question is generated, Then it asks `? + x = 1000` and the computed
  answer satisfies `answer + x = 1000`. `[PBT]`
- Given many questions, When the numbers are drawn, Then they are **mostly arbitrary values in 1–999
  with some rounder ones**, so the topic does not collapse into one repeated trick. `[PBT]`
- Given I open the lesson, When I read it, Then it teaches "ones make 10, tens make 90, **hundreds make
  900**" with a matching worked example.
- Given Number Bonds to 100, When I look for it, Then it is gone — this is a replacement, not an
  addition.

---

## Epic D — Fractions with pictures (P2/P3) — FR11–FR15 `[NEW-UI]`

### I25-D1 — Read a fraction from a picture `[NEW-UI]` `[a11y]`
**As a** child, **I want** to see a shape split into parts, **so that** I can learn what a fraction
actually means instead of memorising symbols.
- Given a "name the fraction" question, When it is shown, Then a **bar model** appears with the prompt —
  a rectangle in equal parts, some of them shaded.
- Given the picture, When I choose my answer, Then the four options are **text** (`3/4`), never pictures.
- Given a bar model, When it is drawn, Then shaded and unshaded parts are distinguishable by **fill**,
  not by hue alone. `[a11y]`
- Given a phone-width screen, When a fraction question is shown, Then the picture and all four answer
  buttons fit without the buttons shrinking below the app's existing tap-target size. `[a11y]`
- Given any fraction question, When its denominator is chosen, Then it is **at most 10** — so the bar
  always divides cleanly.

### I25-D2 — Three fraction skills `[PBT]`
**As a** child, **I want** fractions to cover more than one idea, **so that** the topic teaches
something rather than drilling one trick.
- Given the fractions topic, When questions are generated, Then they draw from: naming a fraction from a
  bar, adding/subtracting with the **same** denominator, and finding a fraction **of** a quantity.
- Given any fraction question, When the answer is produced, Then it is **computed, never authored**.
  `[PBT]`
- Given a "fraction of a quantity" question, When the answer is shown, Then it is a whole number.

### I25-D3 — Wrong answers that look like real mistakes `[PBT]`
**As a** child, **I want** the wrong options to be believable, **so that** I cannot pass by spotting the
odd one out.
- Given a fraction question, When options are built, Then the wrong ones look like mistakes a child
  actually makes — numerator or denominator off by one, the two swapped, or denominators added
  (`1/5 + 3/5 → 4/10`).
- Given a correct answer of `1/2`, When options are built, Then `2/4` can never appear among them —
  equality is judged **by value**, not by how it is spelled. `[PBT]`
- Given any fraction question, When options are shown, Then the correct answer is among them and all four
  are distinct by value. `[PBT]`

### I25-D4 — A fractions lesson
**As a** child, **I want** a short lesson before the fractions quiz, **so that** I know what to do.
- Given I open the fractions topic, When the lesson screen shows, Then it has an intro and a worked
  example, in the same shape as every other topic.
- Given the picker, When topics are counted, Then there are **ten** — four maths, six grammar.

---

## Epic E — Questions that stay fresh (P2/P3) — FR16–FR20

### I25-E1 — I don't get the same grammar question twice
**As a** child, **I want** grammar questions I have not answered before, **so that** I have to work them
out instead of remembering them.
- Given I have answered some questions in a grammar topic, When I take that topic again, Then questions I
  have **not** answered are served first. `[PBT]`
- Given I have answered nearly all of a topic's bank, When fewer than five unseen remain, Then I get all
  the remaining unseen ones plus enough already-seen ones to fill the quiz. `[PBT]`
- Given I have now answered the whole bank, When I take the topic again, Then the memory for **that
  topic** resets and the cycle restarts — I never reach a dead end where everything is seen. `[PBT]`
- Given the reset, When it happens, Then it affects **only that topic**, and only for me — my siblings'
  progress is untouched. `[PBT]`

### I25-E2 — Quitting a quiz costs me nothing
**As a** child, **I want** to be able to abandon a quiz, **so that** closing the tab does not burn
questions I never saw.
- Given I start a quiz, When I leave without submitting, Then **nothing** is recorded as seen.
- Given I submit a quiz, When it is scored, Then exactly the questions I answered are recorded as seen.
- Given the same submission arrives twice, When it is recorded, Then no duplicate is stored.

### I25-E3 — The freshness memory cannot be switched off `[SEC]`
**As the** system, **I want** the record of what was served to come from the signed offer, **so that**
the memory cannot be suppressed by a modified client.
- Given a quiz is built, When the offer is signed, Then it pins the question ids alongside the answer
  keys. `[SEC]`
- Given a submission, When seen-questions are recorded, Then the ids come from the **signed offer**, never
  from anything the client sends. `[SEC]`
- Given the offer, When it is used for scoring, Then the award is still re-scored server-side against the
  signed answer keys — unchanged.

### I25-E4 — Nobody loses a quiz to the deploy
**As a** child, **I want** a quiz I started before an update to still submit, **so that** I do not lose my
attempt.
- Given I started a quiz before the update and submit after it, When the offer is checked, Then it
  verifies and my quiz is scored normally.
- Given such an offer, When it is recorded, Then no seen-questions are stored for it — a one-off,
  affecting only quizzes in flight during the update.

### I25-E5 — Maths freshness comes from generation, not memory
**As the** system, **I want** the seen-question memory scoped to grammar, **so that** it tracks something
meaningful.
- Given a maths quiz is submitted, When it is recorded, Then **no** seen-question rows are written — its
  ids are positional and name a different question every time.
- Given maths topics, When freshness is judged, Then it comes from fresh generation plus the new
  missing-operand shapes (Epic C).

> **Known and accepted for now** (NFR7): at today's bank sizes, unlimited replay reaches repeats within a
> single sitting — after **3** clean attempts for four topics, and only **2** for `conjunctions` and
> `prepositions`, which hold 14 questions rather than 16. This is transitional and closes when the
> authoring PR grows the banks to ~50. Not a defect; do not re-raise it.

---

## Epic F — Parent: history stays readable (P0) — FR6

### I25-F1 — Old quiz history still makes sense
**As a** parent, **I want** past attempts at the retired topic to still read as a topic name, **so that**
the activity view stays useful.
- Given a past attempt at Number Bonds to 100, When I view a child's quiz activity, Then it shows as
  **"Number Bonds to 100 (retired)"**, not a raw id.
- Given the topic was replaced, When history is stored, Then **no historical row is edited or deleted**.
- Given some future id in neither the live nor the retired list, When it is displayed, Then the existing
  raw-id fallback still applies.

### I25-F2 — Nothing the children own is put at risk
**As a** parent, **I want** this update to leave the collections alone, **so that** every pull my children
have made is safe.
- Given the update is applied, When the migration runs, Then it only **adds** a table — no existing table
  is altered and no row is deleted.
- Given before and after the update, When collections are counted, Then the count is identical.

---

## Traceability

| Story | Requirements | Slice |
|---|---|---|
| I25-A1, A3 | FR1, FR3, NFR6 | A |
| I25-A2 | FR2 | A |
| I25-B1, B2 | FR7, FR8 | B |
| I25-B3 | FR9 | B |
| I25-B4 | **FR10** (Finding A) | B |
| I25-B5 | FR10, `decideAward` unchanged | B |
| I25-C1 | FR4 | A |
| I25-C2 | FR5 | A |
| I25-D1 | FR13, FR14 | C |
| I25-D2 | FR11 | C |
| I25-D3 | FR12 | C |
| I25-D4 | FR15 | C |
| I25-E1 | FR20 | D |
| I25-E2 | FR20 (OQ-DR-T1) | D |
| I25-E3 | **FR16** (J1) | D |
| I25-E4 | FR17 (Finding D) | D |
| I25-E5 | FR20 (OQ-DR-T2) | D |
| I25-F1 | FR6 | A |
| I25-F2 | FR18, NFR2 | D |

Every FR is covered by at least one story. FR19 (the Store seam: pg adapter + fake + contract suite) has
no user-facing story — it is an architectural constraint carried by NFR9 and acceptance criterion 23, and
Application Design owns it.

---

## Out of scope for these stories

No story exists — and none should be written — for: a topics-reset countdown, an admin view of seen
questions, read-aloud for P1, duplicate protection in pulls, changing the pass bar or quiz length,
changing the ticket caps, or growing the grammar banks (that is the feature's second PR, per Q6=A).
