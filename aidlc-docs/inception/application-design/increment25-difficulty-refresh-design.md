# INCREMENT 25 — Application Design: Difficulty & Freshness

**Status**: **APPROVED 2026-08-08** — D1–D10 all confirmed (D3=B)
**Date**: 2026-08-08
**Requirements**: `aidlc-docs/inception/requirements/increment25-difficulty-refresh-requirements.md`
(FR1–FR20, NFR1–12, 30 acceptance criteria) — APPROVED 2026-08-08
**User Stories**: `aidlc-docs/inception/user-stories/increment25-difficulty-refresh-stories.md`
(I25-A1…F2) — APPROVED 2026-08-08
**Schema impact**: **one additive migration** — `0007`, new table `quiz_seen_questions`. No existing
table altered. **Zero new npm dependencies.**

---

## 1. Design scope

Four slices. A and C are independent of everything; B and D each add one new pure module plus one
touched boundary.

| Slice | Surface | New pure module | Port change | Migration |
|---|---|---|---|---|
| **A — Economy + maths shapes** (FR1–FR6) | `lib/types.ts`, `quiz/math-gen.ts`, `quiz/topics.ts` | — | none | none |
| **B — Daily three** (FR7–FR10) | `app/play/learn/*`, `quiz-service.ts` | `quiz/daily-topics.ts` | none | none |
| **C — Fractions + pictures** (FR11–FR15) | `quiz/types.ts`, `QuizFlow.tsx` | `quiz/fraction-gen.ts` | none | none |
| **D — Seen-tracking** (FR16–FR20) | `quiz-offer.ts`, `quiz-service.ts`, `db/*` | `quiz/seen-select.ts` | **+2 methods** | **0007** |

**Untouched by design**: `src/features/actions/action.ts` and the `withActiveChild` shape, `requireParent`
/ `requireAdminGate`, every other Store port, all CHECK constraints, all atomicity contracts,
`src/lib/logic.ts`, `src/features/pull/easter-egg.ts`, sacrifice, trading, the binder, and the entire
seed pipeline.

**One thing worth stating up front**: `drawCard` and `rollWeightedRarity` are **not edited**. FR1 is a
four-number change to one object literal; both roll sites already derive their total and bands from it
`[logic.ts:34,40]`, `[easter-egg.ts:19,22]`. Slice A's real work is in the tests, not the code.

---

## 2. Component inventory

### 2.1 New

| Component | Kind | Responsibility |
|---|---|---|
| `src/lib/rng.ts` → `seededRng(seed: string)` | pure primitive (**added to an existing file**) | A deterministic `Rng` from a string. The only new shared primitive. |
| `src/features/quiz/daily-topics.ts` | pure logic `[PBT]` | `dailyTopics(childId, dayKey)` → exactly 3 topic ids. No I/O, no persistence. |
| `src/features/quiz/fraction-gen.ts` | pure logic `[PBT]` | The three fraction skills, `{num,den}` modelling, mistake-shaped distractors, cross-multiplication equality. |
| `src/features/quiz/seen-select.ts` | pure logic `[PBT]` | `selectUnseenFirst(bank, seenIds, n, rng)` and `coversBank(bankIds, seenIds, servedIds)`. No I/O. |
| `src/features/quiz/BarModel.tsx` | presentational component | Inline SVG bar model from `{parts, shaded}`. No state, no props beyond the visual. |
| `src/db/migrations/0007_quiz_seen_questions.sql` | migration | The new table. Additive only. |

### 2.2 Modified

| Component | Change |
|---|---|
| `src/lib/types.ts` | `RARITY_WEIGHTS` → 70/21/7/2 (FR1). Four numbers. |
| `src/features/quiz/types.ts` | `QuizQuestion` gains `visual?: { kind: "bar"; parts: number; shaded: number }` (FR13). |
| `src/features/quiz/topics.ts` | Bonds-1000 replaces bonds-100 (id, title, lesson); Fractions appended → **10**. Gains `RETIRED_TOPIC_TITLES` + `topicTitle(id)` (FR5, FR6, FR15). |
| `src/features/quiz/math-gen.ts` | `numberBonds1000` replaces `numberBonds100`; × and ÷ gain missing-operand shapes; `GENERATORS` gains a fractions entry. **`options()` and `q()` are not touched** (FR4, FR5, FR11). |
| `src/features/quiz/quiz-offer.ts` | `QuizOfferPayload` gains `questionIds?: string[]`; the guard accepts it as optional (FR16, FR17). |
| `src/features/quiz/quiz-service.ts` | `buildQuiz` gains the daily-3 gate + unseen-first grammar selection + `questionIds` in the offer; `submitQuiz` records seen + reset; `getQuizActivity` uses `topicTitle` (FR6, FR10, FR16, FR20). |
| `src/features/quiz/QuizFlow.tsx` | Renders `<BarModel/>` above the prompt when `q.visual` is present (FR14). One conditional. |
| `app/play/learn/page.tsx` | Lists today's three instead of all of `TOPICS` (FR8). |
| `app/play/learn/[topicId]/page.tsx` | Redirects when the topic is outside today's three (FR9). |
| `src/db/schema.ts` | `quizSeenQuestions` table + `QuizSeenRow` type (FR18). |
| `src/db/stores/quiz-store.ts` | Port gains 2 methods (FR19). |
| `src/db/stores/quiz-store.pg.ts` | pg implementations, `db.batch` for the atomic reset. |
| `src/db/stores/quiz-store.fake.ts` | In-memory implementations + seed shape. |
| `tests/contracts/quiz-store-contract.ts` | Conformance cases for both new methods. |
| `tests-pg/db.ts` | `resetAll` TRUNCATE list gains `quiz_seen_questions`; new `seedSeenQuestions`. |

### 2.3 Deleted

- `numberBonds100` and its `GENERATORS` key `[math-gen.ts:63-66,71]`.
- The `number-bonds-100` entry in `TOPICS` `[topics.ts:27-36]`.
- The hardcoded band assertions at `tests/pick-tickets.test.ts:44-54`.

Nothing else. No file is removed.

---

## 3. Slice A — economy and maths shapes

### 3.1 FR1–FR3 — the constant

`RARITY_WEIGHTS` becomes `{common:70, rare:21, epic:7, legendary:2}`. No call site changes.

`tests/pick-tickets.test.ts` is rewritten to **derive** its boundaries:

```ts
// cumulative bands from the constant, so the next tuning doesn't break the test
const bands = RARITIES.reduce<{ r: Rarity; lo: number; hi: number }[]>((acc, r) => {
  const lo = acc.length ? acc[acc.length - 1].hi : 0;
  return [...acc, { r, lo, hi: lo + RARITY_WEIGHTS[r] / 100 }];
}, []);
for (const { r, lo, hi } of bands) {
  expect(rollWeightedRarity(() => lo)).toBe(r);              // inclusive lower edge
  expect(rollWeightedRarity(() => hi - 1e-9)).toBe(r);       // exclusive upper edge
}
```

FR2 needs no code. It is discharged by the existing
`tests/easter-egg.pbt.test.ts` plus the empirical-distribution case at `pick-tickets.test.ts:56`, which
already reads the constant — **the design's job here is to confirm, not to build.**

### 3.2 FR4 — missing-operand shapes

`multiplicationWithin100` and `divisionWithin100` each pick a **form** from the injected `rng`, then
build prompt and answer from the same drawn operands:

```ts
function multiplicationWithin100(id: string, rng: Rng): QuizQuestion {
  const a = randInt(rng, 2, 10);
  const b = randInt(rng, 2, 10);
  const p = a * b;
  switch (randInt(rng, 0, 2)) {
    case 0:  return q(id, `${a} × ${b} = ?`, p, rng, [a, -a, b, -b]);
    case 1:  return q(id, `${a} × ? = ${p}`, b, rng, [1, -1, 2, -2]);
    default: return q(id, `? × ${b} = ${p}`, a, rng, [1, -1, 2, -2]);
  }
}
```

- The answer is **computed** in every branch (NFR5) — nothing is authored.
- `q()` and `options()` are unchanged; every answer is still a non-negative integer.
- The derived explanation `prompt.replace("?", String(answer))` `[math-gen.ts:36]` is correct for all
  three shapes and needs no change. The `spread` distractors differ per form because a plausible wrong
  answer for a *factor* (off by 1–2) is not the same as for a *product* (off by a factor).

Division is the same shape over `dividend = divisor × quotient`.

### 3.3 FR5 — bonds to 1000

```ts
function numberBonds1000(id: string, rng: Rng): QuizQuestion {
  // Q4-iv: mostly arbitrary, some rounder — so the topic can't be reduced to one trick.
  const x = randInt(rng, 0, 9) === 0
    ? randInt(rng, 1, 9) * 100          // rounder: 100, 200, … 900
    : randInt(rng, 1, 999);             // arbitrary
  return q(id, `? + ${x} = 1000`, 1000 - x, rng, [100, -100, 200, -200]);
}
```

The exact rounder-mix ratio is a tuning constant, not a contract; the PBT asserts
`answer + x === 1000` universally and that **both** kinds occur over many draws.

### 3.4 FR6 — the retired-id map

`topics.ts` gains, beside `BY_ID`:

```ts
/** Topic ids that no longer exist but still appear in quiz_completions history.
 *  Inc25: number-bonds-100 was REPLACED by number-bonds-1000. History is never
 *  rewritten (NFR3), so the admin view resolves the old id to a label instead. */
const RETIRED_TOPIC_TITLES: Record<string, string> = {
  "number-bonds-100": "Number Bonds to 100 (retired)",
};

export function topicTitle(id: string): string {
  return BY_ID.get(id)?.title ?? RETIRED_TOPIC_TITLES[id] ?? id;
}
```

`quiz-service.ts:144` becomes `title: topicTitle(r.topic)`. The raw-id fallback survives as the last
resort, so an id in neither map still renders (story I25-F1).

---

## 4. Slice B — the daily three

### 4.1 The problem the naive design hides

The feature's technical document says *"'exclude yesterday's' comes free — call the same function with
`sgtDayKey - 1`"*. **It does not.** If `dailyTopics(d)` is defined as "draw 3, excluding
`dailyTopics(d-1)`", then evaluating it requires `dailyTopics(d-2)`, then `d-3`, and so on — an
unbounded recursion with no anchor. Any O(1) implementation of that sentence is either recursive or
silently excludes something other than what the child actually saw yesterday.

The design therefore makes non-repetition **structural** rather than a filter: consecutive days draw
from *disjoint slices of the same per-cycle permutation*, so the property holds by construction and the
function stays a pure O(1) map of `(childId, dayKey)`.

### 4.2 The construction

```
cycle E = floor(dayKey / 3)          slot s = dayKey mod 3

mPerm(c,E) = shuffle(MATH_IDS,    seededRng(`${c}:m:${E}`))   // 4 maths
gPerm(c,E) = shuffle(GRAMMAR_IDS, seededRng(`${c}:g:${E}`))   // 6 grammar
```

Each cycle covers 3 days. Within a cycle the three days take **disjoint index ranges** of `mPerm` and
`gPerm`, so no topic can repeat across those days — no filtering, no rejection loop.

**Cycle boundary.** Slot 0 of cycle `E` must avoid what slot 2 of cycle `E-1` served.

> ### ⚠️ CORRECTED AT CONSTRUCTION (2026-08-08)
>
> **As designed, this was still recursive, and the property test caught it.** The original text
> rotated *both* permutations of cycle `E` to clear the conflict, and computed the forbidden set from
> `rawCycle(c, E-1)`. But rotating cycle `E-1` changed what *it* served, so excluding its **raw** slot 2
> excluded the wrong set — `resolveCycle(E)` really depended on `resolveCycle(E-1)`, and the recursion
> this section claims to eliminate was still present. A grammar topic repeated across a boundary
> (`conjunctions`, and separately `adjectives-vs-adverbs`) on the first run of the PBT.
>
> **The fix that actually works: slot 2 is never adjusted.** It is a pure function of the cycle's own
> permutations, so cycle `E` can reconstruct what cycle `E-1` served from raw material alone — genuinely
> one level back, genuinely O(1). Slot 0 then picks from everything *except* slot 2's topics, skipping
> the forbidden ones; slot 1 takes the remainder by set difference.
>
> That is only always feasible if slot 2 is small enough to leave room, which is why **`MIX_VECTORS` now
> pins the last day of every cycle to exactly one maths topic** — see §4.3. The `k₀`-reduction fallback
> described below is **gone**; it was patching the wrong problem.

With slot 2 fixed, slot 0 draws from 3 free maths and 4 free grammar against at most 1 forbidden maths
and 2 forbidden grammar, so a clean choice always exists. No rotation, no rejection loop, no fallback.

### 4.3 The maths guarantee — **D3=B, varying mix** *(decided 2026-08-08)*

A per-cycle count vector `k = (k₀,k₁,k₂)`, each `kᵢ ≥ 1` and `Σkᵢ ≤ 4`, chosen deterministically from
the cycle seed — one of `(1,1,1)`, `(2,1,1)`, `(1,2,1)`.

> **⚠️ CORRECTED AT CONSTRUCTION**: `(1,1,2)` was in the original list and has been **removed**. With
> `k₂ = 2`, slot 2 holds two of the four maths topics, leaving only two free for slot 0 — and a previous
> cycle whose slot 2 held those same two would leave slot 0 with **no eligible maths at all**. Pinning
> `k₂ = 1` is what makes the boundary fix feasible without ever touching slot 2, which in turn is what
> makes the whole construction non-recursive (§4.2). The mix still varies: days get 1 or 2 maths.

Slot `s` takes `kₛ` maths and `3−kₛ` grammar, from consecutive index ranges:

```
K(s) = k₀+…+k_{s-1}                    maths:   mPerm[K(s) … K(s)+kₛ)
G(s) = Σ_{i<s} (3−kᵢ)                  grammar: gPerm[G(s) … G(s)+3−kₛ)
```

Index budgets hold: maths uses `Σkᵢ ≤ 4` of `mPerm`'s 4; grammar uses `9−Σkᵢ` ∈ {5,6} of `gPerm`'s 6.
Slots take disjoint ranges, so within-cycle non-repetition is unchanged.

A fixed 1-maths-plus-2-grammar shape (D3-A) was offered and **declined**: the increment exists because
*"the numbers change; the thinking does not"*, and a permanently fixed subject shape is a smaller
version of the same complaint.

#### Feasibility (as built)

With `k₂ ≡ 1`, slot 2 always holds exactly 1 maths and 2 grammar. That leaves slot 0 choosing from **3
free maths** against **at most 1 forbidden**, and **4 free grammar** against **at most 2 forbidden** —
so a clean choice exists unconditionally, for every mix vector and every cycle. No fallback path, and
therefore no rarely-exercised branch to get wrong.

**Verified**: 300,500 consecutive day-draws across 10 child ids produced 0 repeats against the previous
day, 0 zero-maths days, 0 malformed sets, all 10 topics reachable, and a mix distribution of ~78%
one-maths / ~22% two-maths.

### 4.4 Placement and the gate

`daily-topics.ts` imports `TOPICS` (pure data) and `seededRng`. It **does not** use `isMathTopic` —
subject membership comes from `TOPICS[].subject`, so the module is independent of generator
registration and stays correct when Slice C adds fractions as the fourth maths topic.

The gate lands in `buildQuiz`, matching its existing failure idiom:

```ts
async function buildQuiz(childId, topicId, nowMs = Date.now(), rng = Math.random) {
  if (!getTopic(topicId)) throw new Error(`buildQuiz: unknown topic ${topicId}`);
  // FR10 (Finding A): the boundary. The route redirect is UX; a Server Action is
  // a POST endpoint, so the page check is not enforcement.
  if (!dailyTopics(childId, sgtDayKey(nowMs)).includes(topicId))
    throw new Error(`buildQuiz: topic not offered today`);
  ...
}
```

`childId` is already server-resolved by `withActiveChild` — the client never asserts it. The two pages
call the same pure function for display (FR8) and redirect (FR9), so picker, route and gate cannot drift.

---

## 5. Slice C — fractions and pictures

### 5.1 D1 — dispatch: a fourth `GENERATORS` entry, not a third branch

`buildQuestions` `[quiz-service.ts:22-32]` stays at **two** branches. Fractions registers in
`GENERATORS`, so `isMathTopic("fractions")` is true and nothing outside `math-gen.ts` learns a new
concept:

```ts
// math-gen.ts
import { fractionQuestion } from "./fraction-gen";

const GENERATORS: Record<string, (id: string, rng: Rng) => QuizQuestion> = {
  "multiplication-within-100": multiplicationWithin100,
  "division-within-100": divisionWithin100,
  "number-bonds-1000": numberBonds1000,
  "fractions": fractionQuestion,        // own options path; never calls q()/options()
};
```

`fraction-gen.ts` imports only `types` and `rng` — **no cycle** with `math-gen.ts`. `options()` and `q()`
are untouched (FR11), which is why the fraction generator owns its own option construction.

### 5.2 The generator

Answers are modelled as `{num, den}` and formatted last. Three skills, chosen from the injected `rng`:

| Skill | Prompt | `visual` | Answer |
|---|---|---|---|
| Name the fraction | *"What fraction is shaded?"* | `{kind:"bar", parts, shaded}` | `"3/4"` |
| Add / subtract, same denominator | `1/5 + 3/5 = ?` | none | `"4/5"` |
| Fraction of a quantity | `1/4 of 20 = ?` | none | `"5"` (integer) |

Denominators are drawn from `[2,3,4,5,6,8,10]` — the set that divides a bar cleanly. Sevenths and ninths
are excluded by the list, not by a `≤10` check, so the constraint is enforced by construction.

**Distractors and equality (FR12).** Candidates are the mistakes children make — numerator ±1,
denominator ±1, the two swapped, denominators added — filtered by:

```ts
const sameValue = (a: Frac, b: Frac) => a.num * b.den === b.num * a.den;   // never string compare
```

so `2/4` can never be offered against `1/2`. Candidates are also rejected if they duplicate an existing
option by value, or fall outside a sane range. If fewer than three survive, a deterministic widening
(±2 on the numerator) tops up — the generator must never return fewer than four options.

### 5.3 D2 — pictures: a structured field

`visual?: { kind: "bar"; parts: number; shaded: number }` on `QuizQuestion` (FR13). Optional, so the nine
existing topics are unaffected and no other generator changes.

`BarModel.tsx` renders `parts` equal `<rect>`s, `shaded` of them filled, with a stroked outline on every
segment — so filled/unfilled reads without relying on hue (story I25-D1 `[a11y]`). It uses a `viewBox`
with `width:100%`, so it scales to the panel rather than fixing a pixel width on a phone.

`QuizFlow` `[QuizFlow.tsx:120]` becomes:

```tsx
{q.visual ? <BarModel {...q.visual} /> : null}
<p className="text-2xl font-bold">{q.prompt}</p>
```

**No `dangerouslySetInnerHTML`.** The component receives two integers computed by a pure generator; no
markup is ever built from data (NFR10). The `visual` field is **not** added to the signed offer — the
offer signs `answers` and `questionIds`; the picture is presentation only.

---

## 6. Slice D — seen-tracking

### 6.1 Data model (FR18) — migration 0007

```sql
-- Inc25 FR18: per-child memory of which GRAMMAR questions a child has already
-- ANSWERED (not merely been served — rows are written on submit). `topic` is
-- part of the key so the exhaustion reset is one scoped DELETE, and so question
-- ids need only be unique WITHIN a bank rather than across all six.
CREATE TABLE "quiz_seen_questions" (
  "child_id"    text NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
  "topic"       text NOT NULL,
  "question_id" text NOT NULL,
  "seen_at"     timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "quiz_seen_questions_pk" PRIMARY KEY ("child_id","topic","question_id")
);
```

- The composite **primary key** *is* the uniqueness constraint — no separate unique index, and it is
  exactly the lookup key for both reads (`child_id, topic`) and the idempotent insert.
- `ON DELETE CASCADE` matches `quiz_completions` `[schema.ts:102-104]`, so removing a child cleans up.
- **Additive only**: no `ALTER` of any existing table (NFR2, story I25-F2).
- Bounded: 6 topics × ~50 questions × 3 children ≈ **900 rows** at saturation.

### 6.2 D4 — the port: two methods, with an atomic reset

```ts
export interface QuizStore {
  // …existing three…

  /** Question ids this child has already answered in `topic`. */
  seenQuestionIds(childId: string, topic: string): Promise<string[]>;

  /** Record `questionIds` as seen. When `reset`, clear the topic's existing
   *  rows first — atomically, so a crash can't lose the just-answered five. */
  markQuestionsSeen(entry: {
    childId: string;
    topic: string;
    questionIds: string[];
    reset: boolean;
  }): Promise<void>;
}
```

Two methods rather than three (read / mark / clear) **because the reset must be atomic with the insert**.
A service-orchestrated `clear()` then `mark()` can be interrupted between the two, leaving the child with
an empty seen-set and the five questions they just answered immediately eligible again.

neon-http has **no interactive transactions** — documented in this repo at
`collection-store.pg.ts:swapCards`. The adapter therefore uses `db.batch`, the same idiom `removeCard`
already uses `[collection-store.pg.ts:32-44]`:

```ts
async markQuestionsSeen({ childId, topic, questionIds, reset }) {
  if (questionIds.length === 0) return;
  const rows = questionIds.map((questionId) => ({ childId, topic, questionId }));
  const insert = db.insert(quizSeenQuestions).values(rows).onConflictDoNothing();
  if (!reset) { await insert; return; }
  await db.batch([
    db.delete(quizSeenQuestions).where(
      and(eq(quizSeenQuestions.childId, childId), eq(quizSeenQuestions.topic, topic)),
    ),
    insert,
  ]);
}
```

`onConflictDoNothing()` makes a replayed submission a no-op (story I25-E2, AC26).

### 6.3 D5 — selection and exhaustion as pure logic

`seen-select.ts` holds the two decisions so `quiz-service.ts` stays orchestration:

```ts
/** Prefer unseen; when fewer than `n` remain, serve all of them and fill from seen. */
export function selectUnseenFirst<T extends { id: string }>(
  bank: readonly T[], seenIds: readonly string[], n: number, rng: Rng,
): T[]

/** Would recording `servedIds` leave every question in the bank seen? */
export function coversBank(
  bankIds: readonly string[], seenIds: readonly string[], servedIds: readonly string[],
): boolean
```

Both are property-testable with no database and no DOM. `selectUnseenFirst` uses the existing `sample`
`[rng.ts]`, so the "five distinct questions" guarantee is inherited rather than re-implemented.

### 6.4 The two touched paths

**`buildQuiz` — reads, never writes** (consistent with Slice B's no-write-on-read posture):

```ts
const questions = isGrammarTopic(topicId)
  ? selectUnseenFirst(GRAMMAR_BANKS[topicId], await quiz.seenQuestionIds(childId, topicId), QUIZ_LENGTH, rng)
      .map((q) => ({ ...q, options: sample(q.options, q.options.length, rng) }))
  : generateMathQuestions(topicId, QUIZ_LENGTH, rng);

const offer = await makeQuizOffer({
  childId, topic: topicId,
  answers:     questions.map((q) => q.correct),
  questionIds: questions.map((q) => q.id),      // FR16
  exp: nowMs + OFFER_TTL_MS,
}, env.authSecret);
```

Option shuffling `[quiz-service.ts:27]` is preserved exactly.

**`submitQuiz` — the only writer**, after the existing scoring and `recordCompletion`:

```ts
// FR20: grammar only — math ids are positional [math-gen.ts:86] so tracking them
// is meaningless. FR17: a pre-deploy offer carries no ids; record nothing.
const ids = payload.questionIds ?? [];
if (ids.length > 0 && isGrammarTopic(payload.topic)) {
  const bankIds = GRAMMAR_BANKS[payload.topic].map((q) => q.id);
  const seen = await quiz.seenQuestionIds(childId, payload.topic);
  await quiz.markQuestionsSeen({
    childId, topic: payload.topic, questionIds: ids,
    reset: coversBank(bankIds, seen, ids),
  });
}
```

Seen-rows are written on **submit**, never at `buildQuiz` — an abandoned quiz writes nothing
(OQ-DR-T1, story I25-E2, AC25).

### 6.5 D6 — the offer payload

```ts
export interface QuizOfferPayload extends SignedPayload {
  childId: string;
  topic: string;
  answers: string[];
  questionIds?: string[];   // Inc25 FR16. OPTIONAL only to tolerate offers minted
  exp: number;              // before this deploy (FR17); buildQuiz always sets it.
}
```

The guard gains `(o.questionIds === undefined || Array.isArray(o.questionIds))` — accepting absence,
rejecting a wrong type. `signToken`/`verifyToken` are **untouched**: they are payload-agnostic
`[signed-token.ts]`, so the HMAC covers the new field automatically. That is what makes the ids
unforgeable (story I25-E3) with no change to the crypto primitive.

### 6.6 Test-harness changes

`tests-pg/db.ts` — `resetAll` TRUNCATE list gains `quiz_seen_questions` (it would otherwise leak rows
between contract runs and make them order-dependent), plus a `seedSeenQuestions` helper mirroring
`seedQuizCompletions`. Children referenced by seen-rows must exist for the FK, which
`quiz-store.pg.test.ts` already arranges via `seedChildren({kid:{}, other:{}})`.

---

## 7. Decisions

| | Decision | Choice |
|---|---|---|
| **D1** | Fractions dispatch | Fourth `GENERATORS` entry in `math-gen.ts`; `buildQuestions` stays at two branches; `options()`/`q()` untouched |
| **D2** | Pictures | Structured `visual?` field + `BarModel.tsx` inline SVG. No markup from data |
| **D3** | Maths mix per day | **D3=B — varying (1 or 2 maths/day), ≥1 guaranteed.** Corrected at Construction: 3 mix vectors, not 4 — `k₂ ≡ 1`, no fallback needed (§4.3) |
| **D4** | Seen-store port | **Two** methods; reset is atomic with the insert via `db.batch` |
| **D5** | Selection/exhaustion logic | Pure `seen-select.ts`, not inline in the service |
| **D6** | Offer payload | `questionIds?` optional in the type **and** the guard; always populated by `buildQuiz` |
| **D7** | Seeded RNG | `seededRng(seed: string)` added to `src/lib/rng.ts` — a shared primitive, not private to daily-topics |
| **D8** | Daily-3 non-repetition | **Structural** (disjoint slices of a per-cycle permutation), not a filter. The documents' "call it with `dayKey - 1`" does not terminate |
| **D9** | Retired-id map | `topicTitle(id)` in `topics.ts`; service calls it. Raw-id fallback retained |
| **D10** | Migration | `0007`, additive; composite PK doubles as the uniqueness constraint. No `ALTER` |

---

## 8. Test plan

Six obligations from the requirements, plus the four rewrites. All PBTs use named arbitrary helpers per
`tests/sacrifice.pbt.test.ts`.

| File | Kind | Properties |
|---|---|---|
| `tests/pick-tickets.test.ts` | rewrite | Bands derived from `RARITY_WEIGHTS`; no literal boundaries |
| `tests/quiz-bank.test.ts` | rewrite | 10 topics, 4 maths + 6 grammar |
| `tests/quiz-math-gen.pbt.test.ts` | rewrite + extend | Retarget to `number-bonds-1000`; every × and ÷ shape's answer correct; **the derived `explanation` reads correctly per shape** |
| `tests/quiz-service.test.ts` | rewrite | Existing cases re-based on a topic that is in today's three; **plus** a case asserting `buildQuiz` refuses one that is not (I25-B4) |
| `tests/quiz-fraction-gen.pbt.test.ts` | **new** `[PBT]` | Answer among options; options distinct **by value**; no distractor equal under cross-multiplication; denominator always in the allowed set; `visual.shaded ≤ visual.parts` |
| `tests/quiz-daily-topics.pbt.test.ts` | **new** `[PBT]` | Deterministic for `(child, day)`; exactly 3 distinct; **≥1 maths**; **disjoint from `dayKey-1` — asserted across cycle boundaries, not only within a cycle**; independent across child ids; the mix genuinely varies; every topic stays reachable |
| `tests/quiz-seen-select.pbt.test.ts` | **new** `[PBT]` | Unseen served first; all unseen served before any repeat when short; `coversBank` true exactly at exhaustion; always returns `min(n, bank)` distinct questions |
| `tests/contracts/quiz-store-contract.ts` | **extend** | Round-trip; scoped by child **and** topic; idempotent re-insert; `reset:true` clears only that `(child, topic)` and leaves the new ids; `reset:false` accumulates |

**The boundary case that must not be skipped**: `dailyTopics(c, d)` vs `dailyTopics(c, d-1)` where
`d mod 3 === 0` — the cycle transition (§4.2). A property run over arbitrary day keys covers it, but it
is called out because a hand-written test using consecutive days inside one cycle would pass while the
rotation logic was entirely broken.

**Enforcement caveat (NFR12)**: there is still no test CI. All of the above runs only when invoked
locally. This increment does not close parent OQ-T-2.

---

## 9. Risks carried into Construction

| Risk | Mitigation |
|---|---|
| The cycle-boundary rotation is the subtlest code in the increment and is invisible on 2 days out of 3 | The PBT above must generate arbitrary day keys, never a fixed consecutive pair |
| **The `k₀`-reduction fallback (§4.3) fires on ~1 boundary in 6** and is the likeliest thing here to be built wrong and never noticed | Its own property, plus the disjointness property already covers the failure mode it guards |
| `db.batch` semantics differ between the neon-http driver and the local proxy | The contract suite runs the reset case against **both** adapters, and `pnpm test:pg` is mandatory this increment (persistence changed) |
| Fraction distractor generation can starve on small denominators | The generator must guarantee four options; a deterministic widening tops up, and the PBT asserts option count universally |
| A grammar bank shorter than `QUIZ_LENGTH` would break `selectUnseenFirst` | Already guarded — `tests/quiz-bank.test.ts` asserts every bank ≥ `QUIZ_LENGTH * 2` |
| `RARITY_WEIGHTS` reachable from a stale test elsewhere | Whole-repo grep found exactly 5 reader sites; 2 code, 3 test. All accounted for |

---

## 10. Delivery order

1. **Slice A** — constant, generators, topic swap, retired map, 3 test rewrites. Independent.
2. **Slice C** — fractions generator, `visual`, `BarModel`, `QuizFlow`. Depends on A only for the shared
   `TOPICS` edit (both change it; land A first to keep the diff readable).
3. **Slice B** — `seededRng`, `daily-topics.ts`, the two pages, the `buildQuiz` gate. Needs C's fractions
   topic present so "4 maths topics" is true and the ≥1-maths guarantee cannot be starved.
4. **Slice D** — migration, schema, port + 2 adapters + contract, `seen-select.ts`, offer payload,
   `buildQuiz`/`submitQuiz` wiring.

Migration 0007 is applied via the existing `pnpm pg:up` / `drizzle-kit migrate` path **before or with**
the deploy — `buildQuiz` queries the new table on the first grammar quiz taken after release.

---

## Gate

**AWAITING APPROVAL** of D1, D2, D4–D10. **D3 was answered at design time: D3=B** (varying mix, ≥1
maths), which carries the `k₀`-reduction fallback in §4.3 — a real edge that the fixed-shape alternative
did not have, specified here rather than discovered in Construction.

Flagged, decided but worth your eye: **D8** contradicts a sentence in the feature's
technical-environment document. *"'Exclude yesterday's' comes free — call the same function with
`sgtDayKey - 1`"* does not terminate; non-repetition is delivered structurally instead. The outcome the
document wanted is preserved in full.
