# U5 Binder & Collection — NFR Design Patterns

Read-only view unit. No open questions.

## Patterns
- **Server-side scoping**: binder/detail resolve the child from the U2 cookie server-side; ownership checked before returning detail (U5-SEC-1/2). Pattern: *authorize at the data boundary*.
- **Read model assembly**: merge pool (U3) + collection entries in memory into a `BinderView` (owned/locked + progress). Single collection query on the indexed `collections(child_id)` (U5-PERF-1).
- **Pure progress**: reuse U1 `themeProgress` — no reimplementation, already property-tested.
- **Lazy media**: `next/image` lazy-loads thumbnails so large binders stay smooth (U5-PERF-2).
- **Accessible distinction**: owned vs locked uses dim + icon + text, not color alone (U5-A11Y-1).

## Explicitly NOT used
- No caching layer / pagination (small pool). Add later only if the pool grows large.
