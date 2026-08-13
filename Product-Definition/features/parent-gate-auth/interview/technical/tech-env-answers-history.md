# Tech Environment Answers History — Parent Gate Auth (Technical role)

**Append-only.** Every validated batch is recorded here verbatim, including caveats and superseded
answers. Never rewritten or truncated. `tech-env-questions.md` is a disposable buffer; this file is the
durable record.

_No batches validated yet. Batch 1 (T1–T7) is open in `tech-env-questions.md`._

---

## Batch 1 (T1–T7) — validated 2026-08-12T23:20Z

Every question was answered in line with the stated recommendation. Recorded with the reasoning so the
choices are auditable later, not just the letters.

### T1 [CORE] — WebAuthn library
**Answer: a — `@simplewebauthn/server` + `@simplewebauthn/browser`.**

Rejected: (b) Auth.js's experimental WebAuthn provider, because it requires a next-auth **database
adapter** and this app deliberately runs JWT sessions without one — adopting it would restructure the
session layer that Q7-i-1 placed out of scope. (c) hand-rolling, because CBOR/COSE parsing is where
hand-rolled WebAuthn fails, and this sits on the security boundary.

### T2 [CORE] — `rpID` / domain binding
**T2-i — production hostname: `kids-collection.vercel.app`** (Vercel project domain, no custom domain).
**T2-ii — `/admin` is not used on preview deployments.**
**Answer: c — Google re-auth is the preview path.** No passkey on this hostname → recovery flow.

Reasoning retained: this reuses a flow being built anyway rather than preserving the passcode (b) or
adding domain config (d), and it means the recovery path is exercised regularly instead of being
discovered broken on the day it is needed.

*Follow-on finding — see OQ-PG-6.* `vercel.app` is on the **Public Suffix List**, so `rpID` must be the
exact host `kids-collection.vercel.app`; `vercel.app` is not a legal `rpID` and no subdomain sharing is
possible. `localhost` is a valid `rpID` in dev (WebAuthn treats it as a secure context). Therefore
`rpID` must be **environment-derived, not hardcoded**, and the passkey path must be disabled whenever
the request host does not match the configured `rpID` — that disabling is precisely what makes answer
(c) work.

### T3 [CORE] — Credential persistence
**T3-i: yes** — the credential store follows the house seam: `credential-store.ts` (port) + `.pg.ts` +
`.fake.ts` + a pg contract test in `tests-pg/`. Schema goes 7 → 8 tables; first auth-related
persistence in the app.
**T3-ii: store the signature counter but do not enforce it.** 1Password and other synced-passkey
providers always report 0, so the anti-cloning check is inert here; the column is kept for future use
with a comment stating why enforcement is off. Ownership keyed on the Google `sub` (already copied into
the session by `src/auth/config.ts`) rather than left unattached — "there is only one parent" is true
today and cheap not to depend on.

### T4 [CORE] — Request-path changes
**T4-i: confirmed.** The gate machinery is untouched — `gate-token.ts` (HMAC, cookie name, 20s TTL),
the `middleware.ts:30` edge check and slide, and `requireAdminGate()` all survive. Only
`verifyPasscode()` is deleted, and only the unlock action and `UnlockForm.tsx` are replaced. WebAuthn
authenticates the unlock; the existing signed cookie remains what `/admin/*` checks per request.

**T4-ii: signed-token challenge**, reusing `src/lib/signed-token.ts` — the same idiom as the app's
server-authoritative easter-egg offers. No new table.

*Accepted caveat:* a signed challenge with no server-side spent-tracking is replayable inside its expiry
window. Judged acceptable at threat level Q2(a). The concrete expiry value is not yet chosen — see
OQ-PG-8.

### T5 [CORE] — Bootstrap and cutover
**Answer: a — two-deploy cutover.** Deploy 1 ships passkey **and** passcode side by side; enrol on
production, verify; deploy 2 removes `ADMIN_PASSCODE` and its code.

Rationale retained: there is no staging environment and (per T6) no browser E2E, so production is first
contact. One extra commit converts "locked out of my own app" into "the old path still works".

**T5-ii — safety net: `git revert` + redeploy.**

*Follow-on finding — see OQ-PG-7.* This safety net is **asymmetric across the two deploys**. Between
deploy 1 and deploy 2 the passcode still exists, so recovery is as easy as using it. *After* deploy 2,
restoring the `ADMIN_PASSCODE` env var no longer helps — the code that reads it is gone — so the only
route back is a git revert and redeploy, which needs a working development environment. The lockout
scenario is most likely to arise away from the laptop.

### T6 [CORE] — Test strategy
**Answer: a + c.** Manual verification documented as a cutover checklist, plus a **captured real
assertion replayed as a test fixture** so genuine WebAuthn bytes exercise the verification code.

Rejected: (b) adding Playwright with a CDP virtual authenticator — a permanent new test layer for one
flow that changes almost never, in a repo with no E2E layer to build on.

*Recorded consequence:* the browser ceremony stays untested by CI. The T5(a) two-deploy cutover is
therefore a **compensating control, not a nicety**, and must not be collapsed into one deploy later for
convenience.

### T7 [CORE] — Constraints
**Answer: recommendation accepted in full.**
- **T7-i:** two `@simplewebauthn/*` packages on the security boundary are acceptable.
- **T7-ii:** all five must-not-break items hold under the T4 shape. **Item 2 requires active
  verification** — the enrolment page is a *new* admin route and the PostHog replay opt-out is
  route-scoped, so it will not inherit the exclusion automatically.
- **T7-iii:** `vision-document.md:269` is restated as *"Admin actions stay behind the admin gate, which
  requires a fresh proof of parent identity"* — naming the property that matters rather than the
  mechanism that currently provides it.

---

## Pre-declared open questions from Technical Batch 1

- **OQ-PG-6** — `rpID` must be environment-derived (`localhost` in dev, `kids-collection.vercel.app` in
  production), and the passkey path must be disabled when the request host does not match it. `vercel.app`
  is a public suffix, so no subdomain sharing is available. This is a correctness requirement for the
  T2(c) answer, not an optional refinement.
- **OQ-PG-7** — the T5-ii safety net weakens after deploy 2: env restore stops working once the passcode
  code is deleted, leaving only revert-and-redeploy, which needs a dev environment. Confirm this is
  acceptable, or add a break-glass path that survives deploy 2.
- **OQ-PG-8** — the challenge expiry value is unchosen. A signed challenge without spent-tracking is
  replayable within its window; pick a concrete short TTL (~60s suggested) or add spent-tracking.
