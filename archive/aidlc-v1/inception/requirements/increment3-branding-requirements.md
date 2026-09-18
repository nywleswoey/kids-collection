# Increment 3 — Branding & Galaxy Theme: Requirements

**Status**: Ready for approval
**Type**: Brownfield enhancement + bug fix on kids-collection (Next.js 15 App Router, Tailwind v4, React 19)
**Depth**: Standard
**Source**: User request "name/terms need more punch; drop poker-card icons for child-friendly; overall design needs work; galaxy theme with periodic asteroids; avatar can no longer be seen" + answers in `increment3-branding-questions.md`.

## Intent
Give the play experience a bold, cohesive **galaxy identity** kids connect with: a punchier name and vocabulary, space-themed iconography (no poker cards), a deep-space redesign with occasional asteroids streaking by — and fix the regression that hid the child's avatar.

## Decisions (from clarification answers)
| # | Topic | Decision |
|---|---|---|
| 1 | App name | **Star Catchers** |
| 2 | "Pull" verb | **Discover** |
| 3 | "Binder" term | **My Galaxy** |
| 4 | Icon motif | **Planet 🪐 + Rocket 🚀** (replaces 🃏 / 🎴) |
| 5 | Theme depth | **Full re-theme** (deep space, nebula, drifting stars, planets) |
| 6 | Asteroids | **Occasional** — one streaks by every ~8–15s, background-only |
| 7 | Avatar | **Fix + planet framing** (visible, glowing orb, floating) |
| 8 | Scope | **Play area only** (home, discover, galaxy, card detail, sign-in). Admin/profile-manager stay functional/unchanged. |
| 9 | Rarity names | **Keep** Common / Rare / Epic / Legendary |

## Functional Requirements

### FR1 — Rename & re-term (Q1/Q2/Q3)
- App name **"Star Catchers"** in metadata `<title>`, sign-in heading, and any user-facing branding.
- Action verb **"Discover"** replaces "Pull" in all play-area copy and CTAs (e.g. "Discover a card", "Discover", out-of-tokens message). Token/economy semantics unchanged — only the label.
- Collection screen labeled **"My Galaxy"** (replaces "Binder") in play-area headings, nav links, and empty-state copy.
- **Route paths unchanged** (`/play/pull`, `/play/binder` stay) — rename is copy-only to avoid breaking links, middleware, tests, and Increment-2 sound seams. (Internal identifiers/testids unchanged.)

### FR2 — Icon motif swap (Q4)
- Remove poker-card glyphs 🃏 / 🎴 from user-facing surfaces: sign-in hero, empty states, reveal card-back.
- Replace with planet 🪐 / rocket 🚀 motif, applied consistently (e.g. rocket for the "Discover" action, planet for collection/empty states, planet on the reveal card-back).

### FR3 — Galaxy full re-theme (Q5)
- Deep-space backdrop: darker base, nebula gradients, layered drifting stars (strengthen existing starfield), subtle planet accents.
- Restyle panels/buttons/pills to sit cohesively in the new palette (evolve the existing `.panel`/`.btn`/`.pill` design-system tokens, not a rewrite).
- Applies to play area + sign-in only (Q8).

### FR4 — Periodic asteroids (Q6)
- Background-only asteroid that streaks across the viewport roughly every **8–15s**, one at a time, subtle (no layout impact, non-interactive, behind content).
- Play area only.

### FR5 — Avatar visibility fix + framing (Q7)
- **Bug fix**: child avatar must be visible on the play-home hero. Root cause: `.hero-avatar::before` dark disc covers the emoji when it is a bare text node (only element children are lifted above the disc via `.hero-avatar > *`).
- **Treatment**: avatar framed as a glowing planet/orb, clearly visible, gently floating. Fix must hold wherever `.hero-avatar` is used (play home, profile picker, admin rows) without regressions.

## Non-Functional Requirements

### NFR1 — Accessibility (carried standard)
- All new motion (asteroids, drifting stars, avatar float, re-theme animations) **disabled under `prefers-reduced-motion`** — consistent with Increment 2.
- Maintain text contrast on the darker backdrop (WCAG-adequate for kid readability).
- Rarity still conveyed by **label text**, not color alone (existing rule preserved).

### NFR2 — Performance
- Re-theme + asteroids must stay GPU-friendly (transform/opacity animations, no layout thrash). No measurable regression to First Load JS or interaction latency.
- **Zero new runtime dependencies** (match Increment 1/2 discipline). CSS + minimal React only.

### NFR3 — No functional regression
- Auth, pull/token economy, binder data, admin, and Increment-2 sound/animation seams keep working. Copy/theme changes must not alter behavior or break `data-testid` hooks the tests rely on.

### NFR4 — Consistency
- Reuse and extend the existing design-system classes; avoid one-off inline styles where a token fits.

## Out of Scope
- Route/path renames; DB or schema changes; new card content or rarities.
- Admin + profile-manager visual rebrand (stay as-is per Q8).
- New audio (Increment 2 owns sound); asteroids are visual-only.
- Avatar image uploads (preset emoji set stays).

## Extension Compliance (enabled: Security, Resiliency, Property-Based Testing)
- **Security Baseline** — N/A for this increment. No new inputs, auth, data flows, or network calls; purely presentational copy + CSS + decorative client components. No attack surface added.
- **Resiliency Baseline** — Applicable, light. New client-side effects (asteroid timer, avatar) must degrade gracefully: no crashes if animation APIs unavailable, effects are non-blocking and behind reduced-motion. No server/data paths touched.
- **Property-Based Testing** — Minimal applicability. Change is visual/copy; no new pure logic/algorithms warranting PBT. Existing 33 tests must stay green; add targeted unit test(s) only if new pure helpers are introduced (e.g. a rarity/label or icon-map function).

## Acceptance Criteria
1. App presents as **"Star Catchers"**; "Discover" and "My Galaxy" replace "Pull"/"Binder" in play-area + sign-in copy; no 🃏/🎴 remain user-facing.
2. Play area + sign-in show a cohesive deep-space galaxy theme; asteroids streak by periodically (~8–15s), off under reduced-motion.
3. Child avatar is **clearly visible** and planet-framed on play home (and everywhere `.hero-avatar` is used).
4. `pnpm typecheck` clean, `pnpm build` succeeds, existing tests pass (≥33), zero new deps.
5. Reduced-motion fully quiets all new motion; contrast remains readable.
