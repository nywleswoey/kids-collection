# INCREMENT 12 — Code Summary (Harder Quiz Topics)

Status: typecheck clean · **77/77 tests** (stable ×3) · build ✅ · zero deps · **no schema/migration/seed** · redeploy only.

## Changes (content/generators inside Inc11 quiz module)
- **math-gen.ts** — replaced 3 easy generators with: `multiplication-within-100` (2–10 factors, product ≤100), `division-within-100` (exact, dividend ≤100), `number-bonds-100` (`? + x = 100`, x any 1–99, Q3=C). Distractors scaled for larger answers (near-miss + off-by-factor).
- **grammar-bank.ts** — replaced 3 banks with **6**: verb-tenses, pronouns-vs-proper-nouns, adjectives-vs-adverbs, conjunctions, prepositions, subject-verb-agreement (14–16 authored Qs each, verified keys).
- **topics.ts** — 9 topics (3 math + 6 grammar) + authored lessons/examples. Old ids removed.
- Tests updated: `quiz-math-gen.pbt` (new ids + product/quotient/bond invariants, answers ≤100), `quiz-bank.test` (9 topics, 3 math + 6 grammar).

## Notes
- Picker now lists 9 topics (3 Maths, 6 Grammar); flex layout wraps. Daily cap unchanged (3/day, 1/topic/day).
- Historical `quiz_completions` rows keep old topic ids; admin `getTopic` falls back to raw id → still renders. No data migration.
- Q6=A: no "Challenge" UI label.
