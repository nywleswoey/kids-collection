# U5 Binder & Collection — Code Generation Plan

**Unit**: U5 Binder & Collection
**Stories**: D1 (binder grouped by theme), D2 (progress)
**Depends on**: U1 (`themeProgress`), U2 (active child), U3 (pool reader)
**Code at workspace root**; doc summary → `aidlc-docs/construction/U5-binder/code/`.

## Steps

- [ ] **Step 1 — CollectionService**
  `src/features/binder/service.ts` — `getBinder(childId)` (merge pool + collection → ThemeSections w/ owned/locked + `themeProgress`), `getCardDetail(childId, cardId)` (owned-only). Types (`BinderView`, `ThemeSection`, `BinderCard`) in `src/lib/types.ts`.

- [ ] **Step 2 — Binder UI components**
  `src/features/binder/ProgressBar.tsx`, `CardSlot.tsx` (owned thumb + xN / locked silhouette), `ThemeSection.tsx`.

- [ ] **Step 3 — Binder page**
  `app/play/binder/page.tsx` — server: requireParent + active child + `getBinder`; overall progress header; empty-state nudge → pull. testids.

- [ ] **Step 4 — Card detail**
  `app/play/binder/[cardId]/page.tsx` — `getCardDetail`; 404/redirect if not owned; big card (PullResultView-style placeholder; U6 effects later) + count.

- [ ] **Step 5 — Tests**
  `tests/binder.test.ts` — mapping: owned→owned+count, not owned→locked; progress via `themeProgress`; getCardDetail returns null for unowned (pure/logic-level with fake data).

- [ ] **Step 6 — Docs**
  `aidlc-docs/construction/U5-binder/code/summary.md`; README status.

## Story traceability
- D1 → Steps 1–4. D2 → Steps 1,2,3.

## Scope
6 steps, ~8 files. No new deps.

---
Approve to generate (**/aidlc:approve**), or request changes.
