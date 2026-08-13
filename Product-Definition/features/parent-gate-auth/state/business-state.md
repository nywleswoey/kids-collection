# Business State
- Status: complete — approved by user 2026-08-12T23:14Z (artefact-verification gate passed). 2 amendments applied
- Depth: quick
- Scope: Parent gate auth — alternatives to the `/admin/*` passcode (admin gate only; Google login OUT)

## Questions
- [x] Q1 [CORE] — What is wrong with the passcode — **a & c** (typing friction + shoulder-surfing by kids)
- [x] Q2 [CORE] — Threat model — **a** (own kids, casual, non-adversarial)
- [x] Q3 [CORE] — Devices — **c** both, **MIXED ecosystem**; amended 2026-08-12 (**Amendment 1**) —
      user has **1Password** everywhere, a cross-platform passkey provider, so passkeys *do* sync.
      One credential, "add a device" UI leaves slice 1, schema stays multi-credential
- [x] Q4 [CORE] — 20s idle TTL — **c** keep it tight, make re-entry near-free
- [x] Q5 [CORE] — Recovery — **b** re-enrol via Google (`prompt=login`); `ADMIN_PASSCODE` removed
- [x] Q6 [CORE] — Mechanism — **a + b**: WebAuthn passkey primary, Google re-auth as recovery only
- [x] Q7 [CORE] — Scope OUT items 1–5 assumed out (OQ-PG-3); item 6 → **OQ-T-3 CLOSED**, no stable v5
      exists (`latest: 4.24.15`, `beta: 5.0.0-beta.32`); ceiling **a** — strictly $0, no external service

## Pre-declared open questions
- ~~OQ-PG-1 — mixed ecosystem forces multi-credential support; is "add a device" in the first slice?~~
  **Largely resolved by Amendment 1** (1Password syncs cross-platform). Downgraded to: confirm the
  multi-credential schema, defer the management UI. No longer a build-size risk. Number not reused.
- OQ-PG-2 — is deleting the last non-device credential proportionate at threat level Q2(a)?
- ~~OQ-PG-3 — Q5=b recovery touches the Google sign-in flow that Q7-i-1 scoped OUT; confirm the reading,
  and confirm items 1–5 explicitly~~ **CLOSED 2026-08-12 (Amendment 2)** — items 1–5 explicitly
  confirmed OUT; re-using the existing Google flow with `prompt=login` is not a scope violation, since
  it changes no provider, allowlist, session shape or `signIn` callback. Number not reused.
- OQ-PG-4 — untested assumption that a WebAuthn prompt every 20s of idle is "near-free". **Widened by
  Amendment 1**: also covers whether 1Password re-prompts biometric on every `userVerification:
  "required"` assertion or trusts a recently-unlocked vault — the Q1(c) property depends on it
- OQ-PG-5 — 1Password passkeys are **syncable, not device-bound**. The design must not assume
  device-binding it does not have, and must not require attestation. Benign at threat level Q2(a)

## Deltas owed to the parent definition on completion
- `open-questions.md` → **close OQ-T-3**, and correct its stale `beta.25` fact to `beta.32`
- `vision-document.md:269` → "Admin actions stay behind the passcode gate" becomes inaccurate once
  `ADMIN_PASSCODE` is removed; the invariant needs restating as a gate-mechanism-agnostic rule
- `technical-environment.md` → new table in the 7-table schema; first auth-related persistence
