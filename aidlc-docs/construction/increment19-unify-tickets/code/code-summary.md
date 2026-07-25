# Increment 19 — Code Generation Summary: Unify Special Tickets → Easter Egg Ticket

Brownfield refactor collapsing six special-ticket balances into one 🥚 Easter Egg ticket. All in-place edits (no `*_new` files). typecheck clean · 174/174 tests · build ✅ · no client secret leak.

## Modified — data model & migration
- `src/lib/types.ts` — `Child`/`AdminChildRow`: removed `epicTickets`/`luckyTickets`/`pickTickets`, added `easterEggTickets`; removed `EggTicket`/`PickRarity` types.
- `src/db/schema.ts` — dropped 6 ticket columns + 6 checks; added `easter_egg_tickets` + non-negative check.
- **Created** `src/db/migrations/0005_unify_easter_egg_tickets.sql` — add column → backfill `= sum of the 6 old` → drop old columns → add check. Journal + `0005_snapshot.json` hand-authored; `db:generate` confirms "No schema changes" (snapshot consistent). **Not yet applied** — runs in Build & Test / Operations (Q7=A).

## Modified — logic & services
- `src/features/pull/easter-egg.ts` — added pure `rollWeightedRarity()` (RARITY_WEIGHTS 60/25/12/3). Kept `pickRarityChoices` + the two random-egg pickers.
- `src/features/pull/sacrifice.ts` — removed `rollUpgradeTier` (kept `nextTier`/`pickUpgradeCard`, still used by rewards).
- `src/features/pull/pick-tickets.ts` — reduced to `BalanceColumn = "pullTokens" | "easterEggTickets"`; removed the per-rarity/special-ticket helpers.
- `src/features/pull/offer.ts` — `OfferPayload`: replaced `ticket`/`pickRarity` with `easterEgg?`/`rolledRarity?`.
- `src/features/pull/pull-service.ts` — `pullSpecialEgg`+`pullRarityPick` → `pullEasterEgg()` (weighted roll → pick-1-of-5, ticket spent at claim); `EasterEggOutcome.revealRarity`; claim spends `easterEggTickets` when `easterEgg` pinned; `sacrifice` grants one ticket via atomic `clampedGrant`, `SacrificeResult = { newBalance }`.
- `src/features/pull/token-service.ts` — `getSpecialBalances`/`grantSpecial`/`grantPickTicket` → `getEasterEggBalance`/`grantEasterEgg`.
- `src/features/pull/actions.ts` — `pullSpecialEggAction`+`pullRarityPickAction` → `pullEasterEggAction`; `grantSpecialTicketAction`+`grantRarityPickTicketAction` → `grantEasterEggTicketAction`; PostHog events consolidated (`easter_egg_ticket_granted`).

## Modified — stores & mappers
- `src/db/stores/child-store.ts` (doc), `child-store.fake.ts` (doc), `profile-store.fake.ts` (row shape), `src/features/profiles/child-mapper.ts`, `src/features/admin/service.ts` — map/seed the single `easterEggTickets` column.

## Modified — quiz reward (in-scope touchpoint)
- `src/features/quiz/quiz-service.ts` — pass award now grants `easterEggTickets`.
- `src/features/quiz/QuizFlow.tsx` — copy → "You earned an Easter Egg ticket! 🥚 +1".
- `src/features/quiz/cap.ts` / `types.ts` — comment naming only (cap 3/day unchanged).

## Modified — UI
- `src/features/admin/GrantControl.tsx` — one 🥚 `+1/−1` stepper (`egg-balance-*`, `grant-egg-plus1/minus1-*`).
- `src/features/admin/ChildAdminRow.tsx` — GrantControl props; quiz emoji 🍀→🥚.
- `src/features/pull/PullButton.tsx` — single "Open Easter Egg" button (`easter-egg-button`); state/handlers collapsed to one ticket.
- `src/features/pull/EasterEggPicker.tsx` — surprise tier reveal banner (`easter-egg-reveal`) from `revealRarity`.
- `src/features/pull/SacrificePanel.tsx` — result copy → "1 🥚 Easter Egg ticket".
- `src/features/profiles/ProfileRow.tsx` — shows `🎟️ · 🥚`.
- `app/play/pull/page.tsx`, `app/play/home/page.tsx`, `app/admin/profiles/page.tsx` — pass `easterEggTickets`; home shows one 🥚 pill.

## Modified — tests
- `tests/pull-service.test.ts` — easter-egg claim + new `pullEasterEgg` describe; sacrifice → `{ newBalance }`.
- `tests/token-service.test.ts`, `tests/quiz-service.test.ts`, `tests/contracts/child-store-contract.ts`, `tests/contracts/profile-store-contract.ts`, `tests/logic.pbt.test.ts`, `tests/admin.test.ts`, `tests/admin-service.test.ts`, `tests/profile-service.test.ts`, `tests-pg/db.ts` — swapped to `easterEggTickets`.
- `tests/pick-tickets.test.ts` — removed dead helper tests; added `rollWeightedRarity` band + distribution property tests.
- `tests/sacrifice.pbt.test.ts` — removed `rollUpgradeTier` tests.

## Out of scope (unchanged)
- ~1% random in-pull easter egg (`rollEasterEgg`) — untouched (Q3=A).

## Verification
- `pnpm typecheck` ✅ · `pnpm test` 174/174 ✅ · `pnpm build` ✅ · no `authSecret`/`AUTH_SECRET` in `.next/static` ✅.
- `pnpm db:generate` → "No schema changes" (0005 snapshot consistent).
- Note: standalone `next lint` OOM'd in this environment; lint runs inside `next build`, which passed.
