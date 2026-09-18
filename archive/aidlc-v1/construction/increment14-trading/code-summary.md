# INCREMENT 14 — Code Generation Summary

LIGHT increment. typecheck clean, **90/90 tests** (85 prior + 5 new), build ✅, zero new deps, no migration/seed, no secret in client bundle. `/play/trade` route built (4.64 kB).

## What shipped (FR1–FR7)
- **trade-logic.ts** (pure, PBT) — `validateTrade(a,b)` (A≠B, both count≥2, same rarity, distinct cards) + `filterTradable(cards, rarity)` (same-rarity duplicates) + `isTradable`.
- **trade-service.ts** (server-only):
  - `listTradableCards(childId)` — owned duplicates (count≥2) joined with card+rarity.
  - `listMatchesForRarity(childId, rarity)` — friend's dups of a rarity (FR5 step 3).
  - `executeTrade(...)` — re-reads both sides, `validateTrade`, then **`db.batch([...])`** of 4 writes (dec A.cardA / +1 A.cardB / dec B.cardB / +1 B.cardA). **Atomicity via neon-http batch; dup-only backstopped by the `count>=1` CHECK** — a non-dup decrement rolls the whole batch back → caught → friendly `{ok:false}`.
- **actions.ts** — `getMatchesAction`, `executeTradeAction`. Giver A is the **server-side active-profile cookie**, never client-supplied (FR3/FR4 security). revalidates binder/home/trade.
- **TradeFlow.tsx** — step machine: pick your double → pick friend → pick their same-rarity double → confirm (FR6: "You give X · You get Y") → result (gave/got) or friendly error → trade-again. Reuses Card rarity visuals, avatars, sounds.
- **app/play/trade/page.tsx** — server page (requireParent + getActiveChild); loads A's tradables + household friends (minus A).
- **app/play/home/page.tsx** — "🤝 Trade cards" entry link.

## Security / NFR
- Every constraint re-validated server-side at commit; `count>=1` CHECK is the atomic race backstop (no partial swap).
- Giver A from server cookie; B + cards validated against DB. Single household → no cross-tenant surface. Behind parent auth.
- No secret in `.next/static` (AUTH_SECRET/ADMIN_PASSCODE/DATABASE_URL/PARENT_EMAILS absent).
- PBT on trade-logic; empty-state UI for "no doubles" / "friend has no match".

## Tests (5 new)
- `tests/trade-logic.pbt.test.ts` — validateTrade accept/reject matrix + property (ok iff all rules hold); filterTradable same-rarity-dup property.

## Files
NEW: src/features/trade/{trade-logic.ts, trade-service.ts, actions.ts, TradeFlow.tsx}, app/play/trade/page.tsx, tests/trade-logic.pbt.test.ts
EDIT: app/play/home/page.tsx (entry link)

## Follow-up (optional)
- Service-level integration test for executeTrade would need a DB harness (none in repo today); logic path is PBT-covered, atomic path relies on the DB CHECK.
