# U1 — Business Rules

Data-layer invariants every other unit relies on. `[PBT]` = property-tested; `[SEC]` = security-relevant.

## Rarity & Drawing
- **BR1** `[PBT]` Drop weights: Common 60%, Rare 25%, Epic 12%, Legendary 3% (sum = 100%). `drawCard` selects from the active pool weighted by these.
- **BR2** Only cards with a published `imageUrl` and valid theme are eligible for drawing. `[SEC]` (no unreviewed content).
- **BR3** Rarity is one of the four enum values; no other value is valid.

## Tokens
- **BR4** A new Child profile is created with `pullTokens = 3` (starter grant).
- **BR5** `[PBT]` `pullTokens` is always ≥ 0 (no negative balance, ever).
- **BR6** `[PBT]` A successful pull decrements `pullTokens` by exactly 1.
- **BR7** `[SEC]` Token balance increases only via a parent grant/adjust (no child-initiated increase).

## Collection
- **BR8** `[PBT]` At most one CollectionEntry per (childId, cardId) — duplicates increment `count`, never create a second row.
- **BR9** `[PBT]` `count` ≥ 1 for any existing entry (an entry exists iff the child owns ≥1 of that card).
- **BR10** A child's collection references only cards from the shared pool.
- **BR11** Theme progress for a child = (distinct cards owned in theme) / (total cards in theme); a theme is complete iff distinct owned == total.

## Referential integrity
- **BR12** A Card must belong to an existing Theme.
- **BR13** A CollectionEntry must reference an existing Child and an existing Card.
- **BR14** Removing a Child cascades to (deletes) that child's CollectionEntries. `[SEC]` (confirmed destructive action).

## Validation
- **BR15** Theme name non-empty + unique. Card name + eduText non-empty.
- **BR16** Child name non-empty; avatar must be a valid preset key.

## No-history decision
- **BR17** No pull-history/audit-of-pulls table in v1 (per Q5). Only balances + collection counts are persisted.
