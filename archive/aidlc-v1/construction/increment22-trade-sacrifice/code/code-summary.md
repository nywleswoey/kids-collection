# INCREMENT 22 — Code Generation Summary

**Status**: COMPLETE — all 16 plan steps [x]
**Date**: 2026-08-01
**Plan**: `aidlc-docs/construction/plans/increment22-trade-sacrifice-code-generation-plan.md`
**Decisions applied**: D1=A, D2=A, D3=A, **D4=B**, D5=A

## Verification

| Check | Result |
|---|---|
| `pnpm typecheck` | clean |
| `pnpm test` | **206/206** (was 182 — +24), stable across two runs |
| `pnpm build` | ✅ ; `/play/trade` 3.57 kB, `/play/binder` 5.61 kB First Load JS |
| Client-bundle secret scan | AUTH_SECRET and ADMIN_PASSCODE both absent from `.next/static` |
| Migration / seed / new deps | **none** |
| Duplicate or `*_new` files | none |
| Prototype residue | none — grep for `prototype` / `variant=` / `TradeFlow` / `listMatchesForRarity` is clean |

## Files

### New
- `src/features/binder/sacrifice-filter.ts` — pure; `canSacrifice`, `sacrificeReady`
- `src/features/binder/SacrificeGrid.tsx` — flat 🔥 grid, deep-links to card detail
- `src/features/trade/board.ts` — pure; `buildColumns`, `applyMissingFilter`, `missingCount`, `isPickable`
- `src/features/trade/TradeBoard.tsx` — friend-first two-column swap board
- `tests/sacrifice-filter.pbt.test.ts` (8 tests) · `tests/trade-board.pbt.test.ts` (10 tests)

### Modified
- `src/features/pull/sacrifice.ts` — **`SACRIFICE_MIN = SACRIFICE_COST + 1`** (D4=B)
- `app/play/binder/[cardId]/page.tsx` — gate is now `count >= SACRIFICE_MIN` (same behaviour, one home for the rule)
- `src/features/binder/GalaxyView.tsx` — `mode` state + two-chip Show row; `all` mode byte-identical to before
- `src/db/stores/collection-store.ts` / `.pg.ts` / `.fake.ts` — `ownedCardIdsForChildren`
- `tests/contracts/collection-store-contract.ts` — 3 new contract cases for it
- `src/features/trade/trade-service.ts` — `+getTradeBoard`, `+listFriendSummaries`, `−listMatchesForRarity`; new `ChildDirectory` port on `TradeDeps`
- `src/features/trade/trade-service.prod.ts` — wires `profileService`
- `src/features/trade/actions.ts` — `getMatchesAction` → `getTradeBoardAction`
- `app/play/trade/page.tsx` — friend summaries + `TradeBoard`
- `tests/trade-service.test.ts` — `getTradeBoard` + `listFriendSummaries` cases, incl. a spy proving the batched read

### Deleted
- `src/features/trade/TradeFlow.tsx`
- `src/features/prototype/`, `src/features/trade/prototype/`, `src/features/binder/prototype/`

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Friend strip first; no card selectable before a friend is chosen | ✅ code |
| 2 | Friend chips show the missing-doubles count | ✅ code + `trade-service.test.ts` |
| 3 | Two columns side by side, stacked own-first on mobile | ✅ code (`grid md:grid-cols-2`) — visual check at Build & Test |
| 4 | Badge only on cards new to the other party | ✅ PBT (`newToOther` is exact set-complement) |
| 5 | Both filters start unticked and hide non-badged cards | ✅ code + PBT (`applyMissingFilter`) |
| 6 | Picking one side dims (not hides) mismatched rarities | ✅ code + PBT (`isPickable` ≡ `validateTrade` rarity clause) |
| 7 | Completed trade still swaps atomically + fires reward cascade | ✅ commit path untouched; `trade-service.test.ts` green |
| 8 | Old card-first flow gone | ✅ `TradeFlow.tsx` deleted, grep clean |
| 9 | Show row with `All` + `🔥 Ready to sacrifice N` | ✅ code |
| 10 | 3 copies NOT listed, 4 copies IS | ✅ PBT (both directions, exhaustive over the boundary) |
| 11 | Every burn-view card opens a detail page that offers SacrificePanel | ✅ PBT asserts `canSacrifice` ≡ the page's gate; both now use `SACRIFICE_MIN` |
| 12 | Burn view unaffected by category + rarity chips | ✅ code (`sacrificeReady(sections)` on the full set) + PBT partition-invariance |
| 13 | `All` mode filters behave exactly as before | ✅ `rarity-filter.pbt.test.ts` untouched and green |
| 14 | typecheck / tests / build clean, no prototype file remains | ✅ |

## Notes for Build & Test

- `pnpm test:pg` (docker Postgres) has **not** been run here — it is the only thing that exercises the
  new `ownedCardIdsForChildren` **pg** adapter against a real database. Run it at Build & Test.
- Visual checks worth doing against real data: the two-column board on a phone viewport, the friend-chip
  counts, and the 🔥 chip count against a child who actually holds 4+ of something.
