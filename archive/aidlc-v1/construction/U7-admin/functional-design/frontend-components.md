# U7 — Frontend Components (Admin)

`data-testid` on interactive elements. Parent-only (server-gated).

## AdminDashboard — `app/admin/page.tsx`
- **Server**: requireParent + `getAdminOverview()`.
- **Renders**: pool summary (themes/cards counts); table of `AdminChildRow` (avatar, name, balance, progress bar owned/total); per-row grant control + link to profiles + read-only binder link.
- `data-testid="admin-dashboard"`.

## ChildAdminRow — `src/features/admin/ChildAdminRow.tsx`
- **Props**: `{ row: AdminChildRow }`.
- **Renders**: avatar + name + balance + `ProgressBar` (reuse U5) + `GrantControl`.
- Links: "Binder" → `/admin/child/[childId]/binder` (read-only), "Profiles" → `/admin/profiles`.
- `data-testid="admin-child-{childId}"`.

## GrantControl (client) — `src/features/admin/GrantControl.tsx`
- Quick buttons **+1**, **+5**; number input + "Grant" for custom (F1/BR7).
- Calls `grantTokensAction(childId, n)`; optimistic/refresh balance.
- `data-testid="grant-plus1-{childId}"`, `grant-plus5-{childId}`, `grant-input-{childId}`, `grant-submit-{childId}`.

## Read-only child binder — `app/admin/child/[childId]/binder/page.tsx`
- **Server**: requireParent; render U5 `getBinder(childId)` view read-only (no active-profile cookie needed — parent context).
- `data-testid="admin-child-binder"`.

## Nav
- `/admin` links to `/admin/profiles` (U2) and back to `/play`.
- Add an "Admin" link from the profile picker (parent) → `/admin`.

## Accessibility
- Table is responsive (stacks on phone). Progress as text + bar. Large tap targets on grant buttons.
