# U6 Card UI & Effects — NFR Design Patterns

Client rendering unit. No open questions.

## Performance patterns
- **CSS-variable driven animation**: pointer/orientation handlers write `--rx/--ry/--mx/--my` on the element; CSS consumes them for transform + sheen. React state untouched → no re-render per frame (U6-PERF-1/2).
- **rAF throttle**: coalesce rapid `pointermove`/`deviceorientation` events to one write per frame.
- **Scoped listeners**: attach on the interactive card, remove on unmount (U6-PERF-3).
- **GPU-only properties**: animate `transform` + `background-position`/`opacity` only (no width/height/top/left).

## Accessibility patterns
- **Reduced-motion gate**: `useCardTilt` early-returns (no listeners, no animation) when `matchMedia('(prefers-reduced-motion: reduce)')` matches (U6-A11Y-1).
- **Multi-channel rarity**: frame + badge text + effect (not color alone) (U6-A11Y-2).
- **Progressive enhancement**: base card is a plain accessible card; effects layer on top and are optional (U6-A11Y-3, RES-1).
- **Permission-safe orientation**: feature-detect + try `DeviceOrientationEvent.requestPermission` (iOS); on deny/absence, keep pointer effects (U6-A11Y-4).

## Testability patterns
- **Pure rarity mapping**: `rarityClass(rarity)` pure → unit test.
- **Reduced-motion branch**: hook returns no-op handlers when reduced motion; assert no listeners.

## Explicitly NOT used
- No animation library; no canvas/WebGL (CSS is enough + cheaper).
