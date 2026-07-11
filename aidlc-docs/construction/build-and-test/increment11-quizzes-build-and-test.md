# INCREMENT 11 — Build & Test Instructions

## Automated (done)
- `pnpm typecheck` — clean.
- `pnpm test` — **76/76**, stable ×3 (+15 quiz tests: math-gen, cap, quiz-offer, bank/topics).
- `pnpm build` — succeeds; `/play/learn` + `/play/learn/[topicId]` compile.
- Security: no secret in `.next/static`; quiz answer keys never in client payload (`ClientQuestion` omits `correct`; keys only inside HMAC-signed offer).

## Migration (REQUIRED — no data seed needed)
Migration **0003** adds `quiz_completions` (additive, `CREATE TABLE IF NOT EXISTS`; existing data untouched).
1. Local: `pnpm db:migrate`.
2. Production: `pnpm db:migrate` against prod `DATABASE_URL` after deploy.
Without it, starting a quiz works but `submitQuiz` fails on insert.

## Manual / visual QA
- **Entry**: home shows "🧠 Play & Learn" → `/play/learn` lists 6 topics grouped Maths / Grammar.
- **Lesson-first**: tap a topic → lesson card (intro + example) → "Start Quiz".
- **Quiz**: 5 questions one at a time; math shows computed sums, grammar shows MCQ.
- **Pass**: all 5 correct → "All correct!" + confetti + "+1 🍀"; child home special pill (Inc10 FR1) increments.
- **Fail**: any wrong → "Not quite!", score shown, no ticket, back to picker (no retry of same attempt).
- **Caps (FR7)**:
  - Re-pass the SAME topic same day → celebrated, "already earned today", NO extra ticket.
  - Earn from 3 different topics → 4th distinct-topic pass same day → "come back tomorrow", NO ticket.
  - Picker shows ✓🍀 next to topics already earned today.
- **Admin (FR8)**: `/admin` child row shows 🧠 Quizzes — today N/3, all-time, recent pass/fail list.
- **SGT reset**: caps key off Singapore calendar day (verify near local midnight if convenient; covered by `quiz-cap.pbt`).

## Deploy
- Independent of Inc 10. Push `main` → Vercel prod (auto). Run `pnpm db:migrate` against prod after deploy. No seed, no new env, no new deps.
