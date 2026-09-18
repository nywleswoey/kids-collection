# U7 Admin — Code Summary

## Files created
- `src/features/admin/service.ts` — `getAdminOverview()` (parent-only; per-child balance + distinct-owned count via aggregate; pool theme/card counts)
- `src/features/admin/GrantControl.tsx` — +1 / +5 / custom grant → `grantTokensAction` (U4), live balance
- `src/features/admin/ChildAdminRow.tsx` — avatar + name + progress (reuse U5 ProgressBar) + grant + binder link
- `app/admin/page.tsx` — parent dashboard (pool summary + child rows)
- `app/admin/child/[childId]/binder/page.tsx` — read-only child binder (parent)
- `src/lib/types.ts` — `AdminChildRow`/`AdminOverview`
- `src/features/profiles/service.ts` — added `getChild`
- `app/play/page.tsx` — "Parent admin" link → `/admin`
- `tests/admin.test.ts` — overview row mapping property test

## Story closure
- **G1** view all collections & balances ✅ · **F1** grant UI ✅ · **A2** profiles (reused U2, linked) ✅

## Notes
- Thin composition unit: reuses U2 (guard/profiles), U4 (grant), U5 (binder/progress), U3 (pool counts). No new persistence or infra.
- All admin routes parent-gated (`requireParent`).
