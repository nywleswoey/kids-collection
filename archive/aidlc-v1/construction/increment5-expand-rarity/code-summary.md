# Increment 5 — Card Expand & Rarity Clarity: Code Summary

**Status**: Implemented; typecheck/tests/build green.
**Plan**: `increment5-expand-rarity-code-generation-plan.md` (all 8 steps done).

## Files added (4)
- `src/features/card/CardModal.tsx` — `"use client"` accessible dialog (`role="dialog"`, `aria-modal`): interactive `Card` + name/rarity/fact + 🔗 source; close on ✕ / backdrop / Esc; focuses close button on open.
- `src/features/admin/AdminCardSlot.tsx` — `"use client"` rarity-framed + badged admin thumbnail button → opens `CardModal`; keeps name + source link.
- `src/features/binder/rarity-slot.css` — `.rslot--{rarity}` frame colors, epic/legendary glow (legendary pulse), `.rarity-badge` corner tag; reduced-motion disables the pulse.
- `tests/rarity.test.ts` — `RARITY_META` invariants.

## Files changed (2)
- `src/features/card/rarity.ts` — added `RarityMeta` + `RARITY_META` (frame hex / glow / label), single source of truth mirroring `card.css`.
- `src/features/binder/CardSlot.tsx` — owned kid slots get `rslot rslot--{rarity}` frame + glow + corner rarity badge; admin branch delegates to `AdminCardSlot`; locked slots unchanged; imports `rarity-slot.css`.

## Behavior
- **FR1**: admin preview cards are clickable → modal with the interactive card + rarity + fact + source; Esc/backdrop/✕ close; focus-managed.
- **FR2**: owned binder slots (kid + admin) show a rarity-colored frame, epic/legendary glow, and a text rarity badge. Locked slots stay neutral.
- **NFR1**: rarity conveyed by text badge (not color alone); legendary pulse off under reduced-motion.
- **NFR2**: existing `data-testid` preserved (`card-slot-*`, `card-locked-*`, `admin-card-*`, `card-source-*`); kid routes/economy/auth unchanged.

## Verification
- `pnpm typecheck` — clean.
- `pnpm test` — **45/45** (was 42; +3 rarity).
- `pnpm build` — compiled; zero dependency changes.

## Frozen / untouched
Kid card-detail route + behavior, token economy, auth/passcode, seed/schema, Increment 1–4.
