# U2 Auth & Profiles — NFR Requirements

Security is the dominant NFR for this unit (Security extension = blocking). No open questions — auth approach fixed (Auth.js + Google + allowlist).

## Security `[blocking]`
- **U2-SEC-1** Auth via Auth.js (NextAuth v5) Google OAuth; no custom password handling.
- **U2-SEC-2** Authorization server-side only: `requireParent()` guards every parent/admin action and parent-only page. Client never grants access.
- **U2-SEC-3** Parent allowlist (`PARENT_EMAILS`) compared case-insensitively/trimmed, server-side.
- **U2-SEC-4** Session cookie: HTTP-only, Secure, SameSite=Lax, signed (Auth.js `AUTH_SECRET`). `activeChildId` cookie likewise HTTP-only + Secure + signed/scoped.
- **U2-SEC-5** Secrets (`AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `PARENT_EMAILS`) in env only; never client-exposed.
- **U2-SEC-6** Child-scoped data resolved from server-validated cookie; cross-child access impossible (no childId trusted from client input).
- **U2-SEC-7** Invalid/missing active profile → redirect to picker; no data leak, no error disclosure.
- **U2-SEC-8** CSRF: state-changing actions via Next.js Server Actions (built-in protection); Auth.js handles OAuth state/PKCE.

## Reliability
- **U2-REL-1** Auth failures (provider down, denied) show a friendly retry, no stack traces.
- **U2-REL-2** Allowlist misconfig (empty `PARENT_EMAILS`) fails closed (no parent access) and is surfaced to the operator, not the user.

## Performance
- **U2-PERF-1** Auth check is per-request session read (cheap); profile list is a small query. No special tuning.

## Usability / Accessibility
- **U2-UX-1** Profile picker: large tap targets, avatar+name, pre-reader friendly.
- **U2-UX-2** One-tap Google sign-in; clear sign-out + switch-profile.

## Testability `[PBT]`
- **U2-TEST-1** `isParentEmail` pure → property test (case/whitespace invariance, allowlist membership).
- **U2-TEST-2** Authz integration tests: non-allowlisted blocked; invalid cookie → redirect.
