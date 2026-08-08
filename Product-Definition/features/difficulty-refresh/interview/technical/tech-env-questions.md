# Technical Constraints Interview — Difficulty & Freshness (Technical role)

- **Progress**: Business role ✅ **complete and approved** — see `vision-document.md`. Batches 1–2 of
  the vision interview are saved in `interview/business/vision-answers-history.md`; nothing is lost.
- **Depth**: quick — 7 CORE questions, single batch. Fill the `[Answer]:` tags and reply `ready`.
- This interview **records constraints and decisions** — it does not design the implementation. Three
  business questions were deliberately deferred here (OQ-DR-3, OQ-DR-4, OQ-DR-5) and T1–T3 close them.

## What I read out of the code before writing these

| Thing | Where | Today |
|---|---|---|
| Quiz persistence | `src/db/schema.ts:96` `quiz_completions` | `(id, childId, topic, correct, total, passed, awarded, createdAt)`, indexed on `(childId, createdAt)` |
| Quiz port | `src/db/stores/quiz-store.ts` | 3 methods; two adapters (pg + in-memory fake) kept honest by `tests/contracts/quiz-store-contract.ts` |
| Migrations | `src/db/migrations/` | 7 SQL files, applied in sorted order by `pnpm pg:up`; `drizzle-kit migrate` for prod |
| Question prompt rendering | `src/features/quiz/QuizFlow.tsx:120` | `<p className="text-2xl font-bold">{q.prompt}</p>` — a plain string, no markup path |
| Distractor generation | `math-gen.ts` `options()` | Integer-only: `answer + delta`, filtered `>= 0`, padded with `answer + 4…` |
| Weight assertions | `tests/pick-tickets.test.ts:44`, `tests/logic.pbt.test.ts:53` | One test **hardcodes the 60/25/12/3 bands** and will fail the moment the constant changes |

---

### T1 [CORE]: Where does "which questions has this child seen" live? (resolves OQ-DR-4)

The vision's item 5 needs per-child memory of seen questions. This is the only new persistence in the
increment and the only thing here with unbounded row growth, so the shape matters.

a) **A new table** `quiz_seen_questions (child_id, question_id, seen_at)` with a UNIQUE on
   `(child_id, question_id)`, reached through a new `QuizStore` method (or its own `SeenStore` port).
   Normalised, easy to query, one row per child per question — with 6 topics × 50 questions × 3 children
   that tops out around **900 rows**, which is nothing.
b) **A JSON column on `children`** holding a per-topic array of seen question ids. No new table, no
   join, one row per child forever — but it is a read-modify-write on a hot row, and it needs care
   under concurrent submissions.
c) **Derive it from `quiz_completions`** by also recording which question ids were served. No new
   table; add a `question_ids text[]` (or JSON) column to the existing one. History and "seen" stay in
   the same place.
d) Other.

Two sub-questions either way:

- **T1-i — when the bank is exhausted, then what?** Reset the child's seen-set for that topic (so it
  cycles), or fall back to sampling anything (least-recently-seen first)?
- **T1-ii — does this go through a Store port at all?** Every other persistence in this repo does
  (`ChildStore`, `CollectionStore`, `QuizStore`, `RewardStore`), with a pg adapter, an in-memory fake,
  and a shared contract suite. Confirming this means the seen-tracking work includes a contract spec.

**Recommendation:** (a) with a **new method on the existing `QuizStore`** rather than a new port — it
is the same aggregate and the same lifecycle. (T1-i) **reset that topic's seen-set** when exhausted:
simple, self-healing, and it means a child who has genuinely done all 50 starts a fresh cycle instead
of hitting a degenerate "everything is seen" state. (T1-ii) yes — port + fake + contract, no exception.

[Answer]:

---

### T2 [CORE]: How is `number-bonds-100` replaced without harming history? (resolves OQ-DR-3)

The topic id is a plain `text` column on every historical `quiz_completions` row. The admin activity
view renders `getTopic(r.topic)?.title ?? r.topic`, so an unknown id degrades to the raw string rather
than crashing.

a) **New id `number-bonds-1000`; leave history alone.** Old rows keep saying `number-bonds-100` and the
   admin view shows the raw id for them. Honest — those attempts really were the old topic — and needs
   no migration.
b) **Keep the id `number-bonds-100`, change only the title and generator.** No migration, no orphans,
   but the id then lies about what the topic is, forever.
c) **Migrate the rows**: `UPDATE quiz_completions SET topic = 'number-bonds-1000' WHERE topic =
   'number-bonds-100'`. Clean going forward, but it rewrites history to claim attempts at a quiz that
   did not exist when they were taken.
d) **(a) plus a retired-topic label** — keep a small map of dead ids → display names so the admin view
   shows "Number Bonds to 100 (retired)" instead of a raw id.

**Recommendation:** (d). It is (a) — no migration, no rewritten history — with about four lines that
stop the admin view looking broken. (c) is the one to avoid: this repo's whole Increment 23 posture is
that historical child data does not get rewritten for cosmetic reasons.

[Answer]:

---

### T3 [CORE]: How are fraction answers and distractors represented? (resolves OQ-DR-5)

`options()` in `math-gen.ts` is integer-only — it builds distractors as `answer ± delta`, filters
negatives, and pads with `answer + 4`. Two of the three fraction skills have **fraction** answers
(`3/4`, `4/5`); only *fraction of a quantity* yields an integer.

The failure mode to design against: a distractor that is accidentally **equal** to the answer
(`2/4` offered against `1/2`), or one that is not a plausible mistake (`7/3` against `3/4`).

a) **A dedicated fraction generator with its own distractor logic** — answers modelled as
   `{ num, den }`, formatted to a string at the end; distractors built from the *mistakes children
   actually make*: numerator ±1, denominator ±1, numerator and denominator swapped, adding the
   denominators (`1/5 + 3/5 = 4/10`). Equality checked by cross-multiplication, not string comparison.
b) **Generalise `options()`** to work over any answer type via a comparator + a "nearby value"
   function, with fractions as the first non-integer instance.
c) **Keep answers as strings** and hand-author distractor sets per question template.

**Recommendation:** (a). The classic wrong answers *are* the teaching value here — `4/10` for
`1/5 + 3/5` is the single most useful distractor in the whole topic, and no generic "nearby value"
helper will produce it. Keep `options()` untouched for the integer topics; `1/4 of 20` can keep using it.

[Answer]:

---

### T4 [CORE]: How does a bar-model picture reach the screen?

Today a question is `{ id, prompt, options, correct, explanation }` and the prompt renders as a plain
string. Pictures need a new path.

a) **Add an optional structured field** — e.g. `visual?: { kind: "bar"; parts: number; shaded: number }`
   — and render it with a small React component that draws inline SVG. The data stays declarative and
   testable; nothing about it can inject markup.
b) **Put an SVG string in the prompt** and render it with `dangerouslySetInnerHTML`. Fewest moving
   parts, but it puts a raw-HTML path into a kid-facing screen.
c) **Unicode blocks** — `▰▰▰▱` as text. No new component at all, works everywhere, but it is crude and
   awkward for a screen reader.
d) **Pre-rendered images** in Blob storage. Consistent with how cards work — and completely wrong here,
   since the questions are generated at request time.

Sub-question **T4-i — does the picture cross the signed-offer boundary?** The offer signs `answers`
only, so a visual field on the client question does not affect scoring integrity. Confirming that
reading: the picture is presentation, the answer key is authority.

**Recommendation:** (a). It keeps generators pure and property-testable — a test can assert
`{ parts: 4, shaded: 3 }` without touching the DOM — and it keeps a `dangerouslySetInnerHTML` out of
the child-facing path entirely. (b) is a real correctness/safety regression for a small saving.

[Answer]:

---

### T5 [CORE]: Is the daily set of 3 topics derived or stored?

The requirements: 3 per child per day, at least 1 maths, excluding yesterday's 3, resetting at midnight
SGT, and **stable across refreshes** (a reroll on every page load would let a child shop for easy
topics — the exact thing item 4 removes).

a) **Derive it — a pure function of `(childId, sgtDayKey)`**, seeded by a hash of the two. No table, no
   migration, no write path. "Exclude yesterday's" comes free: call the same function with
   `sgtDayKey - 1`. Deterministic, replayable for any date, and property-testable with the repo's
   existing injected-`rng` style.
b) **Store it** — a `daily_topics (child_id, day, topic_ids)` row written on first visit each day.
   Explicit and inspectable, but it is a new table, a new migration, a write on a read path, and a
   race if two tabs open at once.

Sub-question **T5-i — where is it enforced?** Hiding the other seven in the picker is not enforcement;
`/play/learn/[topicId]` is directly navigable. Confirming the route must **reject** a topic outside
today's three, not merely omit it from the list.

**Recommendation:** (a) — a new pure module `src/features/quiz/daily-topics.ts`, sitting beside `cap.ts`
which already does exactly this kind of pure SGT-day reasoning. And yes to (T5-i): the route rejects.

[Answer]:

---

### T6 [CORE]: Test obligations — and the assertion that is going to break

**One existing test will fail the moment `RARITY_WEIGHTS` changes:**
`tests/pick-tickets.test.ts:44` — *"maps the weight bands to the right tier (60/25/12/3)"* — hardcodes
the cumulative boundaries `0.6 / 0.85 / 0.97`. (`tests/logic.pbt.test.ts:53` reads the constant, so it
adapts on its own.)

- **T6-i — how should that test be fixed?** Re-hardcode the new boundaries (`0.70 / 0.91 / 0.98`), or
  rewrite it to **derive** the bands from `RARITY_WEIGHTS` so the next tuning doesn't break it again?
- **T6-ii — which new tests are mandatory** for this increment? Candidates: property tests for the
  fraction generator (answer always in options; options always distinct; no distractor equal to the
  answer by value), the bonds-to-1000 generator, missing-operand forms, daily-topic selection
  (determinism for a given `(child, day)`; always ≥1 maths; never yesterday's), the seen-question
  preference (unseen served first until exhausted), and a **contract-suite extension** if T1 adds a
  Store method.

**Recommendation:** (T6-i) **derive the bands from the constant** — the test's purpose is "the bands
match the weights", and hardcoding restates the constant instead of checking it. (T6-ii) all of the
listed candidates; they are the repo's existing standard, not extra ceremony. The parent definition
also flags **OQ-T-2 — the PBT/CI gate is declared but not enforced** — so these tests are only as
binding as the discipline running them.

[Answer]:

---

### T7 [CORE]: Delivery shape — one increment, or split?

The vision has 11 scope items across three fairly independent areas, plus **150–200 authored grammar
questions**, which is the largest single piece of work and is content rather than code.

a) **One increment, one PR.** Everything lands together.
b) **Split by risk** — (1) the constant change + maths generator changes, (2) daily topics + picker,
   (3) fractions + pictures, (4) seen-tracking + bank authoring. Four smaller PRs.
c) **Split code from content** — all the code in one increment; authoring the ~200 grammar questions as
   a separate, unblocking follow-up.
d) Other.

Also: **any constraint changes?** This increment needs **no new dependencies** as far as I can tell —
inline SVG needs no library, and the seen-tracking uses the existing Drizzle/Neon stack. Confirming
that, and confirming the parent definition's stack constraints (TypeScript only, no `allowJs`,
property-based tests, $0/month) all still hold unchanged.

**Recommendation:** (c). The code is a coherent unit and the bank authoring is a long tail that
shouldn't hold a PR open — and critically, **seen-question tracking delivers most of its value at
today's bank size**, so shipping it early is what actually stops the memorisation while the new
questions get written.

[Answer]:

---

When the `[Answer]:` tags are filled, reply **`ready`**.
