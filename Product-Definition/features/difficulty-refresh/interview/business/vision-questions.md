# Vision Interview — Difficulty & Freshness (Business role)

- **Progress**: Batch 1 (Q1–Q7) is ✅ **saved in `vision-answers-history.md`** — nothing is lost.
  This file now shows only the **active follow-up batch (Q8–Q9)**, opened by the approval loop.
- Two of your three amendments opened sub-decisions that change what gets built. These are the last
  two questions; then the business role closes and the technical role starts.

---

### Q8: "Refresh maths" — what exactly changes?

You rejected my assumption that maths was fine. Here is what the code actually does today, so the
choice is concrete:

| Topic | Today's generator (`math-gen.ts`) | Why it can feel memorised |
|---|---|---|
| Multiplication within 100 | `a × b = ?`, both factors 2–10 | Always the same shape. 81 possible questions, and the times tables are drilled at school — a child who knows them answers without thinking |
| Division within 100 | `dividend ÷ divisor = ?`, divisor & quotient 2–10 | Same shape, and it is just the times tables backwards |

The numbers already change every attempt, so "more randomness" is not the fix. What is memorised is the
**shape**. Options (pick any combination):

a) **Missing-operand forms** — `7 × ? = 56`, `? × 8 = 56`, `56 ÷ ? = 7`. Same arithmetic, but the child
   has to work backwards. Roughly triples the number of distinct question shapes.
b) **Widen the ranges** — factors 2–12 instead of 2–10 (products to 144, so "within 100" becomes
   "within 144" and both topic titles change).
c) **Division with remainders** — `47 ÷ 5 = 9 r 2`. A genuinely new skill, not just a harder sum.
d) **Two-step questions** — `3 × 4 + 5 = ?`.
e) **Word problems** — "6 packets of 7 stickers. How many stickers?"
f) Leave multiplication and division alone; the refresh you meant is bonds-to-1000 and Fractions only.

**Recommendation:** (a) alone. It attacks the exact thing you diagnosed — the shape being memorised —
without renaming topics (b), adding a new skill mid-increment (c), or needing authored text that would
reintroduce the very bank-memorisation problem item 5 exists to fix (e). (d) and (c) are good candidates
for a later "harder maths" topic.

[Answer]: a

---

### Q9: Fraction pictures — how far does the picture go?

Pictures are now in (Amendment 1). This is the only new UI in the increment, so the scope matters.

**Q9-i — which skills get a picture?**
- **A.** Only *name the fraction* (skill a). Add/subtract and fraction-of-a-quantity stay as text
  (`1/5 + 3/5 = ?`, `1/4 of 20 = ?`).
- **B.** All three skills get a picture — including a picture for each of the four answer options.
- **C.** Picture in the question where it helps; answers always text.

**Q9-ii — what shape?**
- **A.** Circles only (pizza / pie).
- **B.** Rectangles / bars only — easiest to draw accurately for any denominator, and it is what
  Singapore maths uses (bar models).
- **C.** A mix of circles, bars, and groups of objects (3 of 4 apples shaded).

**Q9-iii — which denominators?** Pictures constrain this: halves, thirds, quarters, fifths, sixths,
eighths and tenths all draw cleanly; sevenths and ninths do not. Cap the denominator at **10**, or allow
anything up to 12?

**Recommendation:** (i) **C** — picture in the prompt, text answers. Four little pictures per question
is a lot of screen for a phone, and reading a fraction *from* a picture is the skill being taught;
choosing between four pictures is a different, more visual task. (ii) **B** bars — accurate at every
denominator and it matches how they are taught. (iii) cap at **10**.

[Answer]: i, c

---

When both `[Answer]:` tags are filled, reply **`ready`**.
