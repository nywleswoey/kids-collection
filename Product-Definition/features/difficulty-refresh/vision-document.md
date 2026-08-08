# Vision Document — Difficulty & Freshness

- **Scope**: five changes to the pull economy and the Play & Learn quiz
- **Status**: Business role complete, approved by the user 2026-08-08
- **Depth**: quick (7 CORE questions + 2 follow-ups, 3 amendments during the approval loop)
- **Parent definition**: `Product-Definition/vision-document.md` + `technical-environment.md`
  (approved 2026-08-03, Join: done). This document does not rewrite it.
- **Sibling sub-discoveries**: `features/collection-safety/` (2026-08-05),
  `features/vehicle-themes/` (2026-08-07)

---

## Executive Summary

Two things have gone soft at the same time, and they are the two halves of the same loop: pulling cards
is too easy, and earning the tickets that let you pull is too easy.

On the collection side, the pull odds have been common 60 / rare 25 / epic 12 / legendary 3 since the
game was built, while the pool has grown to 360 cards. Nothing about a pull feels like a gamble any more.

On the Play & Learn side, the problem is sharper and the children named it themselves: **they are
memorising the answers.** The diagnosis from the code is precise. Grammar questions come from
hand-authored banks of ~16 per topic, five sampled per attempt, with **no memory of what a child has
already seen** — the whole bank is exhausted in three or four sittings. Maths questions are generated
fresh every attempt, so no individual question repeats, but every question has had the same *shape*
since Increment 11: `a × b = ?` with factors 2–10. The numbers change; the thinking does not. And with
all nine topics permanently on the picker, a child can simply take the three easiest every day.

This increment raises the floor on both sides:

1. **Harder odds** — `RARITY_WEIGHTS` goes to 70 / 21 / 7 / 2, applied everywhere including easter eggs.
2. **A Fractions topic** — the first genuinely new maths skill since the quiz shipped, and the first
   quiz content with **pictures**.
3. **Number Bonds to 100 becomes Number Bonds to 1000** — a replacement, not an addition.
4. **Three topics a day, chosen for you** — free choice is removed.
5. **A real fix for memorisation** — bigger grammar banks *plus* per-child memory of what has been seen,
   *plus* missing-operand maths forms so the shape stops being predictable.

Items 4 and 5 are the ones that matter most. Items 1–3 raise difficulty; items 4 and 5 change what the
children can do about it.

---

## Business Context

### Problem Statement

**The pull has stopped being a gamble.** A collectible-card loop runs on *pull → is it good? → is it
new?*. At 12 epic in every 100 pulls and 3 legendary, the top two tiers arrive often enough to be
ordinary. The pool has tripled in size since the odds were set and the odds never moved with it.

**The quiz has stopped teaching.** The children pass by recognition, not by working anything out. Three
distinct mechanisms produce that, and only one of them is what anyone would call a bug:

| Mechanism | Where | Effect |
|---|---|---|
| Grammar banks are small and have no memory | `grammar-bank.ts` — ~16 per topic, `sample(bank, 5, rng)` | The same questions come round within days. This is the direct cause of "we've seen this one" |
| Maths shape never varies | `math-gen.ts` — `a × b = ?`, factors 2–10, since Inc 11 | The numbers are fresh; the method is automatic. Recall, not reasoning |
| All nine topics are always available | `app/play/learn/page.tsx` | A child optimises for the easiest three and never meets the hard ones |

Number Bonds to 100 sits at the intersection: procedurally generated, so never verbatim-repeated, but
the trick ("make the ones add to 10, the tens add to 90") is learned once and then applied on autopilot.
That is why it is being replaced rather than supplemented.

None of this is urgent. This is a family app; the driver is that both halves of the loop should keep
being worth doing.

### Business Drivers

- **Restore scarcity** to the pull, now that the pool is 360 cards.
- **Stop rewarding recall** in the quiz, where the reward is meant to be for working something out.
- **Widen the maths** — fractions are the first new skill area since the quiz shipped.

No market pressure, no deadline, no external obligation.

### Target Users and Stakeholders

| Role | Description | Primary Need |
|---|---|---|
| Child (early reader, ~7) | Pulls cards, fills the binder, takes quizzes for tickets | Questions that are actually new; a pull that feels like it could go either way |
| Parent (admin, sole operator) | Authors questions, tunes the economy | Changes that don't put existing collections or quiz history at risk |

### Business Constraints

- **$0/month runtime cost**, inherited from the parent definition. Nothing here adds a paid service.
  Per-child seen-question tracking (item 5) adds rows to Neon — small, but it is the one item in this
  increment with unbounded growth, and the technical role must bound it.
- **One-person team.** Growing six grammar banks from ~16 to 40–50 questions is roughly **150–200
  authored questions** — the single largest piece of work in the increment, and it is content work, not
  code.
- **The children's existing collections and quiz history are not to be damaged.** Item 3 replaces a
  topic id that appears in historical `quiz_completions` rows (OQ-DR-3).

### Success Metrics

**None — by explicit decision (Q7).**

The same stance the vehicle-themes increment took, and taken deliberately again here. The drivers above
are rationale, not measurements. Downstream stages must **not** re-derive this as a gap.

The nearest thing to a check is informal and the user named it during discovery: the children should
stop saying they have seen a question before.

---

## Full Scope Vision

### Product Vision Statement

Pulling a legendary should be a story, and passing a quiz should mean the child worked something out
today — not that they remembered what they worked out last week.

### The five changes

#### 1. Harder rarity — `RARITY_WEIGHTS` → 70 / 21 / 7 / 2

| Rarity | Today | New | Change |
|---|---|---|---|
| Common | 60 | **70** | +17% |
| Rare | 25 | **21** | −16% |
| Epic | 12 | **7** | **−42%** |
| Legendary | 3 | **2** | **−33%** |

Sums to 100, as the constant requires. Drawing is unchanged in mechanism: roll a rarity by weight, then
pick **uniformly** within it. Option (d) — biasing picks toward cards a child doesn't own — was offered
and **declined**, so there is still no duplicate protection.

**Applied everywhere (Q2a).** `src/features/pull/easter-egg.ts` consumes the same constant, so easter
eggs get harder by exactly the same amount. One constant, one behaviour — deliberately not split.
**Sacrifice** and **rarity-pick tickets** never consulted the weights and are untouched.

Consequence, accepted: with 24 legendaries across 12 themes, a *specific* legendary goes from ~0.125%
to ~0.083% per pull. Legendary set-completion gets materially longer for every theme.

#### 2. Fractions — a new topic, and the first quiz content with pictures

**One** topic (not several), drawing from three skills:

| Skill | Example |
|---|---|
| Name the fraction | a bar in 4 equal parts, 3 shaded → `3/4` |
| Add / subtract, same denominator | `1/5 + 3/5 = ?` |
| Fraction of a quantity | `1/4 of 20 = ?` |

Equivalent fractions, comparison, and simplifying were considered and **deferred** to a possible harder
fractions topic later.

**Pictures are in** (Amendment 1, overturning the initial plain-text recommendation):

- **Picture in the prompt, answers always text** (Q9-i = C). Reading a fraction *from* a picture is the
  skill being taught; choosing between four pictures is a different, more visual task, and four images
  per question is too much on a phone.
- **Bar models** — rectangles, not circles or groups of objects. Accurate at every denominator and it
  matches how the skill is taught here.
- **Denominators capped at 10.** Halves, thirds, quarters, fifths, sixths, eighths and tenths draw
  cleanly; sevenths and ninths do not.

This is **the only new UI in the increment.** Everything else is constants, generators, and authored
text.

#### 3. Number Bonds to 100 → Number Bonds to 1000

A **replacement** (Q4a), not an addition. The easier topic disappears; keeping both would have halved
the chance the harder one is ever drawn once item 4 randomises the daily set.

Numbers are a **mix — mostly arbitrary values in 1–999, with some rounder ones** (Q4-iv), so it doesn't
degrade into the same sum with bigger digits. The **lesson text must be rewritten**: the current one
teaches "ones make 10, tens make 90", which becomes "ones make 10, tens make 90, hundreds make 900".

#### 4. Three topics per day, chosen for the child

Free choice is **removed**. `/play/learn` shows exactly three topics, drawn from the ten.

| | Decision |
|---|---|
| Per child or shared? | **Per child.** Each gets their own three; no copying between siblings |
| Subject mix | **At least one maths topic** guaranteed every day |
| Repeats | **Yesterday's three are excluded** from today's draw |
| After all three are passed | **Replay is allowed, with no ticket** — and only within today's three. The other seven are unreachable until drawn |
| Reset | **Midnight SGT**, consistent with `sgtDayKey` |

The daily caps already fit this exactly and **do not change**: one ticket per topic per day, three
tickets per day. Three topics × one ticket each = precisely the cap. `decideAward` already returns
`topic-done` / `daily-cap` without granting, so ticket-free replay is existing behaviour, not new logic.

#### 5. Stopping the memorisation

Three moves, matched to the three mechanisms in the problem statement:

| Move | Attacks |
|---|---|
| **Grow every grammar bank to ~40–50 questions** (from ~16) | Bank size |
| **Track which questions each child has seen; prefer unseen ones until the bank is exhausted** | The absence of memory — the actual cause |
| **Missing-operand maths forms**: `7 × ? = 56`, `? × 8 = 56`, `56 ÷ ? = 7`, `? ÷ 8 = 7` | The shape being predictable |

Explicitly **not** doing: rewriting or retiring the existing grammar questions (they stay, just
outnumbered), procedural grammar generation, widening the maths ranges, division with remainders,
two-step questions, or word problems. Word problems in particular were declined for a specific reason:
authored text would reintroduce exactly the bank-memorisation problem this item exists to fix.

Ranges stay at 2–10, so **both maths topic titles and ids are unchanged** — "within 100" stays true.
The existing explanation derivation (`prompt.replace("?", answer)`) already produces a correct "why" for
every new shape: `"7 × ? = 56"` → `"7 × 8 = 56"`.

### Topic roster after this increment

Nine topics become **ten** — four maths, six grammar:

| Subject | Topics |
|---|---|
| Maths | Multiplication within 100 *(new forms)* · Division within 100 *(new forms)* · **Number Bonds to 1000** *(replaces bonds-to-100)* · **Fractions** *(new)* |
| Grammar | Verb Tenses · Pronouns vs Proper Nouns · Adjectives vs Adverbs · Conjunctions · Prepositions · Subject–Verb Agreement — *all six banks grown to 40–50* |

Three of ten are drawn per child per day.

---

## MVP Scope — Features IN

| # | Item | Notes |
|---|---|---|
| 1 | `RARITY_WEIGHTS` → 70/21/7/2 | One constant. Check for tests asserting the old values |
| 2 | Verify the easter-egg roll inherits it | Should be a no-op — same constant — but must be confirmed, not assumed |
| 3 | Fractions generator: three skills, denominators ≤10 | Answers are **strings** (`3/4`), which today's integer-only distractor helper cannot handle (OQ-DR-5) |
| 4 | Bar-model picture rendering in quiz prompts | The only new UI. Must work in the existing QuizFlow layout on a phone |
| 5 | Fractions lesson text | `intro` + `example`, matching the existing Topic shape |
| 6 | Replace `number-bonds-100` with `number-bonds-1000` | Generator, title, id, **and lesson rewrite** |
| 7 | Missing-operand forms for × and ÷ | Forward form retained; new shapes added alongside |
| 8 | Daily topic selection: 3 per child, ≥1 maths, excluding yesterday's, SGT | Must be deterministic for a given (child, day) so a refresh doesn't reroll |
| 9 | `/play/learn` picker shows only today's 3 | And the topic route must **reject** a topic not in today's set — otherwise the URL is a bypass |
| 10 | Grow six grammar banks to 40–50 each | ~150–200 authored questions. The largest single piece of work |
| 11 | Per-child seen-question tracking, preferring unseen | New persistence. Needs a bounded growth story |

### Non-Functional Priorities

- **Cost**: strictly $0. Item 11 is the only row-growth item; bound it.
- **Safety**: no risk to `collections` rows or to `quiz_completions` history.
- **Determinism**: the daily three must not reroll on refresh, and must be reproducible in tests. This
  repo's testing constraint (property-based tests, injected `rng`) applies to every generator here.
- **Kid-facing correctness**: every generated answer is *computed*, never authored — the existing
  `math-gen.ts` invariant. Fractions must hold to it.

---

## MVP Scope — Features OUT

All seven Q7 defaults accepted, plus what the follow-ups excluded:

| Excluded | Reason |
|---|---|
| Per-theme rarity tuning | Breaks the set-completion symmetry; already declined in the vehicle-themes discovery |
| Changing the pass bar (5/5) or quiz length (5) | Not the problem |
| Changing the daily ticket caps (1/topic, 3/day) | They already align exactly with three topics a day |
| Duplicate protection / unowned-bias in pulls | Q1(d) offered and declined |
| Retiring or rewriting existing **card** content | Out of scope |
| A "topics reset in Xh" countdown | Out of scope |
| An admin view of which questions a child has seen | Out of scope — the data exists, the screen doesn't |
| Rewriting or retiring existing **grammar** questions | Q6 chose (a)+(b), not (c) or (e) |
| Procedural grammar generation | Risks stilted or subtly wrong English |
| Equivalent / compare / simplify fractions | Deferred to a possible second fractions topic |
| Wider maths ranges (2–12), remainders, two-step, word problems | Q8 chose (a) alone |
| Circle or object-group fraction pictures | Bar models only |

---

## Risks and Open Questions

### Known Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Losing free choice feels punitive to a child mid-streak | Medium | Ticket-free replay within today's three softens it; the caps are unchanged so no *reward* is lost |
| Seen-question tracking grows without bound | Medium | Technical role must bound it — cap rows per child, or store a compact set rather than a row per question |
| Authoring 150–200 grammar questions stalls the increment | Medium | Content work is separable from code; the seen-tracking fix delivers value even at today's bank size |
| Harder odds make legendary sets feel unreachable | Medium | 70/21/7/2 was chosen over the steeper 75/18/6/1 for exactly this reason. Reversible — it is one constant |
| Replacing the bonds topic id orphans quiz history | Low | OQ-DR-3. The admin view already falls back to the raw id, so it degrades rather than breaks |
| Bar-model pictures don't fit the phone layout | Low | Answers stay text (Q9-i = C), so only the prompt area grows |
| The daily three rerolls on refresh | Low | Requires deterministic selection keyed on (child, SGT day) — called out as scope item 8 |

### Open Questions

Resolved inside the approval loop:

| ID | Question | Resolution |
|---|---|---|
| OQ-DR-1 | Do the maths topics need refreshing too? | **Yes** — missing-operand forms (Amendment 3, Q8a) |
| OQ-DR-2 | Fractions: picture or plain text? | **Pictures** (Amendment 1) |
| OQ-DR-6 | Replay: all 10 topics or today's 3? | **Today's 3 only** (Amendment 2) |
| OQ-DR-7 | Bar models + denominators ≤10 were assumed, not stated | **Confirmed at approval** 2026-08-08 |

Carried into the technical role:

| ID | Question |
|---|---|
| OQ-DR-3 | Replacing `number-bonds-100` orphans historical `quiz_completions.topic` rows — accept the fallback, migrate the rows, or keep the id and change only the title? |
| OQ-DR-4 | Per-child seen-question tracking needs new persistence — which store, what schema, and how is growth bounded? |
| OQ-DR-5 | Fraction answers are strings; `math-gen.ts`'s `options()` distractor helper is integer-only. Plausible wrong fractions must be generated, not padded |

---

## What Must NOT Change

- **The children's existing collections.** Nothing in this increment writes to `collections`.
- **`quiz_completions` history.** Item 3 changes a topic id that appears in old rows; the fix must not
  delete or rewrite them.
- **The daily ticket caps** — 1 per topic, 3 per day, bucketed on the SGT day. They are load-bearing for
  item 4's design.
- **Answers are computed, never authored, in every maths generator.** The safety property that makes a
  generated answer key trustworthy for a child.
- **The signed quiz offer remains the authority for scoring.** Client-side answer keys are for immediate
  feedback only; the award is re-scored server-side.
- **`RARITY_WEIGHTS` must sum to 100** and stay a single constant shared with the easter-egg roll.
- **Uniform picking within a rarity.** No duplicate protection was introduced, and adding one silently
  would change the economy in a way the user explicitly declined.
