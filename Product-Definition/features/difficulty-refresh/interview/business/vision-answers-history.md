# Vision Answers History — Difficulty & Freshness (Business role)

**APPEND-ONLY.** Every validated batch is appended verbatim (questions + answers + caveats).
This file is never rewritten or truncated. The active-batch buffer
(`vision-questions.md`) may be overwritten; nothing recorded here is ever lost.

- Session: `Product-Definition/features/difficulty-refresh/`
- Depth: quick · Interaction: batch · Mode: sequential

---

## Batch 1 — Q1–Q7 (all CORE) — answered 2026-08-08, pending approval

### Q1 [CORE] — How much harder should the cards be to collect, and in what shape?
Options: (a) mild 65/22/10/3 · (b) moderate 70/21/7/2 · (c) steep 75/18/6/1 · (d) change
within-rarity picking instead · (e) other numbers.
Recommendation given: (b).

**[Answer]: b**

→ `RARITY_WEIGHTS` becomes **common 70 / rare 21 / epic 7 / legendary 2** (sums to 100 ✓).
Epic odds fall 12→7 (−42%), legendary 3→2 (−33%). Within-rarity picking stays uniform;
(d) was not chosen, so **no duplicate protection** in this increment.

### Q2 [CORE] — Should the new odds apply everywhere, or only to normal pulls?
Options: (a) everywhere (pulls + easter-egg rarity roll) · (b) normal pulls only · (c) other split.
Recommendation given: (a).

**[Answer]: a**

→ One constant, one behaviour. `src/features/pull/easter-egg.ts` keeps consuming the same
`RARITY_WEIGHTS`, so easter eggs get harder by exactly the same amount. Sacrifice and rarity-pick
tickets are unaffected (they never consulted the weights).

### Q3 [CORE] — What should the Fractions topic actually cover?
Skills offered: (a) name the fraction · (b) equivalent · (c) compare · (d) add/subtract same
denominator · (e) fraction of a quantity · (f) simplify.
Sub-questions: Q3-i one topic or several · Q3-ii rendering (plain text / typographic / picture).
Recommendation given: one topic, skills (a)(d)(e), plain-text `3/4` rendering.

**[Answer]: ok, a,d,e.**

→ **One** topic ("Fractions"), drawing from **(a) name the fraction, (d) add/subtract with the same
denominator, (e) fraction of a quantity**. "ok" read as accepting the rest of the recommendation:
Q3-i = one topic, Q3-ii = **plain text** (`3/4`). Equivalent/compare/simplify are deferred to a
possible harder fractions topic later.
*Caveat raised at approval (see OQ-DR-2): skill (a) was illustrated with a shaded picture; with
plain-text rendering it must be phrased in words instead.*

### Q4 [CORE] — Number Bonds to 1000: replace, or add alongside?
Options: (a) replace bonds-to-100 · (b) add as a 10th topic. Numbers: (i) any 1–999 · (ii) multiples
of 10 · (iii) multiples of 5 · (iv) mostly (i) with some rounder numbers.
Recommendation given: (a) + (iv).

**[Answer]: a iv**

→ **Replace.** "Number Bonds to 100" ceases to exist; "Number Bonds to 1000" takes its place, with a
**mix — mostly arbitrary 1–999, some rounder numbers**. The lesson text must be rewritten too (the
current one teaches the "ones make 10, tens make 90" trick, which becomes "ones make 10, tens make 90,
hundreds make 900").
*Caveat raised at approval (see OQ-DR-3): historical `quiz_completions` rows carry the old topic id.*

### Q5 [CORE] — How should the 3 daily topics be chosen?
Sub-questions: (i) same for all children or per-child · (ii) subject mix guarantee · (iii) avoid
yesterday's · (iv) behaviour once all 3 are passed · (v) SGT midnight reset.
Recommendation given: per-child · guarantee ≥1 maths · avoid yesterday's 3 · allow ticket-free replay ·
yes SGT.

**[Answer]: ok with recommendation**

→ - **Q5-i: different per child.** Each child gets their own 3.
  - **Q5-ii: at least one maths topic** guaranteed in every day's 3.
  - **Q5-iii: yesterday's 3 are excluded** from today's draw.
  - **Q5-iv: replay is allowed after passing, with no ticket.** This is already how `decideAward`
    behaves (`reason: "topic-done"` / `"daily-cap"`), so no cap change is needed — Q7's "daily ticket
    caps stay OUT" holds.
  - **Q5-v: yes, midnight SGT**, consistent with `sgtDayKey`.
  - Free choice of all topics is **removed** — the `/play/learn` picker shows only today's 3.

### Q6 [CORE] — "They are memorising answers": what would fix it?
Options: (a) grow the banks to 40–50/topic · (b) remember what a child has seen and prefer unseen ·
(c) rewrite existing questions harder · (d) generate grammar procedurally · (e) retire the current set.
Also asked: do the maths topics need refreshing too?
Recommendation given: (a) + (b), with (c) as a bonus.

**[Answer]: a+b**

→ **Grow every grammar bank to ~40–50 questions** *and* **track which questions each child has already
seen**, preferring unseen ones until the bank is exhausted. (c), (d), (e) are **not** in scope — the
existing questions stay as they are and are not rewritten or retired, only outnumbered.
*Unanswered sub-question: whether the maths topics also need refreshing. Recorded as OQ-DR-1; the
working assumption is **no** — maths is generated fresh per attempt, and items 2 and 3 of this
increment already raise the maths difficulty.*

### Q7 [CORE] — What is explicitly OUT, and is there a success signal?
Defaults offered: per-theme rarity tuning OUT · pass bar / quiz length OUT · daily ticket caps OUT ·
duplicate protection OUT · card content OUT · reset countdown OUT · admin seen-questions screen OUT.
Plus: any post-ship check, or no metric (as with the vehicle-themes increment)?

**[Answer]: ok with recommendation**

→ **All seven defaults accepted as OUT.** No success metric — same deliberate stance as the
vehicle-themes increment. Recorded as a decision, not a gap; downstream stages must not re-derive it
as missing.

---

### Approval loop — amendments (2026-08-08)

**Amendment 1 — Fractions get pictures (amends Q3-ii).**
The plain-text rendering taken from the recommendation is **overturned**: fraction questions render as
**pictures** (shaded shapes), not `3/4` text. This resolves **OQ-DR-2** in the opposite direction to the
recommendation and makes skill (a) — *name the fraction* — work as originally illustrated. It is the
only part of this increment that needs **new UI** rather than new text.

**Amendment 2 — Replay is scoped to today's 3 (resolves OQ-DR-6).**
Ticket-free replay is confirmed, restricted to **today's 3 topics**. The other 7 are not reachable at
all until they are drawn. Free choice does not return via replay.

**Amendment 3 — The maths topics ARE refreshed too (reverses OQ-DR-1).**
The working assumption ("maths is fine, it generates fresh every attempt") is **rejected by the user**.
Multiplication and division are memorisable at the *method* level: every question has been the same
shape — `a × b = ?` with factors 2–10 — since Increment 11. Scope therefore grows beyond items 2 and 3.
Detail settled in follow-up Q8.

---

## Batch 2 — Q8–Q9 (follow-ups opened by the approval loop) — answered 2026-08-08

### Q8 — "Refresh maths": what exactly changes?
Options: (a) missing-operand forms · (b) widen ranges to 2–12 · (c) division with remainders ·
(d) two-step questions · (e) word problems · (f) leave × and ÷ alone.
Recommendation given: (a) alone.

**[Answer]: a**

→ **Missing-operand forms only.** `multiplicationWithin100` and `divisionWithin100` each gain the
backwards shapes — `7 × ? = 56`, `? × 8 = 56`, `56 ÷ ? = 7`, `? ÷ 8 = 7` — alongside today's forward
form. Ranges stay 2–10, so both topic **titles and ids are unchanged** ("within 100" stays true).
No remainders, no two-step, no word problems.

The existing `explanation` derivation (`prompt.replace("?", answer)`) still produces a correct "why"
for every one of these shapes — `"7 × ? = 56"` → `"7 × 8 = 56"` — so nothing extra is needed there.

### Q9 — Fraction pictures: how far does the picture go?
Sub-questions: (i) which skills get a picture · (ii) what shape · (iii) which denominators.
Recommendation given: (i) C · (ii) B bars · (iii) cap at 10.

**[Answer]: i, c**

→ **Q9-i = C**: the picture appears **in the prompt where it helps; answer options are always text.**
Reading a fraction *from* a picture is the skill; picking between four pictures is a different task,
and four images per question is too much on a phone.

**Q9-ii and Q9-iii were not answered separately.** Taken from the recommendation, flagged for
confirmation at the approval gate (**OQ-DR-7**):
- **Q9-ii = B — bar models** (rectangles), accurate at every denominator and how the skill is taught here.
- **Q9-iii — denominators capped at 10.** Halves, thirds, quarters, fifths, sixths, eighths and tenths
  draw cleanly; sevenths and ninths do not.

---

### Pre-declared open questions — status after batch 2

| ID | Question | Status |
|---|---|---|
| OQ-DR-1 | Do the maths topics need refreshing too? | ✅ **Resolved** — yes; Amendment 3 + Q8(a), missing-operand forms |
| OQ-DR-2 | Fraction skill (a) illustrated with a picture, but rendering was plain text | ✅ **Resolved** — Amendment 1, pictures are IN |
| OQ-DR-3 | Replacing `number-bonds-100` orphans historical `quiz_completions.topic` rows | ⏳ Open — technical role |
| OQ-DR-4 | "Remember what each child has seen" needs new per-child persistence | ⏳ Open — technical role |
| OQ-DR-5 | Fraction answers are strings; the distractor generator is integer-only | ⏳ Open — technical role |
| OQ-DR-6 | Ticket-free replay: all 10 topics or only today's 3? | ✅ **Resolved** — Amendment 2, today's 3 only |
| OQ-DR-7 | Q9-ii (bar models) and Q9-iii (denominators ≤10) taken from the recommendation, not stated | ⏳ Open — confirm at the approval gate |
