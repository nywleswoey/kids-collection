# INCREMENT 14 — Application Design (Kid-to-Kid Trading)

Lean design (LIGHT). Maps FR1–FR7. No migration, no seed, zero new deps.
References: increment14-trading-requirements.md.

---

## Atomicity strategy (key decision)
The DB client is **drizzle `neon-http`** — stateless HTTP, so `db.transaction()` (interactive) is unavailable, but **`db.batch([...])` runs its statements in a single atomic transaction**.

The swap is 4 writes:
1. `UPDATE collections SET count = count - 1 WHERE child=A AND card=cardA` (A gives)
2. upsert `(A, cardB)` `count + 1` (A receives)
3. `UPDATE collections SET count = count - 1 WHERE child=B AND card=cardB` (B gives)
4. upsert `(B, cardA)` `count + 1` (B receives)

**Safety rail = existing CHECK constraint `count >= 1`.** A decrement on a non-duplicate (count 1 → 0) violates the check and **rolls back the whole batch**. So even under a race (a card stopped being a duplicate between pre-check and commit), the trade fails atomically with no partial state — dup-only is enforced by the database, not just the UI.

Decrement of a duplicate (2 → 1) stays ≥ 1: allowed. Rows are never deleted; min count after a valid give is 1.

---

## FR-by-FR

### FR1/FR2/FR7 — swap rules → `trade-logic.ts` (pure, PBT)
```
export interface TradeSide { childId: string; cardId: string; rarity: Rarity; count: number; }
export type TradeValidation = { ok: true } | { ok: false; reason: string };

// same-rarity duplicate filter for the counterparty's cards
filterTradable(cards: {card, count}[], rarity: Rarity): {card, count}[]
  // → count >= 2 && card.rarity === rarity

validateTrade(a: TradeSide, b: TradeSide): TradeValidation
  // rules: a.childId !== b.childId; a.count >= 2; b.count >= 2;
  //        a.rarity === b.rarity; !(a.childId===b.childId && a.cardId===b.cardId)
```
Pure → property-tested (valid swaps accepted; every rule violation rejected with a reason).

### FR4/FR5 — reads + atomic swap → `trade-service.ts` (server-only)
```
// A's own duplicates (count >= 2) with card+rarity
listTradableCards(childId): Promise<TradableCard[]>            // {card, count}

// B's duplicates matching a rarity (FR5 step 3)
listMatchesForRarity(childId, rarity): Promise<TradableCard[]>

// atomic swap (FR4). Re-reads both sides, runs validateTrade, then db.batch(4 writes).
executeTrade(input: { aChildId; aCardId; bChildId; bCardId }): Promise<TradeResult>
  // 1) read A.cardA (rarity,count), B.cardB (rarity,count)
  // 2) validateTrade → throw friendly Error on !ok
  // 3) db.batch([dec A.cardA (count>=1 guard via CHECK), upsert A.cardB +1,
  //              dec B.cardB, upsert B.cardA +1])
  // 4) on CHECK violation / batch error → catch → friendly "trade no longer valid"
```
Reuse `listCards()` (pool) for card+rarity; `collections` for counts. `TradeResult` = `{ ok: true; gave: Card; got: Card } | { ok: false; reason: string }`.

### FR3 — self-serve
- Trade actions require the play-area parent session (`requireParent`) like all `/play/*`, but no admin/approval gate. Active child = A (driver); B chosen in-UI.

### FR5/FR6 — UI → `TradeFlow.tsx` + `app/play/trade/page.tsx`
- `app/play/trade/page.tsx` (server): `requireParent` + `getActiveChild` (A). Loads A's tradable cards, the household child list (`listChildren` minus A), passes to `TradeFlow`.
- `TradeFlow.tsx` (client) step machine:
  1. **Pick your card** — grid of A's duplicates (reuse Card/rarity visuals, show count).
  2. **Pick a friend** — list of other children (avatar + name).
  3. **Pick their card** — server action `getMatchesAction(bChildId, rarity)` → B's same-rarity dups; empty state if none.
  4. **Confirm** (FR6) — "You give {A card} ({rarity}) · You get {B card} ({rarity})" → Confirm / Cancel.
  5. On confirm → `executeTradeAction(...)` → success screen (show gave/got) or friendly error; offer "Trade again".
- Entry link on `app/play/home/page.tsx` (e.g. "🔄 Trade cards").

### `actions.ts` (server actions)
- `getMatchesAction(bChildId, rarity)` → `listMatchesForRarity` (validated).
- `executeTradeAction(aCardId, bChildId, bCardId)` → active child = A via `getActiveChild`; calls `executeTrade`; `revalidatePath` for binder/home.

---

## Non-Functional
- **Zero new deps.** No migration, no seed.
- **Security:** every constraint re-validated server-side at commit; `count>=1` CHECK is the atomic backstop. A is taken from the server-side active-profile cookie (not client-supplied), B/cards validated against DB. Single household → no cross-tenant concern. Behind parent auth.
- **Resiliency:** race between pre-check and commit handled by the CHECK-driven rollback; caught → friendly message, no partial swap.
- **PBT:** `trade-logic.ts` (validateTrade + filterTradable).
- Reduced-motion + existing card visuals reused.

## New / changed files
| File | Change |
|---|---|
| `src/features/trade/trade-logic.ts` | NEW pure (PBT) |
| `src/features/trade/trade-service.ts` | NEW reads + atomic swap (batch) |
| `src/features/trade/actions.ts` | NEW server actions |
| `src/features/trade/TradeFlow.tsx` | NEW step UI |
| `app/play/trade/page.tsx` | NEW screen |
| `app/play/home/page.tsx` | entry link |
| `tests/trade-logic.pbt.test.ts` | NEW |
| `tests/trade-service*.test.ts` | swap validation (mockable pure parts) |

## Test plan
- PBT: `validateTrade` accepts valid swaps, rejects each violation (A=B, non-dup either side, rarity mismatch, self-card); `filterTradable` returns only same-rarity dups.
- Unit: atomic-swap validation path (invalid → throws/`ok:false`); happy path moves one copy each way; receiver-owns → increment (logic-level).
- Existing 85/85 stay green.
