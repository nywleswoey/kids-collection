# U5 Binder & Collection — NFR Requirements

Read-only view unit. No new infra; no open questions.

## Security
- **U5-SEC-1** Binder + card detail scoped to the **active child** server-side (U2 cookie); no cross-child viewing.
- **U5-SEC-2** Card detail returns data only for cards the child owns (no inspecting unowned).

## Performance
- **U5-PERF-1** Binder = pool read + one collection query for the child, merged in memory. Trivial at family scale. Consider a single indexed query on `collections(child_id)` (index exists from U1).
- **U5-PERF-2** Images lazy-loaded (Next/Image) so a large binder stays smooth.

## Accessibility
- **U5-A11Y-1** Owned vs locked distinguished by more than color (dim + "?" icon); progress shown as text ("7 / 12") not only a bar.
- **U5-A11Y-2** Large tap targets; responsive grid (phone/tablet/desktop).

## Testability `[PBT]`
- **U5-TEST-1** `themeProgress` property-tested (U1). U5 mapping (owned/locked, counts) unit-tested.

## Reliability
- **U5-REL-1** Read-only: never mutates collection/tokens (U5-BR9).
