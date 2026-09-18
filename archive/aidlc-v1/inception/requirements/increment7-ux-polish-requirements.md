# INCREMENT 7 — UX Polish & Fixes: Requirements

**Type**: Brownfield enhancement + bug fix. **Cadence**: LIGHT (single increment).
**Status**: APPROVED (answers in increment7-ux-polish-questions.md; user said "commit and continue").

## Scope
Five UX items, shipped together.

## Functional Requirements

### FR1 — Pull cycling (slot-machine) animation
- On pull (non–easter-egg path), before revealing the pulled card, play a **~2.5s slot-machine cycle** of **real card fronts** drawn from the pool, decelerating to land on the actual pulled card.
- Then hand off to existing `RevealCard` flip/reveal (no double-reveal; cycle replaces the initial back→flip delay, or precedes the flip — implementation picks the cleaner seam).
- **Reduced-motion**: skip the cycle entirely, reveal immediately (reuse `shouldAnimate()` / `useReducedMotion`).
- Reuse card art + sound seams where possible (easter-egg roulette is prior art).
- Duplicate badge + all existing post-reveal UI unchanged.

### FR2 — Larger avatar in profile picker
- Cat 🐱 preset already exists; the ask is **legibility**: increase avatar size on the **profile picker** (`ProfileCard`) so the icon reads clearly.
- Enlarge the `hero-avatar` glyph (currently `h-20 w-20 text-4xl`) to a bigger, clearly-readable size; keep card proportions balanced.

### FR3 — Edit profile name/icon (admin)
- Surface an **Edit** affordance per profile row on **Admin → Manage Profiles** (`/admin/profiles`), parent + passcode gated (existing guards).
- Reuse `ProfileForm` with `initial` → `updateProfileAction` (already implemented). No new server logic needed.
- Edit lets a parent change **name** and **avatar/icon**.

### FR4 — Stable profile ordering (no re-shuffle on grant)
- Root cause: `listChildren()` has no `orderBy`; Postgres returns heap order and a grant UPDATE moves the row.
- Fix: order by **name A→Z** in `listChildren()`. No schema migration.
- Applies everywhere `listChildren()` feeds a list (picker + admin manager).

### FR5 — Accessible galaxy back button
- Move the `← Home` link on the galaxy/binder page (`/play/binder`) into the **top header** (sticky, always visible) so it needs no scroll.
- Remove the bottom-of-page link (superseded).

## Non-Functional / Constraints
- Zero new dependencies (match prior increments).
- Typecheck clean; existing tests stay green; add tests where logic changes (FR4 ordering).
- Accessibility: reduced-motion honored (FR1); focus/tap targets preserved.
- No secrets in client bundle (unchanged surface).

## Out of Scope
- No `created_at` column / migration (Q5 chose name-sort).
- Kid-facing profile editing (Q4 chose admin-only).
- New avatar presets beyond existing 8.

## Extension Compliance
- **Security Baseline**: FR3 edit stays behind `requireParent` + `requireAdminGate` (no new exposure). N/A elsewhere.
- **Resiliency Baseline**: N/A (client UX + read ordering).
- **Property-Based Testing**: FR4 ordering is deterministic — cover with a unit/integration test; PBT N/A (no invariant space).

## Traceability
| Item | FR | Primary files |
|---|---|---|
| Cycling anim | FR1 | src/features/pull/PullButton.tsx, src/features/card/RevealCard.tsx (+ new cycle component) |
| Bigger avatar | FR2 | src/features/profiles/ProfileCard.tsx |
| Edit profile | FR3 | app/admin/profiles/page.tsx, src/features/profiles/ProfileForm.tsx (reuse) |
| Stable order | FR4 | src/features/profiles/service.ts (listChildren) |
| Galaxy back | FR5 | app/play/binder/page.tsx |
