# INCREMENT 22 — Code Generation Plan: Friend-First Trade Board + Galaxy Sacrifice Filter

**Status**: COMPLETE — all 16 steps executed
**Date**: 2026-08-01
**Design**: `aidlc-docs/inception/application-design/increment22-trade-sacrifice-design.md`
**Decisions**: D1=A, D2=A, D3=A, **D4=B**, D5=A (recommended set, confirmed at the design gate)
**Schema impact**: none — no migration, no seed, no new dependency

D4=B means `SACRIFICE_MIN` is hoisted into `src/features/pull/sacrifice.ts` beside `SACRIFICE_COST`
and used by **both** the card detail page and the new galaxy filter, so the two gates are the same
expression rather than two that happen to agree.

---

## Slice B first — galaxy sacrifice filter (no server change, lowest risk)

- [x] **Step 1 — Hoist the threshold (D4=B).**
  In `src/features/pull/sacrifice.ts` add `export const SACRIFICE_MIN = SACRIFICE_COST + 1;` with a
  comment tying it to `removeCard(..., SACRIFICE_COST, SACRIFICE_COST + 1)` in `pull-service.ts:232`.
  Change `app/play/binder/[cardId]/page.tsx` from `detail.count > SACRIFICE_COST` to
  `detail.count >= SACRIFICE_MIN`. Behaviour identical; the rule now has one home.

- [x] **Step 2 — `src/features/binder/sacrifice-filter.ts` (NEW, pure).**
  `canSacrifice(entry: BinderCard): boolean` and `sacrificeReady(sections: ThemeSection[]): BinderCard[]`
  (global — ignores every chip, per FR11).

- [x] **Step 3 — `tests/sacrifice-filter.pbt.test.ts` (NEW, PBT).**
  Properties: false for every `count <= SACRIFICE_COST`; true for every `count >= SACRIFICE_MIN`;
  `canSacrifice(e) === (e.owned && e.count >= SACRIFICE_MIN)` — the card detail page's gate, so the
  burn view cannot produce a dead end; implies `owned`; `sacrificeReady` invariant under section
  partitioning and ordering.

- [x] **Step 4 — `src/features/binder/SacrificeGrid.tsx` (NEW, client).**
  Flat grid, no theme headers (FR12). Each tile: `Link` → `/play/binder/{cardId}` (FR14), plain `🔥`
  marker (FR13), existing `×{count}` badge, `RARITY_META` frame. Empty state explains the 4-copy rule
  in child-friendly words (FR15). `data-testid` on the grid and each tile.

- [x] **Step 5 — `src/features/binder/GalaxyView.tsx` (MODIFY).**
  Add `mode: "all" | "sacrifice"` state and the two-chip Show row above the existing rows:
  `All {n}` and `🔥 Ready to sacrifice {n}` (count always global, FR9/FR11). `mode === "sacrifice"`
  renders `SacrificeGrid`; `"all"` keeps today's behaviour byte-for-byte (FR17). Reuse `TabChip`
  (`aria-pressed`, text label — NFR6).

---

## Slice A — friend-first trade board

- [x] **Step 6 — `CollectionStore.ownedCardIdsForChildren` (D1=A).**
  Add to the port in `src/db/stores/collection-store.ts`; implement in `collection-store.pg.ts`
  (single `select childId, cardId ... where childId in (...)`, grouped in memory; empty input →
  empty map, no query) and in `collection-store.fake.ts`.

- [x] **Step 7 — `tests/contracts/collection-store-contract.ts` (MODIFY).**
  Contract cases for the new method: multi-child grouping, a child with no rows (absent key), empty
  input. Both adapters must pass; `pnpm test:pg` covers the pg side.

- [x] **Step 8 — `src/features/trade/board.ts` (NEW, pure).**
  `BoardCard`, `buildColumns`, `applyMissingFilter`, `missingCount`, `isPickable` exactly as §3.2 of
  the design.

- [x] **Step 9 — `tests/trade-board.pbt.test.ts` (NEW, PBT).**
  Properties: `newToOther` is exact set-complement; `applyMissingFilter(x, false)` is the identity and
  `true` keeps only `newToOther`; `missingCount` equals the badged count in `buildColumns` (chip and
  badges can never disagree); `isPickable` agrees with `validateTrade`'s rarity clause for every pair.

- [x] **Step 10 — `src/features/trade/trade-service.ts` (MODIFY).**
  Add `getTradeBoard(childId, friendId)` → `{ theirDupes, theirOwnedIds, myOwnedIds }` (D2=A: arrays
  over the wire). Add `listFriendSummaries(childId)` (D3=A) folding `missingCount` over ONE
  `ownedCardIdsForChildren` call (NFR5). **Remove** `listMatchesForRarity` (D5=A).

- [x] **Step 11 — `src/features/trade/actions.ts` (MODIFY).**
  Replace `getMatchesAction` with `getTradeBoardAction(friendId)` — read-only, `withParent`, active
  child resolved server-side. `executeTradeAction` untouched.

- [x] **Step 12 — `src/features/trade/TradeBoard.tsx` (NEW, client).**
  State model per §3.5, both filters defaulting to `false` (Q1=B). Friend strip with
  `{name} · 🎁 {missingCount}` chips (FR7) → two columns (FR2), stacked own-cards-first below `md`
  (FR5=A). Badges only on `newToOther` cards (FR4); mismatched rarities dimmed, not hidden (FR6).
  Carries over sounds, `posthog.capture("trade_initiated"/"trade_completed")`, `ErrorBanner`,
  `AvatarBadge`, `CardImage`, `RARITY_META`, and the confirm → `executeTradeAction` → result flow
  (FR8). Partner-read failure keeps the friend strip usable (NFR4). `data-testid`s mirroring the old
  flow's naming.

- [x] **Step 13 — `app/play/trade/page.tsx` (MODIFY).**
  Fetch `listTradableCards` + `listFriendSummaries`; render `TradeBoard`. Copy updated for
  friend-first.

- [x] **Step 14 — Delete replaced code (D5=A / FR1).**
  `src/features/trade/TradeFlow.tsx`; update `tests/trade-service.test.ts` (drop
  `listMatchesForRarity` cases, add `getTradeBoard` + `listFriendSummaries`).

---

## Cleanup and verification

- [x] **Step 15 — Delete every throwaway prototype file (§2.3).**
  `src/features/prototype/`, `src/features/trade/prototype/`, `src/features/binder/prototype/`, and
  the `?variant=` switches + `PROTO_NAMES` in `app/play/trade/page.tsx` and `app/play/binder/page.tsx`.
  Grep for `prototype`, `variant=`, `proto` to prove none survive.

- [x] **Step 16 — Verify.**
  `pnpm typecheck` clean · full suite green (182 existing + new, stable across two runs) ·
  `pnpm build` succeeds · no secret in the client bundle · no `*_new`/duplicate files ·
  `tests/trade-logic.pbt.test.ts` and `tests/rarity-filter.pbt.test.ts` still green (proof the commit
  path and the existing galaxy filters are untouched) · walk the 14 acceptance criteria, calling out
  which need a visual check against real data at Build & Test.

---

## Out of scope (unchanged)

`validateTrade` · `CollectionStore.swapCards` · `executeTrade` / `executeTradeAction` · the
completion-reward cascade · `SACRIFICE_COST` itself · where sacrificing happens · any schema, seed,
or dependency change.
