# INCREMENT 12 — Requirements/Design: Harder Quiz Topics

**Type**: Brownfield content change inside Inc11 quiz module. **Cadence**: LIGHT.
**No** schema / migration / seed. Redeploy only. Reuses all Inc11 mechanics (offer signing, caps, scoring, UI).
**Answers**: Q1=A replace · Q2=A · Q3=C (bonds-100 any 1–99) · Q4=A,B,C,D · Q5=9 topics · Q6=A no label.

## Final topic set — replace the current 6, end with **9** (3 math + 6 grammar)
### Math (procedural, `math-gen.ts`)
- `multiplication-within-100` — "Multiplication within 100": a×b, factors 2–10, product ≤ 100.
- `division-within-100` — "Division within 100": exact, dividend = divisor×quotient ≤ 100, divisor/quotient 2–10.
- `number-bonds-100` — "Number Bonds to 100": `? + x = 100`, x any 1–99 (Q3=C).

### Grammar (hand-authored banks ~16 Qs each, verified keys, `grammar-bank.ts`)
- `verb-tenses` — past / present / past-continuous.
- `pronouns-vs-proper-nouns`.
- `adjectives-vs-adverbs`.
- `conjunctions` — and / but / because / or / so.
- `prepositions` — in / on / under / between / behind…
- `subject-verb-agreement` — he runs / they run.

## Changes
- `math-gen.ts`: replace 3 generators; scale distractors for larger answers (near-miss deltas incl. ±operand, clamp ≥ 0, unique 4 options).
- `grammar-bank.ts`: replace 3 banks with the 6 above.
- `topics.ts`: replace 6 topic defs with 9 (new ids, titles, authored lessons + worked examples).
- Tests: update `quiz-math-gen.pbt` (new topic ids + product/quotient/bond invariants) and `quiz-bank.test` (9 topics: 3 math + 6 grammar; each grammar bank ≥ 10 Qs).

## Notes / constraints
- Old topic ids disappear; historical `quiz_completions` rows keep their raw topic string (admin `getTopic` falls back to the id → still renders). No data migration.
- Picker now lists 9 topics (3 Maths, 6 Grammar) — flex layout already wraps.
- Daily cap unchanged (3/day, 1/topic/day). More topics = more distinct topics available, cap still 3.
- Q6=A: no "Challenge" UI label. Difficulty framed as upper-primary.
- Keep suite green; server-authoritative scoring + signing unchanged.
