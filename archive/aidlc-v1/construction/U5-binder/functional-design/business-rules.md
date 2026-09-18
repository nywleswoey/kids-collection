# U5 — Business Rules (Binder & Collection)

`[SEC]` scope, `[PBT]` tested.

## Binder view (D1)
- **U5-BR1** `[SEC]` The binder shows only the **active child's** collection (own binder only; U2 cookie scope).
- **U5-BR2** Cards are grouped by theme; owned cards show their count (`xN`) when > 1.
- **U5-BR3** Unowned cards in a theme render as **locked silhouettes** (name/art hidden or dimmed) — shows what's left.
- **U5-BR4** Tapping an owned card opens its detail (full picture + rarity + educational text; U6 adds effects). Unowned cards are not openable.

## Progress (D2)
- **U5-BR5** `[PBT]` Per-theme progress = distinct owned / total cards in theme (U1 BR11); shown as "M / N" + bar.
- **U5-BR6** A theme is marked complete (✅) iff distinct owned == total.
- **U5-BR7** Overall binder progress = total distinct owned / total pool cards.

## Empty / edge
- **U5-BR8** Empty collection → friendly "No cards yet — go pull your first!" with a link to pull.
- **U5-BR9** Read-only: the binder never mutates collection or tokens.

## Consistency
- **U5-BR10** Duplicate counts reflect U4 pulls exactly (single source: `collections.count`).
