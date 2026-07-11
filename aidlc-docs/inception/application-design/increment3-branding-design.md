# Increment 3 — Branding & Galaxy Theme: Application Design

**Status**: Ready for approval
**Depth**: Standard · **Cadence**: LIGHT (single design doc, per Increment 2 precedent — full components/services/dependency split N/A for a presentational increment)
**Principle**: Dependency-free (CSS + minimal React), evolve existing design-system tokens (don't rewrite), all new motion gated by `prefers-reduced-motion`, copy-only rename (routes/testids frozen), SSR-safe client effects.

## Design overview
Five coordinated changes, mostly CSS + copy, one new decorative client component:

1. **Copy & branding** — string swaps across play-area + sign-in (name, verb, collection term, icons). No route/testid/logic change.
2. **Galaxy theme tokens** — deepen palette + backdrop layers in `globals.css`.
3. **Asteroids** — new `Asteroids.tsx` mounted in existing `app/play/layout.tsx`; keyframes in `anim.css`.
4. **Avatar fix** — CSS-only stacking fix in `.hero-avatar` (robust everywhere), plus planet framing.
5. **Icon centralization** — small brand constants module so icons/labels aren't scattered.

## New / changed module layout
```
src/lib/
  brand.ts                    # NEW — pure constants: APP_NAME, DISCOVER_LABEL, GALAXY_LABEL, ICON.{rocket,planet}
src/features/anim/
  Asteroids.tsx               # NEW "use client" — periodic single asteroid streak, reduced-motion aware, SSR-safe
  anim.css                    # +asteroid keyframes (transform/opacity only)
app/
  globals.css                 # galaxy palette + backdrop layers; .hero-avatar stacking fix + planet framing
  layout.tsx                  # metadata.title → "Star Catchers"
app/play/
  layout.tsx                  # mount <Asteroids/> (alongside existing SoundProvider/SoundControls)
```

## Copy / label change map (FR1, FR2) — copy-only, routes & data-testids UNCHANGED
| File | Old → New |
|---|---|
| `app/layout.tsx` | metadata.title "Card Collection" → **"Star Catchers"** |
| `app/(auth)/signin/page.tsx` | 🃏 hero → 🚀; "Card Collection" → "Star Catchers" |
| `app/play/home/page.tsx` | "Pull a card" → "Discover a card"; "My binder" → "My Galaxy" |
| `app/play/pull/page.tsx` | headings/"Pull a card" → "Discover"; "My binder" link → "My Galaxy" |
| `src/features/pull/PullButton.tsx` | button "✨ Pull a card ✨" → "🚀 Discover a card"; out-of-tokens copy verb; keep `data-testid="pull-button"` |
| `app/play/binder/page.tsx` | "…'s Binder" → "…'s Galaxy"; empty-state 🎴 → 🪐, "Pull" CTA → "Discover"; keep `data-testid="binder-*"` |
| `app/play/binder/[cardId]/page.tsx` | "Back to binder" → "Back to My Galaxy" |
| `src/features/card/RevealCard.tsx` | card-back 🎴 → 🪐 |
| `src/features/pull/PullButton.tsx` / home | any "pull(s) left" token copy → "discover(ies)" wording (label only; balance logic unchanged) |

- **Frozen**: URL paths (`/play/pull`, `/play/binder`), all `data-testid`, server actions, token/economy logic, rarity keys.
- Labels sourced from `src/lib/brand.ts` where reused, so future wording changes are one-file.

## brand.ts (PURE)
```
export const APP_NAME = "Star Catchers";
export const DISCOVER_LABEL = "Discover";
export const GALAXY_LABEL = "My Galaxy";
export const ICON = { rocket: "🚀", planet: "🪐", star: "⭐" } as const;
```
- No side effects; trivially importable in server + client components. (PBT: not warranted — static constants.)

## Galaxy theme (FR3) — globals.css
- **Palette**: deepen `--bg-0/1/2` toward near-black space-navy; retune `--brand-*` to sit on the darker field (keep the candy accents readable; contrast per NFR1).
- **Backdrop layers** (evolve existing `body::before/::after`): add a nebula radial layer + a second, slower parallax star layer; keep existing aurora but darker. Planet accent = one large soft-glow radial pinned off-canvas corner.
- **Panels/buttons/pills**: adjust token values only (border/glass alpha, glow hue) so `.panel`/`.btn`/`.pill`/`.title-pop` inherit the new look — no per-component class churn.
- All backdrop animation already covered by the global `prefers-reduced-motion` reset.

## Asteroids (FR4) — Asteroids.tsx + anim.css
- **Component**: `"use client"`. On mount (guarded: skip if `shouldAnimate()` false / SSR), schedule a streak every **8–15s** (randomized per index to avoid `Math.random` determinism concerns — use `setTimeout` with jittered interval). Renders **one** absolutely-positioned, `pointer-events:none`, `aria-hidden` element that animates across via a CSS keyframe, then unmounts/re-arms. Only one in flight at a time.
- **Placement**: fixed, behind content (`z-index` below app, above backdrop), full-viewport, play area only (mounted in `app/play/layout.tsx`).
- **CSS** (`anim.css`): `@keyframes asteroid-streak` — translate from off-left/top to off-right/bottom + slight rotate + opacity fade; transform/opacity only (GPU, no layout). Disabled under reduced-motion (component no-ops AND keyframe guarded).
- **Cleanup**: clears timers on unmount (no leak). Silent no-op if timers/DOM unavailable (resiliency-light).

## Avatar fix + framing (FR5) — globals.css (CSS-only, no JSX churn)
- **Root cause**: `.hero-avatar::before` (opaque dark disc) paints over the emoji when the emoji is a bare text node; only element children get lifted (`.hero-avatar > *{position:relative}`), text nodes don't.
- **Fix**: establish a stacking context on `.hero-avatar` (`position:relative; isolation:isolate`) and push the disc **behind content** (`::before { z-index:-1 }`). Text-node and element children then always render above the disc. Works for every `.hero-avatar` usage (play home bare-text, ProfileCard span, admin rows) with no JSX edits.
- **Planet framing**: keep the conic glow ring; add a subtle inner planet sheen + retain `.float`. Ensure the inner disc contrasts the emoji.
- **Regression guard**: visually verify play home + profile picker + admin rows after change.

## Files touched (seams summary)
NEW: `src/lib/brand.ts`, `src/features/anim/Asteroids.tsx`.
EDIT: `app/globals.css`, `app/layout.tsx`, `app/play/layout.tsx`, `src/features/anim/anim.css`, `app/(auth)/signin/page.tsx`, `app/play/home/page.tsx`, `app/play/pull/page.tsx`, `app/play/binder/page.tsx`, `app/play/binder/[cardId]/page.tsx`, `src/features/pull/PullButton.tsx`, `src/features/card/RevealCard.tsx`.
UNTOUCHED: admin/*, profile-manager, auth/logic/services, DB, tests (must stay green), all routes & testids.

## Extension compliance
- **Security** — N/A. No new inputs/auth/network/data; presentational only.
- **Resiliency** — light: Asteroids + avatar effects degrade silently (guards, timer cleanup, reduced-motion off); no server/data paths touched.
- **Property-Based Testing** — minimal: no new pure algorithms (brand.ts = static constants). Keep existing 33 tests green; add a unit test only if a non-trivial pure helper emerges.

## Design decisions / trade-offs
- **Copy-only rename (paths frozen)** — avoids breaking tests, middleware, links, and Increment-2 sound seams; wording lives in `brand.ts` for one-file future edits.
- **Token-level re-theme** — restyle via `:root`/backdrop, not per-component rewrites → cohesive, low-risk, no test churn.
- **CSS-only avatar fix** — one rule fixes all call sites; no JSX diffs, no regression surface in components.
- **Asteroids as its own component** in the existing play layout — isolated, easy to gate/remove, mirrors Increment-2 anim structure.
