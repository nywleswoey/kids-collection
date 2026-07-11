# INCREMENT 9 — Galaxy Nav, Prominent Category Pick & Special Egg Tickets: Requirements

**Type**: Brownfield enhancement + new feature (+migration). **Cadence**: LIGHT. **Status**: APPROVED (Q1–Q11 = A).

## FR1 — Scalable galaxy category view (items 1 & 2)
- Galaxy (`/play/binder`) gets a **sticky category tab bar** (chips: **★ All** + one per theme) under the header.
- Selecting a chip **filters** the galaxy to that one category; **All** (default) shows every section.
- Tab bar is **sticky** below the sticky header (item 2). Header sticky unchanged.

## FR2 — Prominent pull category picker (item 3, part 1)
- Replace the pull-screen `<select>` with **big tappable chips** (🎲 Random + each theme); selected chip highlighted; shown above the Discover button.
- Random is the default label.

## FR3 — Change category from result view (item 3, part 2)
- Category chips **stay visible after a card is revealed**, so the child can switch category before the next Discover.
- Chosen category **persists across pulls** this session (until changed); does not reset per pull.

## FR4 — Special egg tickets (item 4, new)
- Two special ticket types, one per easter egg: **✨ Epic+ ticket** and **🍀 Lucky (common/rare) ticket**.
- On the pull screen, when a child holds a ticket, a **labelled button** appears (e.g. "✨ Epic Pick (2)"); tapping runs that egg's **guaranteed** pick-1-of-5 flow (bypasses the ~1% roll).
- Spending a special ticket **costs one special ticket only** (no normal ticket).
- **Parent grants** special tickets on the **admin dashboard**, alongside the existing 🎟️ grant control (+/- per type).
- Security: eggs keep the signed-offer + atomic-claim model; the offer pins the ticket kind; the special ticket is **spent atomically at claim** (single-use — a re-claim spends another ticket or fails).

## Non-Functional / Constraints
- **Schema migration** adds `epic_tickets`, `lucky_tickets` (int, default 0, `>= 0` check) to `children`. Post-deploy `pnpm db:migrate`.
- Zero new npm dependencies. Typecheck clean; existing 57 tests stay green; add tests for new pure logic where applicable.
- Accessibility: chips are real buttons with `aria-pressed`; sticky bars keep tap targets reachable.
- No secrets to client; special-ticket spend server-only, parent-gated for grants.

## Out of Scope
- No change to the ~1% random egg rolls (still fire on normal pulls).
- No sacrifice-ticket (sacrifice stays copy-based).
- No per-category egg scoping (eggs remain global).

## Extension Compliance
- **Security Baseline**: special-ticket claim is atomic CAS (guard `>= 1`); grants behind `requireParent`; offer signs the ticket kind. Compliant.
- **Resiliency Baseline**: atomic spends prevent double-claim/double-grant. Compliant.
- **Property-Based Testing**: egg choice pickers already covered; ticket flow is DB-atomic (integration-level) — cover selection purity if new pure logic is added, else N/A.

## Traceability
| Item | FR | Primary files |
|---|---|---|
| Galaxy view | FR1 | NEW GalaxyView.tsx, app/play/binder/page.tsx, ThemeSection |
| Prominent pick | FR2 | PullButton.tsx (chips) |
| Change on result | FR3 | PullButton.tsx |
| Special tickets | FR4 | db/schema.ts (+migration), token-service, offer.ts, pull-service, actions, PullButton, pull page, admin service/types, ChildAdminRow, GrantControl |
