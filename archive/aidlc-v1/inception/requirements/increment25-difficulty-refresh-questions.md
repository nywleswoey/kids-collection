# INCREMENT 25 — Requirements Questions: Difficulty & Freshness

**Date**: 2026-08-08
**Stage**: Requirements Analysis (AI-DLC Inception)
**Source**: `Product-Definition/features/difficulty-refresh/` (aidlc-discovery, both roles approved
2026-08-08; Join complete with **J1–J3 open**)
**Parent definition**: `Product-Definition/{vision-document,technical-environment}.md` (2026-08-03) —
read for inherited constraints, **not superseded**
**Status**: **ANSWERED 2026-08-08** — Q1=A, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A, Q8=A.
J1, J2, J3 and Findings A/B all closed; Requirements Analysis approved.

---

## 1. Scope boundary

The vision's **MVP Scope — Features IN** table (11 items) is the scope boundary. All 13 *Features OUT*
rows stay out. Three "What Must NOT Change" sections bind: the parent vision's, the parent technical
environment's, and this feature's — the last of which now carries the **new grammar-question-id
durability invariant** (OQ-DR-T3).

---

## 2. Grounding facts (verified in code, 2026-08-08)

Every claim below was read from the repository at this commit, not carried from the feature documents.

### Confirmed as the documents describe

| Claim | Evidence |
|---|---|
| `RARITY_WEIGHTS` is 60/25/12/3, one constant | `src/lib/types.ts:13-18` |
| Both roll sites read the constant; nothing else does | `src/lib/logic.ts:34,40`; `src/features/pull/easter-egg.ts:19,22` |
| `tests/pick-tickets.test.ts:44` hardcodes the bands `0.6 / 0.85 / 0.97` | `tests/pick-tickets.test.ts:44-54` — **will fail** |
| `tests/logic.pbt.test.ts` reads the constant and adapts | `tests/logic.pbt.test.ts:78` — stays green |
| Grammar banks are sampled 5-of-bank with no memory | `quiz-service.ts:25` — `sample(GRAMMAR_BANKS[topicId], QUIZ_LENGTH, rng)` |
| Maths ids are positional and re-used every attempt | `math-gen.ts:86` — `gen(\`${topicId}-${i}\`, rng)` |
| `options()` is integer-only | `math-gen.ts:14-25` — `Set<number>`, `answer + delta` |
| The explanation is derived by filling the blank | `math-gen.ts:36` — `prompt.replace("?", String(answer))`; holds for missing-operand shapes |
| `QuizFlow` renders the prompt as a bare string | `QuizFlow.tsx:120` — `<p>{q.prompt}</p>`, no markup path |
| The picker lists all topics ungrouped by day | `app/play/learn/page.tsx:37` |
| `decideAward` already declines without granting | `cap.ts:20-30` — `topic-done` / `daily-cap`; ticket-free replay needs no new logic ✅ |
| Retired-id display has a natural seam | `quiz-service.ts:144` — `getTopic(r.topic)?.title ?? r.topic` |
| `sgtDayKey` is pure and integer-keyed | `cap.ts:10-12` — `sgtDayKey - 1` genuinely gives yesterday ✅ |

### ❗ J1 confirmed exactly as the Join describes

`QuizOfferPayload` is `{ childId, topic, answers, exp }` `[quiz-offer.ts:14-19]` and the submit action is
`submitQuizAction(offer, picks)` `[actions.ts:14-17]`. **Neither carries question ids.** At
`submitQuiz` `[quiz-service.ts:79]` the server knows which *answers* were correct and nothing about which
*questions* were asked. There is no value to write a seen-row against. The Join's reading is correct and
its recommendation (a) is sound. → **Q1**, **Q2**.

### ⚠️ Finding A — the "today's three" gate must live in the service, not the route

Both feature documents locate the enforcement at the route: *"`/play/learn/[topicId]` refuses a topic
outside today's three"* (D5/T5-i), reasoning correctly that hiding the other seven in the picker is not
enforcement because the URL is navigable.

The same reasoning goes one step further and the documents do not take it. `startQuizAction(topicId)`
`[actions.ts:9-11]` is a **Server Action** — a directly invocable POST endpoint that takes the topic id
from the client. A page-level check is bypassed by calling the action, exactly as a picker-level check is
bypassed by typing the URL. The route redirect is UX; it is not the boundary.

This is the parent technical environment's own standing rule — *"middleware gates, **and** pages re-check
… never rely on middleware alone"* — and its prohibited pattern *"don't trust a client-supplied
identity"*, of which a client-supplied topic id is the same shape. The gate belongs in `buildQuiz`, where
`childId` is already server-resolved, with the route redirect kept for UX. → **Q3**.

Stakes are low (private app behind a Google allowlist; the only "attacker" is a 9-year-old with dev
tools) but the fix is a three-line guard in a function the increment is already editing, and item 4 of
the vision — *removing free choice* — is the one thing an optimising child has a motive to defeat.

### ⚠️ Finding B — the approved schema cannot perform the approved reset

D1 specifies the table as `quiz_seen_questions (child_id, question_id, seen_at)` with
`UNIQUE (child_id, question_id)`, and separately specifies *"on exhaustion, **reset that topic's**
seen-set for that child"* (T1-i).

A row of `(child_id, question_id, seen_at)` does not say which topic the question belongs to. Today the
ids are prefixed by convention — `vt-*`, `pp-*`, `aa-*`, `cj-*`, `pr-*`, `sv-*`
`[grammar-bank.ts:27-140]` — but that prefix is a naming habit, not data, and parsing it would make the
durable-id invariant (OQ-DR-T3) silently load-bearing on the *prefix* as well as the id. The per-topic
reset is therefore not implementable from the specified columns without either a topic column or the
service passing in the whole bank's id list. → **Q4**.

Related, and settled by the same choice: `UNIQUE (child_id, question_id)` assumes grammar ids are unique
**globally across all six banks**, not merely within one. They are today (six distinct prefixes, 92 ids,
no collision), but `tests/quiz-bank.test.ts:19-25` only asserts uniqueness **within** each bank. The
authoring follow-up that adds ~150–200 ids is exactly where a global collision would be introduced, and
nothing would catch it — a collision would silently merge two topics' seen-sets.

### ⚠️ Finding C — two banks are 14, not ~16, so J2's arithmetic is worse than recorded

Actual bank sizes: `verb-tenses` 16, `pronouns-vs-proper-nouns` 16, `adjectives-vs-adverbs` 16,
**`conjunctions` 14**, **`prepositions` 14**, `subject-verb-agreement` 16.

| Bank size | Clean attempts before the first repeat |
|---|---|
| 16 | **3** (5, 5, 5 → 1 left; attempt 4 is 1 unseen + 4 repeats) |
| **14** | **2** (5, 5 → 4 left; attempt 3 is 4 unseen + 1 repeat) |

The Join's table assumes 16 across the board. For two of the six topics the transitional freshness J2
weighs is **two attempts, not three**. It does not change J2's options, but it does weaken option (a)'s
"the rationale holds". → **Q5**.

### ⚠️ Finding D — adding a field to the offer payload invalidates in-flight offers

`isQuizOfferPayload` `[quiz-offer.ts:21-29]` is the type guard `verifyQuizOffer` applies, and
`submitQuiz` throws *"invalid or expired offer"* when it returns null `[quiz-service.ts:86]`. If Q1
resolves to adding `questionIds` and the guard **requires** it, every offer minted before the deploy
fails on submit — a child mid-quiz at deploy time loses that attempt with an error, for up to
`OFFER_TTL_MS` = 10 minutes `[quiz-service.ts:19]`. → **Q2**.

### Tests that will break (all four are correct-to-break, none is a defect)

| Test | Why | Disposition |
|---|---|---|
| `tests/pick-tickets.test.ts:44` | Hardcodes 60/25/12/3 bands | Rewrite to derive bands from `RARITY_WEIGHTS` (T6) |
| `tests/quiz-bank.test.ts:32-34` | Asserts 9 topics / 3 math / 6 grammar | → 10 / 4 / 6 |
| `tests/quiz-math-gen.pbt.test.ts:5-8,83-92` | Names `number-bonds-100` in its topic list and a dedicated property | Retarget to `number-bonds-1000` |
| `tests/quiz-service.test.ts` | Builds quizzes for the current topic set | Re-check once daily-3 gating lands in the service (Q3) |

### Dispatch note for Application Design (not a question)

`buildQuestions` `[quiz-service.ts:22-32]` dispatches `isMathTopic` → `generateMathQuestions` →
`GENERATORS[topicId]`, whose signature is `(id, rng) => QuizQuestion` built through the integer-only `q()`
helper `[math-gen.ts:27-44]`. Fractions is `subject: "math"` (it must be — the ≥1-maths guarantee counts
it) but cannot go through `q()`/`options()`, which D3 keeps untouched. Whether fractions registers as a
fourth `GENERATORS` entry with its own internal path or gets a third branch in `buildQuestions` is
Application Design's call; that `options()` is not modified is the requirement.

---

## 3. Questions

### Q1 — J1: how does the server learn which questions were served? **(BLOCKING)**

| | Option | Consequence |
|---|---|---|
| **A** | **Add `questionIds: string[]` to the signed offer payload** *(recommended — Join's (a))* | Server-authoritative and tamper-proof; keeps the offer the single record of what was served. Touches `QuizOfferPayload`, `isQuizOfferPayload`, `buildQuiz`, `submitQuiz`. Token grows by 5 short ids — inert, it already carries 5 answer strings |
| B | Client sends the ids alongside `picks` | Forgeable: a modified client suppresses seen-tracking and keeps the bank fresh forever. Puts an integrity hole in the one path this repo keeps strictly server-authoritative |
| C | Write seen-rows at `buildQuiz` | Contradicts the approved OQ-DR-T1 ("seen" = answered) and reintroduces the abandoned-quiz burn |

**Recommendation: A.** Also note it is naturally idempotent — a replayed offer re-inserts the same
`(child_id, question_id)` pairs, which the UNIQUE constraint absorbs.

### Q2 — Finding D: how does the guard treat a pre-deploy offer?

| | Option | Consequence |
|---|---|---|
| **A** | **`questionIds` optional in the guard; missing ⇒ record no seen-rows** *(recommended)* | No child loses an in-flight attempt at deploy. The tolerance is inert after 10 minutes and costs one `?? []`. Every *newly minted* offer always carries the ids |
| B | Require it | Up to 10 minutes of "invalid or expired offer" for anyone mid-quiz at deploy. Cleaner type, worse for the three users the app has |

### Q3 — Finding A: where is "today's three" enforced?

| | Option | Consequence |
|---|---|---|
| **A** | **In `buildQuiz` (throws/declines), with the route redirect kept for UX** *(recommended)* | The gate sits where `childId` is server-resolved. Consistent with the repo's defence-in-depth rule. Route redirect stays so a stale link is friendly, not an error |
| B | Route only, as the feature documents state | `startQuizAction("fractions")` bypasses it — a Server Action is a POST endpoint, not a page |

### Q4 — Finding B: how is the seen-set scoped so the per-topic reset works?

| | Option | Consequence |
|---|---|---|
| **A** | **Add `topic` to the table; key `UNIQUE (child_id, topic, question_id)`** *(recommended)* | Reset is one scoped `DELETE`. Makes the topic↔question relation data rather than a filename convention. Removes the global-id-collision hazard entirely — ids need only be unique **within** a bank, which the existing test already asserts. Row estimate unchanged (~900) |
| B | Keep `(child_id, question_id)`; the service passes the bank's id list to reset | No schema change beyond D1 as written, but the reset carries ~50 ids per call, and grammar ids must now be globally unique — needing a **new** cross-bank uniqueness test that does not exist today |

**Recommendation: A**, and either way OQ-DR-T3 (ids never renumbered/reused/removed) is unchanged.

### Q5 — J2: the transitional replay gap (sharpened by Finding C)

| | Option | Consequence |
|---|---|---|
| **A** | **Accept; record the arithmetic including the 14-question banks; sequence the authoring next** *(recommended — Join's (a))* | Nothing to build. Real but temporary; four replays of one topic in one afternoon is not the common case |
| B | Author the six banks to ~30 before shipping code | Halves the follow-up, reintroduces the long pole T7 split out |
| C | Cap replays per topic per day | New rule, new state, re-imposes friction Amendment 2 removed |
| D | Serve least-recently-seen instead of resetting on exhaustion | Removes the cliff at any bank size and is arguably better; contradicts approved T1-i |

If **A**, D6's claim is restated precisely: seen-tracking delivers most of its value at today's bank size
*for the once-a-day path*, not under heavy replay — and for `conjunctions` / `prepositions` that is two
clean attempts, not three.

### Q6 — J3: what does "Increment 25" name? *(assumed A unless overridden)*

| | Option |
|---|---|
| **A** | **Increment 25 = vision items 1–9 and 11 (code). Item 10 (~150–200 authored grammar questions) is IN scope for the *feature*, delivered as a second PR** *(recommended — Join's recommendation)* |
| B | Increment 25 includes the authoring; one increment, two slices |

### Q7 — Are User Stories generated? *(assumed A unless overridden)*

| | Option |
|---|---|
| **A** | **Generate User Stories** *(recommended)* — unlike Increments 23 and 24, this one changes the child's journey (free choice removed; three topics chosen for them) and adds the first new child-facing UI in the quiz (bar models) |
| B | Skip, straight to Application Design, as Inc 23/24 did |

### Q8 — Product-Definition write-backs at the end of the increment *(assumed A unless overridden)*

| | Option |
|---|---|
| **A** | **This feature's deltas only** — new odds in the parent vision; the topic roster 9→10; J1's payload change recorded against the "signed offer" invariant; J1–J3 closed in the feature's `open-questions.md`. Increment 23's 10 pending write-backs stay out *(recommended, consistent with Inc 24 Q8=A)* |
| B | Also clear the Inc 23 backlog |

---

## 4. Recorded, not asked

Accepted consequences carried from the Join. Downstream stages must **not** re-derive these as gaps:

- **No success metrics**, by explicit decision (vision Q7). Same stance as Increment 24.
- A specific legendary goes from ~0.125% to ~0.083% per pull; legendary set-completion lengthens for all
  12 themes.
- Ticket earning gets harder — at least one maths topic is forced daily. Caps unchanged.
- Old `quiz_completions` rows keep `number-bonds-100` and render as retired. History is never rewritten.
- **Parent OQ-T-2 is not closed** by this increment, and the exposure grows: six new test obligations,
  including fraction correctness, which reaches a child directly, all resting on developer discipline
  because there is still no test CI.
