# U1 — Domain Entities

Technology-agnostic domain model. Persistence specifics (Drizzle/SQL types, indexes) finalized at Code Gen.

## Entities

### Theme
| Field | Type | Notes |
|---|---|---|
| id | identifier | PK |
| name | string | unique, e.g. "Animals", "Superheroes" |
- Relationships: 1 Theme → many Cards.

### Card
| Field | Type | Notes |
|---|---|---|
| id | identifier | PK |
| themeId | ref Theme | FK, required |
| name | string | required |
| rarity | enum | one of `common` \| `rare` \| `epic` \| `legendary` |
| imageUrl | string (URL) | Blob URL, required at publish |
| eduText | string | short, age-appropriate fact |
- Relationships: belongs to 1 Theme; referenced by many CollectionEntry.

### Child
| Field | Type | Notes |
|---|---|---|
| id | identifier | PK |
| name | string | required |
| avatar | string (preset key) | references a fixed avatar pack (no upload) |
| pullTokens | integer | balance; **starts at 3** for a new profile; never negative |
- Relationships: 1 Child → many CollectionEntry.

### CollectionEntry
| Field | Type | Notes |
|---|---|---|
| childId | ref Child | FK, part of unique key |
| cardId | ref Card | FK, part of unique key |
| count | integer | ≥1; duplicates increment this (xN) |
- **Unique constraint**: (childId, cardId) — one row per child+card.
- Relationships: links Child ↔ Card with an owned count.

## Enumerations
- **Rarity**: `common`, `rare`, `epic`, `legendary` (ordered, low→high). Carries display weight + drop weight.

## Identity & ownership notes
- Card pool (Theme, Card) is **shared** across all children.
- Collections + token balances are **per child**.
- Avatar is a key into a static preset set (defined in U2), not a stored file.

## Entity relationship sketch
```mermaid
erDiagram
    THEME ||--o{ CARD : has
    CHILD ||--o{ COLLECTION_ENTRY : owns
    CARD  ||--o{ COLLECTION_ENTRY : "appears in"
    THEME { id name }
    CARD { id themeId name rarity imageUrl eduText }
    CHILD { id name avatar pullTokens }
    COLLECTION_ENTRY { childId cardId count }
```
