# U7 Admin — Code Generation Plan

**Unit**: U7 Admin (final code unit)
**Stories**: A2 (base in U2), G1 (oversight), F1 (grant UI)
**Depends on**: U2 (guard, profiles), U4 (grant), U5 (binder/progress), U3 (pool counts)
**Code at workspace root**; doc summary → `aidlc-docs/construction/U7-admin/code/`.

## Steps

- [ ] **Step 1 — AdminService**
  `src/features/admin/service.ts` — `getAdminOverview()` (requireParent; per child: balance + owned distinct count via aggregate; pool theme/card counts). Types `AdminChildRow`/`AdminOverview` in `src/lib/types.ts`.

- [ ] **Step 2 — GrantControl (client)**
  `src/features/admin/GrantControl.tsx` — +1/+5 buttons + custom number input → `grantTokensAction`; shows updated balance. testids.

- [ ] **Step 3 — ChildAdminRow**
  `src/features/admin/ChildAdminRow.tsx` — avatar + name + balance + ProgressBar (reuse U5) + GrantControl + links (binder, profiles).

- [ ] **Step 4 — Admin dashboard**
  `app/admin/page.tsx` — requireParent + `getAdminOverview`; pool summary; rows; link to `/admin/profiles` + `/play`.

- [ ] **Step 5 — Read-only child binder (admin)**
  `app/admin/child/[cardId?]... ` → `app/admin/child/[childId]/binder/page.tsx` — requireParent; render U5 `getBinder(childId)` read-only.

- [ ] **Step 6 — Nav wiring**
  Add "Admin" link on the profile picker (`app/play/page.tsx` already links "Manage profiles" → point to `/admin`), and `/admin` ↔ `/admin/profiles`.

- [ ] **Step 7 — Tests**
  `tests/admin.test.ts` — overview mapping (per-child owned count + balance) with fake data; authz covered by reused `requireParent`.

- [ ] **Step 8 — Docs**
  `aidlc-docs/construction/U7-admin/code/summary.md`; README status (all units done).

## Story traceability
- G1 → Steps 1,3,4,5. F1 → Steps 2,3. A2 → reused (U2), linked from Step 4/6.

## Scope
8 steps, ~8 files. No new deps.

---
Approve to generate (**/aidlc:approve**), or request changes.
