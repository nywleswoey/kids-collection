# Technical Environment — Difficulty & Freshness

- **Status**: Technical role complete, approved by the user 2026-08-08
- **Depth**: quick (7 CORE questions, all recommendations accepted; 3 open questions resolved at the gate)
- **Companion**: `vision-document.md` (approved 2026-08-08)
- **Parent definition**: `Product-Definition/technical-environment.md` (approved 2026-08-03)

This document **records constraints and decisions**. It does not design the implementation — that is
AI-DLC's job.

---

## Summary

Five business changes land as **four constants-and-generators changes, one new pure module, one new
table, and one new component**. No new dependencies. One migration.

| Vision item | Technical shape |
|---|---|
| 1. Harder rarity | One constant in `src/lib/types.ts`. One existing test must be rewritten |
| 2. Fractions | New generator + new `visual` field on `QuizQuestion` + one new SVG component |
| 3. Bonds 100 → 1000 | New generator, new topic id, retired-id label map. **No data migration** |
| 4. Daily 3 topics | New pure module `daily-topics.ts`. No persistence at all |
| 5. Anti-memorisation | New table + `QuizStore` method (grammar only) + missing-operand maths forms |

---

## Existing System

### Stack (inherited, unchanged)

Next.js App Router · TypeScript (no `allowJs`) · Drizzle + Neon Postgres · Vitest with property-based
tests · Vercel · $0/month runtime cost.

### The code this increment touches

| File | Role today | Change |
|---|---|---|
| `src/lib/types.ts` | `RARITY_WEIGHTS` (60/25/12/3), must sum to 100 | → **70/21/7/2** |
| `src/lib/logic.ts` | `drawCard` — weight roll, then uniform within rarity | **No change.** Reads the constant |
| `src/features/pull/easter-egg.ts` | `rollWeightedRarity` — same constant | **No change** — inherits the new odds by design (Q2a) |
| `src/features/quiz/types.ts` | `QuizQuestion`, `QUIZ_LENGTH` 5, `DAILY_TICKET_CAP` 3 | `QuizQuestion` gains optional `visual`. Caps unchanged |
| `src/features/quiz/topics.ts` | 9 topics + lessons | Bonds-1000 replaces bonds-100 (id, title, lesson); Fractions added → **10** |
| `src/features/quiz/math-gen.ts` | 3 generators; integer-only `options()` | 2 new generators; missing-operand forms; `options()` untouched |
| `src/features/quiz/grammar-bank.ts` | 6 banks, ~16 each | Grows to ~50 each — **in the follow-up**, not this increment |
| `src/features/quiz/quiz-service.ts` | `buildQuestions` samples 5 | Prefers unseen grammar questions |
| `src/features/quiz/QuizFlow.tsx` | `<p>{q.prompt}</p>` — plain string, no markup path | Renders `visual` when present |
| `app/play/learn/page.tsx` | Lists all 9 topics grouped by subject | Lists **today's 3** only |
| `app/play/learn/[topicId]/page.tsx` | Any topic reachable by URL | **Rejects** topics outside today's 3 |
| `src/db/schema.ts` | `quiz_completions` | **+ `quiz_seen_questions`** |
| `src/db/stores/quiz-store*.ts` | Port + pg adapter + fake | **+ one method**, all three files |
| `tests/pick-tickets.test.ts:44` | Hardcodes the 60/25/12/3 bands | **Will fail.** Rewritten to derive bands from the constant |

---

## Decisions

### D1 — Seen-question tracking: a new table, reached through `QuizStore` (T1)

```
quiz_seen_questions (child_id, question_id, seen_at)
  UNIQUE (child_id, question_id)
  FK child_id → children(id) ON DELETE CASCADE     -- matches quiz_completions
```

- **A new method on the existing `QuizStore`**, not a new port. Same aggregate, same lifecycle.
- **Full seam treatment**: pg adapter + in-memory fake + an extension to
  `tests/contracts/quiz-store-contract.ts`. No exception to the repo's discipline.
- **Bounded by construction**: 6 grammar topics × ~50 questions × 3 children ≈ **900 rows** at
  saturation. Growth is capped by the size of the authored banks, so no pruning is needed. This
  **resolves the vision's "unbounded growth" risk**.
- **On exhaustion, reset that topic's seen-set** for that child, so it cycles rather than reaching a
  degenerate "everything is seen" state.
- **"Seen" means *answered*, not *served*** (OQ-DR-T1). Rows are written on **submit**, not when
  `buildQuiz` mints the offer, so abandoning a quiz burns nothing.
- **Grammar only** (OQ-DR-T2). `math-gen.ts` ids are positional (`${topicId}-${i}`), so the same id
  names a different question every attempt — tracking it would be meaningless. Maths gets its freshness
  from generation plus the new missing-operand forms.

### D2 — Replacing the bonds topic without touching history (T2)

New id `number-bonds-1000`. Historical `quiz_completions` rows keep `number-bonds-100` **untouched**.
A retired-id → display-name map makes the admin activity view render *"Number Bonds to 100 (retired)"*
rather than a raw id.

**No data migration.** Rewriting children's history to claim attempts at a quiz that did not exist when
they were taken was explicitly rejected — it runs against this repo's Increment 23 posture.

### D3 — Fractions: a dedicated generator (T3)

`options()` in `math-gen.ts` stays **untouched** and keeps serving the integer topics — including
*fraction of a quantity*, whose answer is an integer.

The fraction generator:
- models answers as `{ num, den }`, formatting to a string at the end;
- builds distractors from **the mistakes children actually make** — numerator ±1, denominator ±1,
  numerator/denominator swapped, denominators added (`1/5 + 3/5 → 4/10`);
- checks equality by **cross-multiplication, never string comparison**, so `2/4` can never be offered
  against `1/2`;
- keeps denominators **≤ 10** (bar models don't draw cleanly for sevenths or ninths).

### D4 — Pictures: a structured field, not markup (T4)

`QuizQuestion` gains `visual?: { kind: "bar"; parts: number; shaded: number }`, rendered by a small
React component drawing inline SVG.

- Generators stay pure and property-testable — a test asserts `{ parts: 4, shaded: 3 }` with no DOM.
- **No `dangerouslySetInnerHTML` on a child-facing screen.** An SVG-string-in-the-prompt approach was
  rejected as a correctness/safety regression for a small saving.
- The picture **does not cross the signed-offer boundary**: the offer signs `answers` only. The picture
  is presentation; the signed answer key remains the authority for scoring.

### D5 — The daily 3 are derived, not stored (T5)

A new pure module `src/features/quiz/daily-topics.ts`, beside `cap.ts` which already does this kind of
pure SGT-day reasoning. A function of `(childId, sgtDayKey)`.

- No table, no migration, no write on a read path, no two-tab race.
- **"Exclude yesterday's" comes free** — call the same function with `sgtDayKey - 1`.
- **Stable across refreshes by construction**: a child cannot reroll into easier topics. This is the
  property that makes item 4 actually remove free choice.
- **The route rejects, it does not merely omit** (T5-i): `/play/learn/[topicId]` refuses a topic outside
  today's three. Hiding the other seven in the picker is not enforcement — the URL is navigable.

**Feasibility, checked during the interview:** the "≥1 maths" guarantee cannot be starved. There are
**4 maths topics** and at most **3** are excluded as yesterday's, so at least one is always eligible —
worst case (yesterday's three were all maths) still leaves one.

### D6 — Delivery: code now, content next (T7)

Code lands as one increment; the ~150–200 authored grammar questions follow separately and unblocked.
See the join document for the caveat attached to this split — it is sound, but the value it claims at
today's bank size needs stating precisely.

---

## Constraints

### Confirmed unchanged (inherited from the parent definition)

- **TypeScript only**, no `allowJs`.
- **Property-based tests** for pure logic.
- **$0/month runtime cost.**
- **No unreviewed content path to a child** — applies to the ~200 authored questions as much as to card
  images.

### Confirmed for this increment

- **No new dependencies.** Inline SVG needs no library; seen-tracking uses the existing Drizzle/Neon
  stack; daily-topic selection is pure TypeScript.
- **One migration file** (`quiz_seen_questions`), applied by the existing `pnpm pg:up` /
  `drizzle-kit migrate` path. No other schema change.
- **`RARITY_WEIGHTS` stays a single constant summing to 100**, shared with the easter-egg roll.

---

## Test Obligations (T6)

**One existing test will fail** the moment the constant changes: `tests/pick-tickets.test.ts:44` —
*"maps the weight bands to the right tier (60/25/12/3)"* — hardcodes the cumulative boundaries
`0.6 / 0.85 / 0.97`. It is to be **rewritten to derive the bands from `RARITY_WEIGHTS`**, so the next
tuning does not break it; restating a constant is not a check of it. (`tests/logic.pbt.test.ts:53`
already reads the constant and adapts on its own.)

Mandatory new tests:

| Area | Properties |
|---|---|
| Fraction generator | Answer always among options; options distinct **by value**; no distractor equal to the answer under cross-multiplication; denominators ≤10 |
| Bonds to 1000 | Computed answer always correct; the number mix behaves as specified |
| Missing-operand × and ÷ | Every shape's answer is correct; the derived `explanation` reads correctly for each |
| Daily topics | Deterministic for a given `(child, day)`; always exactly 3; always ≥1 maths; never any of yesterday's |
| Seen-question preference | Unseen served first until exhausted, then reset |
| `QuizStore` | Contract-suite extension for the new method — pg and fake must agree |

**Inherited caveat:** the parent definition's **OQ-T-2** records that the PBT/CI gate is declared but
not enforced by CI. These obligations are therefore only as binding as the discipline running them.
**This increment does not close OQ-T-2.**

---

## What Must NOT Change

- **`quiz_completions` history is never rewritten.** D2 exists specifically to avoid it.
- **The signed quiz offer remains the authority for scoring.** Client-side keys drive feedback only.
- **Answers are computed, never authored, in every maths generator** — including the fraction one.
- **`RARITY_WEIGHTS` sums to 100** and stays one constant shared with the easter-egg roll.
- **Uniform picking within a rarity.** No duplicate protection was introduced; adding one silently
  would change the economy in a way the user explicitly declined.
- **Every persistence path goes through a Store port** with a pg adapter, an in-memory fake, and a
  contract suite. The new seen-tracking method is not an exception.
- **NEW — grammar question ids are durable identifiers** (OQ-DR-T3). Once `vt-1`, `pp-3` etc. are
  referenced by `quiz_seen_questions`, they may be **added to, never renumbered, reused, or removed**.
  Renumbering a bank would silently corrupt every child's seen-set. This binds the ~200-question
  authoring follow-up in particular, which is exactly where the temptation to renumber will arise.
