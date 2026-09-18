# U5 — Frontend Components (Binder & Collection)

`data-testid` on interactive elements. Card visuals reuse **U6 CardRenderer** (placeholder until U6).

## BinderPage — `app/play/binder/page.tsx`
- **Server**: requireParent + getActiveChild (→ /play if none); `getBinder(childId)`.
- **Renders**: overall progress header, one `ThemeSection` per theme; empty-state nudge if nothing owned.
- `data-testid="binder-page"`.

## ThemeSection — `src/features/binder/ThemeSection.tsx`
- **Props**: `{ theme, cards, progress }`.
- **Renders**: theme name + `ProgressBar` ("M / N", ✅ if complete); grid of `CardSlot`.
- `data-testid="theme-section-{themeId}"`.

## ProgressBar — `src/features/binder/ProgressBar.tsx`
- `{ owned, total, complete }` → bar + "owned/total" label. `data-testid="theme-progress-{themeId}"`.

## CardSlot — `src/features/binder/CardSlot.tsx`
- **Owned**: thumbnail + name + `xN` badge if count>1; tap → detail. `data-testid="card-slot-{cardId}"`.
- **Unowned**: locked silhouette (dimmed, "?"), not tappable. `data-testid="card-locked-{cardId}"`.

## CardDetail — `app/play/binder/[cardId]/page.tsx` (or modal)
- **Server**: `getCardDetail(activeChild, cardId)` → 404/redirect if not owned (U5-BR4/SEC).
- **Renders**: big card (U6 `<Card>` later; `PullResultView`-style placeholder now) + count. `data-testid="card-detail"`.

## EmptyState
- "No cards yet — go pull your first! ✨" + link to `/play/pull`. `data-testid="binder-empty"`.

## Accessibility
- Large tap targets; owned/locked visually distinct (not color-only — dim + "?" icon). Progress readable as text ("7 / 12"), not just a bar.
