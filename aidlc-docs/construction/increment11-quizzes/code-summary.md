# INCREMENT 11 — Code Generation Summary

Status: typecheck clean · **76/76 tests** (stable ×3) · build ✅ · zero new npm deps · **migration 0003** (quiz_completions) · no client-bundle secret leak · answer keys never sent to client.

## New module `src/features/quiz/`
- **types.ts** — QuizQuestion/ClientQuestion (keyless), Topic, Lesson, QuizOutcome; `QUIZ_LENGTH=5`, `DAILY_TICKET_CAP=3`.
- **cap.ts** (pure) — `sgtDayKey(now)=floor((now+8h)/86.4M)`; `decideAward(passed, globalToday, topicDone)` → award + reason (failed/topic-done/daily-cap/ok).
- **math-gen.ts** (pure, inject rng) — add-within-20, sub-within-20, number-bonds-10. Computed answers + near-miss distractors, 4 unique shuffled options.
- **grammar-bank.ts** — 3 topics × 16 authored Qs (nouns-vs-verbs, articles, singular-vs-plural), verified keys.
- **topics.ts** — 6 topic defs + authored lessons (intro + worked example).
- **quiz-offer.ts** (pure, Web Crypto HMAC) — sign/verify `{childId, topic, answers, exp}`. Mirrors pull/offer.ts. Correct keys live ONLY here.
- **quiz-service.ts** (server-only) — `buildQuiz` (assemble 5, strip keys, sign) + `submitQuiz` (verify offer → re-score picks vs signed answers → SGT day caps → insert quiz_completions → atomic `luckyTickets += 1` if awarded). Internal grant bypasses `requireParent` (guarded by signed offer + active-child match).
- **activity.ts** (server-only) — `getQuizActivity(childId)` (recent + earnedToday/allTime) + `topicsAwardedToday(childId)`.
- **actions.ts** — `startQuizAction` / `submitQuizAction` (active-child).
- **QuizFlow.tsx** (client) — lesson → quiz (one Q at a time) → result, reuse Confetti + sound.

## Schema / migration
- `src/db/schema.ts`: `quiz_completions(id, childId FK cascade, topic, correct, total, passed, awarded, createdAt)` + index `(childId, createdAt)`; `QuizCompletionRow` type.
- `src/db/migrations/0003_cool_terrax.sql` (drizzle-generated).

## UI wiring
- `app/play/home/page.tsx`: "🧠 Play & Learn" button (FR1).
- `app/play/learn/page.tsx`: picker, 6 topics grouped Math/Grammar, ✓🍀 for topics earned today.
- `app/play/learn/[topicId]/page.tsx`: server shell → QuizFlow.
- Admin: `app/admin/page.tsx` fetches `getQuizActivity` per child; `ChildAdminRow` renders quiz panel (today N/3 + all-time + recent list) (FR8).

## Security (server-authoritative)
- Client receives questions with NO answer key (`ClientQuestion`). Server re-scores against HMAC-signed `answers`. Cap-check + completion insert + grant atomic → no self-declared pass, no double-grant. Verified: no secret in `.next/static`.

## Incidental
- Fixed the admin **"Binder"** text link → button (`btn btn--ghost`) — the exact "e.g binder" example from Inc10 item 3 that used `underline opacity-80` (not `link-soft`), so it was missed in Inc10 FR3.

## Tests (+15)
- `quiz-math-gen.pbt` (well-formed + solvable), `quiz-cap.pbt` (dayKey boundary/monotonic + award truth table), `quiz-offer.pbt` (round-trip + tamper/expiry reject), `quiz-bank.test` (bank integrity + 6 topics).

## Remaining (Build & Test / Operations)
- **Migration 0003** must run: `pnpm db:migrate` locally + against prod after deploy.
- Manual QA: full flow (lesson→5Q→award), cap behaviour (4th pass same day blocked, same-topic-twice blocked), admin panel.
