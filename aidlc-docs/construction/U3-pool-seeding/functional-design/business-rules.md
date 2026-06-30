# U3 — Business Rules (Pool & Seeding)

`[SEC]` kid-safety; `[RES]` resiliency (directional).

## Seed input validation
- **U3-BR1** Each SeedCard has non-empty `name`, valid `rarity`, non-empty `eduText`, non-empty `imagePrompt`.
- **U3-BR2** Theme names unique; each theme has ≥1 card.
- **U3-BR3** Recommended per-theme rarity pyramid (~6/3/2/1) — advisory, not enforced (a theme is valid with any spread, but should include ≥1 of each tier ideally).

## Image generation
- **U3-BR4** `[RES]` Image generated via Pollinations.ai from `imagePrompt`. On failure, retry (bounded); on persistent failure, the card is **not published** (no card row without a valid `imageUrl`) — U1 RES-1.
- **U3-BR5** `imagePrompt` always includes the kid-friendly art-style suffix for consistency.

## Safety / publish
- **U3-BR6** `[SEC]` Images are reviewable before publish (generated to a review location first; published on confirm). Children never see unreviewed output.
- **U3-BR7** `[SEC]` Only cards with a valid Blob `imageUrl` + complete fields become live in the pool.

## Idempotency
- **U3-BR8** Seeding is idempotent: re-running skips themes/cards that already exist (match by theme name + card name) — no duplicates.
- **U3-BR9** Re-running does not regenerate images for already-published cards (cost + stability), unless explicitly forced.

## Pool integrity (consumed by U4)
- **U3-BR10** Every published card belongs to exactly one theme and has a rarity → keeps `drawCard` (U1 BR1/BR2) well-defined.
