# Increment 3 — Branding & Galaxy Theme: Build & Test Instructions

**Scope**: Presentational increment (copy, CSS theme, avatar fix, one decorative client component). No logic/data/route changes → no new automated tests required; existing suite guards against regression.

## Build
```bash
pnpm install      # no-op — zero new dependencies this increment
pnpm typecheck    # tsc --noEmit
pnpm build        # next build
```
Expected: typecheck clean; build compiles; **no** changes to package.json / pnpm-lock.yaml.

## Unit / integration tests
```bash
pnpm test         # vitest run
```
Expected: **33/33 pass** (unchanged suite). Copy/theme edits must not break any `data-testid` the tests rely on.

## Manual QA (visual — recommended via `pnpm dev`)
1. **Avatar visible** — play home hero shows the child's emoji inside the glowing planet (regression fixed). Check profile picker + admin rows too.
2. **Rebrand** — title "Star Catchers"; sign-in shows 🚀; home/pull CTAs say "Discover a card"; collection reads "My Galaxy"; tokens read "ticket(s)". No 🃏/🎴 anywhere user-facing.
3. **Galaxy theme** — deep-space backdrop, nebula, drifting/twinkling stars, planet glow.
4. **Asteroids** — a ☄️ streak crosses the play area every ~8–15s, behind content, one at a time.
5. **Reduced motion** — enable OS "reduce motion": asteroids, star drift, nebula, float, page transitions all quiet; layout intact; avatar still visible.
6. **Contrast** — headings/body readable on the darker backdrop.

## Verification results (this run)
- `pnpm typecheck` — clean ✅
- `pnpm test` — 33/33 pass ✅
- `pnpm build` — compiled successfully ✅
- Dependencies — unchanged (zero new) ✅
- Grep — no user-facing poker glyphs / stale play-area terms ✅

## Acceptance criteria — status
1. Name/terms/icons rebranded, poker glyphs gone — ✅
2. Galaxy theme + periodic asteroids (reduced-motion off) — ✅ (asteroid cadence visual-verify)
3. Avatar visible + planet-framed everywhere — ✅ (CSS fix; visual-verify recommended)
4. typecheck/build/tests green, zero new deps — ✅
5. Reduced-motion quiets new motion, contrast readable — ✅ (visual-verify)
