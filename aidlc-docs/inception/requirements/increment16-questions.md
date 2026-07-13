# INCREMENT 16 — Sacrifice Ticket, Egg Draw Clarity, Collection Reward — Questions

4 items. Likely 1 migration (new ticket storage + rewarded-set record). Answer inline `[Answer]: <letter>`. Recommended marked.

---

## Item 1 — Sacrifice grants a "rarity pick" ticket (choose from same rarity)

Today sacrifice burns 3 → grants a random same/higher card directly. New: grant a **ticket** the child redeems later to CHOOSE a card of that rarity.

**Q1.1 — Redemption: how many choices?**
- A) **Pick from ALL cards of that rarity** (full grid of every card in the tier). (Matches "any card of the same rarity")
- B) **Pick 1-of-5** random cards of that rarity (like existing egg pickers). (Recommended — consistent UX, less overwhelming)
- C) Pick 1-of-N (you pick N).

[Answer]: 

**Q1.2 — Which rarity does the sacrifice ticket grant?**
- A) **Same rarity as the sacrificed cards** (rare×3 → rare-pick ticket). Drops the old 50/50 tier-up. (Recommended — matches request)
- B) Same-or-higher (keep 50/50 roll to decide the ticket's rarity).

[Answer]: 

**Q1.3 — Sacrifice cost / eligibility unchanged?** (burn 3 copies of a card you own ≥3)
- A) Yes, unchanged (still burn 3). (Recommended)
- B) Change (describe).

[Answer]: 

**Q1.4 — Ticket storage (schema):**
- A) **4 integer counters per child — one per rarity** (`common_pick_tickets`, `rare_…`, `epic_…`, `legendary_…`). Migration. Simple, mirrors epic/lucky columns. (Recommended)
- B) A single JSON/row-per-ticket table. (More flexible, more work.)

[Answer]: 

---

## Item 1b — Admin can grant rarity-pick tickets

**Q1.5 — Admin grant UI:**
- A) **Extend GrantControl** — add per-rarity +/- grant buttons alongside epic/lucky. (Recommended)
- B) Separate admin section.

[Answer]: 

**Q1.6 — Where does the child redeem the ticket?**
- A) On the **pull screen** as a new pick button per rarity held (like ✨ Epic Pick / 🍀 Lucky Pick). (Recommended)
- B) On the galaxy/binder screen.

[Answer]: 

---

## Item 2 & 3 — Easter-egg draw clarity (new vs duplicate)

The 5 egg choices currently show only a rarity badge.

**Q2.1 — Mark each choice as:**
- A) **🆕 badge if not yet owned; ➕×N if owned (showing current count)**. (Recommended — covers both item 2 + 3)
- B) Only mark new; don't show dup counts.
- C) Only show dup counts; no new badge.

[Answer]: 

**Q2.2 — Applies to which pickers?**
- A) **All pick-1-of-5 draws** — random easter egg, epic pick, lucky pick, and the new sacrifice rarity-pick. (Recommended — consistent)
- B) Only the random easter egg.

[Answer]: 

**Q2.3 — "Duplicate count" = count before or after claiming?**
- A) **Current owned count shown on the choice** (before claim), e.g. "You have 2". (Recommended — informs the choice)
- B) Show resulting count after claim.

[Answer]: 

---

## Item 4 — Collection-completion reward (category × rarity)

When a child owns **every card of one rarity within one category**, grant a reward.

**Q4.1 — Reward:**
- A) **A random card of that rarity** (direct grant, any category). (Matches request)
- B) A random card of that rarity from the SAME category (but they just completed it, so it'd be a duplicate — likely you mean any category).
- C) Grant a **rarity-pick ticket** (item 1 mechanism) instead of a random card.

[Answer]: 

**Q4.2 — Reward random card pool:**
- A) **Any card of that rarity across all categories** (prefer not-yet-owned, fall back to any). (Recommended)
- B) Restricted to certain categories.

[Answer]: 

**Q4.3 — Grant once per (category, rarity) set — dedup?**
- A) **Yes — record each rewarded (child, category, rarity) so it never re-grants** (needs a `collection_rewards` table / migration). (Recommended, robust)
- B) Recompute each time; risk double-grant on re-trigger. (Not recommended.)

[Answer]: 

**Q4.4 — When is completion checked / reward granted?**
- A) **Server-side right after any card is added** (pull, egg claim, sacrifice ticket redeem, trade) — detect the set just completed, grant atomically. (Recommended)
- B) Only on pull.

[Answer]: 

**Q4.5 — How is the reward surfaced to the child?**
- A) **A celebratory notice on the next binder/galaxy view** ("You completed all Rare Dinosaurs — here's a bonus card!"). (Recommended, simple)
- B) Immediate modal at the moment of completion (needs threading through each add path).
- C) Both.

[Answer]: 

---

## Cadence & migration

**Q5 — Migration:** Item 1 (4 rarity-pick columns) + Item 4 (`collection_rewards` table) → **one migration 0004**. OK?
- A) Yes, one migration 0004 for both. (Recommended)
- B) Split / avoid (explain).

[Answer]: 

**Q6 — Cadence:** This is 4 features + migration → **LIGHT-MEDIUM single increment**. OK, or split?
- A) LIGHT-MEDIUM single increment (all together). (Recommended)
- B) Split into two increments (e.g. 16=sacrifice ticket + egg clarity; 17=collection reward).

[Answer]: 
