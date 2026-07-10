# U6 Card UI & Effects — NFR Requirements

Client presentational unit. Performance + Accessibility dominate. No new infra; no open questions.

## Performance `[blocking-ish]`
- **U6-PERF-1** Effects run at ~60fps: use GPU-friendly CSS `transform` + `background-position` only; no layout thrash, no per-frame React re-render.
- **U6-PERF-2** Pointer/orientation handlers throttled to animation frames (rAF); update CSS custom properties, not React state.
- **U6-PERF-3** Listeners attached only for the visible interactive card; removed on unmount.

## Accessibility `[a11y blocking]`
- **U6-A11Y-1** `prefers-reduced-motion: reduce` → no motion effects, static legible card.
- **U6-A11Y-2** Rarity conveyed by label + frame, not color alone.
- **U6-A11Y-3** Real text (not baked in image); `alt` = card name; usable by pre-reader (image-forward).
- **U6-A11Y-4** `deviceorientation` permission (iOS) handled gracefully — if denied/unavailable, pointer effects still work.

## Resiliency
- **U6-RES-1** Effects degrade gracefully: if transforms/orientation unsupported, card renders static; interaction never breaks.

## Testability
- **U6-TEST-1** Rarity→class mapping unit-tested (pure). Reduced-motion branch tested (no listeners attached).

## Security
- **U6-SEC-1** No new data access; renders already-authorized card data passed in.
