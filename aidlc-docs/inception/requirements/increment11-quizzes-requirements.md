# INCREMENT 11 — Requirements: Educational Quizzes

**Type**: Brownfield feature. **Cadence**: LIGHT-MEDIUM (new feature module + migration).
**Source**: user request item 4 + pre-captured D1–D11 + answers in `increment11-quizzes-questions.md`.
**Depends on**: Inc 9 special-ticket columns (`luckyTickets`). Independent of Inc 10 (can build/deploy separately).

## Extensions
- Security Baseline **Enabled** — reward grant must be **server-authoritative**: the client never asserts "I passed"; the server re-scores the submitted answers, enforces caps, and grants atomically. No API secret this increment (Q1=D → no live LLM).
- Resiliency Baseline **Enabled** — idempotent/atomic award; daily-cap + per-topic checks in one transaction (no double-grant on double-submit).
- Property-Based Testing **Enabled** — pure scoring + math-question generators + cap logic are property-tested.

## FR1 — Entry point (D9=A)
- New button on `/play/home`: **"🧠 Play & Learn"** → `/play/learn` (quiz picker). Uses button style (Inc10 FR3 consistency).

## FR2 — Quiz picker (`/play/learn`)
- Lists the **6 topics** (Q2=B) grouped Math / Grammar, each a button/card. Shows which topics still have a ticket available today (per FR7). Child taps a topic → lesson screen.

## FR3 — Topics (Q2=B, 6 total, SG lower-primary)
- **Math (procedural, Q1=D)**: `Addition within 20`, `Subtraction within 20`, `Number bonds to 10`.
- **Grammar (static curated bank, Q1=D)**: `Nouns vs Verbs`, `A / An / The (articles)`, `Singular vs Plural`.

## FR4 — Teach-first lesson (D3=A, Q5=A)
- Before any quiz, show **1 lesson card**: 2–4 kid-friendly sentences + 1 worked example, authored per topic (SG context). Then a **"Start Quiz"** button.
- Lesson content authored + stored with the topic definition (code/JSON, not DB).

## FR5 — Quiz (D2=B 5 Q; D8=B random selection; Q1=D generation)
- Each attempt = **5 questions**.
- **Math topics**: 5 questions **procedurally generated in-app** with computed correct answers (safe, infinite variety). Multiple-choice (correct answer + distractors) suited to lower-primary.
- **Grammar topics**: pick **5 at random** from a hand-authored bank (~15–20 Qs/topic) with verified answer keys. Multiple-choice.
- One question at a time, kid-friendly UI, sound/animation reuse.

## FR6 — Scoring & reward (D4=A lucky; D10=A auto; D5=B/Q6=A no retry)
- **All 5 correct** → auto-grant **1 lucky 🍀 ticket** (subject to caps, FR7), show celebration.
- **Any wrong** → friendly "Not quite! Review the lesson and try again later 🌟", reveal which were wrong, **no reward**, return to quiz picker. **No immediate retry** of the same attempt.
- **Server-authoritative**: the quiz submit sends the child's answers (+ a signed record of the served questions/keys, like the egg-offer pattern) to a server action that **re-scores**, checks caps, grants atomically, and returns the outcome. Client cannot self-declare a pass.

## FR7 — Caps (D6=D cap 3/day; Q3=A SGT reset; Q4=B per-topic/day)
- **Per-topic/day (Q4=B)**: a child earns **at most 1 lucky ticket per topic per day**. Re-passing an already-rewarded topic today → completion celebrated but **no additional ticket** ("You already earned this one today!").
- **Global daily cap (D6=D)**: at most **3 quiz lucky tickets per child per day** total (so needs ≥3 distinct topics; 6 available).
- **Reset**: both counters reset at **midnight Singapore time (SGT, UTC+8)**. "Today" = SGT calendar day.
- Once capped, quizzes still playable (no reward): "Great job! Come back tomorrow for more tickets 🌙".

## FR8 — Admin quiz activity (D11=A, Q7=A)
- Admin dashboard per child: **recent completions** (topic, date, pass/fail) + **quiz tickets earned today / all-time**.

## FR9 — Data model (Q8=A → migration 0003)
- New table **`quiz_completions`**: `id`, `child_id` (FK, cascade), `topic` (text), `correct_count` (int), `total` (int), `passed` (bool), `awarded` (bool, whether a ticket was granted), `created_at` (timestamptz default now). Indexed on `(child_id, created_at)`.
- Cap queries derive "today (SGT)" from `created_at`; per-topic/day = exists(passed+awarded for this child+topic today); global/day = count(awarded today) < 3.
- No change to `children` (reuse `luckyTickets` + existing `grantSpecial`).

## Non-Functional / Constraints
- Migration **0003** (quiz_completions). Post-deploy `pnpm db:migrate`.
- No new npm deps (no LLM client; procedural math + static JSON). No API secret.
- Reward path reuses `grantSpecial(childId, "lucky", 1)` (already parent-guarded — relax guard for the quiz path: introduce a server-internal grant not requiring `requireParent`, still auth'd as the active child's session). **Security note**: ensure the quiz-grant path is callable only for the session's active child and only via server re-scoring.
- Keep suite green (61/61 + new quiz tests).

## Out of Scope
- Live/LLM-generated questions (Q1 rejected C/B) — procedural math + curated grammar only.
- Difficulty levels / adaptive difficulty, leaderboards, streaks — future.

## Traceability
| Ref | FR |
|---|---|
| D9/Q2 entry+topics | FR1, FR2, FR3 |
| D3/Q5 teach-first | FR4 |
| D2/D8/Q1 quiz+gen | FR5 |
| D4/D10/D5/Q6 reward | FR6 |
| D6/Q3/Q4 caps | FR7 |
| D11/Q7 admin | FR8 |
| Q8 migration | FR9 |
