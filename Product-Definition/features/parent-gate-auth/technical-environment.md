# Technical Environment — Parent Gate Auth

**Scoped sub-discovery.** Records human-provided constraints and repo facts; it does not design the
stack. Technical role approved 2026-08-12T23:23Z.

---

## Blast radius — smaller than the vision implies

The single most useful finding of the technical role: **the gate machinery does not change.**

| Component | Change |
|---|---|
| `src/features/admin/gate-token.ts` — HMAC, cookie name, 20s TTL | **None** |
| `middleware.ts:21-39` — edge check + 20s slide | **None** |
| `requireAdminGate()` per-page check | **None** |
| `verifyPasscode()` in `gate.ts` | **Deleted** |
| `setGateCookie()` | **None** — still what issues the session |
| The unlock server action | **Replaced** — WebAuthn assertion verification instead of SHA-256 compare |
| `UnlockForm.tsx` | **Replaced** — passkey prompt instead of a password input |
| — | **New:** enrolment route + credential store + challenge issuance |

WebAuthn authenticates *the unlock*. Everything downstream — the signed cookie, the sliding window, the
edge check, defence in depth — is untouched. The change is one action, one form, and one new route.

## Decisions

| Area | Decision | Rejected, and why |
|---|---|---|
| **Library** | `@simplewebauthn/server` + `@simplewebauthn/browser` | **Auth.js's own WebAuthn provider** — looks like the fewest-dependencies choice, actually requires a next-auth **database adapter**; this app deliberately runs JWT sessions without one, so adopting it restructures the out-of-scope session layer. **Hand-rolling** — CBOR/COSE parsing is where hand-rolled WebAuthn fails, and this is the security boundary |
| **`rpID`** | Environment-derived: `localhost` in dev, `kids-collection.vercel.app` in production | Hardcoding. See the public-suffix constraint below |
| **Previews** | Google re-auth is the path; no passkeys on preview hostnames | Preserving an env-gated passcode (keeps the code being deleted); a stable preview domain (config for a surface the user does not use) |
| **Persistence** | New store following the house seam; 7 → 8 tables | Ad-hoc DB access. A security-boundary store is the last place to skip the contract suite |
| **Challenge** | Signed, expiring token reusing `src/lib/signed-token.ts` | A challenges table — unnecessary persistence for a value bounded by expiry |
| **Cutover** | Two deploys | One deploy — production is first contact, with no staging and no browser E2E |
| **Tests** | Manual checklist + captured real assertion replayed as a fixture | Playwright with a CDP virtual authenticator — a permanent new test layer for one rarely-changing flow, in a repo with no E2E layer to build on |

## The `rpID` constraint (OQ-PG-6)

Production is `kids-collection.vercel.app` — the Vercel project domain, no custom domain. Two facts
follow that are easy to get wrong:

1. **`vercel.app` is on the Public Suffix List.** `rpID` must therefore be the *exact* host
   `kids-collection.vercel.app`. `vercel.app` is not a legal `rpID`, and no subdomain sharing is
   available.
2. **`localhost` is a valid `rpID`** — WebAuthn treats it as a secure context, so dev works without TLS.

Consequence: `rpID` must be environment-derived, **and the passkey path must be disabled whenever the
request host does not match the configured `rpID`.** That disabling is precisely what makes the
"previews use Google re-auth" answer correct — without it, a preview deployment would attempt to
register a passkey against a throwaway hostname. This is a correctness requirement, not a refinement.

## Persistence

Follows the existing store seam exactly — `src/db/stores/<name>-store.ts` (port) + `.pg.ts` (adapter) +
`.fake.ts` (fake), with a pg contract test in `tests-pg/`. Five stores exist today; this is the sixth,
and the **first auth-related persistence in the app** (schema goes 7 → 8 tables).

Per credential: credential ID · public key · signature counter · transports · created-at · label.

- **Signature counter — stored but not enforced.** The anti-cloning check is inert here: 1Password and
  other synced-passkey providers always report 0. The column is kept for future use, with a comment
  stating why enforcement is off. Enforcing it would break the chosen setup.
- **Ownership keyed on the Google `sub`**, already copied into the session by `src/auth/config.ts`.
  "There is only one parent" is true today and cheap not to depend on.
- **Multi-credential by construction.** The UI for managing multiple devices is deferred; the schema is
  not.

## Testing

The repo has **no browser E2E harness of any kind** — Vitest units, `fast-check` PBT (`*.pbt.test.ts`),
and pg contract tests in `tests-pg/`. WebAuthn's browser half cannot be exercised by any of them.

| Testable with what exists | |
|---|---|
| Credential store contract suite (fake + pg) | ✅ same pattern as the other five |
| Challenge signing / expiry | ✅ pure functions, unit + PBT |
| Assertion verification | ✅ `@simplewebauthn/server` is pure server-side; fed a **real captured assertion** as a fixture |
| Unlock action decision logic | ✅ |
| The browser ceremony | ❌ manual checklist only |

**Recorded consequence:** the ceremony stays untested by CI, which makes the two-deploy cutover a
**compensating control, not a nicety**. It must not be collapsed into a single deploy later for
convenience.

## Cutover

**Deploy 1** — passkey and passcode ship side by side. Enrol on production, verify the real flow.
**Deploy 2** — remove `ADMIN_PASSCODE`, `verifyPasscode()`, and the password input.

There is no staging environment (a consequence of the parent definition's near-zero-cost posture), so
production is first contact. One extra commit converts "locked out of my own app" into "the old path
still works".

**Safety net: `git revert` + redeploy** — and note it is *asymmetric across the two deploys* (OQ-PG-7).
Before deploy 2, the passcode still exists and recovery is trivial. After deploy 2, restoring the
`ADMIN_PASSCODE` env var no longer helps, because the code that reads it is gone. Only a revert works,
and that needs a working development environment — while the lockout scenario is most likely to arise
away from the laptop.

## Constraints confirmed

**Dependency budget:** two `@simplewebauthn/*` packages on the security boundary, accepted deliberately.
No new external service (the effort ceiling is strictly $0).

**Must not break:**
1. No secret reaches the client bundle.
2. PostHog never records parent/admin pages — **including the new enrolment route**. This one needs
   active verification: the replay opt-out is route-scoped, so a new admin route will not inherit it.
3. Two-place gate check (middleware + page) survives.
4. `pnpm build` needs no network.
5. The new table is covered by the full DB dump automatically (from the collection-safety discovery).

## OQ-T-3 — closed by this session

The parent definition carried `next-auth` pinned to a beta release on the only security boundary, with
"no action until auth-adjacent work is planned". This was that work, and the user's first answer was to
do the stable upgrade before building. **That answer was not executable.**

```
npm view next-auth dist-tags  →  latest: 4.24.15   beta: 5.0.0-beta.32
```

`latest` is the **v4** line. Auth.js v5 has been in beta since 2023 and there is nothing stable to
upgrade to. Two corrections follow:

- **OQ-T-3 is closed.** `5.0.0-beta.32` *is* the current v5 line; v4 is the legacy branch, not the safer
  one. "Wait for stable" was never a plan with a date attached. Keep taking beta releases via Dependabot.
- **The parent `open-questions.md` fact is stale** — it records `beta.25`; the repo is on `beta.32`
  (`package.json:31`) after recent Dependabot bumps.

## Deltas owed to the parent definition

| File | Delta |
|---|---|
| `open-questions.md` | Close **OQ-T-3**; correct `beta.25` → `beta.32` |
| `vision-document.md:269` | *"Admin actions stay behind the passcode gate"* → *"…behind the admin gate, which requires a fresh proof of parent identity"* |
| `technical-environment.md` | 8th table, first auth-related persistence · two new deps · `ADMIN_PASSCODE` removed from the env inventory |
