# Open Questions — Parent Gate Auth

Consolidated at the join, 2026-08-12T23:23Z. Both roles complete.

**Raised: 8 · Closed: 3 · Implemented: 1 · Still open: 4 · Cross-role contradictions: 1**

> **Deploy 1 shipped 2026-08-13.** OQ-PG-6 implemented and OQ-PG-8 closed in code. OQ-PG-4 is now the
> highest-priority item and is the one thing that could still invalidate the feature's justification.

---

## Cross-role contradiction

### CR-1: the only remaining way back in is the one path that will never be exercised

**Vision side.** Recovery is Google re-auth (Q5b). `ADMIN_PASSCODE` is deleted, so this becomes the sole
route into `/admin/*` when no passkey is available.

**Constraints side.** Two facts from the technical role collide with that:

1. The technical recommendation for previews (T2c) was justified partly on the grounds that *"the
   recovery flow gets exercised regularly instead of being the untested path you only discover is broken
   on the day you need it."* **That justification is void.** T2-ii answered that `/admin` is not used on
   preview deployments at all, so the recovery path will be exercised approximately never. The
   recommendation still stands on its other merits — no preserved passcode, no domain config — but one
   of its two stated benefits evaporated, and this document records that rather than letting it stand.
2. Per OQ-PG-7, after deploy 2 the `git revert` safety net requires a development environment, and
   restoring the env var no longer works.

**The combined risk.** After deploy 2 there are exactly two ways back into admin: a passkey (untested by
CI — T6) and Google re-auth (never exercised in practice — above). If the passkey flow fails on a
device, the fallback has never once been run end to end.

**Suggested resolution path (AI, not user-stated):** adopt the *drill* precedent already established in
this repo. The collection-safety discovery closed OQ-B-1 with a yearly restore drill for exactly this
class of risk — a mitigation that silently fails is worse than a known gap. A deliberate periodic
exercise of the Google re-auth enrolment path (annually, or whenever the passkey is re-enrolled) would
convert it from an untested assumption into a verified one. Cheap; nothing to build.

---

## Still open

### OQ-PG-2: is deleting the last non-device credential proportionate?
- **Source**: Business Q2 vs Q6
- **Question**: The threat is "own kids, casual, non-adversarial" (Q2a), yet the design removes
  `ADMIN_PASSCODE` outright, leaving recovery dependent on a working Google sign-in on whatever device
  is to hand.
- **User's stated reasoning**: Q5=b was chosen deliberately — the fallback is strictly stronger than the
  thing it replaces, and no standing shared secret is a property worth having.
- **Suggested resolution path (AI)**: probably fine as decided, but it interacts with CR-1 and OQ-PG-7.
  Revisit all three together rather than individually.

### OQ-PG-4: user-verification behaviour is unverified, and Q1(c) rests on it
- **Source**: Business Q4 + Amendment 1
- **Question**: Two untested assumptions in one. (a) Is a WebAuthn prompt every 20 seconds of idle
  actually "near-free"? On desktop it is a system modal, not a glance. (b) Does 1Password re-prompt
  biometric on every `userVerification: "required"` assertion, or does it trust a recently-unlocked
  vault?
- **Why it matters**: (b) is load-bearing. If 1Password serves assertions from an unlocked vault without
  a fresh check, then an unattended device with 1Password unlocked lets a child approve the prompt — and
  the shoulder-surfing property that justified this entire build (Q1c) is weaker than assumed.
- **Suggested resolution path (AI)**: establish by trial before the TTL and the security claim are
  treated as settled. This is a ten-minute experiment, not a design question. Do it first.

### OQ-PG-5: credentials are syncable, not device-bound
- **Source**: Amendment 1
- **Question**: A passkey in a synced 1Password vault is exportable by design.
- **Suggested resolution path (AI)**: benign at threat level Q2(a) — no action needed beyond ensuring
  the design never assumes device-binding it does not have and never requires attestation. Recorded so a
  future reader does not mistake it for a device-bound credential.

### OQ-PG-6: `rpID` must be environment-derived and host-guarded
- **Source**: Technical T2
- **Question**: `vercel.app` is on the Public Suffix List, so `rpID` must be the exact host
  `kids-collection.vercel.app`; `localhost` is valid in dev. The passkey path must be **disabled**
  whenever the request host does not match the configured `rpID`.
- **Status**: **IMPLEMENTED in deploy 1.** `passkeyRp()` in `src/features/admin/webauthn/rp.ts` returns
  `null` for any host that is not the configured rpID; every ceremony and both pages branch on that.
  Covered by `tests/passkey-rp.test.ts`, including the preview-hostname, public-suffix (`vercel.app`),
  and subdomain cases. Configured by `WEBAUTHN_RP_ID`, defaulting to `localhost` for dev.

### OQ-PG-7: the safety net weakens after deploy 2
- **Source**: Technical T5-ii
- **Question**: Before deploy 2, the passcode still exists and recovery is trivial. After deploy 2,
  restoring `ADMIN_PASSCODE` in the Vercel dashboard no longer helps — the code that reads it is gone —
  leaving only `git revert` + redeploy, which needs a development environment. The lockout scenario is
  most likely to arise away from the laptop.
- **User's stated reasoning**: "`git revert` + redeploy is the honest answer."
- **Suggested resolution path (AI)**: accepted as stated, but see CR-1 — this is one of the two legs of
  the combined risk. If CR-1's drill is adopted, this becomes materially less sharp.

### ~~OQ-PG-8: challenge expiry value unchosen~~ — **CLOSED in deploy 1**
- **Source**: Technical T4-ii
- **Resolution**: `CHALLENGE_TTL_MS = 60_000` in `src/features/admin/webauthn/challenge.ts`, with the
  replay limitation documented in the module header. Challenges are additionally bound to a *purpose*
  (`auth` | `enrol`) and to the parent's Google `sub`, so an enrolment challenge cannot be replayed into
  the unlock ceremony. Pinned by a property-based test over the (purpose, parent, elapsed) space.

---

## Closed during this session — not carried

- ~~**OQ-PG-1**: mixed ecosystem forces multi-credential support; is "add a device" in the first
  slice?~~ **Largely resolved 2026-08-12 (Amendment 1)** — 1Password syncs passkeys cross-platform, so
  one credential covers every device. Downgraded to "keep the multi-credential schema, defer the
  management UI". No longer a build-size risk. Number not reused.
- ~~**OQ-PG-3**: does the Google re-auth recovery path violate the "Google login is out of scope"
  boundary, and are Q7-i items 1–5 confirmed?~~ **Closed 2026-08-12 (Amendment 2)** — items 1–5
  explicitly confirmed OUT; re-using the existing flow with `prompt=login` is not a scope violation
  since it changes no provider, allowlist, session shape, or `signIn` callback. Number not reused.

## Closed in the *parent* definition by this session

- ~~**OQ-T-3**: `next-auth` pinned to a beta release on the only security boundary.~~ **Closed.** No
  stable Auth.js v5 exists (`npm view next-auth dist-tags` → `latest: 4.24.15`, `beta: 5.0.0-beta.32`);
  `latest` is the legacy v4 line. "Wait for stable" was never a dated plan. Also corrects a stale fact:
  the parent file records `beta.25`, the repo is on `beta.32`.

---

## Priority order

1. **OQ-PG-4** — a ten-minute experiment that could undermine the build's core justification. It was
   meant to run *before* the code; it did not, so it now gates **deploy 2** instead. `requireUserVerification:
   true` is set on both ceremonies, which is the lever — what is unverified is whether 1Password honours
   it per assertion or serves from an unlocked vault.
2. **CR-1** — the untested-and-only recovery path. Cheap to mitigate with the existing drill precedent.
   Note deploy 1 exercises the enrolment half of that path by construction: enrolling the first passkey
   *requires* the Google re-auth round-trip.
3. **OQ-PG-7**, **OQ-PG-2** — accepted as decided; revisit alongside CR-1 before deploy 2.
4. **OQ-PG-5** — recorded for the future reader; no action.
AI-DLC should load this file during Requirements Analysis and resolve each entry before proceeding to
User Stories or Application Design.
