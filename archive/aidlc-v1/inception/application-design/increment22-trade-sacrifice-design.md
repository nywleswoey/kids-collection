# INCREMENT 22 — Application Design: Friend-First Trade Board + Galaxy Sacrifice Filter

**Status**: AWAITING APPROVAL
**Date**: 2026-08-01
**Requirements**: `aidlc-docs/inception/requirements/increment22-trade-sacrifice-requirements.md` (FR1–FR17, NFR1–7)
**Schema impact**: none — no migration, no seed, no new dependency

---

## 1. Design scope

Two independent feature slices in one increment. They share no module.

| Slice | Surface | New pure module | Port change |
|---|---|---|---|
| **A — Friend-first trade board** | `/play/trade` | `src/features/trade/board.ts` | `CollectionStore.ownedCardIdsForChildren` |
| **B — Galaxy sacrifice filter** | `/play/binder` | `src/features/binder/sacrifice-filter.ts` | none |

The trade **commit** path is out of scope and untouched: `validateTrade`, `CollectionStore.swapCards`,
`executeTrade`, `executeTradeAction`, and the completion-reward cascade all stay exactly as they are.
Every change is on the read side plus the UI.

---

## 2. Component inventory

### 2.1 New

| Component | Kind | Responsibility |
|---|---|---|
| `src/features/trade/board.ts` | pure logic (PBT) | Decide what each column contains, which cards are new to the other party, which are pickable, and the per-friend "missing" counts. No I/O. |
| `src/features/trade/TradeBoard.tsx` | client component | The two-column swap board: friend strip → columns → confirm. Replaces `TradeFlow.tsx`. |
| `src/features/binder/sacrifice-filter.ts` | pure logic (PBT) | Sacrifice eligibility and the global burnable list. Single source of truth for the 4-copy rule. |
| `src/features/binder/SacrificeGrid.tsx` | client component | Flat 🔥 grid of burnable cards, each deep-linking to the card detail page. |

### 2.2 Modified

| Component | Change |
|---|---|
| `src/db/stores/collection-store.ts` (+ `.pg`, `.fake`, contract suite) | Add `ownedCardIdsForChildren(childIds)` — one batched read (NFR5). |
| `src/features/trade/trade-service.ts` | Add `getTradeBoard`, add `listFriendSummaries`, **remove** `listMatchesForRarity` (its only caller disappears with FR1). |
| `src/features/trade/actions.ts` | Replace `getMatchesAction` with `getTradeBoardAction`. |
| `app/play/trade/page.tsx` | Fetch friend summaries (with counts) instead of a plain child list. |
| `src/features/binder/GalaxyView.tsx` | Add the "Show" chip row and the burn-view branch. |

### 2.3 Deleted

- `src/features/trade/TradeFlow.tsx` (FR1 / Q7=A — replaced, not flagged)
- `src/features/trade/trade-service.ts::listMatchesForRarity`
- `src/features/trade/actions.ts::getMatchesAction`
- All throwaway prototype files: `src/features/prototype/`, `src/features/trade/prototype/`,
  `src/features/binder/prototype/`, and the `?variant=` switches in both `page.tsx`

---

## 3. Slice A — Friend-first trade board

### 3.1 Data flow

```text
app/play/trade/page.tsx  (server)
  |
  +-- tradeService.listTradableCards(me)      -> my doubles
  +-- tradeService.listFriendSummaries(me)    -> [{ id, name, avatar, missingCount }]
  |        (profiles.listChildren + collections.ownedCardIdsForChildren -- ONE batched read)
  v
TradeBoard  (client)
  |
  +-- on friend tap --> getTradeBoardAction(friendId)   [read-only, parent-gated]
  |                        -> tradeService.getTradeBoard(me, friendId)
  |                        -> { theirDupes, theirOwnedIds, myOwnedIds }
  |
  +-- board.ts: buildColumns(...) -> { mine[], theirs[] } each tagged newToOther
  +-- board.ts: isPickable(card, otherPick) -> same-rarity gate (dim, FR6)
  |
  +-- on confirm --> executeTradeAction(myCardId, friendId, theirCardId)   [UNCHANGED]
```

### 3.2 `board.ts` — interface (pure, property-tested)

```ts
export interface BoardCard {
  card: Card;
  count: number;
  /** True when the OTHER party does not own this card at all. Drives the badge (FR4)
   *  and the "only show what's missing" filter (FR5). */
  newToOther: boolean;
}

/** Tag both inventories against the opposite party's ownership set. */
export function buildColumns(input: {
  mine: TradableCard[];
  theirs: TradableCard[];
  myOwnedIds: ReadonlySet<string>;
  theirOwnedIds: ReadonlySet<string>;
}): { mine: BoardCard[]; theirs: BoardCard[] };

/** FR5 — hide non-badged cards when the column filter is on. */
export function applyMissingFilter(cards: BoardCard[], onlyMissing: boolean): BoardCard[];

/** FR7 — how many of `mine` the given ownership set lacks. */
export function missingCount(mine: TradableCard[], theirOwnedIds: ReadonlySet<string>): number;

/** FR6 — selectable only while no opposite pick exists, or the rarities match. */
export function isPickable(card: Card, otherPick: Card | null): boolean;
```

**Properties to hold** (PBT):
- `newToOther` is exactly set-membership complement — never true for a card in the other party's owned set.
- `applyMissingFilter(cards, false)` is the identity; with `true` every survivor has `newToOther === true`.
- `missingCount(mine, owned) === buildColumns(...).mine.filter(c => c.newToOther).length` — the chip count and the badges can never disagree.
- `isPickable` agrees with `validateTrade`'s rarity clause for every pair, so the UI never offers a pick the server would reject.

### 3.3 Service additions

```ts
/** FR3 — the partner's full duplicate list plus BOTH ownership sets, one call. */
getTradeBoard(childId, friendId): Promise<{
  theirDupes: TradableCard[];
  theirOwnedIds: string[];
  myOwnedIds: string[];
}>;

/** FR7 — every other child plus how many of MY doubles they're missing. */
listFriendSummaries(childId): Promise<Array<{
  id: string; name: string; avatar: string; missingCount: number;
}>>;
```

`listFriendSummaries` calls `collections.ownedCardIdsForChildren(otherChildIds)` **once** and folds
`missingCount` over the result — never N sequential reads (NFR5).

### 3.4 Port addition

```ts
/** Owned card-id sets for several children in one query. */
ownedCardIdsForChildren(childIds: string[]): Promise<Map<string, Set<string>>>;
```

- pg adapter: single `select childId, cardId from collections where childId in (...)`, grouped in memory.
- fake adapter: read from the in-memory map.
- Added to `tests/contracts/collection-store-contract.ts` so both adapters stay honest, including the
  empty-input case (returns an empty map, issues no query) and children with no rows (absent key).

### 3.5 `TradeBoard.tsx` — state model

| State | Purpose |
|---|---|
| `friend` | selected partner; `null` on entry (FR1) |
| `view` | fetched `getTradeBoard` payload, `null` while pending |
| `mine` / `theirs` | the two picks |
| `onlyMineMissing` / `onlyTheirsMissing` | per-column filters, **both `false` initially** (FR5 / Q1=B) |
| `error` | banner text; a failed partner read leaves the friend strip usable (NFR4) |
| `result` | post-commit summary |

Switching friend clears both picks and both fetched sets. Sounds, `posthog.capture` calls, the
`ErrorBanner`, `AvatarBadge`, `CardImage` and `RARITY_META` usages carry over from `TradeFlow`.

---

## 4. Slice B — Galaxy sacrifice filter

### 4.1 `sacrifice-filter.ts` — interface (pure, property-tested)

```ts
/** Burning SACRIFICE_COST copies must leave one behind: pull-service passes
 *  minHeld = SACRIFICE_COST + 1, and the card detail page gates on
 *  count > SACRIFICE_COST. Derived, never hardcoded (FR10). */
export const SACRIFICE_MIN = SACRIFICE_COST + 1;

export function canSacrifice(entry: BinderCard): boolean;

/** FR11 — the complete burnable list across ALL sections, deliberately ignoring
 *  the category and rarity chips. */
export function sacrificeReady(sections: ThemeSection[]): BinderCard[];
```

**Properties to hold** (PBT):
- `canSacrifice` is false for every `count <= SACRIFICE_COST` and true for every `count >= SACRIFICE_COST + 1`.
- `canSacrifice(entry) === (entry.owned && entry.count > SACRIFICE_COST)` — byte-for-byte the card
  detail page's gate, so the burn view can never produce a dead end (acceptance criterion 11).
- `canSacrifice` implies `owned`.
- `sacrificeReady` is invariant under section partitioning and ordering (a global list is a global list).

### 4.2 `GalaxyView` change

One added state — `mode: "all" | "sacrifice"` — and one branch:

```text
mode = "all"        -> today's behaviour, untouched (FR17)
                       category chips AND rarity chips AND theme sections
mode = "sacrifice"  -> <SacrificeGrid cards={sacrificeReady(sections)} />
                       category + rarity chips ignored entirely (FR11)
```

The "Show" row renders above the existing rows with two chips: `All {n}` and
`🔥 Ready to sacrifice {n}`, the second count always global. Chips reuse the existing `TabChip`
(`aria-pressed`, text label — NFR6).

### 4.3 `SacrificeGrid.tsx`

Flat grid (FR12), no theme headers. Each tile: `Link` to `/play/binder/{cardId}` (FR14), a plain `🔥`
marker (FR13), the existing `×{count}` badge, rarity frame from `RARITY_META`. Empty state explains
the 4-copy rule in child-friendly words (FR15).

---

## 5. Test surface

| Test | Kind | Covers |
|---|---|---|
| `tests/trade-board.pbt.test.ts` | NEW, PBT | §3.2 properties |
| `tests/sacrifice-filter.pbt.test.ts` | NEW, PBT | §4.1 properties |
| `tests/trade-service.test.ts` | MODIFIED | `getTradeBoard` + `listFriendSummaries`; drop `listMatchesForRarity` cases |
| `tests/contracts/collection-store-contract.ts` | MODIFIED | `ownedCardIdsForChildren` on both adapters |
| `tests/trade-logic.pbt.test.ts`, `tests/rarity-filter.pbt.test.ts` | UNCHANGED | must stay green — proves the commit path and the existing galaxy filters are untouched |

---

## 6. Design decisions to confirm

### D1 — Where does the batched multi-child read live?
A) New `CollectionStore.ownedCardIdsForChildren` port method (as designed) — one query, contract-tested on both adapters
B) Loop `ownedCardIds` per friend in the service — no port change, N queries
C) A bespoke SQL read outside the store seam

**Recommended: A** — it keeps every query behind the port (the project's existing rule) and satisfies NFR5.

[Answer]:

### D2 — Does `getTradeBoard` return ownership as arrays or sets?
A) Arrays over the wire, converted to `Set` inside `board.ts` (as designed) — server actions must return serializable data
B) Return a pre-computed `newToOther` flag per card from the server, no sets on the client

**Recommended: A** — keeps the tagging logic pure and property-testable in one place, and the client
needs `myOwnedIds` for its own column anyway.

[Answer]:

### D3 — Friend summaries: computed on the page, or in the service?
A) `tradeService.listFriendSummaries(childId)` owns it (as designed) — page stays a thin composition
B) `app/play/trade/page.tsx` composes `profileService.listChildren` + the store read inline

**Recommended: A** — the page stays declarative and the fold gets unit-tested with fakes.

[Answer]:

### D4 — `SACRIFICE_MIN` placement
A) Export from the new `src/features/binder/sacrifice-filter.ts`, derived from `SACRIFICE_COST` (as designed)
B) Export from `src/features/pull/sacrifice.ts` next to `SACRIFICE_COST`, and have the card detail page use it too

**Recommended: B on reflection** — the card detail page currently spells the rule as
`count > SACRIFICE_COST` independently. Putting `SACRIFICE_MIN` beside `SACRIFICE_COST` and using it
in *both* places makes the two literally the same expression, which is what acceptance criterion 11
is really asking for. A leaves two expressions that merely happen to agree.

[Answer]:

### D5 — Delete `listMatchesForRarity` now, or leave it?
A) Delete it and its action + tests (as designed) — Q7=A removes its only caller
B) Keep it as unused API surface

**Recommended: A** — dead code with a live-looking name is a trap for the next increment.

[Answer]:

---

## 7. Extension compliance

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **Compliant** | Giver stays server-derived from the active-profile cookie; both new reads are read-only and parent-gated; the widened payload is card ids and counts the child could already see by trading. No new secret reaches the client. |
| Resiliency Baseline | **Compliant** | Partner read failure surfaces in `ErrorBanner` with the friend strip still usable (§3.5); the commit path's existing atomicity and best-effort reward cascade are untouched. |
| Property-Based Testing | **Compliant** | Both new modules are pure with stated properties (§3.2, §4.1), including the cross-check that `canSacrifice` equals the card detail page's gate and that `isPickable` agrees with `validateTrade`. |

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Burn view lists a card whose detail page won't offer the panel | D4=B makes both sites the same expression; PBT asserts the equality; acceptance criterion 11 |
| `listFriendSummaries` degrades as children/cards grow | Single batched query; ~300 cards × a handful of children |
| Deleting `TradeFlow` loses behaviour (sounds, PostHog, reward cascade) | §3.5 enumerates what carries over; `trade-service.test.ts` and `trade-logic.pbt.test.ts` stay green |
| A prototype file survives into main | Explicit deletion list in §2.3; acceptance criterion 14 |
