# Increment 5 — Card Expand & Rarity Clarity: Build & Test Instructions

**Scope**: Presentational (admin expand modal + binder rarity signals). No schema/data/logic. One new unit test for the pure rarity map; existing suite guards regression.

## Build
```bash
pnpm install     # zero new dependencies
pnpm typecheck
pnpm build
```
Expected: typecheck clean; build compiles; no package.json / lockfile changes.

## Automated tests
```bash
pnpm test        # vitest run
```
Expected: **45/45 pass** — includes new `rarity.test.ts` (RARITY_META invariants). No `data-testid` changes.

## Manual QA (via `pnpm dev`)
1. **Admin expand** — `/admin/preview` (behind passcode) → click any card → modal opens with the big interactive card (holo/tilt), name, rarity, fact, and 🔗 source. Close via ✕, clicking the backdrop, and **Esc**. Focus lands on Close on open.
2. **Binder rarity** — `/play/binder`: owned cards show a rarity-colored frame (gray/blue/purple/gold), a corner rarity **badge** (text), and a glow on epic/legendary. Same in `/admin/preview`.
3. **Locked** — uncollected slots stay neutral (no frame/badge).
4. **Reduced motion** — enable OS reduce-motion: the legendary pulse stops (static glow remains); modal still works.
5. **Accessibility** — rarity readable from the badge text, not color alone; modal is Esc-closable and keyboard-focusable.

## Verification results (this run)
- typecheck clean ✅ · `pnpm test` 45/45 ✅ · `pnpm build` ✅ · zero new deps ✅

## Acceptance criteria — status
1. Admin card click → accessible modal (interactive card + rarity + fact + source; Esc/backdrop/✕; focus-managed) — ✅ (visual-verify)
2. Owned slots (kid + admin) show frame + epic/legendary glow + badge; locked neutral — ✅ (visual-verify)
3. Rarity readable without color; reduced-motion quiets glow pulse — ✅
4. typecheck/build/tests green, zero new deps, no testid regressions — ✅
