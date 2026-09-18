# Increment 19 — Unify Special Tickets → Easter Egg Ticket: Requirements

## Intent Analysis
- **User request**: "Collapse all the special tickets into 1 easter egg ticket."
- **Request type**: Refactoring / Enhancement (brownfield).
- **Scope**: Multiple components — DB schema + migration, domain types, child stores (pg + fakes), profile/admin mappers, admin grant UI, pull actions/services, signed offer, EasterEggPicker UI, SacrificePanel.
- **Complexity**: Moderate.
- **Requirements depth**: Standard.
- **Cadence**: LIGHT-MEDIUM single increment. Schema migration required.

## Background (current state)
A child holds **6 separate special-ticket balances**, each redeemed on the pull screen for a guaranteed **pick-1-of-5**, differing only by candidate pool:
- `epic_tickets` (✨) — epic + legendary
- `lucky_tickets` (🍀) — common + rare
- `common_pick_tickets` / `rare_pick_tickets` / `epic_pick_tickets` / `legendary_pick_tickets` (🎯) — one exact rarity each (Inc16)

Separately, a **~1% random easter-egg trigger** (`rollEasterEgg`) may fire on a normal pull and shows an epic+ pick-1-of-5. It consumes no ticket.

## Decisions (from Q&A)
| Ref | Decision |
|---|---|
| Q1 + clarification | Unified ticket redemption = **rarity-weighted roll** using the normal pull odds (common 60 / rare 25 / epic 12 / legendary 3), then a **pick-1-of-5 of the rolled rarity**. |
| Clarification Q2 | **Surprise-reveal** the rolled tier (e.g. "LEGENDARY EGG!") before showing the 5 candidate cards. |
| Q2 | Migrate existing balances by **summing all 6 old columns 1:1** into the new balance. |
| Q3 | **Leave the ~1% random easter-egg trigger unchanged** (stays epic+ pick-1-of-5, ticket-free). |
| Q4 | Name **"Easter Egg ticket"**, icon **🥚**. |
| Q5 | Admin grant: **one simple stepper** (+1 / −1 only) per child. |
| Q6 | Sacrificing **3 duplicates → 1 easter egg ticket** (same threshold; rarity no longer matters). |
| Q7 | **Build, migrate, and deploy to prod** when complete. |

## Functional Requirements

- **FR1 — Single balance**: Replace the 6 special-ticket columns on `children` with one `easter_egg_tickets` integer balance (non-negative, default 0). The four/six old columns are removed after data migration.

- **FR2 — Data migration (1:1 sum)**: A migration adds `easter_egg_tickets` and backfills each child's value as the sum of `epic_tickets + lucky_tickets + common_pick_tickets + rare_pick_tickets + epic_pick_tickets + legendary_pick_tickets`, then drops the six old columns. No child loses tickets.

- **FR3 — Redemption (weighted roll → pick-1-of-5)**: Redeeming one easter egg ticket, server-side:
  1. Rolls a rarity by the normal odds (reuse `RARITY_WEIGHTS`: common 60, rare 25, epic 12, legendary 3).
  2. Draws a pick-1-of-5 of that exact rarity (existing `pickRarityChoices`); fewer than 5 in the tier → as many as exist.
  3. Deducts 1 easter egg ticket atomically and issues a single-use signed offer pinning the 5 candidates and the rolled rarity, consistent with the current claim flow.

- **FR4 — Surprise reveal**: The picker announces the rolled tier (tier name + color, e.g. "✨ EPIC EGG!" / "🌟 LEGENDARY EGG!") before/above the 5 candidate cards. The child then picks one, which is added to their collection (owned duplicates allowed, as today).

- **FR5 — Random ~1% egg unchanged**: The existing in-pull ~1% `rollEasterEgg` behavior is untouched — still an epic+ pick-1-of-5 that consumes no ticket. (It is not a "special ticket".)

- **FR6 — Admin grant control**: Manage-Profiles shows a single 🥚 easter-egg-ticket stepper per child with **+1 / −1** only (−1 disabled at zero). The old ✨ 🍀 and four 🎯 steppers are removed. One grant server action replaces the three old grant actions.

- **FR7 — Sacrifice reward**: Sacrificing 3 duplicate copies of any card grants **1 easter egg ticket** (threshold unchanged); the reward no longer depends on the card's rarity.

- **FR8 — Display surfaces**: Everywhere the old special tickets were shown (child landing, profile rows, pull screen, admin) now shows the single 🥚 easter-egg-ticket count. Redemption entry point on the pull screen is a single "Open Easter Egg" action, enabled only when balance > 0.

- **FR9 — Naming**: Ticket is labeled "Easter Egg ticket" with the 🥚 icon across all surfaces.

## Non-Functional Requirements

- **NFR1 — Atomicity (Resiliency)**: Ticket spend + card grant remain atomic (single-use offer; no double-spend, no spend-without-award), matching the current signed-offer + atomic-claim guarantees.
- **NFR2 — Server authority (Security)**: The rolled rarity and 5 candidates are chosen server-side and HMAC-signed; the client cannot influence the tier rolled or swap in an un-offered card. `AUTH_SECRET` must not leak to the client bundle.
- **NFR3 — Purity / testability (Property-Based Testing)**: The weighted-rarity roll and candidate selection stay pure and property-testable (distribution over the tier weights; candidates always match the rolled rarity; never more than 5).
- **NFR4 — Migration safety**: Migration is reversible in intent and preserves totals (sum invariant). Existing tests remain green; new tests cover the roll, migration sum, and the collapsed grant/redeem paths.
- **NFR5 — No regressions**: Binder, pulls, trading, quizzes, and the ~1% random egg continue to work unchanged.

## Out of Scope
- Changing the ~1% random in-pull easter-egg trigger (Q3=A).
- Changing pull-token economics or card content.
- Changing the sacrifice threshold (stays 3).

## Summary
Collapse six per-tier "special ticket" columns into one 🥚 **Easter Egg ticket**. Redeeming it rolls a rarity by normal pull odds, surprise-reveals that tier, and offers a pick-1-of-5 of that rarity. Existing balances are summed 1:1 into the new column via migration; admin grants via a single +1/−1 stepper; sacrifice yields the unified ticket; the unrelated ~1% random egg is left as-is. Ends with migrate + prod deploy.
