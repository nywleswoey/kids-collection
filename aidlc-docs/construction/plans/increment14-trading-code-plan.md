# INCREMENT 14 — Code Generation Plan

LIGHT increment. No migration, no seed, zero new deps. Target: existing 85/85 stay green + new tests.
Pure logic + tests first, then service, then actions/UI.

## Trade logic (pure)
- [x] `src/features/trade/trade-logic.ts` — `TradeSide`, `validateTrade(a,b)`, `filterTradable(cards, rarity)`
- [x] `tests/trade-logic.pbt.test.ts` — PBT: valid swap ok; reject A=B, non-dup either side, rarity mismatch, self-card; filterTradable returns only same-rarity dups

## Trade service (server-only, atomic)
- [x] `src/features/trade/trade-service.ts` — `listTradableCards(childId)`, `listMatchesForRarity(childId, rarity)`, `executeTrade({aChildId,aCardId,bChildId,bCardId})`
- [x] executeTrade: re-read both sides → `validateTrade` → `db.batch([dec A.cardA, upsert A.cardB +1, dec B.cardB, upsert B.cardA +1])`; catch CHECK/batch error → friendly `{ok:false}`
- [x] Confirm neon-http `db.batch` shape; decrement guarded so non-dup rolls back via `count>=1` CHECK

## Server actions
- [x] `src/features/trade/actions.ts` — `getMatchesAction(bChildId, rarity)`, `executeTradeAction(aCardId, bChildId, bCardId)` (A from `getActiveChild`, `revalidatePath` binder/home)

## UI
- [x] `src/features/trade/TradeFlow.tsx` — step machine: pick own dup → pick friend → pick their same-rarity dup → confirm (FR6) → result/error + trade-again
- [x] `app/play/trade/page.tsx` — server: requireParent + getActiveChild; load A's tradables + other children
- [x] `app/play/home/page.tsx` — add "🔄 Trade cards" entry link

## Verification
- [x] `pnpm typecheck` clean
- [x] `pnpm test` — 85 prior + new green (x2 stable)
- [x] `pnpm build` ✅
- [x] zero new deps, no migration, no secret in client bundle
- [x] Write `increment14-trading/code-summary.md`
