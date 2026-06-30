# U2 Auth & Profiles — Code Generation Plan

**Unit**: U2 Auth & Profiles
**Stories**: A1 (Google sign-in), A2 (manage profiles), B1 (profile picker)
**Depends on**: U1 (children table, types, env). **Security extension: blocking.**
**Code at workspace root**; doc summary → `aidlc-docs/construction/U2-auth-profiles/code/`.

## Steps

- [x] **Step 1 — Auth.js setup**
  `src/auth/config.ts` (NextAuth v5 Google provider, `AUTH_SECRET`), `app/api/auth/[...nextauth]/route.ts` (handlers). Add auth deps to `package.json` (`next-auth@beta`, `zod`).

- [x] **Step 2 — Authorization guard + allowlist**
  `src/features/auth/policy.ts` — pure `isParentEmail(email, allowlist)`. `src/features/auth/guard.ts` — `requireParent()` (server, reads session + allowlist, redirects on fail), `getParent()`.

- [x] **Step 3 — Active-profile session**
  `src/features/profiles/active-profile.ts` — `setActiveProfile`, `getActiveChild` (validate vs DB), `clearActiveProfile` (signed HTTP-only cookie `activeChildId`).

- [x] **Step 4 — Profile service + server actions**
  `src/features/profiles/service.ts` (listChildren, createChild, updateChild, removeChild — parent-gated, Zod-validated). `src/features/profiles/actions.ts` (Server Actions wrapping the service + setActiveProfile/signOut).

- [x] **Step 5 — Sign-in UI**
  `app/(auth)/signin/page.tsx` + `src/features/auth/SignInButton.tsx` (Google). `data-testid="signin-google-button"`.

- [x] **Step 6 — Profile picker**
  `app/play/page.tsx` (server: requireParent + listChildren) + `src/features/profiles/ProfilePicker.tsx`, `ProfileCard.tsx`. Large tap targets, avatar emoji. `data-testid="profile-card-{id}"`, `switch-profile-button`.

- [x] **Step 7 — Profile manager (parent)**
  `app/admin/profiles/page.tsx` + `ProfileForm.tsx`, `ConfirmDialog.tsx`. Create/edit/remove with confirm. testids per frontend-components.md.

- [x] **Step 8 — Route protection**
  `middleware.ts` or per-page `requireParent()` to gate `/play`, `/admin`, redirect unauth to `/signin`. (Auth.js middleware.)

- [x] **Step 9 — Tests**
  `tests/auth-policy.pbt.test.ts` — property test `isParentEmail` (case/whitespace invariance, membership). Integration test stubs for guard/active-profile (run in Build & Test).

- [x] **Step 10 — Docs**
  `aidlc-docs/construction/U2-auth-profiles/code/summary.md`; update README status + env.

## Story traceability
- A1 → Steps 1,5,8. B1 → Steps 3,6. A2 → Steps 4,7.

## Scope
10 steps, ~14 files. New deps: `next-auth@beta`, `zod`. Install/tests in Build & Test.

---
Approve to generate (**/aidlc:approve**), or request changes.
