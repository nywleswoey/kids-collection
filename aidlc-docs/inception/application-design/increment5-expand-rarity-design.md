# Increment 5 — Card Expand & Rarity Clarity: Application Design

**Status**: Ready for approval
**Depth**: Standard (light) · **Cadence**: LIGHT (single design doc)
**Principle**: Presentational only. Reuse the existing rarity palette (`card.css`), the `Card` component, and design tokens. A single pure `RARITY_META` drives all rarity visuals (testable). No schema/data/logic changes.

## New / changed module layout
```
src/features/card/
  rarity.ts        # + RARITY_META (pure: frame color, glow flag, short label) — PBT/unit
  CardModal.tsx    # NEW "use client" — accessible dialog: interactive Card + name/rarity/fact/source
src/features/admin/
  AdminCardSlot.tsx # NEW "use client" — clickable admin thumbnail + rarity styling → opens CardModal
src/features/binder/
  CardSlot.tsx     # kid slots: rarity frame + glow + badge; admin branch delegates to AdminCardSlot
  rarity-slot.css  # NEW — per-rarity frame/glow/badge classes + reduced-motion guard
```

## Rarity metadata (FR2, single source of truth)
`src/features/card/rarity.ts` adds:
```
export interface RarityMeta { frame: string; glow: boolean; label: string; }
export const RARITY_META: Record<Rarity, RarityMeta> = {
  common:    { frame: "#9ca3af", glow: false, label: "Common" },
  rare:      { frame: "#60a5fa", glow: false, label: "Rare" },
  epic:      { frame: "#c084fc", glow: true,  label: "Epic" },
  legendary: { frame: "#fbbf24", glow: true,  label: "Legendary" },
};
```
- Pure; matches the existing `card.css` frame colors. → small unit/PBT test (every rarity has a hex frame + non-empty label; glow only on epic/legendary).

## FR2 — Rarity signals on binder slots
- **`rarity-slot.css`**: `.rslot` base + `.rslot--{rarity}` setting a colored border (frame), and glow box-shadow for `.rslot--epic` / `.rslot--legendary` (legendary gets a gentle pulse). A `.rarity-badge` corner tag (small pill) colored per rarity.
- **CardSlot (kid, owned)**: apply `rslot rslot--{rarity}` to the thumbnail wrapper (border color via class; inline `borderColor: RARITY_META[r].frame` acceptable too), and render a corner **rarity badge** (short label). Keeps the existing `slot-pop`, hover, and `data-testid`.
- **Locked slots**: unchanged/neutral (Q5).
- **Admin grid**: same visuals via `AdminCardSlot`.
- Reduced-motion: legendary pulse disabled (guard in `rarity-slot.css`).
- Accessibility: rarity shown as **text label** (badge), not color alone (NFR1, existing rule).

## FR1 — Admin card expand modal
- **`CardModal.tsx`** (`"use client"`): props `{ card, onClose }`. Renders a fixed overlay (backdrop) + centered panel containing the interactive `<Card card interactive size="lg" />`, name, rarity label, `eduText`, and the **🔗 source link** (`target="_blank" rel="noopener noreferrer"`). 
  - Close on ✕ button, backdrop click, and **Esc** (keydown listener). `role="dialog"` + `aria-modal="true"` + `aria-label`. Move focus to the close button on open; restore focus to the trigger on close. No native `alert`/`confirm`.
- **`AdminCardSlot.tsx`** (`"use client"`): renders the thumbnail as a `<button>` (rarity-framed + badge, same visuals as kid slot), name, and source link (as today); clicking the thumbnail opens `CardModal` for that card. Holds `open` state.
- **CardSlot** admin branch returns `<AdminCardSlot entry={entry} />` (a server component may render a client child). Kid branch stays a `Link` to the existing kid detail route (unchanged).

## Frozen / untouched
Kid pull/binder/detail routes + all `data-testid`; token economy; auth/passcode; seed/schema; Increment 1–4 behavior. Kid card-detail page unchanged (already a full interactive view).

## Extension compliance
- **Security** — N/A. Modal shows already-loaded admin data behind the existing passcode gate; no new inputs/auth/network.
- **Resiliency** — light: modal + rarity styling are presentational; no data paths; graceful with reduced-motion.
- **Property-Based Testing** — `RARITY_META` invariants (valid frame hex, non-empty label, glow⊆{epic,legendary}) get a small fast-check/unit test. Existing 42 stay green.

## Design decisions / trade-offs
- **`RARITY_META` as the single source** — frame color, glow, and label all derive from one pure map that mirrors `card.css`, so kid + admin grids and the badge stay consistent and testable.
- **Modal reuses `Card`** — no new card rendering; the expand view is literally the interactive card, so holo/tilt and rarity frame come for free.
- **`AdminCardSlot` client wrapper** — keeps the modal state client-side while the preview page/`ThemeSection` stay server components; kid `CardSlot` remains a plain server `Link` (no client cost for kids).
