# INCREMENT 16 — Code Generation Summary

LIGHT-MEDIUM. typecheck clean, **99/99 tests** (92 + 7 new), build ✅, zero new deps, no secret in client bundle. **Migration 0004 generated + NOT YET APPLIED** (needs `pnpm db:migrate` on the Neon DB — awaiting authorization).

## Migration 0004 (`0004_little_leper_queen.sql`)
- `children` +4 cols: `common/rare/epic/legendary_pick_tickets` (default 0, `>=0` CHECK).
- NEW `collection_rewards` (id, childId, themeId, rarity, cardId, createdAt, shownAt) with UNIQUE(childId, themeId, rarity) + child index.

## FR1 — Sacrifice → rarity-pick ticket
- `pull-service.sacrifice()` burns 3, then increments `{rollUpgradeTier(rarity)}_pick_tickets` (50/50 same/higher). No card grant. New `SacrificeResult = { ticketRarity, sourceRarity }`.
- `SacrificePanel` shows "You earned a {Rarity} Pick ticket! Go redeem" → /play/pull.

## FR2 — Redeem rarity-pick (pick-1-of-5 of that rarity)
- `easter-egg.pickRarityChoices`; `offer.pickRarity?`; `pull-service.pullRarityPick`; `claimEasterEgg` spends the matching column (guarded). `pick-tickets.ts` helper (column map, row→Record, hasAny).
- `PullButton` renders "🎯 {Rarity} Pick (n)" buttons; tracks `activePick` to decrement the right counter on claim. `pull/page.tsx` passes `child.pickTickets`.

## FR3 — Admin grant rarity-pick tickets
- `token-service.grantPickTicket`; `actions.grantRarityPickTicketAction`; `GrantControl` per-rarity +/- row; `ChildAdminRow`/`admin/service` pass `pickTickets` (Child now carries `pickTickets: Record<Rarity, number>`).

## FR4 — Egg draw clarity (🆕 / ➕×N)
- All egg outcomes carry `ownedCounts: Record<cardId, number>` (`ownedCountsFor` query) — makeEggOutcome, pullSpecialEgg, pullRarityPick.
- `EasterEggPicker` shows 🆕 New (owned 0) or ➕ ×N per choice.

## FR5 — Collection-completion reward
- Pure `rewards/collection-reward.ts` (`isRaritySetComplete`, `raritySetsFor`; reward card via `pickUpgradeCard`).
- `rewards/service.grantCompletionRewards` — **insert `collection_rewards` first with `onConflictDoNothing().returning()`; only grant the bonus card if a row comes back** → exactly-once, race-safe. Cascade re-checks the reward card; UNIQUE bounds the loop. Hooked after every card add: `pull`, `claimEasterEgg`, and `trade executeTrade` (both receivers). (Sacrifice grants a ticket, no card add → reward fires when redeemed.)
- Pending surfacing: `getPendingRewards` (shownAt null) → `CollectionRewardModal` on the galaxy view (prominent modal + Fireworks + fanfare, steps through multiple), marks shown via `markRewardsShownAction`.

## Security / NFR
- All grants/claims/rewards server-authoritative + atomic; pick-ticket claim single-use signed offer; reward exactly-once via UNIQUE + insert-before-grant. Admin grant behind parent+passcode. Egg owned-counts are the child's own data. No secret in `.next/static`.
- PBT: collection-reward detection, pickRarityChoices, pick-ticket helpers.

## Tests (7 new)
- `tests/collection-reward.pbt.test.ts`, `tests/pick-tickets.test.ts`. Updated Child fixtures (logic.pbt, admin) + sound/sacrifice unaffected.

## ⚠️ Deploy prerequisite
- `pnpm db:migrate` (0004) on the Neon DB (local == prod DB) BEFORE deploy, else the new columns/table are missing and pull/binder queries fail.
