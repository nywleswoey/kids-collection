# Increment 3 — Branding & Galaxy Theme: Code Generation Plan

**Status**: Awaiting approval (Part 1)
**Type**: Brownfield — modify existing files, add 2 new. Zero new deps.
**Source of truth**: This plan governs Code Generation. Design: `increment3-branding-design.md`.
**Frozen (do NOT change)**: route paths, all `data-testid`, server actions, token/economy logic, rarity keys, admin + profile-manager screens, Increment-2 sound/anim seams.

## Story / requirement coverage
FR1 rename+reterm · FR2 icon swap · FR3 galaxy re-theme · FR4 asteroids · FR5 avatar fix+framing · NFR1 a11y · NFR2 perf/zero-dep · NFR3 no-regression · NFR4 consistency.

---

## Step 1 — Brand constants (FR1/FR2)
- [ ] Create `src/lib/brand.ts`: `APP_NAME="Star Catchers"`, `DISCOVER_LABEL="Discover"`, `GALAXY_LABEL="My Galaxy"`, `ICON={rocket:"🚀",planet:"🪐",star:"⭐"}`. Pure, SSR-safe, no side effects.

## Step 2 — Galaxy theme tokens + backdrop (FR3, NFR1/NFR4)
- [ ] `app/globals.css`: deepen `--bg-0/1/2`; retune `--brand-*`/glow hues for the darker field (keep contrast readable).
- [ ] Evolve `body::before/::after`: add nebula radial layer + slower parallax star layer + one soft planet-glow accent; keep aurora (darker).
- [ ] Adjust `.panel`/`.btn`/`.pill`/`.title-pop` token values only so they inherit the theme (no per-component class churn).

## Step 3 — Avatar fix + planet framing (FR5, NFR3)
- [ ] `app/globals.css` `.hero-avatar`: add `position:relative; isolation:isolate`; set `::before { z-index:-1 }` so text-node + element children always render above the dark disc.
- [ ] Add subtle inner planet sheen; keep conic ring + `.float`. Verify contrast of emoji vs disc.

## Step 4 — Asteroids component (FR4, NFR2, NFR1)
- [ ] `src/features/anim/anim.css`: add `@keyframes asteroid-streak` (translate off-screen→off-screen + rotate + opacity; transform/opacity only).
- [ ] Create `src/features/anim/Asteroids.tsx` (`"use client"`): guard on `shouldAnimate()`/SSR; schedule one streak every 8–15s (jittered `setTimeout`), single in-flight, `aria-hidden`, `pointer-events:none`, fixed behind content; clean timers on unmount; silent no-op if unavailable.
- [ ] `app/play/layout.tsx`: mount `<Asteroids/>` alongside existing SoundProvider/SoundControls.

## Step 5 — Copy + icon swaps (FR1/FR2, NFR3) — labels only, testids frozen
- [ ] `app/layout.tsx`: metadata.title → `APP_NAME`.
- [ ] `app/(auth)/signin/page.tsx`: hero 🃏→🚀; "Card Collection"→"Star Catchers".
- [ ] `app/play/home/page.tsx`: "Pull a card"→"Discover a card"; "My binder"→"My Galaxy"; token copy verb.
- [ ] `app/play/pull/page.tsx`: headings/CTA "Pull"→"Discover"; binder link→"My Galaxy".
- [ ] `src/features/pull/PullButton.tsx`: button→"🚀 Discover a card"; out-of-tokens + "pulls left" copy → discover wording; **keep** `data-testid="pull-button"`/`token-balance`.
- [ ] `app/play/binder/page.tsx`: "…'s Binder"→"…'s Galaxy"; empty 🎴→🪐, CTA "Pull"→"Discover"; keep testids.
- [ ] `app/play/binder/[cardId]/page.tsx`: "Back to binder"→"Back to My Galaxy".
- [ ] `src/features/card/RevealCard.tsx`: card-back 🎴→🪐.
- [ ] Route reused labels through `brand.ts` where practical.

## Step 6 — Verify (NFR2/NFR3, acceptance criteria)
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm test` — existing suite green (≥33). Add a unit test only if a non-trivial pure helper emerged (none expected).
- [ ] `pnpm build` succeeds; confirm no new deps in package.json.
- [ ] Manual sanity: avatar visible on play home; no 🃏/🎴 user-facing; asteroids stream (and off under reduced-motion).

## Step 7 — Summary doc
- [ ] Write `aidlc-docs/construction/increment3-branding/code-summary.md` (files changed, decisions, verification results).

---
**Scope**: 2 new files, ~10 edits, CSS-heavy. No logic/data/route/testid changes.
