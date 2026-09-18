# U6 — Frontend Components (Card UI & Effects)

Custom CSS + pointer/device-orientation; no animation library. One `<Card>` used by pull + binder.

## Card — `src/features/card/Card.tsx` (client)
- **Props**: `{ card: Card, interactive?: boolean, reveal?: boolean, size?: 'sm'|'lg' }`.
- **Renders**: rarity-framed card — image (image-forward), name, rarity badge, educational text (E3). `data-testid="card-{cardId}"`.
- **Interactive** (E2): binds pointer move + `deviceorientation`; updates CSS custom properties (`--rx`, `--ry`, `--mx`, `--my`) driving:
  - **3D tilt**: `transform: rotateX/rotateY` from pointer/tilt.
  - **Holographic sheen**: moving gradient/`background-position` follows pointer.
- **Rarity-scaled** (E3/Q3): intensity via a per-rarity CSS class (`card--common` … `card--legendary`) — legendary gets stronger glow + animated shimmer.
- **Reduced motion**: if `prefers-reduced-motion`, skip pointer/tilt listeners + animations; render static framed card (still legible). `[a11y]`
- **Low-end degrade**: effects are CSS transforms/gradients (GPU-cheap); on failure they simply don't apply — card stays usable. `[resiliency]`

## useCardTilt hook — `src/features/card/useCardTilt.ts` (client)
- Attaches pointer + `deviceorientation` listeners; returns handlers + a ref; writes CSS vars. Cleans up on unmount. No-op under reduced motion.

## RevealCard — `src/features/card/RevealCard.tsx` (client)
- **Props**: `{ card }`.
- **Behavior (C2)**: shows card **back** → flip animation (suspense) → **front** with a rarity flash, then becomes the interactive `<Card>`.
- Reduced motion → skip flip, show front directly.
- `data-testid="reveal-card"`.

## Integration (Q4 — replace placeholders)
- **U4 pull result**: `PullButton` renders `RevealCard` instead of `PullResultView`.
- **U5 binder detail**: `[cardId]/page.tsx` renders `<Card interactive>` instead of `PullResultView`.
- `PullResultView` removed (or kept as a thin fallback).

## Styles — `src/features/card/card.css` (or Tailwind + a small CSS module)
- Rarity frames/colors; holographic gradient keyframes; tilt transform vars; `@media (prefers-reduced-motion: reduce)` disables animation.

## Accessibility
- Image has descriptive `alt` (card name). Text is real text (not baked into image). Rarity conveyed by label + frame (not color alone). Reduced-motion fully supported.
