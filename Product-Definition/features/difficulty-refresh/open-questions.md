# Open Questions — Difficulty & Freshness

- **Stage**: Join (both roles complete, barrier verified deterministically 2026-08-08)
- **Sources**: `vision-document.md` (Business) + `technical-environment.md` (Technical)
- **Barrier check**: `process-checker.cjs` → `{ business: complete, technical: complete, join: ready }`

## Summary

| | Count |
|---|---|
| Pre-declared during the interviews | 10 (7 business, 3 technical) |
| Resolved inside the approval loops | **10** |
| Raised at the join | **3** (J1–J3) |
| **Open going into AI-DLC** | ~~3~~ → **0** |
| **Closed at Requirements, 2026-08-08** | **3** (J1=a, J2=a, J3=recommended) + 2 new findings |

---

## Resolved during the interviews

Recorded for traceability. None of these need AI-DLC's attention.

| ID | Question | Resolution |
|---|---|---|
| OQ-DR-1 | Do the maths topics need refreshing too? | **Yes** — missing-operand forms (Amendment 3, Q8a) |
| OQ-DR-2 | Fractions: picture or plain text? | **Pictures** — bar models (Amendment 1) |
| OQ-DR-3 | Replacing `number-bonds-100` orphans historical rows | New id + retired-label map; **no migration** (T2d) |
| OQ-DR-4 | Where does seen-question tracking live? | New `quiz_seen_questions` table via `QuizStore` (T1a) |
| OQ-DR-5 | Fraction answers are strings; `options()` is integer-only | Dedicated generator with mistake-shaped distractors (T3a) |
| OQ-DR-6 | Replay: all 10 topics or today's 3? | **Today's 3 only** (Amendment 2) |
| OQ-DR-7 | Bar models + denominators ≤10 were assumed | Confirmed at the approval gate |
| OQ-DR-T1 | Does "seen" mean served or answered? | **Answered** — rows written on submit |
| OQ-DR-T2 | Is seen-tracking meaningful for maths? | **No — grammar only.** Maths ids are positional |
| OQ-DR-T3 | Grammar ids become durable identifiers | Confirmed as an invariant in "What Must NOT Change" |

---

## Contradictions and gaps found at the join

### ✅ J1 — **CLOSED (a)** 2026-08-08: the seen-tracking design cannot be implemented as specified

**The technical document says** seen-rows are written on **submit**, not when the offer is minted
(OQ-DR-T1), so an abandoned quiz burns nothing.

**The code says that is not currently possible.** Reading `quiz-offer.ts` and `actions.ts`:

```ts
export interface QuizOfferPayload extends SignedPayload {
  childId: string;
  topic: string;
  answers: string[];   // correct option per served question, in order
  exp: number;
}
```

```ts
submitQuizAction(offer: string, picks: string[])
```

**Neither the signed offer nor the submission carries question ids.** By the time `submitQuiz` runs,
the server knows *which answers were correct* but not *which questions were asked*. There is nothing to
write a seen-row against.

Three ways out, and the choice has a security dimension:

| Option | Consequence |
|---|---|
| **(a) Add `questionIds: string[]` to the signed offer payload** | Server-authoritative and tamper-proof — a child cannot strip the ids to dodge seen-tracking. Touches `QuizOfferPayload`, `isQuizOfferPayload`, and `buildQuiz`. **Recommended.** |
| (b) Have the client send the ids alongside `picks` | Forgeable. A modified client could suppress seen-tracking and keep the bank fresh forever — small stakes, but it puts an integrity hole in a path that is otherwise carefully server-authoritative |
| (c) Write seen-rows at `buildQuiz` after all | Contradicts the approved OQ-DR-T1 resolution and reintroduces the abandoned-quiz burn |

**Recommendation: (a).** It preserves the approved semantics and keeps the offer the single
server-authoritative record of what was served. Note it slightly enlarges every offer token (5 short
ids), which is inert — the token is already carrying 5 answer strings.

### ✅ J2 — **CLOSED (a), accepted** 2026-08-08: ticket-free replay undercuts the anti-memorisation fix at today's bank size

Two approved decisions collide, and the arithmetic matters.

- **Amendment 2** (business): after passing, a child may **replay today's 3 topics freely**, ticket-free.
- **T1-i** (technical): when a topic's bank is exhausted, **reset that child's seen-set** for it.
- **T7 / D6** (technical): ship the code now; author the ~200 new questions later. The stated rationale
  is that *"seen-question tracking delivers most of its value at today's bank size."*

At today's bank size, with `QUIZ_LENGTH = 5` and ~16 questions per grammar topic:

| Attempt | Unseen served | Unseen left |
|---|---|---|
| 1 | 5 | 11 |
| 2 | 5 | 6 |
| 3 | 5 | 1 |
| 4 | 1 + **4 repeats** | 0 → **reset** |

**Three clean attempts, then the cycle restarts.** If a child only takes a topic on the day it is drawn,
a given grammar topic surfaces roughly every 3 days (3 of 10 drawn daily), so three clean attempts is
~10 days of freshness — the rationale holds.

**But unlimited replay collapses that to a single sitting.** A keen child can take the same topic four
times in one afternoon and be back to repeats the same day. The two decisions were made in separate
interviews and neither anticipated the other.

At the target bank size (~50) the same arithmetic gives **10 clean attempts**, which absorbs replay
comfortably. So this is specifically a **transitional** problem created by the T7 code/content split.

Options:

| Option | Consequence |
|---|---|
| **(a) Accept it, and sequence the authoring soon after** | Nothing to build. The gap is real but temporary, and the children's own behaviour (replaying a topic four times in one sitting) is not the common case |
| (b) Author the six banks up to ~30 before shipping the code | Halves the follow-up but reintroduces the long-pole content work T7 deliberately split out |
| (c) Cap replays per topic per day (e.g. 3) | New rule, new state, and it partially re-imposes the friction Amendment 2 removed |
| (d) Don't reset on exhaustion — serve least-recently-seen instead | Removes the cliff entirely and is arguably the better design at any bank size, but contradicts the approved T1-i |

**Recommendation: (a), with the arithmetic recorded** so nobody is surprised — and revisit (d) if the
authoring follow-up slips. The claim in D6 should be **restated more precisely**: seen-tracking
delivers most of its value at today's bank size *for the once-a-day path*, not under heavy replay.

### ✅ J3 — **CLOSED** 2026-08-08: the vision's scope list and the technical delivery plan disagree

`vision-document.md` lists **11 items IN the MVP**, including item 10: *"Grow six grammar banks to
40–50 each — ~150–200 authored questions. The largest single piece of work."*

`technical-environment.md` D6 puts that item in a **separate follow-up**, not this increment.

Both were approved, on different days, and neither references the other. Not a design conflict — a
bookkeeping one — but AI-DLC will read the vision's IN list as the increment's definition of done and
will be wrong.

**Recommendation:** treat the vision's item 10 as **IN scope for the feature, delivered in a second
PR**. The increment is "done" when items 1–9 and 11 ship; the feature is done when the banks are grown.
Say which one "Increment 25" names before construction starts.

---

## Cross-checks that passed

Verified at the join; no action needed.

| Check | Result |
|---|---|
| "≥1 maths topic per day" can never be starved | **PASS** — 4 maths topics, at most 3 excluded as yesterday's |
| Daily ticket caps still fit the new daily-3 design | **PASS** — 3 topics × 1 ticket = the existing cap of 3. No cap change needed |
| Ticket-free replay needs new logic | **PASS — none needed.** `decideAward` already returns `topic-done` / `daily-cap` without granting |
| The picture crosses the signed-offer boundary | **PASS** — it does not. The offer signs `answers`; the picture is presentation only |
| Seen-tracking growth is bounded | **PASS** — ~900 rows at saturation, capped by bank size. Resolves the vision's "unbounded growth" risk |
| The new odds reach the easter-egg roll | **PASS** — same constant, by design (Q2a) |
| Rarity change breaks an existing test | **PASS (known)** — `tests/pick-tickets.test.ts:44`, to be rewritten to derive its bands |
| `$0/month` survives | **PASS** — no new dependencies, no new service, one small table |
| Vision says "track which questions each child has seen"; technical scopes it to grammar | **Narrowing, not a conflict** — maths ids are positional, so tracking them is meaningless. The vision's wording is broader than the mechanism supports; read it as grammar-only |

---

## Accepted consequences, not open questions

Recorded so they are not re-derived as problems later.

- **No success metric**, by explicit decision (Q7) — the same stance the vehicle-themes increment took.
- **A specific legendary goes from ~0.125% to ~0.083% per pull.** Legendary set-completion gets
  materially longer for all 12 themes.
- **Ticket earning may drop.** A child could previously pick the three easiest topics; now at least one
  maths topic is forced daily. Caps are unchanged, but hitting them is harder.
- **Old `quiz_completions` rows keep the retired topic id** and render as "Number Bonds to 100
  (retired)". History is deliberately not rewritten.
- **The increment leans on unenforced tests.** The parent definition's **OQ-T-2** (PBT/CI gate declared
  but not enforced) is inherited unchanged, and this increment adds six new test obligations — including
  fraction correctness, which reaches a child directly. This increment does not close OQ-T-2, and the
  exposure is now larger than when it was first raised.

---

## Priority going into AI-DLC

1. **J1** — a blocking design gap: the approved seen-tracking semantics cannot be built without
   changing the signed offer. Decide before any implementation.
2. **J3** — cheap to settle and it defines "done" for the increment.
3. **J2** — no action needed to start; record the arithmetic and revisit if the authoring follow-up
   slips.


---

## Resolution — closed at Requirements Analysis, 2026-08-08

Increment 25 shipped (PR #15). All three join questions are closed, and the join itself missed two
things that only appeared when the code was read.

| ID | Resolution |
|---|---|
| **J1** | **(a)** — `questionIds` joins the signed offer payload. Confirmed against the code first: `QuizOfferPayload` was `{childId, topic, answers, exp}` and submit was `(offer, picks)`, so the server genuinely could not name what it served. Guard treats the field as optional so a quiz begun before the deploy still submits |
| **J2** | **(a)** — accepted, with the arithmetic recorded. **Sharpened**: `conjunctions` and `prepositions` hold **14** questions, not ~16, so they give **two** clean attempts before repeats, not three. Confirmed by observation against a real database, not by argument |
| **J3** | Increment 25 = vision items 1–9 and 11. Item 10 (~150–200 authored questions) is in scope for the **feature**, delivered in a second PR |

### Two contradictions the join did not catch

**Finding A — the daily-three gate was specified in the wrong place.** Both documents put enforcement on
the route, reasoning correctly that hiding topics in the picker is not enforcement because the URL is
navigable — then stopped one step short. `startQuizAction` is a Server Action: a directly invocable POST
taking the topic id from the client, so a page redirect is bypassed exactly as a picker is. The gate now
sits in `buildQuiz`. **This strengthens D5/T5-i rather than implementing it.**

**Finding B — D1's schema could not perform D1's own reset.** `(child_id, question_id, seen_at)` does not
say which topic a question belongs to, so the approved per-topic exhaustion reset was not expressible;
the `vt-`/`pp-` prefixes are a naming habit, not data. A `topic` column was added. It also dissolves a
hazard nobody had noticed: a global key silently requires grammar ids to be unique across **all six**
banks — true today only by convention, tested nowhere, and precisely what the ~200-question authoring
follow-up would have broken, silently merging two children's seen-sets. **This corrects D1.**

### And one the design got wrong, caught by a property test

`D5`'s recipe — *"'exclude yesterday's' comes free — call the same function with `sgtDayKey - 1`"* — does
not terminate: day D needs D−1, needs D−2, with no anchor. The first implementation hid the recursion one
level down and failed on the property test's first run, repeating a grammar topic across a cycle
boundary. Non-repetition is now structural. The outcome D5 wanted is preserved in full; its recipe is not.
