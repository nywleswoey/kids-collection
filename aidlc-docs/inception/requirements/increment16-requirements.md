# INCREMENT 16 — Sacrifice Rarity-Pick Ticket, Egg Draw Clarity, Collection-Completion Reward

**Type**: Brownfield feature (gameplay + schema).
**Cadence**: LIGHT-MEDIUM — single increment (Q6=A).
**Migration**: **0004** — 4 rarity-pick ticket columns + `collection_rewards` table (Q5=A).
**Answers**: increment16-questions.md.

---

## FR1 — Sacrifice grants a rarity-pick ticket (replaces direct card grant)
- Sacrifice still **burns 3 copies** of a card the child owns ≥3 (Q1.3=A, cost unchanged).
- Instead of granting a random card, it grants **one rarity-pick ticket** (Q1.1=B redeemed later as a pick-1-of-5).
- **Ticket rarity = 50/50 same tier or one higher** (Q1.2=B) — reuses `rollUpgradeTier` (legendary stays legendary). So sacrificing 3 rares → a rare-pick OR epic-pick ticket (50/50).
- Sacrifice result UI updates: instead of "here's your upgraded card", show "You earned a {rarity} Pick ticket! Redeem it on the pull screen."

## FR2 — Rarity-pick ticket storage + redemption
- **Schema (Q1.4=A):** 4 new integer columns on `children`: `common_pick_tickets`, `rare_pick_tickets`, `epic_pick_tickets`, `legendary_pick_tickets` (default 0, `>= 0` CHECK each). Migration 0004.
- **Redemption (Q1.6=A):** on the **pull screen**, a new pick button per rarity the child holds (e.g. "🎯 Rare Pick (2)"), alongside existing ✨ Epic / 🍀 Lucky.
- Redeem = **pick-1-of-5 random cards of that exact rarity** (Q1.1=B). Spend one ticket atomically at claim (mirror the epic/lucky single-use signed-offer pattern; the offer pins the rarity).

## FR3 — Admin can grant rarity-pick tickets
- **Extend `GrantControl` (Q1.5=A):** per-rarity +/- grant buttons alongside epic/lucky. New action `grantRarityPickTicketAction(childId, rarity, n)`.
- Reflected read-only in the manage-profile / landing ticket displays where appropriate (extend existing ticket summaries to include rarity-pick tickets if non-zero).

## FR4 — Easter-egg draw clarity: new vs duplicate (items 2 & 3)
- On **every pick-1-of-5 draw** (random easter egg, epic pick, lucky pick, new rarity pick) (Q2.2=A), each of the 5 choice cards shows:
  - **🆕 badge if the child does NOT yet own it** (Q2.1=A, item 2), OR
  - **➕ ×N if owned**, showing the **current owned count before claim** (Q2.1=A / Q2.3=A, item 3).
- Requires the offer/choices to carry each choice's current owned count for the active child. Server includes owned counts when building the pick offer (no answer key leak — counts are the child's own data).

## FR5 — Collection-completion reward (item 4)
- **Trigger (Q4.4=A):** server-side, right after ANY card is added to a collection (pull, egg claim, epic/lucky/rarity-pick claim, sacrifice-ticket redeem, trade). Detect a **(category × rarity) set that just became complete** — child owns ≥1 of every card of that rarity in that theme.
- **Reward (Q4.1=A, Q4.2=A):** grant **one random card of that rarity from ANY category**, preferring a not-yet-owned card, falling back to any. Direct grant (not a ticket).
- **Dedup (Q4.3=A):** a `collection_rewards` table records each rewarded **(childId, themeId, rarity)** with a UNIQUE constraint, so a set is rewarded **exactly once** even on re-trigger. Migration 0004.
- **Cascade:** granting the reward card adds a card, which could complete a different (category, rarity) set → re-check in a bounded loop; the UNIQUE dedup guarantees termination (each set rewards at most once).
- **Surfacing (Q4.5=A + Q4.1 note):** the reward is granted server-side immediately; a **pending-reward record** surfaces on the next binder/galaxy view as a **prominent celebratory modal** describing what happened ("You completed all Rare Dinosaurs! Here's a bonus: {card}") **with micro-interactions** (confetti/fireworks, animated card reveal). Pending rewards are marked shown after display so they don't repeat.

---

## Non-Functional / Constraints
- **Zero new npm deps.** Migration 0004 (columns + table); no seed.
- **Security:** all grants/claims server-authoritative + atomic (single-use signed offers for picks; UNIQUE constraint + atomic insert for rewards prevent double-grant/races). Admin grant behind parent + passcode gate. No secret exposure. Owned-count on egg choices is the child's own data.
- **PBT:** rarity-pick offer/claim logic; set-completion detector (owns-all-of-rarity-in-theme); reward-card picker (prefers unowned); cascade termination.
- **Resiliency:** completion/reward runs inside the same atomic path as the card add; failure doesn't corrupt the collection; dedup UNIQUE avoids duplicates under concurrency.
- Reduced-motion respected on the reward modal micro-interactions.

## Out of Scope
- Rarity-pick redemption as full-grid "all cards of rarity" (Q1.1=A not chosen — using 1-of-5).
- Immediate at-the-moment modal threaded through every add path (Q4.5=B) — using pending-record + next-view modal instead.
- Trading rarity-pick tickets between kids.

## Test Impact
- Existing 92/92 stay green.
- New PBT/unit: rarity-pick ticket rarity roll (50/50 same/higher), pick-1-of-5-of-rarity choices, egg-choice owned-count annotation, set-completion detector, reward-card selection, cascade bound, dedup.

## Affected Modules (indicative)
- `src/db/schema.ts` + `drizzle` migration 0004 (4 columns + `collection_rewards`).
- `src/lib/types.ts` — Child ticket fields; pick-ticket rarity type; egg choice owned-count.
- `src/features/pull/sacrifice.ts` + `SacrificePanel.tsx` — grant ticket instead of card.
- `src/features/pull/pull-service.ts` / `offer` — rarity-pick offer + claim; annotate choices with owned counts.
- `src/features/pull/EasterEggPicker.tsx` — 🆕 / ➕×N badges; rarity-pick redemption entry in `PullButton.tsx`.
- NEW `src/features/rewards/collection-reward.ts` (pure detector + picker) + service hook invoked from all card-add paths (pull, egg, sacrifice redeem, trade).
- NEW pending-reward surfacing (record + galaxy modal).
- `src/features/admin/GrantControl.tsx` + grant action.
