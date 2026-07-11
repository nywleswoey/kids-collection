# INCREMENT 8 — Code Summary

Cadence LIGHT. typecheck clean · 57/57 tests (+5) · build ✅ · zero new deps.

## FR1 — Common/Rare egg
- `easter-egg.ts` — refactor to `pickChoicesByTier`; NEW `pickCommonRareChoices` (common|rare). `COMMON_RARE` tiers.
- `pull-service.ts` — `makeEggOutcome` helper (sign+refund shared); after epic+ egg misses, independent second `rollEasterEgg()` → common/rare pick-1-of-5. `claimEasterEgg` rarity gate removed (signed offer cardIds are the security boundary; any offered rarity claimable).

## FR2 — Sacrifice-to-upgrade
- NEW `sacrifice.ts` (PURE) — `SACRIFICE_COST=3`, `nextTier` (caps legendary), `rollUpgradeTier` (50/50 same vs +1), `pickUpgradeCard` (in-tier, prefer unowned).
- `pull-service.ts` — NEW `sacrifice(childId,cardId)`: requireParent, atomic guarded `count-3 where count>=3`, owned set AFTER burn, tier roll, pick result, upsert +1. Free. Returns `SacrificeResult`.
- `actions.ts` — NEW `sacrificeAction`.
- NEW `SacrificePanel.tsx` — shown on card detail when count≥3; burns 3 → reveals upgraded card.
- `app/play/binder/[cardId]/page.tsx` — renders SacrificePanel when count≥3.

## FR3 — Category pick before pull
- `pull-service.ts` — `pull(childId, themeId?)`; normal draw scoped to theme (`drawPool`), eggs stay full-pool; empty-theme fallback.
- `actions.ts` — `pullAction(themeId?)`.
- `PullButton.tsx` — `themes` prop + `<select>` (default "" = Random); passes themeId. Selector hidden during roulette/result.
- `app/play/pull/page.tsx` — fetches `listThemes()`, passes themes.

## FR4 — True alphabetical order (fix reshuffle-on-grant)
- `admin/service.ts` `getAdminOverview` — added `.orderBy(lower(name))` (the real culprit: grant page's unordered query).
- `profiles/service.ts` `listChildren` — `asc(name)` → `lower(name)` (case-insensitive).

## Tests
- easter-egg.pbt: +common/rare selection property.
- NEW sacrifice.pbt: nextTier caps, rollUpgradeTier bounds, pickUpgradeCard in-tier + prefer-unowned.
- FR3/FR4 query-level → build + inspection.

## Security
Eggs keep signed-offer + atomic claim; claim membership check unchanged (server-signed cardIds). Sacrifice server-only, parent-gated, atomic CAS on copies. No new secrets; no client-bundle leak.
