# INCREMENT 11 — Educational Quizzes: Open Questions

Most scope already decided (pre-captured from Inc 10 questions D1–D11):
- **D1** both Math + English grammar (SG lower-primary) · **D2** 5 questions/quiz · **D3** 1 short lesson card, teach-first · **D4** reward = 1 lucky 🍀 ticket · **D5** no retry (wrong → try again later / new quiz) · **D9** entry via home "🧠 Play & Learn" button · **D10** auto-grant on all-correct · **D11** admin shows quiz activity.

Only the items below are still open. Answer with a letter.

---

## Q1. Question generation approach (resolves D7 "can they be dynamic / is there an API")
Rewards depend on **correct answer keys** — a wrong key rewards a wrong answer or blocks a right one, which is bad for a kid. That's the core trade-off here.

- A) **Static curated bank** (recommended, safest): hand-authored question bank per topic (~15–20 Qs each), stored in a JSON file like the card seed. Each attempt picks 5 at random (D8=B). No API, no cost, offline, answer keys verified. Fully deterministic + testable.
- B) **Pre-generated bank via Claude API at build/seed time**: I generate a large bank once with `claude-haiku-4-5`, a script validates every answer, store to JSON/DB. Runtime uses the stored bank (no live API). More variety; one-time gen + human spot-check.
- C) **Live Claude API per attempt**: fresh questions each play via API call. Most variety, but adds latency, per-play cost, an API key secret, and requires runtime answer-validation — riskiest for correctness.
- D) **Hybrid**: math = procedurally generated in-app (e.g. random `a + b` with computed answer — safe, infinite variety); grammar = static curated bank.

[Answer]:

## Q2. Launch topics (the concrete list). Suggested 4 (2 math, 2 grammar), SG lower-primary:
- Math: **Addition within 20**, **Subtraction within 20**
- Grammar: **Nouns vs Verbs**, **A / An / The (articles)**

- A) Use these 4 (recommended)
- B) These 4 + add **Number bonds to 10** (math) and **Singular vs Plural** (grammar) = 6
- C) Different set — I'll specify in notes
- D) Other

[Answer]:

## Q3. Daily cap mechanics (D6=D, cap 3 quiz tickets/day)
- A) Max **3 lucky tickets per child per day** from quizzes; after the cap they can still play + see "Great job! Come back tomorrow for more tickets" but earn none. Resets at **midnight Singapore time (SGT)** (recommended).
- B) Cap 3/day but reset on a rolling 24h from first earn
- C) Different cap/reset — notes

[Answer]:

## Q4. Can a child replay the same topic for more tickets (within the daily cap)?
- A) Yes — each all-correct completion earns 1 lucky ticket until the daily cap of 3 is hit, regardless of topic (recommended; simple)
- B) No — max 1 ticket per topic per day (so needs ≥3 topics to hit the cap)
- C) Other

[Answer]:

## Q5. Lesson ("teach first") content — who authors, how deep?
- A) I author a short lesson per topic (2–4 kid-friendly sentences + 1 worked example), stored alongside the question bank (recommended)
- B) Minimal — just 1 example, very brief
- C) Richer — a couple of examples + a tip; more teaching

[Answer]:

## Q6. Wrong-answer flow detail (D5=B no retry)
- A) Show a friendly "Not quite! Review the lesson and try again later 🌟", reveal which were wrong, no reward, return to quiz picker (recommended)
- B) End immediately on first wrong answer (harsher)
- C) Let them finish all 5, then show score + which wrong, no reward, no immediate retry

[Answer]:

## Q7. Admin quiz activity (D11=A) — what to show per child?
- A) Recent completions (topic, date, pass/fail) + total quiz tickets earned today / all-time (recommended)
- B) Just a count of tickets earned from quizzes
- C) Full attempt history
- D) Other

[Answer]:

## Q8. New DB table for tracking (daily cap + admin log) — acknowledge a migration?
Needs a `quiz_completions` table (child, topic, correct-count, awarded, timestamp) to enforce the daily cap and power the admin view. This is a schema migration (0003).
- A) Yes, add the table / migration (recommended)
- B) Track without a new table (notes)

[Answer]:
