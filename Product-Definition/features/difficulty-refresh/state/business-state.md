# Business State
- Status: in-progress (batches 1–2 answered + 3 amendments; awaiting explicit Approve)
- Depth: quick
- Batches: 1 (Q1–Q7 CORE) + 2 (Q8–Q9 follow-ups) — both answered 2026-08-08

## Questions
- [x] Q1 [CORE] — Rarity shape → **(b) 70/21/7/2**
- [x] Q2 [CORE] — Blast radius → **(a) everywhere, incl. easter-egg roll**
- [x] Q3 [CORE] — Fractions → **one topic; skills a,d,e**; rendering overturned by Amendment 1
- [x] Q4 [CORE] — Number Bonds 1000 → **(a) replace + (iv) mixed numbers**
- [x] Q5 [CORE] — Daily 3 topics → **per-child · ≥1 maths · not yesterday's · replay w/o ticket · SGT**
- [x] Q6 [CORE] — Question refresh → **(a) grow banks + (b) track seen-per-child**
- [x] Q7 [CORE] — Explicitly OUT + success signal → **all 7 defaults OUT; no metric**
- [x] Q8 — Refresh maths → **(a) missing-operand forms only; ranges and topic ids unchanged**
- [x] Q9 — Fraction pictures → **(i) C picture-in-prompt/text-answers**; (ii) bars + (iii) ≤10 assumed

## Amendments during the approval loop
1. Fractions render as **pictures**, not plain text (overturns the Q3-ii recommendation)
2. Ticket-free replay is scoped to **today's 3 topics** only
3. The **maths topics are refreshed too** (reverses the OQ-DR-1 assumption) → opened Q8

## Pre-declared open questions
- ✅ OQ-DR-1 resolved (maths IS refreshed — Q8a)
- ✅ OQ-DR-2 resolved (pictures IN)
- ⏳ OQ-DR-3 — replacing `number-bonds-100` orphans historical completion rows → technical
- ⏳ OQ-DR-4 — "seen questions" needs new per-child persistence → technical
- ⏳ OQ-DR-5 — fraction answers are strings; distractor generator is integer-only → technical
- ✅ OQ-DR-6 resolved (today's 3 only)
- ⏳ OQ-DR-7 — bar models + denominators ≤10 assumed, not stated → confirm at the gate
