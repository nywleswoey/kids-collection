# INCREMENT 16 — Application Design

LIGHT-MEDIUM. Migration 0004. Zero new deps. References: increment16-requirements.md.

---

## Migration 0004 (schema.ts → drizzle-kit generate)
- **`children`** +4 columns: `common_pick_tickets`, `rare_pick_tickets`, `epic_pick_tickets`, `legendary_pick_tickets` — `integer notNull default 0`, each with `>= 0` CHECK.
- **NEW table `collection_rewards`**:
  - `id` (uuid pk), `childId` (fk→children, cascade), `themeId` (fk→themes), `rarity` (rarityEnum), `cardId` (fk→cards; the granted bonus card), `createdAt` (default now), `shownAt` (timestamptz, nullable — null = pending modal).
  - **UNIQUE(childId, themeId, rarity)** — a set is rewarded exactly once (dedup, race-safe via `onConflictDoNothing`).
  - index on `(childId)` where `shownAt is null` (pending lookup) — or plain `(childId, shownAt)`.

Types (`types.ts`): add the 4 pick-ticket fields to `Child` + admin row; `PickRarity = Rarity`; `EggChoice`/owned-count carrier (below).

---

## FR1 — Sacrifice grants a rarity-pick ticket
- `sacrifice.ts` stays for the tier roll (`rollUpgradeTier`). `pull-service.ts sacrifice()`:
  - After the atomic burn (unchanged), **stop granting a card**. Compute `ticketRarity = rollUpgradeTier(source.rarity)` (50/50 same/higher, Q1.2=B).
  - Atomically increment the matching `{ticketRarity}_pick_tickets` column.
  - Return `{ ticketRarity }` (new `SacrificeResult` shape: `{ ticketRarity: Rarity }` instead of card).
- `SacrificePanel.tsx` — result view: "✨ You earned a {Rarity} Pick ticket! Redeem it on the Discover screen." (no card render).

## FR2 — Rarity-pick ticket redemption (pick-1-of-5 of that rarity)
- `offer.ts` `OfferPayload`: add optional `pickRarity?: Rarity` (alongside existing `ticket?: "epic"|"lucky"`). Exactly one of `ticket` / `pickRarity` set for special offers.
- `pull-service.ts` new `pullRarityPick(childId, rarity)`:
  - Read the `{rarity}_pick_tickets` column; `< 1` → `{ outOfTokens: true }`.
  - `choices = pickN(pool.filter(rarity), 5)` (new pure helper `pickRarityChoices(pool, rarity, 5)` in easter-egg.ts, mirrors pickEasterEggChoices).
  - Sign offer with `pickRarity`. Ticket spent at claim (single-use), balance unchanged (like special egg).
- `claimEasterEgg` — extend the spend branch: if `payload.pickRarity`, spend the matching `{rarity}_pick_tickets` column atomically (guarded `>= 1`), same pattern as epic/lucky.
- `actions.ts` — `pullRarityPickAction(rarity)`.
- `PullButton.tsx` — render a "🎯 {Rarity} Pick (n)" button per rarity the child holds (new props `pickTickets: Record<Rarity, number>`); on claim decrement that rarity (extend `onEggClaimed` / activeTicket to track a pickRarity).

## FR3 — Admin grant rarity-pick tickets
- `GrantControl.tsx` — add a per-rarity grant row (4 small +buttons or a rarity select + amount). New action `grantRarityPickTicketAction(childId, rarity, n)` (parent+passcode gated) → increments column, returns new count.
- Extend ticket summaries (ProfileRow / landing) to include non-zero pick tickets (optional, low-pri; include for consistency).

## FR4 — Egg draw clarity (🆕 / ➕×N) on all pick-1-of-5
- Carry owned counts to the client: extend `EasterEggOutcome` with `ownedCounts: Record<string, number>` (cardId → active child's current count, 0 if unowned). Populated in `makeEggOutcome`, `pullSpecialEgg`, `pullRarityPick` by querying `collections` for the choice cardIds.
- `EasterEggPicker.tsx` — new prop `ownedCounts`; per choice badge:
  - owned 0 → **🆕** ; owned ≥1 → **➕ ×{n}** ("You have {n}").
- `PullButton.tsx` passes `ownedCounts` from the outcome to `EasterEggPicker`.
- Security: counts are the child's own data; no answer-key concern.

## FR5 — Collection-completion reward
**Pure logic** `src/features/rewards/collection-reward.ts`:
- `isRaritySetComplete(cards, themeId, rarity, ownedIds): boolean` — every card of (theme,rarity) is in ownedIds (and the set is non-empty).
- `raritySetsFor(cards, cardIds): {themeId, rarity}[]` — distinct (theme,rarity) pairs touched by a set of added cards (candidates to re-check).
- Reuse `pickUpgradeCard(pool, rarity, ownedIds, rng)` (sacrifice.ts) for the reward card (prefers unowned, any category — Q4.2=A).
- PBT: complete detection, reward prefers unowned, candidate pairs.

**Service** `src/features/rewards/service.ts` `grantCompletionRewards(childId, addedCardIds)`:
- Loop (cascade, Q4.4/cascade): maintain a worklist of added cardIds. For each distinct (theme,rarity) touched, if `isRaritySetComplete` AND no existing `collection_rewards` row (UNIQUE + `onConflictDoNothing`):
  - pick reward card, upsert into `collections` (+1), insert `collection_rewards` row (childId, themeId, rarity, rewardCardId). If the insert hit the UNIQUE conflict (already rewarded, race) → skip, no card double-grant (insert reward BEFORE the collection upsert, or gate the upsert on the insert's success).
  - add the reward cardId to the worklist → re-check (cascade). UNIQUE dedup bounds the loop.
- Return granted rewards for logging; surfacing is via the pending record.
- **Ordering for race-safety:** insert `collection_rewards` with `onConflictDoNothing().returning()`; only if a row returns (we won the set) do we grant the reward card. Guarantees exactly-once even under concurrency.

**Hook into every add path (Q4.4=A):** call `grantCompletionRewards(childId, [cardId])` right after the collection upsert in: `pull`, `claimEasterEgg` (covers epic/lucky/rarity-pick), and `trade executeTrade` (both receivers). Sacrifice grants a ticket (no card add) so no hook there; the reward fires when that ticket is later redeemed via claim. Keep each call inside the existing success path.

**Surfacing (pending modal + micro-interactions):**
- `getPendingRewards(childId)` — `collection_rewards` where `shownAt is null`, joined to card + theme names.
- `app/play/binder/page.tsx` — load pending rewards, pass to a new client `CollectionRewardModal.tsx`:
  - Prominent modal: "🏆 You completed all {Rarity} {Theme}! Bonus card:" + animated card reveal + Fireworks/Confetti (reduced-motion respected).
  - On mount, calls `markRewardsShownAction(ids)` (server action sets `shownAt=now`) so it shows once. Handles multiple pending (queue or list).
- Optionally also a small entry on home; primary is the galaxy modal (Q4.5=A + Q4.1 note).

---

## Non-Functional
- Zero deps. Migration 0004 (4 cols + table). No seed.
- **Security:** all grants/claims/rewards server-authoritative + atomic. Pick-ticket claim single-use (signed offer + guarded decrement). Reward exactly-once via UNIQUE + insert-before-grant. Admin grant behind parent+passcode. No secret exposure; egg owned-counts are child's own data.
- **PBT:** rarity-pick choices; set-completion; reward-card prefers unowned; cascade termination (rewarded set never re-selected).
- **Resiliency:** reward runs in the card-add success path; UNIQUE prevents double-grant under races/retries; cascade bounded.
- Reduced-motion on reward modal.

## New / changed files
| File | Change |
|---|---|
| `src/db/schema.ts` + `migrations/0004_*` | 4 pick cols + `collection_rewards` |
| `src/lib/types.ts` | pick-ticket fields, EggChoice ownedCounts |
| `src/features/pull/easter-egg.ts` | `pickRarityChoices` |
| `src/features/pull/offer.ts` | `pickRarity?` in payload |
| `src/features/pull/pull-service.ts` | sacrifice→ticket; `pullRarityPick`; claim spend pickRarity; ownedCounts on outcomes; reward hook |
| `src/features/pull/actions.ts` | `pullRarityPickAction` |
| `src/features/pull/PullButton.tsx` | rarity pick buttons + ownedCounts passthrough |
| `src/features/pull/EasterEggPicker.tsx` | 🆕/➕×N badges |
| `src/features/pull/SacrificePanel.tsx` | ticket result copy |
| `src/features/admin/GrantControl.tsx` + action | grant pick tickets |
| `src/features/rewards/collection-reward.ts` | NEW pure (PBT) |
| `src/features/rewards/service.ts` | NEW grant + pending + markShown |
| `src/features/rewards/CollectionRewardModal.tsx` | NEW modal |
| `app/play/binder/page.tsx` | load + render pending rewards |
| `app/play/pull/page.tsx` | pass pickTickets to PullButton |
| tests | rarity-pick, egg-count, collection-reward PBT/unit |

## Test plan
- `pickRarityChoices` returns ≤5 of the exact rarity.
- `isRaritySetComplete` true iff all of (theme,rarity) owned; reward card prefers unowned; cascade candidate pairs.
- offer `pickRarity` round-trips; claim spends the right column.
- Existing 92/92 green; migration applies clean.
