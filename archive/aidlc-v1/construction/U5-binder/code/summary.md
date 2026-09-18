# U5 Binder & Collection — Code Summary

## Files created
- `src/features/binder/service.ts` — `getBinder(childId)` (pool + collection → ThemeSections w/ owned/locked + `themeProgress`), `getCardDetail` (owned-only)
- `src/features/binder/ProgressBar.tsx` — "M / N" bar + ✅
- `src/features/binder/CardSlot.tsx` — owned thumbnail (xN, lazy image) or locked silhouette
- `src/features/binder/ThemeSection.tsx` — theme header + progress + grid
- `app/play/binder/page.tsx` — binder page + overall progress + empty-state nudge
- `app/play/binder/[cardId]/page.tsx` — card detail (owned-only; 404 otherwise); placeholder card view (U6 effects later)
- `src/lib/types.ts` — added `BinderCard`/`ThemeSection`/`BinderView`
- `tests/binder.test.ts` — property tests for owned/locked mapping + progress + duplicates

## Story closure
- **D1** view binder ✅ · **D2** theme progress ✅

## Notes
- Read-only; scoped to active child; card detail refuses unowned cards.
- Card visuals are placeholders; U6 CardRenderer replaces them (detail + pull reveal).
