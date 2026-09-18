# U2 Auth & Profiles — Code Summary

## Files created
### Auth
- `src/auth/config.ts` — NextAuth v5 (Google); `signIn` callback denies non-allowlisted emails (fail-closed)
- `app/api/auth/[...nextauth]/route.ts` — Auth.js route handlers
- `src/features/auth/policy.ts` — pure `parseAllowlist`, `isParentEmail`
- `src/features/auth/guard.ts` — `getParent`, `requireParent` (server-side authz)
- `middleware.ts` — redirects unauthed from `/play`, `/admin` → `/signin`

### Profiles
- `src/features/profiles/active-profile.ts` — `setActiveProfile`/`getActiveChild`/`clearActiveProfile` (HTTP-only cookie, DB-validated)
- `src/features/profiles/service.ts` — `listChildren`/`createChild`/`updateChild`/`removeChild` (parent-gated, Zod-validated)
- `src/features/profiles/actions.ts` — Server Actions (select/switch profile, profile CRUD, sign-out)
- `src/features/profiles/ProfileCard.tsx`, `ProfileForm.tsx`, `RemoveProfileButton.tsx`

### Pages
- `app/(auth)/signin/page.tsx` — SignInScreen (Google)
- `app/play/page.tsx` — ProfilePicker (B1)
- `app/play/home/page.tsx` — child home placeholder (token balance + switch; U4/U5 extend)
- `app/admin/profiles/page.tsx` — ProfileManager (A2)
- `app/page.tsx` — redirects to `/play`

### Tests
- `tests/auth-policy.pbt.test.ts` — property tests for allowlist normalization + membership

### Deps
- `next-auth@^5 beta`, `zod` added to package.json

## Story closure
- **A1** Google sign-in ✅ · **B1** profile picker ✅ · **A2** manage profiles ✅

## Security notes
- Authz centralized in `requireParent()`; allowlist enforced server-side + at signIn callback (defense in depth).
- Child scope resolved from server-validated cookie; no client-trusted childId for authorization.
- `pnpm install` + tests run in Build & Test.
