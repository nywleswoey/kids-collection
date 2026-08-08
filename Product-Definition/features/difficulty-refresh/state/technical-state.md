# Technical State
- Status: in-progress (batch 1 answered; awaiting explicit Approve)
- Depth: quick
- Batch: 1 of 1 (T1–T7, all CORE) — answered 2026-08-08 ("ok with recommendations")

## Questions
- [x] T1 [CORE] — Seen-question persistence → **new `quiz_seen_questions` table via a `QuizStore` method; reset on exhaustion; port + fake + contract** (resolves OQ-DR-4)
- [x] T2 [CORE] — Topic-id replacement → **new id + retired-label map; no migration of history** (resolves OQ-DR-3)
- [x] T3 [CORE] — Fraction answers → **dedicated generator; mistake-shaped distractors; cross-multiplication equality** (resolves OQ-DR-5)
- [x] T4 [CORE] — Pictures → **structured `visual` field + inline-SVG component; no `dangerouslySetInnerHTML`**
- [x] T5 [CORE] — Daily 3 → **derived, pure `daily-topics.ts` keyed on (child, SGT day); route rejects off-list topics**
- [x] T6 [CORE] — Tests → **derive the weight bands from the constant; all 6 new test obligations mandatory**
- [x] T7 [CORE] — Delivery → **code now, ~200 authored questions as a follow-up; no new dependencies**

## Pre-declared open questions
- ⏳ OQ-DR-T1 — does "seen" mean served or answered? (abandoned quizzes burn questions)
- ⏳ OQ-DR-T2 — maths question ids are positional, so seen-tracking is grammar-only — confirm
- ⏳ OQ-DR-T3 — grammar question ids become durable identifiers; renumbering would corrupt seen-sets
