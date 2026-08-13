# Vision — Parent Gate Auth

**Scoped sub-discovery.** Does not rewrite the approved 2026-08-03 parent definition
(`Product-Definition/vision-document.md`). Business role approved 2026-08-12T23:14Z; technical role
approved 2026-08-12T23:23Z.

---

## The question that started it

> *"Can I use something other than a PIN for parent login? Biometric perhaps."*

The premise needed correcting before it could be answered. The app has **two** parent gates, not one:

| Layer | What it is | Where |
|---|---|---|
| Login | Google OAuth (Auth.js v5), email allowlist, fail-closed | `src/auth/config.ts`, `/signin` |
| **Admin gate** | `ADMIN_PASSCODE` env, SHA-256 constant-time compare → signed httpOnly cookie, **20s sliding idle TTL** | `src/features/admin/gate.ts`, `middleware.ts:21` |

The "PIN" is the **second** one — a re-prompt guarding `/admin/*`, not the login. Only that gate is in
scope. Google login, the allowlist, and the session shape are explicitly out
(`vision-answers-history.md` → Amendment 2).

And "biometric" needed correcting too: browsers never expose a fingerprint or face to a site. The real
mechanism is **WebAuthn** — a platform or roaming authenticator performs the biometric check locally and
returns a signed assertion. What the app stores is a public key, never biometric data.

## The decision

**Replace the passcode with a WebAuthn passkey, delivered through 1Password. Recovery is a fresh Google
re-authentication. `ADMIN_PASSCODE` is deleted.**

## Why — the argument in one line

A typed secret is defeated by *observation*, and the parent's own children are in the room.

That is the whole case. It is worth separating from the weaker arguments that also happen to be true:

| Argument | Weight |
|---|---|
| **The kids can watch me type it** (Q1c) | **Decisive.** No TTL change, keypad UI, or password-manager autofill fixes an observable secret. Once seen, it is compromised until rotated |
| Typing it is annoying at a 20s TTL (Q1a) | Real, but a longer TTL would have fixed it for free. Not sufficient on its own |
| Dislike of a shared secret in env (Q1d) | Not claimed by the user. Falls out as a side benefit anyway |

An earlier version of this argument was wrong and is corrected here: during the interview it was argued
that at the stated threat level — *own kids, casual, non-adversarial* (Q2a) — passkeys would win on
convenience rather than security. Q1(c) overturns that. **Observation requires no sophistication.** A
curious seven-year-old who watched you type does not need a script. Both the ergonomic and the security
arguments hold.

## Why not the alternatives

By the time the mechanism question was reached, prior answers had eliminated everything else:

| Option | Verdict |
|---|---|
| Longer TTL, same passcode | ✗ User chose to keep the 20s window tight (Q4c). Does nothing for observation |
| "Trust this device" cookie | ✗ Same, and a long-lived trust cookie on a device the kids can reach reopens the exact hole Q2(a) describes |
| Passcode, but nicer UI | ✗ Still typed, therefore still watchable |
| Google re-auth as the *primary* unlock | ✗ A full OAuth round-trip every 20 seconds is worse than the status quo |
| **WebAuthn passkey** | ✓ The only option that is both fast and unobservable at a 20s TTL |

## What the parent experiences

**Everyday unlock.** Hit `/admin/*`, the 20s window has lapsed, 1Password prompts, one biometric check,
in. No typing, nothing for a child in the room to observe.

**New device, or 1Password unavailable.** No passkey for this hostname → re-authenticate with Google
(`prompt=login`) → enrol a passkey. The fallback is *strictly stronger* than the thing it backs up,
which is an unusual and desirable property.

**After this change there is no standing shared secret anywhere in the system.**

## The 1Password amendment

The interview initially concluded that a mixed-ecosystem answer (iPhone + Windows/Linux laptop) meant no
passkey sync, hence two independent credentials and an "add a device" flow as load-bearing work in the
first slice. **This was wrong**, and the error was in the question, not the answer: the ecosystem
follow-up offered only platform authenticators and no "I use a password manager" option.

1Password 8 is a cross-platform passkey provider — macOS, Windows, Linux, iOS, Android; desktop via the
browser extension, mobile via the OS credential-provider APIs. Mixed ecosystem therefore does **not**
imply no sync.

| | Platform authenticators only | With 1Password |
|---|---|---|
| Credentials to enrol | 2+, one per ecosystem | **1**, synced everywhere |
| "Add a device" UI | Required in slice 1 | **Deferrable** |
| Independent recovery paths | Google re-auth only | Google re-auth **+** 1Password account recovery |

Roughly half the anticipated build, removed. What is retained: the **schema stays multi-credential** — a
table holds N rows for free, and a platform passkey is wanted as a backup should 1Password ever be
unavailable. Only the management *UI* leaves the first slice.

Two caveats this introduces, both tracked:

- **User verification is now provider-dependent** (OQ-PG-4). With a platform authenticator, a biometric
  check per assertion is guaranteed. With 1Password it depends on vault auto-lock state — an unattended
  device with an unlocked vault could let a child approve the prompt. `userVerification: "required"`
  *should* force a fresh check; whether 1Password honours that per assertion is **unverified and must be
  established by trial**. The Q1(c) property rests on it.
- **These are syncable credentials, not device-bound** (OQ-PG-5). Exportable by design. Benign at threat
  level Q2(a), but the design must not assume device-binding it does not have, and must not require
  attestation.

## Scope

**IN:** the `/admin/*` gate unlock mechanism; passkey enrolment; the Google re-auth recovery path;
removal of `ADMIN_PASSCODE`.

**OUT** (confirmed, Amendment 2): Google OAuth login and the parent allowlist · per-child logins or any
auth for children · multi-parent / multi-family accounts · 2FA on the Google account · rotating
`AUTH_SECRET` or the cookie-signing scheme.

**Interpretation recorded for the first item:** the recovery path invokes the *existing* Google sign-in
flow with `prompt=login`. This is not a scope violation, because it changes no provider, no allowlist, no
session shape, and no `signIn` callback. Should implementation require modifying any of those, that is a
scope change and returns to this interview rather than being absorbed silently.

**Effort ceiling:** strictly $0 and no new external service. Managed passkey providers (Clerk, WorkOS)
are ruled out even on free tiers. Two npm dependencies are acceptable (T7-i).

## Success criteria

1. Unlocking `/admin/*` requires no typed secret and leaks nothing to an observer in the room.
2. `ADMIN_PASSCODE` is gone from the code and from the environment.
3. A parent with no passkey on the current hostname can still get in, via Google re-auth.
4. The 20s sliding idle window is unchanged.
5. Nothing in the out-of-scope list changed.

## What must NOT change

- Google OAuth + the fail-closed email allowlist remain the real security boundary.
- The gate is checked in **two** places — middleware and page — defence in depth survives.
- No secret reaches the client bundle.
- PostHog never records parent/admin pages, **including the new enrolment route** (this one needs active
  verification; the opt-out is route-scoped and a new route will not inherit it).
- `pnpm build` needs no network access.

## Invariant that this change breaks

The parent definition states, at `vision-document.md:269`:

> *"Admin actions stay behind the passcode gate."*

That stops being true. Restated mechanism-agnostically:

> **"Admin actions stay behind the admin gate, which requires a fresh proof of parent identity."**

This names the property that matters rather than the mechanism that currently supplies it.
