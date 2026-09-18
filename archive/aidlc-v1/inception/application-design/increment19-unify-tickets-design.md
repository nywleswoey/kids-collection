# Increment 19 — Application Design: Unify Special Tickets → Easter Egg Ticket

Consolidated design (components, methods, services, dependencies, migration, data flow) for collapsing the 6 special-ticket balances into one 🥚 Easter Egg ticket. Cadence LIGHT-MEDIUM — single design doc.

## 1. Design Overview

**Core model change**: six per-tier columns → one `easterEggTickets` balance. All redemption paths spend that single column. Redeeming rolls a rarity by the normal pull odds, surprise-reveals the tier, and offers a pick-1-of-5 of that rarity.

**Design principles preserved**:
- Spend + award stay atomic behind `ChildStore` (single guarded decrement = single-use offer).
- Roll + candidate selection stay pure in `easter-egg.ts` (property-testable).
- Offer crypto server-side; client can't influence the rolled tier or swap cards.

## 2. Data Model & Migration

### Schema (`src/db/schema.ts`, `children`)
- **Remove**: `epic_tickets`, `lucky_tickets`, `common_pick_tickets`, `rare_pick_tickets`, `epic_pick_tickets`, `legendary_pick_tickets` (and their 6 non-negative checks).
- **Add**: `easter_egg_tickets integer NOT NULL DEFAULT 0`, check `easter_egg_tickets >= 0`.

### Migration 0005 (drizzle) — order matters
1. `ADD COLUMN easter_egg_tickets integer NOT NULL DEFAULT 0`.
2. Backfill: `UPDATE children SET easter_egg_tickets = epic_tickets + lucky_tickets + common_pick_tickets + rare_pick_tickets + epic_pick_tickets + legendary_pick_tickets` (FR2 sum-1:1 invariant).
3. `DROP COLUMN` the six old columns.
4. Add the `easter_egg_tickets >= 0` check.

**Invariant**: post-migration `Σ new = Σ (6 old)` per child. No loss.

### Domain types (`src/lib/types.ts`)
- `Child`: remove `epicTickets`, `luckyTickets`, `pickTickets`; add `easterEggTickets: number` (>= 0).
- Remove `EggTicket` and `PickRarity` types (no longer any callers).
- Keep `RARITY_WEIGHTS` (reused by the roll) and `zeroRarityCount` (still used by binder rarity counts).

## 3. Components (changed) & Responsibilities

| Component | File | Change |
|---|---|---|
| Rarity roll + choices | `features/pull/easter-egg.ts` | ADD pure `rollWeightedRarity(rng)` using `RARITY_WEIGHTS`. KEEP `pickRarityChoices`, `pickEasterEggChoices`, `pickCommonRareChoices` (last two still used by the unchanged ~1% eggs). |
| Balance column keys | `features/pull/pick-tickets.ts` | SHRINK to essentials: `BalanceColumn = "pullTokens" \| "easterEggTickets"`. REMOVE `pickTicketColumn`, `specialTicketColumn`, `pickTicketsFromRow`, `hasAnyPickTicket`, the per-rarity COLUMN map. (File may be folded into types if it becomes trivial.) |
| Signed offer | `features/pull/offer.ts` | `OfferPayload`: remove `ticket` + `pickRarity`; add `easterEgg?: true` and `rolledRarity?: Rarity` (reveal + claim-time rarity validation). |
| Pull orchestration | `features/pull/pull-service.ts` | REPLACE `pullSpecialEgg` + `pullRarityPick` with `pullEasterEgg(childId)`. Simplify claim spend-column to `easterEgg ? "easterEggTickets" : "pullTokens"`. `sacrifice` grants `easterEggTickets`. |
| Sacrifice roll | `features/pull/sacrifice.ts` | REMOVE `rollUpgradeTier` (no rarity dimension); keep `SACRIFICE_COST`. |
| Pull actions | `features/pull/actions.ts` | REPLACE `pullSpecialEggAction`+`pullRarityPickAction` → `pullEasterEggAction`; REPLACE `grantSpecialTicketAction`+`grantRarityPickTicketAction` → `grantEasterEggTicketAction`. Consolidate PostHog events to `easter_egg_ticket_granted` / `easter_egg_redeemed`. |
| Token/grant service | `features/pull/token-service.ts` | REPLACE `grantSpecial`+`grantPickTicket` with `grantEasterEgg(childId, n)` (clampedGrant on `easterEggTickets`). |
| Admin grant UI | `features/admin/GrantControl.tsx` | REMOVE ✨/🍀/🎯×4 steppers; ADD one 🥚 stepper (+1 / −1 only, −1 disabled at 0). |
| Egg picker UI | `features/pull/EasterEggPicker.tsx` | ADD surprise tier reveal banner (tier name + rarity color) driven by `rolledRarity`, shown before the 5 cards. |
| Pull screen | `features/pull/PullButton.tsx` | REPLACE the special/rarity redeem controls with one "Open Easter Egg 🥚" action, enabled when `easterEggTickets > 0`; show the balance. |
| Sacrifice panel | `features/pull/SacrificePanel.tsx` | Result copy → "You earned 1 🥚 Easter Egg ticket!" (no rarity). |
| Profiles / landing | `features/profiles/ProfileRow.tsx`, `child-mapper.ts`, `features/admin/ChildAdminRow.tsx`, `admin/service.ts`, `profile-store.fake.ts` | Map/display the single `easterEggTickets` count; drop the 6 old fields. |
| Quiz reward | `features/quiz/quiz-service.ts`, `QuizFlow.tsx`, `quiz/cap.ts`/`types.ts` | Award now `incrementColumn(childId, "easterEggTickets", 1)`. QuizFlow copy → "You earned an Easter Egg ticket! 🥚 +1". `DAILY_TICKET_CAP` semantics unchanged (3/day). |
| Stores | `db/stores/child-store.ts` (doc), `child-store.pg.ts`, `child-store.fake.ts` | Column set now `pullTokens` + `easterEggTickets`; update any column allow-list/mapping and the store contract test. |

## 4. Service Methods (signatures)

```
// easter-egg.ts (pure)
rollWeightedRarity(rng?: Rng): Rarity          // weighted by RARITY_WEIGHTS (60/25/12/3)
pickRarityChoices(pool, rarity, n=5, rng?): Card[]   // unchanged

// pull-service.ts
pullEasterEgg(childId): Promise<PullOutcome>   // guard easterEggTickets>=1;
                                               // roll rarity → pick-1-of-5; offer {easterEgg,rolledRarity};
                                               // ticket spent at claim (single-use)
claimEasterEgg(childId, offer, chosenCardId): Promise<PullOutcome>  // spend col = easterEgg?"easterEggTickets":"pullTokens"
sacrifice(childId, cardId): Promise<SacrificeResult>               // grants easterEggTickets += 1

// token-service.ts
grantEasterEgg(childId, n): Promise<number>    // clampedGrant("easterEggTickets", n)

// actions.ts
pullEasterEggAction(): Promise<PullOutcome>
grantEasterEggTicketAction(childId, amount): Promise<number>
```

`EasterEggOutcome` gains optional `revealRarity?: Rarity` so the picker can show the tier banner. `SacrificeResult` simplifies to `{ newBalance: number }` (rarity fields dropped).

## 5. Redemption Flow (text sequence)

```
Child taps "Open Easter Egg 🥚" (balance > 0)
  -> pullEasterEggAction -> pullService.pullEasterEgg(childId)
       guard easterEggTickets >= 1                      (else out-of-tokens)
       rarity = rollWeightedRarity()                    (server, pure)
       choices = pickRarityChoices(pool, rarity, 5)
       offer = sign{ childId, cardIds, exp, easterEgg:true, rolledRarity:rarity }
       return EasterEggOutcome{ choices, revealRarity:rarity, offer, ... }   (ticket NOT yet spent)
  -> EasterEggPicker: surprise-reveal tier banner, then show 5 cards
  -> child picks one -> claimEasterEggAction(offer, cardId)
       verify sig+expiry+child+membership
       spendOne("easterEggTickets")                     (atomic => single-use)
       grantCard + completion rewards
```

## 6. Dependencies / Data Flow (unchanged shape)
`PullButton/EasterEggPicker (client)` → `actions (server)` → `pullService` → `ChildStore` (atomic spend) + `Catalog` (pool) + `CollectionStore` (grant) + `RewardGranter`. Offer HMAC via `env.authSecret`. No new dependencies; no new modules — this is a contraction.

## 7. Security / Resiliency Notes
- Rolled rarity + candidates chosen server-side and signed; client cannot pick the tier or an un-offered card (NFR2).
- Single-use preserved: exactly one guarded `spendOne("easterEggTickets")` at claim (NFR1).
- Migration preserves totals (sum invariant) and is a pure schema/data step (NFR4).

## 8. Test Impact
- Property tests: `rollWeightedRarity` distribution ≈ RARITY_WEIGHTS; candidates always match rolled rarity; ≤ 5.
- Update store contract for the new column set; update pull-service unit tests (egg redeem, claim spend column, sacrifice grants easterEggTickets); quiz award test → easterEggTickets; migration sum test.
- Remove tests referencing the 6 removed columns/actions.

## 9. Out of Scope (design)
- The ~1% random in-pull eggs (`rollEasterEgg`, epic+ and common/rare) are untouched (Q3=A) — they still refund+re-spend a normal token and carry no `easterEgg` offer flag.
