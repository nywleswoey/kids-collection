# Increment 5 — Card Expand & Rarity Clarity: Code Generation Plan

**Status**: Awaiting approval (Part 1)
**Type**: Brownfield, presentational. Source of truth for Code Gen.
**Design**: `increment5-expand-rarity-design.md`.
**Frozen**: kid routes + all `data-testid`, token economy, auth/passcode, seed/schema, Increment 1–4 behavior, kid card-detail page.

## Coverage
FR1 admin expand modal · FR2 obvious binder rarity · NFR1 a11y · NFR2 no-regression · NFR3 consistency/zero-dep.

---

## Step 1 — Rarity metadata (FR2, single source)
- [ ] `src/features/card/rarity.ts`: add `RarityMeta` type + `RARITY_META` (frame hex, glow flag, label) mirroring `card.css` (common gray, rare blue, epic purple+glow, legendary gold+glow).

## Step 2 — Rarity slot styles (FR2)
- [ ] `src/features/binder/rarity-slot.css`: `.rslot` + `.rslot--{rarity}` colored border; glow box-shadow for `.rslot--epic`/`.rslot--legendary` (legendary gentle pulse); `.rarity-badge` corner pill per rarity; reduced-motion guard disables the pulse.

## Step 3 — Kid binder rarity signals (FR2, NFR1)
- [ ] `src/features/binder/CardSlot.tsx` (owned kid slot): apply `rslot rslot--{rarity}` + inline frame color, render a corner `rarity-badge` with `RARITY_META[r].label`. Keep `slot-pop`, hover, and `data-testid`. Locked slots unchanged. Import `rarity-slot.css`.

## Step 4 — Expand modal (FR1, NFR1)
- [ ] `src/features/card/CardModal.tsx` (`"use client"`): `role="dialog"` + `aria-modal`, backdrop + panel with interactive `<Card interactive size="lg">` + name + rarity label + `eduText` + 🔗 source link (`target=_blank rel=noopener noreferrer`). Close on ✕ / backdrop / Esc; focus close button on open, restore focus on close. No native alert/confirm.

## Step 5 — Admin clickable slot (FR1/FR2)
- [ ] `src/features/admin/AdminCardSlot.tsx` (`"use client"`): thumbnail as a `<button>` with the same rarity frame + badge, name, and source link; click opens `CardModal`. Holds `open` state; keeps `data-testid="admin-card-*"` / `card-source-*`.
- [ ] `src/features/binder/CardSlot.tsx` admin branch → render `<AdminCardSlot entry={entry} />`.

## Step 6 — Tests (PBT extension, NFR2)
- [ ] `tests/rarity.test.ts`: `RARITY_META` — every rarity has a valid hex frame + non-empty label; `glow` true only for epic/legendary. Existing 42 stay green.

## Step 7 — Verify
- [ ] `pnpm typecheck` clean; `pnpm test` green (≥43); `pnpm build` succeeds; zero new deps; no `data-testid` regressions.
- [ ] Manual: admin preview card click → modal (Esc/backdrop/✕ close); binder slots show frame + glow + badge; locked neutral; reduced-motion quiets glow pulse.

## Step 8 — Summary
- [ ] `aidlc-docs/construction/increment5-expand-rarity/code-summary.md`.

---
**Scope**: 3 new files (+1 css, +1 test), ~2 edits. Presentational, zero deps.
