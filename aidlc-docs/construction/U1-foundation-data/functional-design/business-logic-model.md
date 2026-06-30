# U1 — Business Logic Model

U1 is the data foundation. It owns the schema + core invariants; behavior is exercised by later units (U4 draw/spend, U5 progress). Logic here is the pure/data layer those units call.

## Core operations (technology-agnostic)

### drawCard(pool) → Card  `[PBT]`
- Input: eligible pool (published cards, per BR2).
- Logic: weighted random by rarity drop weights (BR1). Within a chosen rarity, pick uniformly among that rarity's cards.
- Output: one Card.
- Properties: over many draws, observed rarity frequencies approach the weights; never returns an ineligible card.

### applyPull(child, card) → {child', entry'}  `[PBT]`
- Precondition: `child.pullTokens ≥ 1` (BR6 caller-enforced atomically in U4).
- Logic: `pullTokens -= 1`; upsert CollectionEntry(child, card): if exists `count += 1` else create `count = 1` (BR8/BR9).
- Properties: exactly one token spent; exactly one card added to count; no duplicate rows.

### grantTokens(child, n) → child'  `[PBT][SEC]`
- Logic: `pullTokens += n` (n>0 grant, or adjust). Result clamped at ≥0 (BR5).
- Properties: balance never negative; grant adds exactly n.

### themeProgress(child, theme) → {owned, total}  `[PBT]`
- Logic: owned = distinct cards of theme in child's collection; total = cards in theme (BR11).
- Properties: 0 ≤ owned ≤ total; complete iff owned == total.

## Data flow
```mermaid
flowchart LR
    Pool["Card Pool (shared)"] --> Draw["drawCard (weighted)"]
    Draw --> Apply["applyPull: -1 token, upsert count"]
    Apply --> Coll["CollectionEntry (per child)"]
    Grant["parent grant"] --> Tok["pullTokens"]
    Tok --> Apply
    Coll --> Prog["themeProgress M/N"]
```

## Seed-time vs runtime
- **Seed-time** (U3): Theme + Card rows + imageUrl populated; reviewed before publish.
- **Runtime**: Children, CollectionEntry, token mutations.

## Test seams (for PBT in Build & Test)
- `drawCard` distribution (BR1) — pure function, ideal for property tests.
- `applyPull` invariants (BR5/BR6/BR8/BR9).
- `grantTokens` non-negativity (BR5).
- `themeProgress` bounds (BR11).
