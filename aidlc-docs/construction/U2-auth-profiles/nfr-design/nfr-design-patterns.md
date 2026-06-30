# U2 Auth & Profiles — NFR Design Patterns

Maps U2 NFRs to concrete patterns. No open questions.

## Security patterns
- **Gateway guard (`requireParent`)**: one server-side function reads the Auth.js session, checks the allowlist, throws/redirects on failure. Every parent action + parent page calls it first. Centralizes authz (U2-SEC-2/3). Pattern: *policy enforcement point*.
- **Server-resolved identity**: child scope derived from the signed `activeChildId` cookie, re-validated against DB each request; client never passes a childId for authorization (U2-SEC-6). Pattern: *never trust client identity*.
- **Secure cookies**: HTTP-only + Secure + SameSite=Lax + signed (Auth.js secret) for both session and `activeChildId` (U2-SEC-4).
- **Fail closed**: empty/misconfigured allowlist → no access; invalid active profile → redirect to picker (U2-SEC-7, U2-REL-2).
- **Secrets at the edge**: all auth secrets server-only env (U2-SEC-5).
- **Framework CSRF/OAuth hardening**: Server Actions for mutations; Auth.js manages OAuth state + PKCE (U2-SEC-8).

## Reliability patterns
- **Graceful auth errors**: provider failures surface a retry screen, no stack traces (U2-REL-1).

## Usability patterns
- **Large-target picker**: ProfilePicker uses big avatar tiles; one-tap sign-in/switch (U2-UX-1/2).

## Testability patterns
- **Pure allowlist check**: `isParentEmail(email, allowlist)` pure → property-tested (U2-TEST-1).
- **Authz integration seams**: `requireParent` and `getActiveChild` exercised by integration tests (non-allowlisted blocked; bad cookie → redirect).

## Explicitly NOT used
- No session DB / refresh-token store (stateless JWT sufficient at family scale).
- No rate-limiting/WAF for v1 (single-family, private); can add Vercel Firewall later if exposed.
