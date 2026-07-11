# Increment 5 — Card Expand & Rarity Clarity: Requirements

**Status**: Ready for approval
**Type**: Brownfield enhancement, presentational. No schema / data / business-logic changes.
**Depth**: Standard (light)
**Source**: User request + answers in `increment5-expand-rarity-questions.md`.

## Intent
Let the parent open any card in the admin preview to inspect it larger, and make each card's rarity immediately obvious in the binder grids.

## Decisions (from answers)
| # | Topic | Decision |
|---|---|---|
| 1 | Admin expand | **Modal overlay** (in place; ✕ / backdrop / Esc to close) |
| 2 | Expanded content | **Full interactive card** (big art + holo/tilt) + name + rarity label + fun fact + 🔗 source link |
| 3 | Rarity signals | **All three**: colored frame + glow (higher rarities) + corner badge/label |
| 4 | Scope | **Kid binder + admin preview** (both grids) |
| 5 | Locked slots | **Neutral** — no rarity hint on uncollected cards |

## Functional Requirements

### FR1 — Admin card expand (modal)
- In the admin preview, clicking a card opens a **modal overlay** showing the full card: the interactive `Card` component (big art + holo/tilt), name, rarity label, fun fact (`eduText`), and the **🔗 source link** (admin-only, as today).
- Close via ✕ button, backdrop click, or Esc. Focus returns to the trigger; modal is keyboard-accessible (`role="dialog"`, `aria-modal`). No native `window.confirm`/`alert`.
- Admin-only (lives in the passcode-gated preview). Kid views are unchanged (kid card detail already opens a full interactive card via its own route).

### FR2 — Obvious rarity in the binder
- Owned card slots gain **all three** rarity signals, driven by the card's rarity:
  - **Colored frame** — common gray · rare blue · epic purple · legendary gold (reuse the existing `card.css` rarity palette).
  - **Glow** — subtle shimmer/halo on **epic** and **legendary** only (higher tiers stand out).
  - **Corner badge / label** — a small rarity tag (text, e.g. "Epic", or a labeled dot) so rarity is conveyed by more than color alone.
- Applies to **both** the kid binder grid and the admin preview grid.
- **Locked** (uncollected) slots stay neutral — no rarity signal (Q5).

## Non-Functional Requirements
- **NFR1 Accessibility** — rarity conveyed by a **text label**, not color alone (keeps the existing project rule). Glow/shimmer disabled under `prefers-reduced-motion`. Modal is focus-managed and Esc-closable.
- **NFR2 No regression** — all existing `data-testid` preserved; kid pull/binder/detail behavior unchanged; existing 42 tests stay green.
- **NFR3 Consistency & perf** — reuse existing rarity CSS variables / design tokens; transform/opacity-only effects; no new runtime dependencies.

## Out of Scope
- Kid card-detail page changes (already a full interactive view).
- Any schema, seed, auth, or economy change.
- New rarity tiers or renaming.

## Extension Compliance (enabled: Security, Resiliency, Property-Based Testing)
- **Security** — N/A. No new inputs, auth, data, or network; the modal shows already-loaded admin data behind the existing passcode gate.
- **Resiliency** — light: modal + rarity styling are presentational and degrade gracefully (no data paths).
- **Property-Based Testing** — minimal. If a pure `rarityStyle(rarity)` helper (frame color / glow flag / label) is introduced, add a small unit/PBT test; otherwise none. Keep the 42 existing tests green.

## Acceptance Criteria
1. Clicking an admin-preview card opens a modal with the interactive card, rarity, fact, and source link; ✕ / backdrop / Esc close it; focus is managed.
2. Owned binder slots (kid + admin) show a rarity-colored frame, epic/legendary glow, and a rarity badge/label; locked slots stay neutral.
3. Rarity is readable without relying on color (label present); reduced-motion quiets the glow.
4. `pnpm typecheck` clean, `pnpm build` succeeds, tests green (≥42), zero new deps, no `data-testid` regressions.
