# U7 Admin — NFR Design Patterns

Composition unit. No open questions.

## Patterns
- **Single authz choke point**: every admin page/action calls `requireParent()` (reuse U2) — no new authz logic (U7-SEC-1).
- **Aggregate-not-hydrate**: overview computes per-child owned counts with a `COUNT` query rather than loading each full binder (U7-PERF-1).
- **Service composition**: dashboard = `listChildren` (U2) + owned-count (U5-lite) + pool counts (U3); grant = U4 action. No duplicated logic (U7-BR10).
- **Read-only oversight**: admin views call read services only; the sole mutation is the explicit grant (U7-SEC-3).
- **Optimistic grant + reconcile**: GrantControl updates the shown balance, then confirms against the returned value (U7-REL-1).

## Explicitly NOT used
- No new tables, no reporting/analytics store — plain reads at family scale.
