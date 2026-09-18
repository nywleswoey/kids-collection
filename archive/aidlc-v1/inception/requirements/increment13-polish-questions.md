# INCREMENT 13 — Requirements Clarification Questions

Brownfield polish increment. 6 items. Answer inline with `[Answer]: <letter>` (add notes freely).
Where an item is already partly built, I've noted current behaviour so you can confirm the delta.

---

## Item 1 — Show count of cards by rarity

Currently the binder/galaxy shows sets and a progress bar, but no rarity tally.

**Q1.1 — Where should the rarity counts appear?**
- A) Child side only (in My Galaxy / binder)
- B) Admin/parent side only
- C) Both child and admin
- D) Child galaxy only, and it doubles as the Item 4 filter buttons (see Item 4)

[Answer]: D

**Q1.2 — Count scope: owned vs total?**
- A) Owned only (e.g. "Epic: 3")
- B) Owned / total (e.g. "Epic: 3 / 5")
- C) Owned / total, per rarity, and it updates when a category filter is active

[Answer]: A

---

## Item 2 — Parent portal: count of all ticket types

Current admin `ChildAdminRow` already shows each child's normal balance, epic ✨ and lucky 🍀 tickets (via GrantControl, editable). So the counts are technically visible already.

**Q2.1 — What's missing / what do you want?**
- A) A clear read-only summary line per child (e.g. "🎫 12 · ✨ 2 · 🍀 1") at a glance, separate from the edit controls
- B) Add a totals row across ALL children (sum of each ticket type)
- C) Both A and B
- D) Something else (describe in notes)

[Answer]: I mean the manage profile screen and the child landing page

---

## Item 3 — First-duplicate → teach sacrifice easter egg (kid-friendly)

Sacrifice/upgrade flow already exists (SacrificePanel, sacrifice.ts). Kids likely don't discover it. You want: the FIRST time a child ever pulls a duplicate, show a kid-friendly prompt explaining they can trade duplicates for something better.

**Q3.1 — "First time" tracking — how persistent?**
- A) Per child, persisted in DB (migration: `seen_sacrifice_hint` flag) — never shows again even on new device/session (Recommended, robust)
- B) Per browser via localStorage — simpler, no migration, but re-shows on new device / cleared storage

[Answer]: B

**Q3.2 — Prompt style?**
- A) Dismissible one-time modal/popover with a "Show me!" button that opens the SacrificePanel
- B) Inline banner on the reveal screen, dismissible
- C) Modal, and it auto-highlights the sacrifice button after dismiss

[Answer]: A

**Q3.3 — Wording tone (pick a direction; I'll finalise copy):**
- A) "Snap! You already have this card. Got doubles? You can trade them in to power up and win a rarer card! ✨"
- B) Shorter/punchier
- C) I'll write my own (notes)

[Answer]: A

---

## Item 4 — Rarity filter in galaxy (count buttons on top → tap to filter)

Galaxy already has a sticky category tab bar (★ All + one chip per theme, Inc9). You want ADD a rarity filter: buttons showing per-rarity counts that filter the view.

**Q4.1 — How does rarity filter combine with the existing category tabs?**
- A) Second row of chips: Common / Rare / Epic / Legendary, each with a count; works together with the category tab (AND filter)
- B) Rarity chips replace/ignore category selection (independent)
- C) Rarity chips only, drop nothing — category tabs stay as-is above, rarity row below

[Answer]: A

**Q4.2 — What does each rarity button count?**
- A) Owned count of that rarity (across current category selection)
- B) Owned / total
- C) Owned only, and greys out / disables rarities you own zero of

[Answer]: A

**Q4.3 — Filtered view shows…?**
- A) Only owned cards of that rarity
- B) All cards of that rarity (owned + locked/missing slots)

[Answer]: B

---

## Item 5 — Remove the "lucky pick roulette"

Two roulette animations exist:
- **EasterEggPicker** (special ticket pick-1-of-5): kid picks a card, THEN a ~2.7s decelerating roulette spins and lands on the card they already picked, then jackpot reveal.
- **CardRoulette** (normal pull slot-machine before reveal).

Your note "since they can choose" points at EasterEggPicker's post-pick spin (pointless suspense — they already chose).

**Q5.1 — Which roulette to remove?**
- A) Only the EasterEggPicker post-pick spin: kid picks → reveal immediately (fireworks + card), no spin. CardRoulette on normal pulls stays. (Recommended, matches your note)
- B) Both roulettes everywhere
- C) Something else (notes)

[Answer]: A

---

## Item 6 — Immediate feedback on wrong quiz answers

Current QuizFlow shows results only at the END (score + "review the lesson and try again later"). No per-question feedback, no retry. Scoring is server-authoritative.

**Q6.1 — Immediate feedback = per question, as they answer?**
- A) After each answer, show ✓/✗ instantly and reveal the correct answer, then a "Next" button advances (no changing the answer). End screen unchanged. (Recommended)
- B) Same, but also show a one-line "why" explanation per question
- C) Only flag wrong answers at the end (highlight which were wrong + correct answer), no per-question interruption

[Answer]: B

**Q6.2 — Does immediate feedback change the no-retry / reward rule?**
- A) No — still one attempt, reward only on all-correct, cap unchanged. Feedback is purely educational. (Recommended)
- B) Allow re-answering after seeing it's wrong (changes scoring — not recommended)

[Answer]: A

---

## Cross-cutting

**Q7 — Migration needed?** Item 3-A implies migration **0004** (`seen_sacrifice_hint` on children). All other items are UI/read-only. Confirm you're OK with one small migration if you pick 3-A.
- A) Yes, 3-A + migration 0004 is fine
- B) Prefer no migration → use 3-B (localStorage)

[Answer]: B

**Q8 — Cadence:** LIGHT single increment (all 6 items together, one code-gen pass), consistent with Inc 7–12. OK?
- A) Yes, LIGHT single increment
- B) Split (tell me how)

[Answer]: A
