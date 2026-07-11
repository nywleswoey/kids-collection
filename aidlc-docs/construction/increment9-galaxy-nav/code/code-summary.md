# INCREMENT 9 — Code Summary

Cadence LIGHT. typecheck clean · 57/57 tests · build ✅ · zero new npm deps · **1 migration (0002)**.

## ⚠️ Post-deploy REQUIRED
Run `pnpm db:migrate` against the production DB (adds `epic_tickets`, `lucky_tickets` to `children`). Deployed code queries these columns — migrate before/at release.

## FR1 — Galaxy category tabs (items 1 & 2)
- NEW `src/features/binder/GalaxyView.tsx` (client) — sticky tab bar (★ All + per-theme chips), filters sections to the active category (All default). `sticky top-24 z-[9]` under the sticky header.
- `app/play/binder/page.tsx` — renders `<GalaxyView sections={binder.themes} />` instead of mapping ThemeSection inline.

## FR2/FR3 — Prominent + persistent pull category (item 3)
- `PullButton.tsx` — replaced `<select>` with big `CategoryChip` buttons (🎲 Random + themes, `aria-pressed`); chips ALWAYS visible (incl. on result/roulette) so category is switchable before the next Discover; `themeId` persists across pulls.

## FR4 — Special egg tickets (item 4, new)
- **Migration 0002** + `db/schema.ts`: `epic_tickets`, `lucky_tickets` (int default 0, `>= 0` checks).
- `lib/types.ts`: `Child` + `AdminChildRow` gain the two counts; NEW `EggTicket` type. Updated all `Child` builders (profiles/service toChild, active-profile, tests).
- `offer.ts`: `OfferPayload.ticket?: "epic"|"lucky"` (signed, pins kind).
- `token-service.ts`: `getSpecialBalances`, `grantSpecial(kind, delta)` (clamped, parent-only).
- `pull-service.ts`: NEW `pullSpecialEgg(childId, kind)` — checks ticket>0, picks tier choices from full pool, signs offer with kind (no spend). `claimEasterEgg` branches on `payload.ticket`: spends that special ticket atomically (single-use) instead of a normal token; else unchanged.
- `actions.ts`: `pullSpecialEggAction(kind)`, `grantSpecialTicketAction(childId, kind, amount)`.
- `PullButton.tsx`: special "✨ Epic Pick (n)" / "🍀 Lucky Pick (n)" buttons when held (work even at 0 normal tokens); decrement on claim.
- `app/play/pull/page.tsx`: passes special balances.
- `admin/service.ts` getAdminOverview + `ChildAdminRow` + `GrantControl`: per-type +/- grant controls beside 🎟️.

## Security
Eggs keep signed-offer + atomic claim. Special ticket spent atomically at claim (guard `>= 1`) → offer single-use; offer pins ticket kind (tamper-proof). Grants behind `requireParent`. No client-bundle secret. Migration additive (safe on existing rows).
