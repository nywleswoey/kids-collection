# INCREMENT 8 — New Easter Eggs, Category Pick & Sort Fix: Questions

Fill each `[Answer]:` with a letter. Notes welcome.

Context: existing egg = ~1% roll → pick-1-of-5 **epic+**, signed offer, atomic claim (net 1 token).

---

## Q1 — New "common/rare" egg (item 1): how does its chance relate to the epic+ egg?
- A) **Independent 1% roll** — epic+ egg rolls first (~1%); if it doesn't fire, roll the common/rare egg (~1%). Roughly ~2% total any-egg *(recommended, simplest)*
- B) One ~1% "egg" roll, then 50/50 which egg type (epic+ vs common/rare) — keeps total egg rate ~1%
- C) Other (notes)

[Answer]: A

---

## Q2 — Common/rare egg: how many choices offered?
- A) Pick 1 of **5** (mirror the epic+ egg) *(recommended)*
- B) Pick 1 of 3
- C) Other (notes)

Note: choices are random distinct **common OR rare** cards (owned allowed), same signed-offer + atomic-claim security as the epic+ egg.

[Answer]: A

---

## Q3 — Sacrifice mechanic (item 2): how many copies consumed?
When a child has **≥3 copies** of a card, they may sacrifice extras for a random upgraded card. Consume:
- A) Exactly **3 copies per sacrifice** (must have 3+; leaves the rest) *(recommended — matches "hit 3 copies")*
- B) All copies beyond the first (keep 1, burn the rest in one go)
- C) Exactly 2 extra copies (keep 1)

[Answer]: A

---

## Q4 — Sacrifice result rarity
The randomed card is **equivalent OR one tier higher**. Split:
- A) **50/50** same-tier vs +1-tier *(recommended)*
- B) 70% same-tier / 30% +1-tier (rarer upgrade)
- C) Always +1 tier (legendary sacrifices stay legendary — already max)
- D) Other (notes)

Note: legendary is max tier → its "+1" falls back to legendary.

[Answer]: A

---

## Q5 — Sacrifice: token cost + result selection
- A) **Free** (you're spending duplicate cards, not tokens); result = random card of the chosen tier from the pool, **prefer not-yet-owned** if any *(recommended)*
- B) Free; result = fully random in tier (owned allowed)
- C) Costs 1 token on top of the copies
- D) Other (notes)

[Answer]: A

---

## Q6 — Where does the sacrifice action live?
- A) On the **card detail modal** in the galaxy/binder, shown only when count ≥ 3 *(recommended)*
- B) A dedicated "Sacrifice" screen listing all eligible cards
- C) Other (notes)

[Answer]: A

---

## Q7 — Category pick before pulling (item 3)
Show a category selector on the pull screen; **Random = default**. When a specific category is chosen, the normal draw is limited to that category's cards (rarity odds preserved within it).
- A) Category choice affects **only the normal draw**; both easter eggs stay **global** (all categories) *(recommended — eggs are special, category-agnostic)*
- B) Category choice **also scopes the eggs** to the chosen category
- C) Other (notes)

[Answer]: A

---

## Q8 — Category selection persistence
- A) **Resets to Random each visit** to the pull screen *(recommended, simplest)*
- B) Remembers the last category for that child

[Answer]: A

---

## Q9 — Profile order (item 4)
**Real cause found**: the **grant page (`/admin` dashboard)** uses `getAdminOverview()`, which does `db.select().from(children)` with **no ordering** → after a token grant (an UPDATE) Postgres returns heap order, so rows reshuffle. Inc7's fix only ordered `listChildren` (picker + Manage-Profiles), never this query. Fix:
- A) Order `getAdminOverview` by name too, **case-insensitive A→Z** (`lower(name)`), same applied to `listChildren` *(recommended)*
- B) Plain name sort (case-sensitive) is fine

[Answer]: A

---

## Q10 — Scope
Ship all 4 items as **INCREMENT 8 (LIGHT)**?
- A) Yes, all together *(recommended)*
- B) Split (notes)

[Answer]: A
