# Increment 5 — Card Expand & Rarity Clarity: Clarification Questions

**Type**: Enhancement (brownfield, presentational). No schema/data/logic changes.
**Intent (your request)**: (1) admin view should let you expand a card to view it larger; (2) rarity should be more obvious in the binder.

Answer each after its `[Answer]:` tag. Recommended default listed first.

---

## Q1 — Admin card expand: how does it open?
Clicking a card in the admin preview should…

A) **Modal overlay** — expands in place over the preview grid; click outside / ✕ to close (stays on the page, fast)

B) **Dedicated admin card page** — navigates to a full admin detail route

C) **Reuse the kid card-detail page** — same `/play/binder/[cardId]` view (but that's kid-styled, no source link)

D) Other (describe after [Answer]:)

[Answer]: A

---

## Q2 — Expanded admin card: what's shown?
In the expanded admin view, show…

A) **Full interactive card** (big art + holo/tilt) + name + rarity label + fun fact + 🔗 source link

B) Big static art + name + rarity + fact + source link (no holo/tilt)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q3 — Rarity signal in the binder: which visuals?
Make each card's rarity obvious with… (pick all that apply)

A) **Colored frame** per rarity (common gray · rare blue · epic purple · legendary gold)

B) **Glow** on higher rarities (epic/legendary shimmer)

C) **Corner badge / label** (e.g. small "Epic" tag or a rarity dot)

D) Other (describe after [Answer]:)

[Answer]: A, B, C

---

## Q4 — Where does the rarity styling apply?
Apply the clearer rarity signals to…

A) **Kid binder + admin preview** (both grids)

B) Kid binder only

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q5 — Locked (uncollected) slots
The kid binder shows locked cards as a "❔" silhouette. Should locked slots also hint at the card's rarity (e.g. a colored frame)?

A) **No** — keep locked slots neutral (rarity is a reveal-time surprise)

B) Yes — show the rarity frame even when locked

C) Other (describe after [Answer]:)

[Answer]: A
