# INCREMENT 25 — Requirements: Difficulty & Freshness

**Status**: **APPROVED 2026-08-08** — including the Finding A and Finding B strengthenings (§Gate)
**Date**: 2026-08-08
**Type**: Constant change + 3 new/rewritten generators + 1 new pure module + 1 new table + 1 new component
**Cadence**: MEDIUM (single increment, four slices)
**Schema impact**: **one migration** — `quiz_seen_questions` (new table, additive). No existing table altered
**Source**: `Product-Definition/features/difficulty-refresh/` (aidlc-discovery, both roles approved
2026-08-08; Join raised J1–J3).
Parent `Product-Definition/{vision-document,technical-environment}.md` (2026-08-03) **not superseded**.
**Answers**: Q1=A, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A, Q8=A
(`increment25-difficulty-refresh-questions.md`)
**Open questions**: **J1 CLOSED** by Q1=A + Q2=A. **J2 CLOSED (accepted)** by Q5=A. **J3 CLOSED** by
Q6=A. New Findings **A** and **B** closed by Q3=A and Q4=A. Parent **OQ-T-2** (no test CI) and
**OQ-CS-3** remain open and are untouched here.

---

## 1. Intent Analysis

| | |
|---|---|
| **Request type** | Economy re-tuning (1 constant) + quiz content/difficulty overhaul (4 areas) |
| **Scope** | `src/lib/types.ts`, `src/features/quiz/{types,topics,math-gen,quiz-service,quiz-offer,QuizFlow}.ts(x)`, NEW `daily-topics.ts` + fraction generator + bar-model component, `src/db/schema.ts` + one migration, `src/db/stores/quiz-store{,.pg,.fake}.ts`, `app/play/learn/{page,[topicId]/page}.tsx`, 4 existing test files rewritten, 6 new test obligations |
| **Complexity** | Moderate. First increment since Inc 19 to touch the **signed-offer payload**, and the first to add a table since Inc 11. One new child-facing UI |
| **User Stories** | **GENERATED** (Q7=A) — unlike Inc 23/24, the child's journey changes (free choice removed) and a new child-facing UI appears (bar models) |
| **Slices** | **A** economy + maths shapes · **B** daily three + gating · **C** fractions + pictures · **D** seen-tracking |

**Scope boundary**: the vision's *MVP Scope — Features IN* table, 11 items. All 13 *Features OUT* rows
stay out. Three "What Must NOT Change" sections bind — the parent vision's, the parent technical
environment's, and this feature's (including the new grammar-id durability invariant, OQ-DR-T3).

### Scope-item → requirement map

| # | Vision scope item | Requirements | Slice |
|---|---|---|---|
| 1 | `RARITY_WEIGHTS` → 70/21/7/2 | FR1, FR3 | A |
| 2 | Verify the easter-egg roll inherits it | FR2 | A |
| 7 | Missing-operand forms for × and ÷ | FR4 | A |
| 6 | Replace `number-bonds-100` with `number-bonds-1000` | FR5, FR6 | A |
| 8 | Daily topic selection: 3 per child, ≥1 maths, ex-yesterday, SGT | FR7 | B |
| 9 | `/play/learn` shows only today's 3; the route rejects others | FR8, FR9, **FR10** | B |
| 3 | Fractions generator: three skills, denominators ≤10 | FR11, FR12 | C |
| 4 | Bar-model picture rendering in quiz prompts | FR13, FR14 | C |
| 5 | Fractions lesson text | FR15 | C |
| 11 | Per-child seen-question tracking, preferring unseen | FR16–FR20 | D |
| 10 | Grow six grammar banks to 40–50 each | **Deferred to the feature's second PR** (Q6=A) — see §10 | — |

---

## 2. Grounding

Full grounding, with file:line evidence for every claim, is in
`increment25-difficulty-refresh-questions.md` §2. The load-bearing results:

- **J1 confirmed in code.** `QuizOfferPayload` is `{childId, topic, answers, exp}` `[quiz-offer.ts:14-19]`
  and submit is `(offer, picks)` `[actions.ts:14-17]`. The server genuinely cannot name the questions it
  served. → FR16.
- **Finding A** — `startQuizAction(topicId)` `[actions.ts:9-11]` is a Server Action, so a route-level
  gate is not a boundary. → FR10 (Q3=A).
- **Finding B** — `(child_id, question_id, seen_at)` cannot express the approved per-topic reset; the
  `vt-`/`pp-`/… prefixes are convention, not data. → FR18 adds `topic` (Q4=A).
- **Finding C** — actual bank sizes are 16/16/16/**14**/**14**/16, so two topics give **two** clean
  attempts before repeats, not three. → recorded in NFR7 (Q5=A).
- **Finding D** — a required `questionIds` in `isQuizOfferPayload` `[quiz-offer.ts:21-29]` would fail
  every in-flight offer for up to `OFFER_TTL_MS` = 10 min. → FR17 (Q2=A).
- **Confirmed no-change**: `decideAward` `[cap.ts:20-30]` already declines without granting, so
  ticket-free replay needs **no new logic**; `sgtDayKey` `[cap.ts:10-12]` is integer-keyed, so
  "yesterday" is `sgtDayKey - 1`; `getTopic(r.topic)?.title ?? r.topic` `[quiz-service.ts:144]` is the
  seam the retired-id map plugs into.

---

## 3. Functional Requirements — Slice A: economy and maths shapes

### FR1 — `RARITY_WEIGHTS` → 70 / 21 / 7 / 2 *(scope item 1)*

`src/lib/types.ts` sets common 70, rare 21, epic 7, legendary 2. The map stays **one exported constant
summing to 100**. No call site changes: `drawCard` `[logic.ts:34,40]` and `rollWeightedRarity`
`[easter-egg.ts:19,22]` both derive their total and bands from it.

Uniform picking within a rarity is unchanged. **No duplicate protection and no unowned-bias is
introduced** — offered as vision Q1(d) and declined.

### FR2 — The easter-egg roll inherits the new odds *(scope item 2)*

No code change. This requirement is a **verification obligation**: confirm by reading and by test that
`rollWeightedRarity` consumes `RARITY_WEIGHTS` and therefore hardens by exactly the same amount. The
vision requires this be *confirmed, not assumed*.

Sacrifice and rarity-pick tickets never consulted the weights and stay untouched.

### FR3 — Rewrite the band test to derive from the constant *(T6)*

`tests/pick-tickets.test.ts:44` — *"maps the weight bands to the right tier (60/25/12/3)"* — hardcodes
the cumulative boundaries `0.6 / 0.85 / 0.97` and **will fail**. It is rewritten to compute the
cumulative bands from `RARITY_WEIGHTS` and assert each tier at its own boundaries, so the next tuning
does not break it.

Restating a constant is not a check of it. `tests/logic.pbt.test.ts:78` already reads the constant and
needs no change.

### FR4 — Missing-operand forms for × and ÷ *(scope item 7)*

`multiplication-within-100` and `division-within-100` keep their ids and titles — ranges stay 2–10, so
"within 100" stays true — and each gains three further shapes alongside the retained forward form:

| Topic | Shapes |
|---|---|
| Multiplication | `a × b = ?` · `a × ? = p` · `? × b = p` |
| Division | `d ÷ v = ?` · `d ÷ ? = q` · `? ÷ v = q` |

- The answer is **computed, never authored**, in every shape — the `math-gen.ts` invariant.
- The existing explanation derivation `prompt.replace("?", String(answer))` `[math-gen.ts:36]` already
  produces a correct "why" for each new shape (`"7 × ? = 56"` → `"7 × 8 = 56"`). It is **not** changed;
  a test asserts it reads correctly for every shape.
- `options()` `[math-gen.ts:14-25]` is untouched: every answer here is still a non-negative integer.

**Out**: wider ranges (2–12), remainders, two-step questions, word problems (vision Q8 chose (a) alone).

### FR5 — `number-bonds-1000` replaces `number-bonds-100` *(scope item 6)*

A **replacement, not an addition**. The old topic id disappears from `TOPICS` and from `GENERATORS`.

| | |
|---|---|
| **Id** | `number-bonds-1000` |
| **Form** | `? + x = 1000` |
| **Number mix** | Mostly arbitrary values in 1–999, **with some rounder ones** (vision Q4-iv) — so it does not degrade into the same sum with bigger digits |
| **Lesson** | **Rewritten**: "ones make 10, tens make 90" becomes "ones make 10, tens make 90, hundreds make 900", with a matching worked example |
| **Title** | "Number Bonds to 1000" |

`tests/quiz-math-gen.pbt.test.ts:5-8,83-92` names the old id in its topic list and in a dedicated
property; both are retargeted.

### FR6 — Retired topic ids render as names, and history is never rewritten *(D2, OQ-DR-3)*

**No data migration.** Historical `quiz_completions` rows keep `number-bonds-100` untouched.

A retired-id → display-name map renders such a row as **"Number Bonds to 100 (retired)"** in the admin
activity view, replacing today's raw-id fallback at `[quiz-service.ts:144]`. The fallback to the raw id
stays as the last resort for an id in neither map.

Rewriting children's history to claim attempts at a quiz that did not exist when they were taken is
explicitly rejected — it runs against this repo's Increment 23 posture.

---

## 4. Functional Requirements — Slice B: the daily three

### FR7 — `daily-topics.ts`: a pure, derived selection *(scope item 8; D5)*

A new pure module `src/features/quiz/daily-topics.ts`, beside `cap.ts` which already does this kind of
pure SGT-day reasoning. **No table, no migration, no write on a read path, no two-tab race.**

A function of `(childId, sgtDayKey)` returning exactly three topic ids, satisfying:

| Property | Requirement |
|---|---|
| **Deterministic** | The same `(childId, dayKey)` always yields the same three. A refresh cannot reroll into easier topics — this is the property that makes item 4 actually remove free choice |
| **Count** | Exactly 3, distinct, drawn from the 10 |
| **Subject mix** | **At least one maths topic**, every day |
| **Per child** | Different children get independent draws; no copying between siblings |
| **Excludes yesterday** | None of `dailyTopics(childId, dayKey - 1)` appears — which comes free from the same function |
| **Reset** | Midnight SGT, via the existing `sgtDayKey` |

Determinism must come from a **pure hash of `(childId, dayKey)`** seeding the existing injected-`rng`
convention — not from `Math.random`, and not from any stored state.

**Feasibility, re-verified**: the ≥1-maths guarantee cannot be starved. There are 4 maths topics after
FR5 + FR15, and at most 3 are excluded as yesterday's, so at least one is always eligible — worst case
(yesterday's three were all maths) still leaves one.

### FR8 — The picker shows only today's three *(scope item 9)*

`app/play/learn/page.tsx` lists the three topics from FR7 instead of all of `TOPICS` `[page.tsx:37]`.
The existing "earned today" ✓ from `topicsAwardedToday` is retained per topic.

Grouping by subject is retained where it still reads well with three items; presentation detail is
Application Design's call.

### FR9 — The topic route rejects a topic outside today's three *(scope item 9; T5-i)*

`app/play/learn/[topicId]/page.tsx` redirects to `/play/learn` for a topic that is valid but **not in
today's three**, in addition to today's redirect for an unknown topic `[page.tsx:15]`.

Hiding the other seven in the picker is not enforcement — the URL is navigable.

### FR10 — The gate is enforced in `buildQuiz` *(Finding A, Q3=A)*

`buildQuiz` declines a topic that is not in the child's three for the current SGT day, using the
**server-resolved `childId`** it already receives.

FR9's redirect is **UX**; FR10 is the boundary. `startQuizAction(topicId)` `[actions.ts:9-11]` is a
Server Action — a directly invocable POST endpoint taking the topic id from the client — so a page-level
check is bypassed by calling the action, exactly as a picker-level check is bypassed by typing the URL.

This follows the parent technical environment's standing rule (*"middleware gates, **and** pages
re-check … never rely on middleware alone"*) and its prohibited pattern *"don't trust a client-supplied
identity"*, of which a client-supplied topic id is the same shape. Item 4 of the vision — removing free
choice — is precisely the thing an optimising child has a motive to defeat.

Replay of an already-passed topic **within today's three stays allowed and ticket-free**: FR10 gates on
topic membership only, never on completion. No new award logic is written — `decideAward` already
returns `topic-done` / `daily-cap` without granting `[cap.ts:20-30]`.

---

## 5. Functional Requirements — Slice C: fractions and pictures

### FR11 — A dedicated fraction generator *(scope item 3; D3)*

One new topic, `subject: "math"` (it must be — the ≥1-maths guarantee counts it), drawing from three
skills:

| Skill | Example | Answer type |
|---|---|---|
| Name the fraction | a bar in 4 equal parts, 3 shaded → `3/4` | string |
| Add / subtract, same denominator | `1/5 + 3/5 = ?` | string |
| Fraction of a quantity | `1/4 of 20 = ?` | integer |

- Answers are modelled internally as `{ num, den }` and formatted to a string at the end.
- **Denominators ≤ 10** — halves, thirds, quarters, fifths, sixths, eighths and tenths draw cleanly as
  bar models; sevenths and ninths do not.
- Answers are **computed, never authored** — the `math-gen.ts` invariant, which the fraction generator
  is explicitly bound by.
- `options()` in `math-gen.ts` stays **untouched** and keeps serving the integer topics, including
  *fraction of a quantity*, whose answer is an integer.

**Out**: equivalent fractions, comparison, and simplifying — deferred to a possible harder fractions
topic later.

### FR12 — Mistake-shaped distractors, compared by value *(OQ-DR-5)*

Distractors are built from **the mistakes children actually make**: numerator ±1, denominator ±1,
numerator and denominator swapped, denominators added (`1/5 + 3/5 → 4/10`).

Equality is checked by **cross-multiplication, never string comparison**, so `2/4` can never be offered
as a distractor against a correct answer of `1/2`. Options are distinct **by value**, and the correct
answer is always among them.

### FR13 — `visual`: a structured field, not markup *(D4)*

`QuizQuestion` gains an optional field:

```ts
visual?: { kind: "bar"; parts: number; shaded: number }
```

- Generators stay pure and property-testable — a test asserts `{ parts: 4, shaded: 3 }` with no DOM.
- **No `dangerouslySetInnerHTML` on a child-facing screen.** An SVG-string-in-the-prompt approach was
  considered and rejected as a correctness and safety regression for a small saving.
- The field is **optional**, so the nine existing topics are unaffected.

### FR14 — Bar-model rendering in the quiz prompt *(scope item 4)*

A small React component draws an inline **SVG bar model** — a rectangle divided into `parts` equal
segments with `shaded` of them filled. **No new dependency.** `QuizFlow` renders it above the prompt
when `visual` is present `[QuizFlow.tsx:120]`, and is otherwise unchanged.

- **Bar models only** — not circles, not groups of objects.
- **Answers stay text** (vision Q9-i = C): reading a fraction *from* a picture is the skill being
  taught, and four images per question is too much on a phone. Only the prompt area grows.
- Must work in the existing `QuizFlow` layout at phone width, honouring the parent definition's
  large-tap-target and `prefers-reduced-motion` posture.

**The picture does not cross the signed-offer boundary.** The offer signs `answers` (and, after FR16,
`questionIds`); the picture is presentation only, and the signed answer key remains the authority for
scoring.

### FR15 — The fractions topic and its lesson *(scope item 5)*

A tenth entry in `TOPICS` with `subject: "math"`, a title, and a `lesson` of `intro` + `example`
matching the existing `Topic` shape `[types.ts:24-34]`.

**Roster after this increment: 10 topics — 4 maths, 6 grammar.**
`tests/quiz-bank.test.ts:32-34` asserts 9 / 3 / 6 and is updated to 10 / 4 / 6.

---

## 6. Functional Requirements — Slice D: seen-question tracking

### FR16 — `questionIds` joins the signed offer *(J1 CLOSED, Q1=A)*

`QuizOfferPayload` gains `questionIds: string[]`, parallel to `answers` and in the same served order:

```ts
export interface QuizOfferPayload extends SignedPayload {
  childId: string;
  topic: string;
  answers: string[];      // correct option per served question, in order
  questionIds: string[];  // NEW — the question ids served, same order
  exp: number;
}
```

`buildQuiz` populates it; `isQuizOfferPayload` validates it; `submitQuiz` reads it. The offer remains
the single server-authoritative record of what was served, so **a child cannot strip the ids to dodge
seen-tracking**. The token grows by five short ids — inert; it already carries five answer strings.

Options (b) *client sends the ids* and (c) *write rows at `buildQuiz`* were considered and declined: (b)
is forgeable and would put an integrity hole in the one path this repo keeps strictly
server-authoritative; (c) contradicts the approved OQ-DR-T1 and reintroduces the abandoned-quiz burn.

### FR17 — The guard tolerates a pre-deploy offer *(Finding D, Q2=A)*

`isQuizOfferPayload` treats `questionIds` as **optional**; a payload without it verifies, and
`submitQuiz` records **no seen-rows** for that submission.

Without this, every offer minted before the deploy fails on submit — a child mid-quiz at deploy time
loses that attempt to *"invalid or expired offer"* `[quiz-service.ts:86]` for up to `OFFER_TTL_MS` = 10
minutes `[quiz-service.ts:19]`. The tolerance is inert thereafter; every newly minted offer always
carries the ids.

### FR18 — `quiz_seen_questions` *(scope item 11; D1, Finding B, Q4=A)*

One new table, one migration, additive:

```
quiz_seen_questions (child_id, topic, question_id, seen_at)
  UNIQUE (child_id, topic, question_id)
  FK child_id → children(id) ON DELETE CASCADE      -- matches quiz_completions
```

`topic` is present so the per-topic exhaustion reset (FR20) is a single scoped `DELETE`. It also removes
the global-id-collision hazard: with `topic` in the key, grammar ids need only be unique **within** a
bank — which `tests/quiz-bank.test.ts:19-25` already asserts — rather than globally across all six,
which holds today only by prefix convention and has no test. The ~150–200-question authoring follow-up
is exactly where a cross-bank collision would otherwise be introduced, and it would silently merge two
topics' seen-sets.

- **Bounded by construction**: 6 grammar topics × ~50 questions × 3 children ≈ **900 rows** at
  saturation. Growth is capped by the size of the authored banks, so no pruning is needed. This
  **resolves the vision's "unbounded growth" risk** — it is not deferred, it is dissolved.
- No existing table is altered. Migrations 0000–0006 are never edited, only added to.

### FR19 — Seen-tracking reaches the database through `QuizStore` *(D1)*

The new persistence is **a method (or methods) on the existing `QuizStore` port**, not a new port — same
aggregate, same lifecycle.

**Full seam treatment, no exception**: pg adapter + in-memory fake + an extension to
`tests/contracts/quiz-store-contract.ts` so both adapters are proven to agree. This is the parent
technical environment's hard constraint — *"every persistence path goes through a Store port with a pg
adapter, an in-memory fake, and a contract suite"* — and the new method is not an exception.

The port needs to support: reading a child's seen ids for a topic, recording ids as seen idempotently,
and clearing a child's seen-set for one topic. The exact method decomposition is Application Design's
call; that it goes through the port with both adapters and a contract spec is the requirement.

### FR20 — Unseen-preferring selection, and the exhaustion cycle *(scope item 11)*

**Grammar only** (OQ-DR-T2). `math-gen.ts` ids are positional — `` `${topicId}-${i}` `` `[math-gen.ts:86]`
— so the same id names a different question every attempt and tracking it would be meaningless. Maths
gets its freshness from generation plus FR4's missing-operand forms. Reading the vision's broader
wording as grammar-only is a **narrowing, not a conflict**.

**At `buildQuiz`** (no write on the read path):

- `unseen = bank − seen(child, topic)`.
- If `|unseen| ≥ QUIZ_LENGTH`, sample the five from `unseen`.
- Otherwise serve all of `unseen` and fill the remainder from the seen set.
- Option shuffling per question `[quiz-service.ts:27]` is retained; the five served questions are
  distinct, as `sample` already guarantees.

**At `submitQuiz`** — where *"seen" means **answered**, not served* (OQ-DR-T1), so abandoning a quiz
burns nothing:

- Record the offer's `questionIds` as seen for `(child, topic)`.
- **Exhaustion cycle**: if recording them would make the child's seen-set cover the entire bank, clear
  that `(child, topic)` seen-set **first**, then record the five just served. The seen-set becomes those
  five and the cycle restarts with `bank − 5` unseen, rather than reaching a degenerate
  "everything is seen" state.
- Recording is **idempotent** — a replayed offer re-inserts the same rows, which the UNIQUE constraint
  absorbs.

Keeping every write at submit means no write ever happens on a read path, consistent with FR7's
same posture for daily topics.

---

## 7. Non-Functional Requirements

**NFR1 — $0/month, strictly.** No new dependency (inline SVG needs no library; seen-tracking uses the
existing Drizzle/Neon stack; daily-topic selection is pure TypeScript). No new service. One small,
bounded table (~900 rows at saturation).

**NFR2 — Zero risk to the children's data.** Nothing in this increment writes to `collections`. The one
migration is purely additive — a new table, no ALTER of `quiz_completions`, `children`, `cards`,
`themes` or `collections`. All existing CHECK constraints and atomicity contracts are untouched.

**NFR3 — `quiz_completions` history is never rewritten.** FR6 exists specifically to avoid it. No row is
deleted, and no `topic` value is updated.

**NFR4 — The signed offer remains the authority for scoring.** FR16 *adds* to the payload; it does not
move any award decision to the client. Client-side answer keys continue to drive immediate feedback only
`[types.ts:5-11]`, and the award is still re-scored server-side.

**NFR5 — Answers are computed, never authored, in every maths generator** — including the fraction one
(FR11) and every new missing-operand shape (FR4). This is the property that makes a generated answer key
trustworthy for a child.

**NFR6 — `RARITY_WEIGHTS` sums to 100** and stays a single constant shared with the easter-egg roll.
Uniform picking within a rarity is preserved; no duplicate protection is introduced. Adding one silently
would change the economy in a way the user explicitly declined.

**NFR7 — The transitional replay gap is accepted and recorded** (J2, Q5=A). At today's bank sizes,
ticket-free replay lets a keen child reach repeats in a single sitting:

| Bank | Topics | Clean attempts before the first repeat |
|---|---|---|
| 16 | verb-tenses, pronouns-vs-proper-nouns, adjectives-vs-adverbs, subject-verb-agreement | **3** |
| **14** | **conjunctions, prepositions** | **2** |

D6's rationale is restated precisely: seen-tracking delivers most of its value at today's bank size
**for the once-a-day path** — where a topic surfaces roughly every 3 days, giving ~10 days of freshness
— **not under heavy replay**. At the target bank size (~50) the same arithmetic gives ~10 clean
attempts, which absorbs replay comfortably. The gap is therefore **transitional**, created by the
code/content split (Q6=A), and closes when the authoring PR lands. Revisit least-recently-seen serving
(Join option (d)) if that follow-up slips.

**NFR8 — Determinism.** The daily three must not reroll on refresh and must be reproducible in tests
(FR7). Every generator takes an injected `rng` per the existing convention `[rng.ts]`, so all of Slice A
and Slice C is property-testable without a database.

**NFR9 — The persistence seam is not bypassed.** No feature service imports the `db` singleton; the new
operation becomes a port method with two implementations and a contract spec, never an inline query.
Pure logic modules (`daily-topics.ts`, the fraction generator) take no `db` import.

**NFR10 — Kid-safety.** No unreviewed content path to a child. The bar-model SVG is generated from
`{parts, shaded}` integers computed by a pure generator — no markup from data, no
`dangerouslySetInnerHTML`, no runtime generation call. The authored fractions lesson text (FR15) is
parent-reviewed like any other authored content.

**NFR11 — No success metrics.** By explicit decision (vision Q7), the same stance Increment 24 took.
Downstream stages must **not** re-derive this as a gap. The nearest thing to a check is informal: the
children should stop saying they have seen a question before.

**NFR12 — Enforcement caveat (parent OQ-T-2).** There is still no test or lint CI —
`.github/workflows/` holds `backup.yml` only. This increment adds **six** new test obligations,
including fraction correctness, which reaches a child directly. Every one of them runs only when invoked
locally. This increment does **not** close OQ-T-2, and the exposure is now larger than when it was first
raised.

---

## 8. Test Obligations

Beyond FR3's rewrite, the mandatory new coverage (T6):

| Area | Properties |
|---|---|
| Fraction generator | Answer always among options; options distinct **by value**; no distractor equal to the answer under cross-multiplication; denominators ≤ 10 |
| Bonds to 1000 | Computed answer always correct (`answer + x = 1000`); the number mix behaves as specified |
| Missing-operand × and ÷ | Every shape's answer is correct; the derived `explanation` reads correctly for each shape |
| Daily topics | Deterministic for a given `(child, day)`; always exactly 3, distinct; always ≥1 maths; never any of yesterday's |
| Seen-question preference | Unseen served first until exhausted, then the cycle resets to the five just served |
| `QuizStore` | Contract-suite extension for the new method(s) — pg and fake must agree |

Following the repo's PBT convention: named arbitrary helpers rather than inline generators, per
`tests/sacrifice.pbt.test.ts`.

**Four existing tests break and are correct to break** — none is a defect:
`tests/pick-tickets.test.ts:44` (FR3), `tests/quiz-bank.test.ts:32-34` (FR15),
`tests/quiz-math-gen.pbt.test.ts:5-8,83-92` (FR5), and `tests/quiz-service.test.ts` (re-check once FR10's
gate lands in the service).

---

## 9. Acceptance Criteria

**Slice A — economy and maths shapes**

1. `RARITY_WEIGHTS` is `{common:70, rare:21, epic:7, legendary:2}`, sums to 100, and remains one exported
   constant (FR1, NFR6).
2. `drawCard` and `rollWeightedRarity` both reflect the new odds with **no call-site change**, confirmed
   by reading and by test (FR1, FR2).
3. `tests/pick-tickets.test.ts` derives its cumulative bands from `RARITY_WEIGHTS` and passes; it
   contains no hardcoded `0.6 / 0.85 / 0.97` (FR3).
4. Both maths topics generate all four shapes; every answer is computed and correct, and each shape's
   derived `explanation` reads correctly (FR4, NFR5).
5. `number-bonds-100` appears in no `TOPICS` entry and no `GENERATORS` key; `number-bonds-1000` generates
   `? + x = 1000` with the specified number mix and a rewritten lesson (FR5).
6. A historical `quiz_completions` row with `topic = "number-bonds-100"` renders as
   *"Number Bonds to 100 (retired)"* in the admin activity view, and **no such row was updated or
   deleted** (FR6, NFR3).

**Slice B — the daily three**

7. `dailyTopics(childId, dayKey)` returns the same three ids on every call for the same arguments (FR7,
   NFR8).
8. It always returns exactly 3 distinct topics, always including ≥1 maths, never including any of
   `dailyTopics(childId, dayKey - 1)` — asserted as properties over generated child ids and days (FR7).
9. Two different child ids draw independently on the same day (FR7).
10. `/play/learn` lists exactly today's three, retaining the "earned today" ✓ (FR8).
11. `/play/learn/<a-topic-not-in-todays-three>` redirects to `/play/learn` (FR9).
12. **`startQuizAction` called directly with a topic outside today's three is declined by `buildQuiz`** —
    the redirect is not the only barrier (FR10, Finding A).
13. Replaying an already-passed topic **within** today's three still works and grants no ticket, with no
    new award logic written (FR10; `decideAward` unchanged).

**Slice C — fractions and pictures**

14. The fraction generator produces all three skills; every answer is computed; denominators never
    exceed 10 (FR11, NFR5).
15. No distractor equals the answer under cross-multiplication, and options are distinct by value —
    asserted as a property (FR12).
16. `options()` in `math-gen.ts` is **unchanged** (FR11).
17. A generator test asserts `visual: {kind:"bar", parts:4, shaded:3}` with **no DOM involved** (FR13).
18. The bar model renders in `QuizFlow` at phone width, answers remain text buttons, and no
    `dangerouslySetInnerHTML` appears anywhere in the change (FR14, NFR10).
19. `TOPICS` holds **10** entries — 4 maths, 6 grammar — each with a lesson; `tests/quiz-bank.test.ts`
    is updated and green (FR15).

**Slice D — seen-tracking**

20. A minted offer carries `questionIds` parallel to `answers` in served order, and the payload verifies
    (FR16).
21. An offer **without** `questionIds` still verifies, and its submission records no seen-rows (FR17).
22. Migration adds `quiz_seen_questions` with `UNIQUE (child_id, topic, question_id)` and
    `ON DELETE CASCADE`; **no existing table is altered** (FR18, NFR2).
23. The new port method(s) have a pg adapter, an in-memory fake, and a contract spec in
    `tests/contracts/quiz-store-contract.ts` that both adapters pass (FR19, NFR9).
24. Across successive grammar attempts, unseen questions are served first until the bank is exhausted;
    the reset then leaves the seen-set equal to the five just served (FR20).
25. Seen-rows are written on **submit**, never at `buildQuiz` — an abandoned quiz writes nothing (FR20,
    OQ-DR-T1).
26. Submitting the same offer twice inserts no duplicate rows (FR20).
27. No seen-rows are written for a maths topic (FR20, OQ-DR-T2).

**Whole increment**

28. `pnpm typecheck` clean, `pnpm test` green, `pnpm test:pg` green (the persistence layer changed),
    `pnpm build` succeeds, **zero new dependencies** (NFR1).
29. The `collections` row count is identical before and after the migration (NFR2).
30. Grammar question ids are unchanged — none renumbered, reused or removed (OQ-DR-T3).

---

## 10. Out of Scope

From the vision's *Features OUT*, all thirteen:

| Excluded | Reason |
|---|---|
| Per-theme rarity tuning | Breaks set-completion symmetry; already declined in the vehicle-themes discovery |
| Changing the pass bar (5/5) or quiz length (5) | Not the problem |
| Changing the daily ticket caps (1/topic, 3/day) | They already align exactly with three topics a day |
| Duplicate protection / unowned-bias in pulls | Vision Q1(d) offered and declined |
| Retiring or rewriting existing **card** content | Out of scope |
| A "topics reset in Xh" countdown | Out of scope |
| An admin view of which questions a child has seen | The data will exist; the screen does not |
| Rewriting or retiring existing **grammar** questions | Vision Q6 chose (a)+(b), not (c) or (e) |
| Procedural grammar generation | Risks stilted or subtly wrong English |
| Equivalent / compare / simplify fractions | Deferred to a possible second fractions topic |
| Wider maths ranges (2–12), remainders, two-step, word problems | Vision Q8 chose (a) alone. Word problems in particular would reintroduce exactly the bank-memorisation problem item 11 exists to fix |
| Circle or object-group fraction pictures | Bar models only |
| Seen-tracking for maths topics | Ids are positional; tracking them is meaningless (OQ-DR-T2) |

Also out of **this increment**, but **IN scope for the feature** (J3 CLOSED, Q6=A):

> **Vision item 10 — grow the six grammar banks from ~16 to 40–50 each (~150–200 authored questions).**
> Delivered as a **second PR**, unblocked by and separable from this one. **Increment 25 is done when
> items 1–9 and 11 ship; the *feature* is done when the banks are grown.** The vision's IN list and the
> technical document's D6 were approved on different days without referencing each other; this is the
> bookkeeping reconciliation.
>
> That PR is bound by **OQ-DR-T3**: grammar question ids are durable identifiers referenced by
> `quiz_seen_questions` and may be **added to, never renumbered, reused, or removed**. Renumbering a
> bank would silently corrupt every child's seen-set. This is exactly where the temptation to renumber
> will arise.

And also out:

- **Test/lint CI.** Parent OQ-T-2 stays open (NFR12).
- **Increment 23's 10 pending Product-Definition write-backs** (Q8=A).
- **OQ-CS-3** — the general delete-path PBT, untouched.

---

## 11. Deltas to `Product-Definition/` (write-backs, Q8=A)

Applied at the **end** of the increment.

| Target | Delta |
|---|---|
| `vision-document.md` → What Must NOT Change | The signed-offer invariant is restated to reflect that the payload now also pins `questionIds`. The offer remaining the scoring authority is unchanged |
| `vision-document.md` → Feature Areas / Current State | Quizzes: 9 topics → **10** (4 maths, 6 grammar); pull odds 60/25/12/3 → **70/21/7/2** |
| `technical-environment.md` → Data Patterns | 6 tables → **7** (`quiz_seen_questions`); migrations 0000–0006 → 0000–0007 |
| `features/difficulty-refresh/open-questions.md` | **J1 CLOSED** (Q1=A + Q2=A), **J2 CLOSED/accepted** (Q5=A, with the 14-question-bank arithmetic recorded), **J3 CLOSED** (Q6=A). Findings A and B recorded as closed by Q3=A / Q4=A |
| `features/difficulty-refresh/technical-environment.md` → D1 | Schema corrected to include `topic`; note that the per-topic reset was not expressible without it (Finding B) |
| `features/difficulty-refresh/technical-environment.md` → D5 | Enforcement point corrected: the gate is in `buildQuiz`; the route redirect is UX (Finding A) |

`Product-Definition/features/difficulty-refresh/` is otherwise **not rewritten** — it is the input to
this increment.

---

## 12. Extension Compliance

Deferred items, carried forward untouched — nothing here forecloses any of them:

- A second, harder fractions topic (equivalent / compare / simplify).
- Wider maths ranges, remainders, two-step questions.
- An admin view of each child's seen-question state (the data will exist after FR18).
- Least-recently-seen serving instead of exhaustion-reset (NFR7 — revisit if the authoring PR slips).
- Duplicate protection in pulls — declined, and reversible only as an explicit economy decision.

---

## 13. Delivery

**Increment number**: 25.

**Next stage**: **User Stories** (Q7=A), then Application Design. Both J1 and the two new findings are
closed, so neither stage is blocked.

**Sequencing note**: Slice D depends on FR16 (the offer payload) and FR18 (the table); Slice B's FR10
depends on FR7. Slices A and C are independent of both and of each other. FR5 and FR15 both change
`TOPICS`, so they land together or in a fixed order — Application Design's call.

**Operations gate**: push to `main` → Vercel prod, with **the migration applied via the existing
`drizzle-kit migrate` path before or with the deploy** — `buildQuiz` and `submitQuiz` will query the new
table on the first quiz taken after deploy.

**Carried forward, unresolved**:

- Parent **OQ-T-2** — no test CI; six new test obligations rest on developer discipline (NFR12).
- Parent **OQ-T-3** — `next-auth` pinned to a beta on the only security boundary.
- **OQ-CS-3** — general delete-path PBT.
- The **content follow-up** (vision item 10), which is what closes NFR7's transitional gap.

---

## Gate

**AWAITING APPROVAL.** Four decisions were taken at this stage and are recorded for confirmation:

> **Q1=A (J1, blocking)** — `questionIds` joins the signed offer payload (FR16). The approved
> seen-tracking semantics are not implementable otherwise.
>
> **Q3=A (Finding A, new)** — the "today's three" gate moves into `buildQuiz` (FR10). Both feature
> documents place it at the route; a Server Action is a POST endpoint, so the route alone is not a
> boundary. A strengthening of the documents' intent, in the same shape as Inc 23's FR1 and Inc 24's
> Finding D.
>
> **Q4=A (Finding B, new)** — `quiz_seen_questions` gains a `topic` column (FR18). The approved
> three-column schema cannot perform the approved per-topic reset. This **corrects** the feature's
> technical-environment D1 rather than merely extending it.
>
> **Q5=A (J2)** — the transitional replay gap is accepted, with the arithmetic recorded including the
> newly-found 14-question banks, which give **two** clean attempts rather than three (NFR7).
