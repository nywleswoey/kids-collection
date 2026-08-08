# Technical Answers History — Difficulty & Freshness (Technical role)

**APPEND-ONLY.** Every validated batch is appended verbatim (questions + answers + caveats).
Never rewritten or truncated.

- Session: `Product-Definition/features/difficulty-refresh/`
- Depth: quick · Interaction: batch · Mode: sequential

---

## Batch 1 — T1–T7 (all CORE) — answered 2026-08-08

**[Answer] for the whole batch: "ok with recommendations"** — every recommendation accepted as written.
Each is expanded below so the decision is unambiguous downstream.

### T1 [CORE] — Where does "which questions has this child seen" live? (resolves OQ-DR-4)
Options: (a) new table · (b) JSON column on `children` · (c) extend `quiz_completions` · (d) other.
Sub-questions: T1-i exhaustion behaviour · T1-ii does it go through a Store port.

**→ (a), via a new method on the existing `QuizStore`** — not a new port. Same aggregate, same lifecycle.
- New table `quiz_seen_questions (child_id, question_id, seen_at)`, UNIQUE on `(child_id, question_id)`,
  FK to `children` with `ON DELETE CASCADE` (matching `quiz_completions`).
- **Bounded by construction**: 6 grammar topics × ~50 questions × 3 children ≈ **900 rows** at
  saturation. No pruning needed; growth is capped by the size of the authored banks.
- **T1-i — on exhaustion, reset that topic's seen-set** for that child, so it cycles rather than
  reaching a degenerate "everything is seen" state.
- **T1-ii — yes, full port treatment**: pg adapter + in-memory fake + an extension to
  `tests/contracts/quiz-store-contract.ts`. No exception to the repo's seam discipline.

### T2 [CORE] — Replacing `number-bonds-100` without harming history (resolves OQ-DR-3)
Options: (a) new id, orphan old rows · (b) keep the id, change the title · (c) migrate the rows ·
(d) (a) + a retired-topic label map.

**→ (d).** New id `number-bonds-1000`; historical rows keep `number-bonds-100` untouched; a small
retired-id → display-name map makes the admin activity view render **"Number Bonds to 100 (retired)"**
instead of a raw id.
**No data migration.** (c) was explicitly rejected: rewriting children's history to claim attempts at a
quiz that did not exist when they were taken runs against this repo's Increment 23 posture.

### T3 [CORE] — Fraction answers and distractors (resolves OQ-DR-5)
Options: (a) dedicated fraction generator · (b) generalise `options()` · (c) authored distractor sets.

**→ (a).** A dedicated generator; `options()` stays **untouched** and keeps serving the integer topics
(including *fraction of a quantity*, whose answer is an integer).
- Answers modelled as `{ num, den }`, formatted to a string at the end.
- Distractors are **the mistakes children actually make**: numerator ±1, denominator ±1, numerator and
  denominator swapped, and denominators added (`1/5 + 3/5 → 4/10`). That last one is the single most
  useful distractor in the topic and no generic "nearby value" helper would ever produce it.
- **Equality checked by cross-multiplication, never string comparison** — so `2/4` can never be offered
  as a distractor against `1/2`.

### T4 [CORE] — How a bar-model picture reaches the screen
Options: (a) structured `visual` field + inline-SVG component · (b) SVG string +
`dangerouslySetInnerHTML` · (c) unicode blocks · (d) pre-rendered images.

**→ (a).** `QuizQuestion` gains an optional structured field —
`visual?: { kind: "bar"; parts: number; shaded: number }` — rendered by a small React component that
draws inline SVG.
- Generators stay pure and property-testable: a test asserts `{ parts: 4, shaded: 3 }` without a DOM.
- **No `dangerouslySetInnerHTML` on a child-facing screen.** (b) was rejected as a real
  correctness/safety regression for a small saving.
- **T4-i confirmed**: the picture does **not** cross the signed-offer boundary. The offer signs
  `answers` only. The picture is presentation; the signed answer key remains the authority for scoring.

### T5 [CORE] — Is the daily set of 3 derived or stored?
Options: (a) pure function of `(childId, sgtDayKey)` · (b) a stored `daily_topics` row.

**→ (a).** A new pure module `src/features/quiz/daily-topics.ts`, beside `cap.ts` which already does
this kind of pure SGT-day reasoning.
- No table, no migration, no write on a read path, no two-tab race.
- **"Exclude yesterday's" comes free**: call the same function with `sgtDayKey - 1`.
- Stable across refreshes by construction — a child cannot reroll into easier topics.
- **T5-i confirmed**: `/play/learn/[topicId]` **rejects** a topic outside today's three. Hiding the
  other seven in the picker is not enforcement; the route is directly navigable.

*Feasibility check done during this interview:* the "≥1 maths" guarantee can never be starved. There
are **4 maths topics** and at most **3** are excluded as yesterday's, so at least one maths topic is
always eligible. Worst case (yesterday's three were all maths) still leaves one.

### T6 [CORE] — Test obligations, and the assertion that will break
Sub-questions: T6-i how to fix the failing test · T6-ii which new tests are mandatory.

**→ T6-i: derive the bands from `RARITY_WEIGHTS`.** `tests/pick-tickets.test.ts:44`
("maps the weight bands to the right tier (60/25/12/3)") hardcodes the cumulative boundaries
`0.6 / 0.85 / 0.97` and **will fail** on the constant change. Rewriting it to compute the bands from the
constant means the next tuning does not break it. Restating the constant is not a check of the constant.
(`tests/logic.pbt.test.ts:53` already reads the constant and adapts on its own.)

**→ T6-ii: all listed candidates are mandatory**, as the repo's existing standard rather than extra
ceremony:
- Fraction generator PBT — the answer is always among the options; options are always distinct **by
  value**; no distractor equals the answer under cross-multiplication; denominators stay ≤10.
- Number-bonds-to-1000 generator PBT.
- Missing-operand forms for × and ÷ — every shape's computed answer is correct, and the derived
  `explanation` reads correctly for each.
- Daily-topic selection PBT — deterministic for a given `(child, day)`; always ≥1 maths; never any of
  yesterday's three; always exactly 3.
- Seen-question preference — unseen questions are served first until the bank is exhausted, then reset.
- Contract-suite extension for the new `QuizStore` method (T1-ii).

*Inherited caveat, unchanged:* the parent definition's **OQ-T-2** records that the PBT/CI gate is
declared but not enforced by CI. These tests are therefore only as binding as the discipline running
them. This increment does not close OQ-T-2.

### T7 [CORE] — Delivery shape, and constraint confirmation
Options: (a) one PR · (b) split by risk into four · (c) split code from content · (d) other.

**→ (c). Code first as one increment; the ~150–200 authored grammar questions as a separate,
unblocking follow-up.**
Rationale accepted as written: **seen-question tracking delivers most of its value at today's bank
size**, so shipping the code early is what actually stops the memorisation while the new questions get
written. The bank authoring is a long tail that should not hold a PR open.

**Constraints confirmed unchanged:**
- **No new dependencies.** Inline SVG needs no library; seen-tracking uses the existing Drizzle/Neon
  stack; the daily-topic selection is pure TypeScript.
- Parent-definition stack constraints all still hold: **TypeScript only** (no `allowJs`),
  **property-based tests**, **$0/month runtime cost**.
- One new migration file (`quiz_seen_questions`), applied by the existing `pnpm pg:up` /
  `drizzle-kit migrate` path. No other schema change.

---

### Pre-declared open questions from this batch

| ID | Question | Status |
|---|---|---|
| OQ-DR-T1 | Does "seen" mean *served* or *answered*? The offer is built at `buildQuiz`, so a child who abandons a quiz would have those 5 questions burned under a served-based rule | ⏳ Open — needs a decision before implementation |
| OQ-DR-T2 | Seen-tracking is meaningless for maths: `math-gen.ts` ids are **positional** (`${topicId}-${i}`), not content-derived, so the same id names a different question every attempt. Confirming seen-tracking is **grammar-only** | ⏳ Open — confirm |
| OQ-DR-T3 | Grammar question ids (`vt-1`, `pp-3`, …) become **durable identifiers** once they are foreign-keyed by seen-history. Renumbering a bank later would silently corrupt every child's seen-set | ⏳ Open — should become an invariant in "What Must NOT Change" |

---

## Approval loop — resolutions (2026-08-08)

The three technical open questions were put to the user at the approval gate with a stated lean, and
approved as recommended.

| ID | Resolution |
|---|---|
| **OQ-DR-T1** | **"Seen" means *answered*, not *served*.** Seen-rows are written on **submit**, not when `buildQuiz` mints the offer. A child who opens a quiz and walks away burns nothing. Side effect, accepted: a child who abandons repeatedly sees the same questions again — correct, since they never actually answered them. |
| **OQ-DR-T2** | **Confirmed: seen-tracking is grammar-only.** `math-gen.ts` ids are positional (`${topicId}-${i}`), so the same id names a different question on every attempt. Maths needs no seen-tracking anyway — it generates fresh each time, which is why Q8's missing-operand forms are the maths half of the fix. |
| **OQ-DR-T3** | **Confirmed as a new invariant.** Grammar question ids (`vt-1`, `pp-3`, …) are **durable identifiers** once referenced by seen-history. They may be **added to**, never renumbered, reused, or removed. This binds the ~200-question authoring follow-up specifically. Added to "What Must NOT Change". |

**Technical role complete**, approved by the user 2026-08-08.
