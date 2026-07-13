# INCREMENT 16 — Code Generation Plan

LIGHT-MEDIUM. Migration 0004, zero deps. Target: 92/92 stay green + new tests.
Schema+pure logic first, then services, then UI.

## Schema / migration 0004
- [ ] `schema.ts` — children +4 `{rarity}_pick_tickets` cols (default 0, >=0 CHECK); NEW `collection_rewards` (id, childId, themeId, rarity, cardId, createdAt, shownAt; UNIQUE(childId,themeId,rarity); index)
- [ ] `pnpm db:generate` → migration 0004 SQL
- [ ] `types.ts` — Child + admin row pick-ticket fields; PickRarity

## Pure logic (PBT)
- [ ] `easter-egg.ts` — `pickRarityChoices(pool, rarity, n)`
- [ ] `rewards/collection-reward.ts` — `isRaritySetComplete`, `raritySetsFor`; reuse `pickUpgradeCard`
- [ ] tests: `rarity-pick.pbt`, `collection-reward.pbt`

## Pull service + offers
- [ ] `offer.ts` — `pickRarity?: Rarity` in payload (+ validate)
- [ ] `pull-service.ts` — sacrifice→ticket (rollUpgradeTier, increment col); `pullRarityPick`; claim spend pickRarity; `ownedCounts` on all egg outcomes; reward hook after each collection upsert (pull, claim)
- [ ] `rewards/service.ts` — `grantCompletionRewards(childId, addedIds)` (insert-before-grant race-safe, cascade), `getPendingRewards`, `markRewardsShown`
- [ ] trade `trade-service.ts` — call grantCompletionRewards for both receivers after swap
- [ ] `actions.ts` — `pullRarityPickAction`; rewards `markRewardsShownAction`

## UI
- [ ] `EasterEggPicker.tsx` — `ownedCounts` prop → 🆕 / ➕×N badges
- [ ] `PullButton.tsx` — rarity pick buttons (pickTickets prop) + pass ownedCounts; track pickRarity claim
- [ ] `app/play/pull/page.tsx` — pass pickTickets
- [ ] `SacrificePanel.tsx` — ticket-earned result copy
- [ ] `GrantControl.tsx` + `grantRarityPickTicketAction` — per-rarity grant
- [ ] `rewards/CollectionRewardModal.tsx` + `app/play/binder/page.tsx` — pending reward modal + confetti + markShown

## Verify
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` — 92 + new green
- [ ] `pnpm build` ✅
- [ ] zero deps, migration 0004 only, no secret in client bundle
- [ ] `increment16/code-summary.md`
