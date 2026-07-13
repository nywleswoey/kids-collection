# INCREMENT 16 — Code Generation Plan

LIGHT-MEDIUM. Migration 0004, zero deps. Target: 92/92 stay green + new tests.
Schema+pure logic first, then services, then UI.

## Schema / migration 0004
- [x] `schema.ts` — children +4 `{rarity}_pick_tickets` cols (default 0, >=0 CHECK); NEW `collection_rewards` (id, childId, themeId, rarity, cardId, createdAt, shownAt; UNIQUE(childId,themeId,rarity); index)
- [x] `pnpm db:generate` → migration 0004 SQL
- [x] `types.ts` — Child + admin row pick-ticket fields; PickRarity

## Pure logic (PBT)
- [x] `easter-egg.ts` — `pickRarityChoices(pool, rarity, n)`
- [x] `rewards/collection-reward.ts` — `isRaritySetComplete`, `raritySetsFor`; reuse `pickUpgradeCard`
- [x] tests: `rarity-pick.pbt`, `collection-reward.pbt`

## Pull service + offers
- [x] `offer.ts` — `pickRarity?: Rarity` in payload (+ validate)
- [x] `pull-service.ts` — sacrifice→ticket (rollUpgradeTier, increment col); `pullRarityPick`; claim spend pickRarity; `ownedCounts` on all egg outcomes; reward hook after each collection upsert (pull, claim)
- [x] `rewards/service.ts` — `grantCompletionRewards(childId, addedIds)` (insert-before-grant race-safe, cascade), `getPendingRewards`, `markRewardsShown`
- [x] trade `trade-service.ts` — call grantCompletionRewards for both receivers after swap
- [x] `actions.ts` — `pullRarityPickAction`; rewards `markRewardsShownAction`

## UI
- [x] `EasterEggPicker.tsx` — `ownedCounts` prop → 🆕 / ➕×N badges
- [x] `PullButton.tsx` — rarity pick buttons (pickTickets prop) + pass ownedCounts; track pickRarity claim
- [x] `app/play/pull/page.tsx` — pass pickTickets
- [x] `SacrificePanel.tsx` — ticket-earned result copy
- [x] `GrantControl.tsx` + `grantRarityPickTicketAction` — per-rarity grant
- [x] `rewards/CollectionRewardModal.tsx` + `app/play/binder/page.tsx` — pending reward modal + confetti + markShown

## Verify
- [x] `pnpm typecheck` clean
- [x] `pnpm test` — 92 + new green
- [x] `pnpm build` ✅
- [x] zero deps, migration 0004 only, no secret in client bundle
- [x] `increment16/code-summary.md`
