import { isParentEmail, parseAllowlist } from "./policy";

/**
 * The parent decision, in one place: an authenticated email on the
 * `PARENT_EMAILS` allowlist. This is THE authorization boundary.
 *
 * The auth model, stated once so it isn't scattered:
 * - The NextAuth `signIn` callback (`auth/config.ts`) asks this and denies a
 *   session to anyone who fails — so **"has a session" ≈ "is a parent"** (fail-closed).
 * - The per-page / per-action `requireParent()` calls (`auth/guard.ts`) re-ask it
 *   as defense-in-depth; `middleware.ts` checks only session presence, trusting the
 *   fail-closed callback.
 * - Child selection (`profiles/active-profile.ts`) is a post-auth UX convenience,
 *   **not** a second security boundary — all children belong to the one parent.
 *
 * `signIn` (no session yet, checks `user.email`) and `getParent` (checks the
 * session email) both route through here, so the allowlist source + parse rule
 * live in exactly one place.
 */
export function isAllowlistedParent(email: string | null | undefined): boolean {
  return isParentEmail(email, parseAllowlist(process.env.PARENT_EMAILS));
}
