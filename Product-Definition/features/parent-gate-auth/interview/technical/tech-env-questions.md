# Technical Constraints Interview — Parent Gate Auth (Technical role)

- **Progress**: Business role ✅ **complete** (approved 2026-08-12T23:14Z, 2 amendments) — recorded in
  `../business/vision-answers-history.md`. This is technical batch 1 (T1–T7), all CORE. Quick pass, so
  this is expected to be the only technical batch.
- **This role records constraints — it does not design the stack.** Where a decision is genuinely
  yours, it is asked; where the repo already answers it, the answer is stated as evidence.

---

## What the business role decided

| | Decision |
|---|---|
| Mechanism | WebAuthn passkey, primary. Delivered via **1Password** (cross-platform, syncs) |
| Recovery | Google re-auth (`prompt=login`) → enrol a passkey. `ADMIN_PASSCODE` **deleted** |
| TTL | 20s sliding idle window **kept** |
| Ceiling | Strictly $0, **no new external service** |
| Not device-bound | Credentials sync via 1Password — no attestation, no device-binding assumptions |

## Repo facts relevant to this batch

| Thing | Reality |
|---|---|
| Store seam | `src/db/stores/<name>-store.ts` (port) + `.pg.ts` (adapter) + `.fake.ts` (fake), 5 stores today, each with a pg contract test in `tests-pg/` |
| Migrations | `drizzle-kit generate` → `src/db/migrations/*.sql` (8 so far), applied by `db:migrate`; `pg:up` replays them into `postgres:17-alpine` |
| Test layers | Vitest unit + `fast-check` PBT (`*.pbt.test.ts`) + `tests-pg` contract suite. **No Playwright, no browser E2E harness of any kind** |
| Gate machinery | `gate-token.ts` (edge-safe HMAC), the 20s slide in `middleware.ts:30`, `requireAdminGate()` per page |
| PostHog | Session replay never records parent/admin pages. Parent definition calls any change to this scoping "a kid-safety decision, not a config tweak" |
| Backups | Full DB dump (from the collection-safety discovery) — a new table is covered automatically |
| `next-auth` | `5.0.0-beta.32`. OQ-T-3 closed by this session: no stable v5 exists |

---

### T1 [CORE]: WebAuthn library

a) **`@simplewebauthn/server` + `@simplewebauthn/browser`** — the de-facto standard pair for Node/TS.
   Two new dependencies, no service, no account.
b) **Auth.js's own experimental WebAuthn provider** (`@auth/core`). Sounds like the natural fit since
   you already run next-auth — but it requires a **database adapter** for next-auth, and this app
   deliberately runs JWT sessions with no adapter. It is also designed for *login*, not a second gate.
   Adopting it means restructuring the session layer that Q7-i-1 put out of scope.
c) **Hand-roll the WebAuthn verification** against the W3C spec using Web Crypto (which
   `src/lib/webcrypto.ts` already wraps).
d) Something else.

**Recommendation:** (a). (b) is the trap here — it looks like the low-dependency choice and is actually
the one that violates your scope boundary. (c) is a genuine option given the house style of small
self-written primitives (`signed-token.ts`, `webcrypto.ts`), and the assertion-verification path is not
huge — but CBOR/COSE parsing and attestation handling are where hand-rolled WebAuthn goes wrong, and
this sits on a security boundary. Two well-maintained deps is the cheaper risk.

[Answer]: a

---

### T2 [CORE]: `rpID` — the domain problem

WebAuthn credentials are **bound to a domain** (the Relying Party ID). A passkey registered on
`example.com` will not work on `kids-collection-abc123.vercel.app`. Vercel gives every preview
deployment a **new hostname**, so previews cannot use a passkey enrolled on production.

First, two facts I need from you:

**T2-i — what is the production hostname?** (a custom domain, or the `*.vercel.app` project domain?) kids-collection.vercel.app

**T2-ii — do you actually use `/admin` on preview deployments,** or only on production and localhost? not on preview

Then the constraint:

a) **`rpID` = production domain only.** Previews simply cannot open the admin gate. Acceptable if the
   answer to T2-ii is "production and localhost only".
b) **Keep a passcode path that works only outside production** — previews and localhost fall back to a
   passcode; production is passkey-only. Costs: the passcode code you wanted deleted survives, gated by
   environment.
c) **Google re-auth is the preview path** — no passkey on this hostname? Recovery flow, every time. Slow,
   but it is a flow you are building anyway, and it needs no extra code.
d) **A stable preview domain** — assign a fixed subdomain to preview deployments so one `rpID` covers it.

**Recommendation:** (c), assuming T2-ii is "rarely". It reuses the recovery path rather than preserving
the passcode (b) or adding domain config (d), and it means the recovery flow gets exercised regularly
instead of being the untested path you only discover is broken on the day you need it. That last
property is worth more than it sounds.

[Answer]: c

---

### T3 [CORE]: Where the credential lives

Following the house store seam, this implies: `credential-store.ts` (port) + `.pg.ts` + `.fake.ts`, a
new Drizzle table (schema goes from 7 tables to 8 — the first auth-related persistence in the app), and
a pg contract test in `tests-pg/`.

**T3-i — confirm the seam applies.** Any reason a credential store should *not* follow the same
port/adapter/fake/contract-suite pattern as the other five?

**T3-ii — what is stored?** WebAuthn needs, per credential: credential ID, public key, signature
counter, transports, created-at, and a label ("1Password"). Two decisions:
- **Signature counter** — the anti-cloning defence. 1Password and most synced-passkey providers return
  a counter of **0 always**, so the check is inert for your setup. Store it and skip the check, store it
  and enforce it (which would break with 1Password), or do not store it?
- **Ownership** — the app has exactly one parent identity (the allowlist). Key the credential to the
  Google `sub` (already copied into the session in `src/auth/config.ts`), or store credentials
  unattached since there is only ever one parent?

**Recommendation:** (i) yes, follow the seam — the parent definition treats the contract suite as what
makes the seam real rather than hypothetical, and a security-boundary store is the last place to make an
exception. (ii) store the counter but **do not enforce** it, with a comment saying why (synced passkeys
report 0); key on Google `sub`, because "there is only one parent" is true today and cheap to not
depend on.

[Answer]: i->yes, ii->ok, store counter byt don't enforce

---

### T4 [CORE]: What actually changes in the request path

The good news, stated so you can confirm or correct it: **the gate machinery does not need to change.**

| Component | Change |
|---|---|
| `gate-token.ts` (HMAC, cookie name, 20s TTL) | **None** |
| `middleware.ts` edge check + 20s slide | **None** |
| `requireAdminGate()` per-page check | **None** |
| `verifyPasscode()` in `gate.ts` | **Deleted** |
| The unlock action | Replaced: WebAuthn assertion verify instead of SHA-256 compare, then the same `setGateCookie()` |
| `UnlockForm.tsx` | Replaced: passkey prompt instead of a password input |

So the blast radius is the unlock *action* and its form — the cookie, the TTL, the edge check and the
defence-in-depth structure all survive untouched.

**T4-i — confirm this is the intended shape**, i.e. WebAuthn authenticates the unlock, and the existing
signed-cookie session is still what `/admin/*` checks on every request.

**T4-ii — the challenge.** WebAuthn needs a server-generated challenge, valid once, short-lived.
Options: a new table (more persistence), or a **signed, expiring token reusing `signed-token.ts`** —
the exact pattern the app already uses for easter-egg offers, with no storage at all.

**Recommendation:** (i) confirm. (ii) the signed-token route — it matches the app's existing
"server-authoritative offers" idiom, needs no table, and the replay window is already bounded by the
short expiry. Note the honest caveat: a signed challenge with no server-side store is replayable within
its expiry window unless you also track spent challenges. At threat level Q2(a), a ~60s window is fine;
say if you want it stricter.

[Answer]: i->confirm, ii->signed-token route

---

### T5 [CORE]: Bootstrap and cutover — the lockout risk

There is a chicken-and-egg: enrolling your first passkey happens on a page that lives behind the very
gate the passkey is meant to open. And the parent definition's cost posture means no staging
environment to rehearse on.

The Q5=b recovery path resolves it — enrolment is gated by *session + fresh Google re-auth*, not by the
gate. But the **cutover order** still matters, and getting it wrong locks you out of your own admin area
in production.

a) **Passcode and passkey coexist during cutover.** Ship both, enrol on production, verify it works,
   *then* remove `ADMIN_PASSCODE` and its code in a follow-up commit. Two deploys.
b) **Single deploy**, passcode removed at once, trusting the Google re-auth path to be correct on first
   contact in production.
c) Something else.

**T5-ii — what is the safety net** if the passkey flow is broken in production and Google re-auth also
fails? (Restore `ADMIN_PASSCODE` env and redeploy? A break-glass env var? Direct DB access?)

**Recommendation:** (a), emphatically. There is no staging environment and no browser E2E tests (T6), so
production *is* first contact. A two-deploy cutover costs one extra commit and converts "locked out of
my own app" into "the old path still works". For T5-ii: `git revert` + redeploy is the honest answer, so
it is worth confirming you can do that quickly from a phone if the laptop is not to hand.

[Answer]: a, T5-ii: `git revert` + redeploy is the honest answer

---

### T6 [CORE]: How this gets tested

The repo has **no browser E2E harness** — Vitest units, `fast-check` PBT, and pg contract tests only.
WebAuthn's browser half (`navigator.credentials`) cannot be exercised by any of them. The parent
definition treats the contract suite as a blocking constraint, so this needs an explicit answer rather
than a shrug.

What *can* be tested with what exists:
- Credential store contract suite (fake + pg) — same as the other five stores ✅
- Challenge signing/expiry — pure functions, unit + PBT ✅
- Assertion **verification** — `@simplewebauthn/server` is pure server-side; feed it fixtures ✅
- The unlock action's decision logic (valid → cookie, invalid → deny) ✅
- The actual browser ceremony ❌

Options for the last one:
a) **Manual verification only**, documented as a cutover checklist. Nothing automated.
b) **Add Playwright** purely for this, using CDP's virtual authenticator. New dev dependency and a new
   test layer to maintain — for one flow.
c) **Fixture-based**: capture a real assertion from your own browser once, replay it as a test fixture.
   Tests the server half against real data; still nothing for the client half.

**Recommendation:** (a) + (c). (b) is a large, permanent addition to the test estate for a flow that
changes almost never, in an app with no E2E layer to build on. (c) gets you the valuable half — real
WebAuthn bytes hitting your verification code — for the cost of one captured fixture. Note this makes
T5(a)'s two-deploy cutover more important, not less: it is the compensating control for the untested
ceremony.

[Answer]:a+c

---

### T7 [CORE]: Constraints to confirm

**T7-i — dependency budget.** T1(a) adds two npm packages on the security boundary. The parent
definition treats new deps there as a deliberate decision (that was OQ-T-3's whole reasoning). Confirm
two `@simplewebauthn/*` packages are acceptable, or state a stricter budget.

**T7-ii — things that must not break.** Confirm each still holds after this change:
1. No secret reaches the client bundle.
2. PostHog never records parent/admin pages — **including the new enrolment UI**.
3. The gate is checked in two places (middleware + page) — defence in depth survives.
4. `pnpm build` needs no network (the vendored-fonts precedent).
5. The new table is covered by the full DB dump automatically.

**T7-iii — the invariant that breaks.** `vision-document.md:269` states *"Admin actions stay behind the
passcode gate."* That sentence stops being true. Restate it mechanism-agnostically — e.g. *"Admin
actions stay behind the admin gate, which requires a fresh proof of parent identity"* — or propose your
own wording.

**Recommendation:** accept both deps; all five items in (ii) hold under the T4 shape, with item 2 being
the one to actively check, since the enrolment page is a *new* admin route and the replay opt-out is
route-scoped. For (iii), the suggested wording, because it names the property that matters (fresh proof)
rather than the mechanism that happens to provide it.

[Answer]: ok with recommendation

---

When every `[Answer]:` tag is filled, reply **`ready`**.
