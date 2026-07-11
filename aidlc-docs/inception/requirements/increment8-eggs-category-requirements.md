# INCREMENT 8 — New Eggs, Category Pick & Sort Fix: Requirements

**Type**: Brownfield enhancement + bug fix. **Cadence**: LIGHT. **Status**: APPROVED (answers Q1–Q10 = A; "commit and continue").

## FR1 — Common/Rare easter egg (item 1)
- Add a **second** rare event: independent ~1% roll (`EGG_CHANCE`). Order per discover: roll epic+ egg first; if it doesn't fire, roll common/rare egg. (~2% total any-egg.)
- On fire: offer **pick-1-of-5** distinct random **common OR rare** cards (owned allowed).
- Same security as epic+ egg: signed offer (HMAC over pinned cardIds + child + exp), token refunded on offer, re-spent atomically on claim (net 1 token).
- Claim path generalized: validity = card ∈ signed offer (server-chosen ids). Drop the hard-coded epic+ rarity gate (redundant given the signed pin; would reject common/rare picks).
- Reuse the existing picker/roulette UI.

## FR2 — Sacrifice-to-upgrade (item 2)
- When a child owns **≥3 copies** of a card, they may **sacrifice exactly 3 copies** for a random upgraded card.
- Result rarity: **50/50** same tier vs **+1 tier** (order common<rare<epic<legendary; legendary caps at legendary).
- Result card: random within the target tier, **prefer a not-yet-owned** card; fall back to any in tier.
- **Free** (costs cards, not tokens).
- Atomic: guarded `count - 3 where count >= 3`; then +1 the result card. No token change.
- Surfaced on the **card detail page** (`/play/binder/[cardId]`), shown only when `count >= 3`. Reveal the earned card.

## FR3 — Category pick before pulling (item 3)
- Pull screen shows a **category selector** (themes + **Random**, default Random).
- Specific category → normal draw limited to that theme's cards (rarity odds preserved within the theme).
- **Both easter eggs stay global** (draw from full pool), regardless of category.
- Selection **resets to Random** on each visit (no persistence).

## FR4 — Stable profile order, true alphabetical (item 4)
- **Real cause**: grant dashboard uses `getAdminOverview()` — an unordered `select().from(children)`; a grant UPDATE reshuffles heap order. Inc7 only fixed `listChildren`.
- Fix: order **both** `getAdminOverview` and `listChildren` by **`lower(name)`** (case-insensitive A→Z).

## Non-Functional / Constraints
- Zero new dependencies. Typecheck clean; existing 52 tests stay green.
- New **pure, property-testable** logic for FR1 selection + FR2 upgrade tiering/selection (Property-Based Testing extension applies).
- Security: eggs keep signed-offer + atomic-claim; sacrifice is server-only, atomic, parent-gated; no secret to client. No new secrets.

## Out of Scope
- No schema migration (collections/children columns unchanged; sacrifice uses existing count).
- No category persistence; no per-egg distinct celebration theming (reuse picker).

## Extension Compliance
- **Security Baseline**: FR1 reuses HMAC offer; FR2 server-only atomic guarded mutation behind `requireParent`. Compliant.
- **Resiliency Baseline**: atomic CAS on sacrifice (count>=3 guard) prevents double-spend of copies. Compliant.
- **Property-Based Testing**: add PBT for common/rare selection + upgrade tiering (cap, distribution, prefer-unowned).

## Traceability
| Item | FR | Primary files |
|---|---|---|
| Common/rare egg | FR1 | src/features/pull/easter-egg.ts, pull-service.ts (+ actions) |
| Sacrifice | FR2 | NEW src/features/pull/sacrifice.ts + service/action, app/play/binder/[cardId]/page.tsx, NEW SacrificePanel |
| Category pick | FR3 | src/features/pull/pull-service.ts, actions.ts, PullButton.tsx, app/play/pull/page.tsx |
| Profile order | FR4 | src/features/profiles/service.ts, src/features/admin/service.ts |
