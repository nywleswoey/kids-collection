# Increment 19 — Code Generation Plan: Unify Special Tickets → Easter Egg Ticket

Single-unit brownfield refactor. Source of truth for Code Generation. Modify files in-place (no `*_new` copies). All paths are workspace-relative. Traceability → FR1–FR9 / NFR1–5 in `increment19-unify-tickets-requirements.md` and design in `increment19-unify-tickets-design.md`.

## Step 1 — Data model & types (FR1)
- [ ] `src/lib/types.ts`: `Child` — remove `epicTickets`, `luckyTickets`, `pickTickets`; add `easterEggTickets: number`. Remove `EggTicket` and `PickRarity` types. Keep `RARITY_WEIGHTS`, `zeroRarityCount`.
- [ ] `src/db/schema.ts`: remove the 6 ticket columns + their 6 non-negative checks; add `easterEggTickets` (`easter_egg_tickets`, integer, notNull, default 0) + `easter_egg_tickets >= 0` check.

## Step 2 — Migration 0005 (FR2, NFR4)
- [ ] Generate drizzle migration via the project's migration workflow (`pnpm db:generate` equivalent) OR hand-author `src/db/migrations/0005_*.sql` + meta snapshot, in this order: (1) add `easter_egg_tickets` default 0; (2) `UPDATE children SET easter_egg_tickets = epic_tickets + lucky_tickets + common_pick_tickets + rare_pick_tickets + epic_pick_tickets + legendary_pick_tickets`; (3) drop the 6 old columns; (4) add `easter_egg_tickets >= 0` check. Preserve sum invariant.

## Step 3 — Pure logic (FR3, NFR3)
- [ ] `src/features/pull/easter-egg.ts`: add pure `rollWeightedRarity(rng: Rng = Math.random): Rarity` weighted by `RARITY_WEIGHTS`. Keep `pickRarityChoices`, `pickEasterEggChoices`, `pickCommonRareChoices` (last two used by the unchanged ~1% eggs).
- [ ] `src/features/pull/sacrifice.ts`: remove `rollUpgradeTier`; keep `SACRIFICE_COST`.
- [ ] `src/features/pull/pick-tickets.ts`: reduce `BalanceColumn` to `"pullTokens" | "easterEggTickets"`; remove `pickTicketColumn`, `specialTicketColumn`, `pickTicketsFromRow`, `hasAnyPickTicket`, COLUMN map. (If the file becomes trivial, inline `BalanceColumn` into a shared location and delete the file — update imports accordingly.)

## Step 4 — Signed offer (NFR2)
- [ ] `src/features/pull/offer.ts`: `OfferPayload` — remove `ticket` and `pickRarity`; add `easterEgg?: true` and `rolledRarity?: Rarity`.

## Step 5 — Pull service (FR3, FR4, FR7, NFR1)
- [ ] `src/features/pull/pull-service.ts`:
  - Replace `pullSpecialEgg` + `pullRarityPick` with `pullEasterEgg(childId)`: guard `easterEggTickets >= 1`; `rarity = rollWeightedRarity()`; `choices = pickRarityChoices(pool, rarity, 5)`; offer `{ easterEgg: true, rolledRarity: rarity }`; ticket spent at claim.
  - `EasterEggOutcome`: add `revealRarity?: Rarity`; set it for `pullEasterEgg`.
  - `claimEasterEgg`: spend column = `payload.easterEgg ? "easterEggTickets" : "pullTokens"`.
  - `sacrifice`: grant `easterEggTickets += 1`; `SacrificeResult` → `{ newBalance: number }`.
  - Update `PullService` returned method set.

## Step 6 — Token service + actions (FR6, FR8)
- [ ] `src/features/pull/token-service.ts`: replace `grantSpecial` + `grantPickTicket` with `grantEasterEgg(childId, n)` (clampedGrant on `easterEggTickets`). Keep `grant` (tokens).
- [ ] `src/features/pull/actions.ts`: replace `pullSpecialEggAction`+`pullRarityPickAction` → `pullEasterEggAction()`; replace `grantSpecialTicketAction`+`grantRarityPickTicketAction` → `grantEasterEggTicketAction(childId, amount)`. Consolidate PostHog events (`easter_egg_ticket_granted`, `easter_egg_redeemed`).

## Step 7 — Stores & mappers (FR1, FR8)
- [ ] `src/db/stores/child-store.ts`: update doc comment + any `BalanceColumn` import; column set now `pullTokens` + `easterEggTickets`.
- [ ] `src/db/stores/child-store.pg.ts` + `child-store.fake.ts`: update column allow-list / mapping to the new set; remove old-column handling.
- [ ] `src/features/profiles/child-mapper.ts`, `src/db/stores/profile-store.fake.ts`, `src/features/admin/service.ts`: map row → `Child.easterEggTickets`; drop the 6 old fields.

## Step 8 — Quiz reward (FR7-adjacent / in-scope touchpoint)
- [ ] `src/features/quiz/quiz-service.ts`: award now `incrementColumn(childId, "easterEggTickets", 1)`.
- [ ] `src/features/quiz/QuizFlow.tsx`: reward copy → "You earned an Easter Egg ticket! 🥚 +1". Keep `DAILY_TICKET_CAP` (3/day) semantics; rename incidental "lucky" wording in `quiz/types.ts`/`cap.ts` comments if it aids clarity (no behavior change).

## Step 9 — UI (FR4, FR6, FR8, FR9)
- [ ] `src/features/admin/GrantControl.tsx`: remove ✨/🍀/🎯×4 steppers; one 🥚 stepper (+1 / −1 only, −1 disabled at 0), wired to `grantEasterEggTicketAction`. Keep stable `data-testid`s (e.g. `grant-egg-plus1-{childId}`).
- [ ] `src/features/pull/PullButton.tsx`: replace special/rarity redeem controls with one "Open Easter Egg 🥚" action calling `pullEasterEggAction`, enabled when `easterEggTickets > 0`; display the balance.
- [ ] `src/features/pull/EasterEggPicker.tsx`: add surprise tier-reveal banner (tier label + rarity color) from `revealRarity`, shown before the 5 cards; `data-testid` for the banner.
- [ ] `src/features/pull/SacrificePanel.tsx`: result copy → "You earned 1 🥚 Easter Egg ticket!" (drop rarity messaging).
- [ ] `src/features/profiles/ProfileRow.tsx`, `src/features/admin/ChildAdminRow.tsx`: show single 🥚 count; drop old ticket displays.

## Step 10 — Tests (NFR3, NFR4, NFR5)
- [ ] Add property test: `rollWeightedRarity` distribution ≈ `RARITY_WEIGHTS`; candidates always match rolled rarity; ≤ 5.
- [ ] Update store contract test (`tests/contracts/child-store-contract.ts`) for the new column set.
- [ ] Update pull-service unit tests: `pullEasterEgg` redeem, claim spends `easterEggTickets`, sacrifice grants `easterEggTickets`.
- [ ] Update quiz award test → `easterEggTickets`.
- [ ] Add migration sum-invariant test if the harness supports it; otherwise assert backfill logic in a unit test.
- [ ] Remove/adjust tests referencing the 6 removed columns/actions. Target: full suite green.

## Step 11 — Verify build (NFR5)
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` all clean; confirm no `AUTH_SECRET` in client bundle; no duplicate `*_new` files.

## Step 12 — Documentation
- [ ] Write `aidlc-docs/construction/increment19-unify-tickets/code/code-summary.md` (modified vs created files, migration note, test results).

---

### Notes / Out of scope
- ~1% random in-pull eggs (`rollEasterEgg`) untouched (Q3=A).
- Migration application to Neon + prod deploy happen in Build & Test / Operations (Q7=A), not here.
- Scope: single logical unit; per-unit NFR sub-stages folded into this plan (LIGHT-MEDIUM cadence).
