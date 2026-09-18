# INCREMENT 11 — Application Design: Educational Quizzes

New feature module `src/features/quiz/*` + migration 0003. Reuses existing patterns: HMAC signed offer (pull/offer.ts), atomic grant (grantSpecial), active-child session, admin overview.

## Data model (FR9) — migration 0003
New table `quiz_completions` in `src/db/schema.ts`:
```
id          text pk default gen_random_uuid()
childId     text notNull FK children(id) onDelete cascade
topic       text notNull            -- topic id, e.g. "add-within-20"
correct     integer notNull         -- score 0..5
total       integer notNull         -- always 5
passed      boolean notNull         -- correct === total
awarded     boolean notNull         -- a lucky ticket was granted
createdAt   timestamptz notNull default now()
index (childId, createdAt)
```
`pnpm db:generate` → migration 0003; `pnpm db:migrate` post-deploy. No change to `children` (reuse `luckyTickets`).

## Module layout `src/features/quiz/`
- **types.ts** — `QuizQuestion { id; prompt; options: string[]; correct: string }`, `Topic { id; subject: "math"|"grammar"; title; lesson: Lesson; }`, `Lesson { intro: string; example: string }`, `QuizOutcome`.
- **topics.ts** — the 6 topic definitions (title + authored `lesson`), tagging math topics with a generator id, grammar topics with their bank. Single source of truth; UI reads titles/lessons from here.
- **grammar-bank.ts** — 3 grammar topics × ~16 hand-authored `QuizQuestion` (verified keys): Nouns-vs-Verbs, A/An/The, Singular-vs-Plural. SG lower-primary vocabulary.
- **math-gen.ts** — PURE generators (inject `rng: () => number`), one per math topic:
  - `add-within-20`: a,b with a+b ≤ 20; `sub-within-20`: a≥b, a ≤ 20; `number-bonds-10`: "? + x = 10". Each returns `{prompt, options(4, shuffled), correct}`; distractors = near-misses (±1/±2/±10), deduped, clamped ≥0. Property-tested (correct always in options; correct actually solves; 4 unique options).
- **quiz-offer.ts** — sign/verify a `QuizOffer { childId; topic; answers: string[]; exp }` via HMAC (reuse the crypto helpers; factor shared helpers or duplicate the ~40 lines as pull/offer.ts does). `answers` = ordered correct option per served question → server re-scores without trusting the client. Short TTL (e.g. 10 min).
- **quiz-service.ts** (`server-only`):
  - `buildQuiz(childId, topicId, nowMs, rng)`: assemble 5 questions (math → generate; grammar → pick 5 random from bank), `makeOffer({childId, topic, answers, exp})`. Return `{ questions: (without `correct`), offer }` — correct keys never sent to client.
  - `submitQuiz(childId, offer, picks[])`: `verifyOffer` (sig+exp+child); score `picks` vs signed `answers`; `passed = correct===5`. Then **atomic award**:
    - Compute `dayKey` (SGT). In one transaction: count today's `awarded` rows for child (global cap) + exists today's awarded row for (child, topic) (per-topic cap, Q4=B). `award = passed && globalToday < 3 && !topicAwardedToday`.
    - Insert `quiz_completions` row; if `award`, `luckyTickets += 1` (internal grant, NOT `requireParent`).
    - Return `{ passed, correct, awarded, wrongIndexes, reason: "ok"|"topic-done"|"daily-cap" }`.
- **cap.ts** — PURE: `sgtDayKey(nowMs) = Math.floor((nowMs + 8*3600_000)/86_400_000)` (SGT = UTC+8, no tz lib); `decideAward(passed, globalTodayCount, topicDoneToday)` → boolean + reason. Property-tested.
- **actions.ts** (`"use server"`): `startQuizAction(topicId)`, `submitQuizAction(offer, picks)` — resolve active child, delegate to service, `revalidatePath("/play/home","/play/learn")`.

## Security (Security Baseline)
- Correct answers live only in the **signed offer** (server) — client receives questions without keys. Server re-scores. Mirrors the egg-offer boundary.
- Award path is **internal** (session's active child only), bypasses `requireParent` — add `grantLuckyInternal(childId, delta)` in token-service (no parent guard) OR inline the update in the service transaction. Guarded by: valid signed offer + active-child match. Document why parent-guard is not required (child self-earns by passing).
- Atomic cap + insert prevents double-grant on double-submit (offer TTL + one award per topic/day check).

## UI
- **`app/play/home/page.tsx`**: add "🧠 Play & Learn" button → `/play/learn` (button style).
- **`app/play/learn/page.tsx`** (server): list 6 topics from `topics.ts`, grouped Math/Grammar; show per-topic "✓ earned today" / "available" using today's completions. Each topic → link to lesson.
- **`app/play/learn/[topicId]/page.tsx`** (server shell) → **`QuizFlow.tsx`** (client): states = lesson → quiz(Q1..Q5) → result. Lesson card (intro+example) + Start Quiz. Quiz: one question at a time, tap an option, next. On finish → `submitQuizAction`. Result: all-correct → celebration (reuse Confetti/sound) + "+1 🍀" (or "already earned today" / "come back tomorrow"); wrong → friendly message + which wrong, back to picker. No retry of same attempt.
- Reuse `useSound`, `Confetti`, `CountUp`, `.btn`, `.panel`, `.pill`.

## Admin (FR8)
- Extend admin service: `getQuizActivity(childId)` → recent completions (topic, date, passed) + `earnedToday` + `earnedAllTime`. Add a compact panel/row to the admin child view (`ChildAdminRow` or dashboard). Read-only.

## Tests
- PBT: `math-gen` (correctness invariants), `cap.ts` (`sgtDayKey` monotonic + boundary; `decideAward` truth table), quiz scoring (all-correct ⇔ award eligible), `quiz-offer` round-trip + tamper-reject (mirror offer.pbt).
- Unit: grammar-bank integrity (every question's `correct` ∈ `options`; ≥ 5 per topic). Keep suite green.

## Files
New: `src/features/quiz/{types,topics,grammar-bank,math-gen,quiz-offer,cap,quiz-service,actions}.ts`, `src/features/quiz/QuizFlow.tsx`, `app/play/learn/page.tsx`, `app/play/learn/[topicId]/page.tsx`, `src/db/migrations/0003_*.sql`, quiz tests. Edits: `src/db/schema.ts` (+table), `app/play/home/page.tsx` (+button), admin service + admin UI (+quiz panel), token-service (+internal grant). No new npm deps.
