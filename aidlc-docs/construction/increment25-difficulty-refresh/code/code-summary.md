# INCREMENT 25 — Code Generation Summary: Difficulty & Freshness

**Status**: DONE — all four slices
**Date**: 2026-08-08
**Design**: `aidlc-docs/inception/application-design/increment25-difficulty-refresh-design.md` (D1–D10, D3=B)
**Requirements**: FR1–FR20, NFR1–12, 30 acceptance criteria

---

## Gate results

| Gate | Result |
|---|---|
| `pnpm typecheck` | **clean** |
| `pnpm test` | **321/321** (was 278 before the increment) |
| `pnpm test:pg` | **47 passed, 3 skipped** — mandatory this increment, persistence changed |
| `pnpm build` | **succeeds** |
| New dependencies | **zero** |
| Migration | **0007**, additive only |
| `pnpm lint` | **not run** — `next lint` is unconfigured in this repo and prompts interactively for setup. Pre-existing; not among the documented CI gates (tests + typecheck + build) |

---

## What shipped

### Slice A — economy and maths shapes (FR1–FR6)

- `src/lib/types.ts` — `RARITY_WEIGHTS` → **70/21/7/2**. Four numbers; **no call-site change**, exactly
  as designed: `drawCard` and `rollWeightedRarity` already derive their bands from the constant.
- `src/features/quiz/math-gen.ts` — × and ÷ each gained two missing-operand shapes alongside the forward
  form; `numberBonds1000` replaced `numberBonds100`. `q()` and `options()` untouched.
- `src/features/quiz/topics.ts` — bonds-1000 with a rewritten lesson; `topicTitle()` + retired-id map;
  `MATH_TOPIC_IDS` / `GRAMMAR_TOPIC_IDS` exported for the daily draw.
- `quiz-service.ts` — the activity view resolves titles through `topicTitle()`.

### Slice C — fractions and pictures (FR11–FR15)

- **NEW** `src/features/quiz/fraction-gen.ts` — three skills, `{num,den}` modelling, mistake-shaped
  distractors, cross-multiplication equality, denominators drawn from a fixed clean-dividing set.
- **NEW** `src/features/quiz/BarModel.tsx` — inline SVG, no dependency, stroked segments so filled/empty
  reads without hue, `viewBox` + `width:100%` so it scales to the panel.
- `types.ts` — optional `visual?: QuizVisual` on `QuizQuestion`.
- `QuizFlow.tsx` — one conditional above the prompt.
- Registered as a **fourth `GENERATORS` entry** (D1), so `buildQuestions` kept its two branches.

### Slice B — the daily three (FR7–FR10)

- **NEW** `src/features/quiz/daily-topics.ts` — pure, derived, no persistence.
- `src/lib/rng.ts` — `seededRng(seed: string)` (xmur3 + mulberry32), a shared primitive.
- Both `/play/learn` pages now show and enforce today's three.
- **`buildQuiz` is the boundary** (FR10), not the route.

### Slice D — seen-tracking (FR16–FR20)

- **NEW** migration `0007_quiz_seen_questions.sql` + `quizSeenQuestions` in `schema.ts` — composite PK
  `(child_id, topic, question_id)`, `ON DELETE CASCADE`. Purely additive.
- **NEW** `src/features/quiz/seen-select.ts` — `selectUnseenFirst` + `coversBank`, pure.
- `QuizStore` gained `seenQuestionIds` and `markQuestionsSeen` (D4: two methods, atomic reset via
  `db.batch`), with pg adapter, in-memory fake, and **8 new contract cases** run against both.
- `quiz-offer.ts` — `questionIds?` in the payload and the guard.
- `quiz-service.ts` — reads seen at build (no write), records at submit, resets on exhaustion.

---

## Findings during Construction

### ⚠️ Finding 1 — the daily-topics design was still recursive, and the PBT caught it

The approved design fixed cycle-boundary collisions by **rotating both permutations** of cycle `E` and
computing the forbidden set from `rawCycle(c, E-1)`. That is wrong: rotating cycle `E-1` changes what
`E-1` actually served, so excluding its *raw* slot 2 excludes the wrong set. `resolveCycle(E)` therefore
depended on `resolveCycle(E-1)` — the unbounded recursion §4.2 was written specifically to eliminate was
still present, just hidden one level down.

It failed on the **first run** of `tests/quiz-daily-topics.pbt.test.ts`: `conjunctions` repeated across a
boundary (and `adjectives-vs-adverbs` on the previous revision). Neither is reachable by a test that
uses two consecutive days inside one cycle — which is precisely the risk the design flagged and the
reason that property generates arbitrary day keys.

**Fix**: *slot 2 is never adjusted.* It is a pure function of its own cycle's permutations, so cycle `E`
reconstructs `E-1`'s served set from raw material — genuinely one level back. Slot 0 picks from
everything except slot 2's topics, skipping the forbidden ones; slot 1 takes the remainder by set
difference. **No rotation, no rejection loop, no fallback.**

**Consequence — `MIX_VECTORS` lost a row.** `(1,1,2)` is gone: with `k₂ = 2`, slot 2 holds two of the
four maths topics, and a previous cycle whose slot 2 held those same two would leave slot 0 with **no
eligible maths at all**. Pinning `k₂ ≡ 1` makes the fix feasible unconditionally. D3=B survives intact —
days still get 1 or 2 maths.

**The `k₀`-reduction fallback specified in the design is therefore deleted**, not implemented: it was
patching a symptom of the wrong construction. The design doc §4.2/§4.3 carry correction notices.

### ⚠️ Finding 2 — `cycle === 0` was a needless anchor, and it broke day 0

The first fix skipped the look-back for cycle 0. But day 0 sits in cycle 0 at slot 0, and day −1 exists
in cycle −1, so the property found a repeat at `(child, day) = (" ", 0)`. `rawCycle` is total over every
integer; the guard was removed and cycle −1 resolves like any other. Real day keys are ~20,700 so this
was unreachable in production — but a test that only sampled realistic days would have hidden a genuine
asymmetry in the function.

### ⚠️ Finding 3 — the rewritten band test asserted floating-point identity

The first version of `tests/pick-tickets.test.ts` derived band edges as accumulated fractions
(`0.7 + 0.21 = 0.9099999999999999`) and probed them exactly, while `rollWeightedRarity` works in weight
units. It failed on the epic boundary. Rewritten to accumulate in weight units and probe **strictly
inside** each band, plus a 10,000-point sweep that skips the handful of points within float noise of an
edge. Testing IEEE-754 was never the point.

### Finding 4 — `quiz-service.test.ts` hardcoded a topic (predicted)

Predicted by the design; `TOPIC = "multiplication-within-100"` began failing the moment FR10's gate
landed. Re-based on `dailyTopics("kid", DAY)`.

Five of the new seen-tracking cases initially carried an `if (!OFFERED_GRAMMAR) return;` guard. The
fixture does contain grammar, so they ran — but a silently-skipping test is worse than no test, so the
guard was replaced with an explicit **fixture assertion** that fails loudly if the daily-topics
algorithm ever stops putting grammar in that child's three.

---

## Hand-verification against real Postgres

Driven through the **real** `quiz-service` + `pgQuizStore` on local PG16 + neon HTTP proxy, not the fake.
Child `kid`, day 20468 → today's three were `number-bonds-1000, prepositions, verb-tenses`.

```
gate: refused 'pronouns-vs-proper-nouns' -> buildQuiz: topic not offered today

attempt 1: seen_before= 0  served=5  repeats=0  -> seen_after=5
attempt 2: seen_before= 5  served=5  repeats=0  -> seen_after=10
attempt 3: seen_before=10  served=5  repeats=1  -> seen_after=5   <== RESET
attempt 4: seen_before= 5  served=5  repeats=0  -> seen_after=10
attempt 5: seen_before=10  served=5  repeats=1  -> seen_after=5   <== RESET

abandoned quiz: seen 5 -> 5  nothing burned
rows: quiz_seen_questions=5  quiz_completions=5
```

This reproduces **Finding C from Requirements exactly**: `prepositions` holds 14 questions, so it yields
**two clean attempts**, then 4-unseen-plus-1-repeat, then the reset — not the three the Join document
assumed. NFR7's recorded arithmetic is confirmed by observation, not by argument.

Also confirmed: the FR10 gate refuses through the service (not merely the page); an abandoned quiz writes
nothing; row growth is bounded.

`daily-topics` was separately stressed over **300,500 consecutive draws** across 10 child ids: **0**
repeats vs the previous day, **0** zero-maths days, **0** malformed sets, all 10 topics reachable, mix
~78% one-maths / ~22% two-maths.

---

## Visual check — DONE, and it found four defects no test caught

The fractions topic was **not reachable through the UI on the day of the check**: `dailyTopics` gave
jasper `Division · Adjectives vs Adverbs · Conjunctions`, jax `Multiplication · Adjectives vs Adverbs ·
Verb Tenses`, jazil `Division · Verb Tenses · Prepositions`. Earliest availability was **the next day**
for jax and jazil, +3 days for jasper.

> **Consequence worth keeping in mind**: with 3 of 10 topics drawn per day, any given topic — including
> brand-new UI — is reachable roughly **30% of days per child**, and can be invisible to *everyone* for
> a day or more after a deploy. Nothing to fix; it is the daily-3 design working as specified. But
> "ship it and look at it" is no longer a thing that can be done on demand.

The check was therefore done by server-rendering the **real** `BarModel` and **real** `fraction-gen`
output inside `QuizFlow`'s exact markup, with the app's compiled CSS inlined, at 390px. Four defects,
all of them invisible to the test suite because every one is a *judgement about what a child should
see*, not a property violation:

| # | Defect | Fix |
|---|---|---|
| 1 | **`3/3` appeared as an operand and an answer** — `3/3 − 1/3 = ?`. A whole number wearing a fraction's clothes; reads as a typo to a 7-year-old | Operands and results kept strictly proper; `n/n` rejected as a distractor. Halves dropped from add/subtract, where every non-trivial sum is a whole |
| 2 | **`6/10 of 120 = ?`** — an unsimplified fraction the children have not been taught to reduce (simplifying is explicitly OUT of scope), at a quantity beyond every other maths topic's scale | Only lowest-terms fractions; quantity capped at **100** |
| 3 | **Quantity distractors were `answer ± 1..5` noise** — for an answer of 72, the options were 73/74/77. Nothing a child would ever compute, so the question degenerated into spotting the odd one out — and it contradicted FR12's own premise, which had been applied to fraction answers but not to this integer skill | Mistake-shaped: one part instead of `num` parts, the remainder, divided by the numerator, `num × den` |
| 4 | **`var(--accent)` does not exist** in `globals.css` — the bar silently fell back to hard-coded amber, implying a theme token that was never there | Uses `--brand-1`, the app's real warm-gold accent (same family as `.pill--gold`) |

Three new properties pin 1–3 so they cannot regress: no `n/n` anywhere on screen (options *and* prompt
operands), lowest-terms-and-≤100 for quantities, and quantity options bounded by the whole. A fourth
bug surfaced while writing them — the option top-up could exceed the quantity being shared.

**Confirmed good**: bars render cleanly and legibly at 390px for every drawable denominator
(2,3,4,5,6,8,10); filled vs empty reads by fill, not hue; answers stay text buttons; the picture sits
above the prompt without pushing the options off-screen.

**Noted, not changed**: distractors may carry denominators outside the drawable set (`2/7` against a
6-part bar, `9/11` against a 10-part bar). They are never *drawn* — only the answer's denominator
reaches `visual` — and "did you miscount the parts?" is a legitimate error to offer.

> ⚠️ **A caution recorded for the record**: the first preview run appeared to show two serious generator
> bugs — three identical options on one card, and `2/4` offered against `1/2` on another. Both were
> **defects in the preview scaffolding**, which hand-faked cards for denominators the sample missed.
> The generator cannot produce either, and the PBTs forbid both. The scaffold was rewritten to use only
> real generator output. Worth remembering: a preview harness is not evidence about the code unless the
> harness itself is honest.

---

## Not done in this increment

- **Vision item 10** — growing the six grammar banks to 40–50 (~150–200 authored questions). Deferred to
  the feature's second PR by Q6=A. Bound by **OQ-DR-T3**: ids may be added to, never renumbered, reused
  or removed.
- **The §11 write-backs to `Product-Definition/`** — applied at the end of the increment.
- **A check inside the signed-in app.** The visual pass above used the real component, real generator
  output and the app's real CSS at 390px, but rendered statically — nobody has yet tapped through a
  fractions quiz as a signed-in child, because the topic was not reachable on the day (see above). Worth
  doing the first day it comes up.
- **Parent OQ-T-2 is not closed.** Six new test obligations landed; none of them runs in CI, because
  there is still no test CI.
