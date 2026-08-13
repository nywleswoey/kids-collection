# Vision Answers History — Parent Gate Auth (Business role)

**Append-only.** Every validated batch is recorded here verbatim, including caveats and superseded
answers. Never rewritten or truncated. `vision-questions.md` is a disposable buffer; this file is the
durable record.

---

## Batch 1 (Q1–Q7) — validated 2026-08-12T22:56:06Z

Scope: the admin passcode gate on `/admin/*` only. Google OAuth login at `/signin` is OUT of scope.

### Q1 [CORE] — What is actually wrong with the passcode today?
**Answer: a & c.**
- (a) Typing it is annoying, especially on a phone, and the 20s TTL means doing it repeatedly.
- (c) The kids can watch me type it — shoulder-surfing is a live risk.

*Consequence recorded:* (c) is the answer that makes this a build rather than a config tweak. It is the
only complaint that no amount of TTL-lengthening or keypad-prettifying can fix — a typed secret is
observable by anyone in the room, and once observed it is permanently compromised until rotated.

### Q2 [CORE] — Who is the gate defending against?
**Answer: a.** My own kids — casual and curious, not adversarial. They will not run a script.

*Tension noted and resolved (see OQ-PG-2):* during the interview the AI initially argued that at threat
level (a), passkeys would win on convenience rather than security. Q1(c) overturns that: a curious child
does not need sophistication to defeat a passcode they watched being typed. Observation is the attack,
and it is available at threat level (a). Both the ergonomic and the security argument therefore hold.

### Q3 [CORE] — Where do you actually use the admin pages?
**Answer: c — both phone and laptop, regularly.**
**Refinement (asked as a follow-up, 2026-08-12): ecosystem is MIXED** — e.g. iPhone + Windows/Linux
laptop.

*Consequence recorded:* this is the answer with the largest effect on build size. Passkeys sync only
**within** an ecosystem (iCloud Keychain for Apple, Google Password Manager for Android/Chrome). Mixed
means **no sync**: at least two independent credentials, so the design must support multiple
credentials per parent and an "add another device" flow from day one. A single-credential first slice
would be unusable on the second device. See OQ-PG-1.

### Q4 [CORE] — The 20-second idle window
**Answer: c.** Keep it tight, but make re-entry near-free. 20s is the right security posture; the fix is
a mechanism that costs one glance rather than one typed string.

*Consequence recorded:* this eliminates every "just make the prompt rarer" option (Q6 c and d) by
construction, and it rules out Google re-auth as the *primary* mechanism — a full OAuth round-trip
every 20 seconds of idle is worse than typing.

### Q5 [CORE] — Lockout and recovery
**Answer: b.** Re-enrol via Google — no passkey on this device? Re-authenticate with Google
(`prompt=login`), prove you are the allowlisted parent, then register a new passkey.

*Consequence recorded:* the fallback is strictly stronger than the thing it backs up. It also means
`ADMIN_PASSCODE` is **removed**, not kept alongside — there is no standing shared secret anywhere in
the system after this change.

### Q6 [CORE] — Which mechanism
**Answer: a + b — WebAuthn passkey primary, Google re-auth as recovery/enrolment only.**

This was not a free choice by the time it was reached; Q1, Q4 and Q5 had already eliminated the
alternatives. Recorded elimination table:

| Option | Verdict | Why |
|---|---|---|
| c) Longer TTL, same passcode | ✗ | Contradicts Q4=c. Also does nothing for Q1(c) |
| d) "Trust this device" cookie | ✗ | Contradicts Q4=c, and a long-lived trust cookie on a device the kids can reach reopens exactly the Q2(a) hole |
| e) Passcode, but nicer | ✗ | Still typed, therefore still observable — fails Q1(c) |
| b) Google re-auth as *primary* | ✗ | Full OAuth round-trip at a 20s TTL is worse than the status quo |
| **a) WebAuthn passkey** | ✓ | The only option that is both fast (Q1a) and unobservable (Q1c) at a 20s TTL |
| **b) Google re-auth as *recovery*** | ✓ | Carried in from Q5 |

### Q7 [CORE] — Scope OUT and effort ceiling

**Q7-i — items 1–5: assumed OUT, pending explicit confirmation at the approval gate (see OQ-PG-3).**
1. Changing Google OAuth login or the parent email allowlist — OUT
2. Per-child logins / any auth for children — OUT
3. Multi-parent / multi-family accounts — OUT
4. 2FA on the Google account itself — OUT
5. Rotating `AUTH_SECRET` or the cookie-signing scheme — OUT

**Q7-i item 6 — OQ-T-3 (`next-auth` beta): originally answered "IN scope — do the stable upgrade
first". Superseded the same session by a factual finding (original answer preserved above, not
erased).**

*Finding (AI, verified against the npm registry 2026-08-12):* **there is no stable Auth.js v5.**
`npm view next-auth dist-tags` returns `latest: 4.24.15` (the legacy v4 line) and `beta:
5.0.0-beta.32`. v5 has been in beta since 2023. There is nothing stable to upgrade to, so the answer
as given was not executable.

*Correction to the parent definition:* OQ-T-3 states the repo is pinned to `5.0.0-beta.25`. It is
actually on **`5.0.0-beta.32`** (`package.json:31`) following recent Dependabot bumps. The parent
`open-questions.md` fact is stale.

**Revised answer: CLOSE OQ-T-3.** `5.0.0-beta.32` *is* the current line for Auth.js v5; v4 is the legacy
branch, not the safer one. "Wait for stable" was never a real plan with a date attached. Keep taking
beta releases via Dependabot; stop carrying this as an open question.

**Q7-ii — effort ceiling: a.** Strictly $0 and no new external service. Anything needed must be
self-hosted in the existing Neon/Vercel footprint.

*Consequence recorded:* this rules out managed passkey providers (Clerk, WorkOS) even on free tiers, and
confirms the self-hosted route — a WebAuthn library plus one table in the existing Neon database.

---

## Pre-declared open questions from Batch 1

- **OQ-PG-1** — Q3 is mixed-ecosystem, so passkeys will not sync and at least two credentials are
  needed. Does the first slice ship multi-credential support and an "add a device" flow, or one device
  plus the Google recovery path, with multi-device deferred? Q3's answer implies the former; scope
  discipline implies the latter.
- **OQ-PG-2** — Q2 puts the threat at "casual, non-adversarial kids", yet Q6 deletes `ADMIN_PASSCODE`
  outright. Is removing the last non-device credential proportionate at that threat level, given the
  recovery path requires a working Google sign-in on whatever device is at hand?
- **OQ-PG-3** — Q7-i item 1 places Google login OUT of scope, but the Q5=b recovery path invokes the
  Google sign-in flow (`prompt=login`). Confirm the intended reading: re-using the existing flow without
  changing the provider, the allowlist, or the session shape is *not* a scope violation. Also: items 1–5
  were assumed out rather than explicitly confirmed.
- **OQ-PG-4** — Q4 keeps the 20s idle TTL and assumes a passkey re-prompt is "near-free". Untested: a
  WebAuthn user-verification prompt every 20 seconds of idle may be materially more intrusive than
  predicted, particularly on desktop where it is a system modal rather than a glance. Needs a real trial
  before the TTL is treated as settled.

---

## Amendment 1 to Batch 1 — Q3 (recorded 2026-08-12T23:04Z)

**Trigger:** user volunteered that **1Password is installed on all their devices**. This was not asked
in batch 1 — the Q3 follow-up asked only about OS ecosystems, which was the wrong question. It assumed
the passkey provider would be the platform authenticator.

**Original Q3 answer stands** (c — both phone and laptop, mixed ecosystem). What changes is the
*consequence* drawn from it.

### Superseded consequence
> "Mixed means **no sync**: at least two independent credentials, so the design must support multiple
> credentials per parent and an 'add another device' flow from day one."

### Revised consequence
1Password 8 is a **cross-platform passkey provider** — it stores and syncs passkeys across macOS,
Windows, Linux, iOS and Android (desktop via the browser extension, mobile via the OS
credential-provider APIs). Mixed ecosystem therefore no longer implies no sync.

| | Platform authenticators only | With 1Password |
|---|---|---|
| Credentials to enrol | 2+, one per ecosystem | **1**, synced to every device |
| "Add a device" UI | Required in slice 1 | **Deferrable** |
| Independent recovery paths | Google re-auth only | Google re-auth **+** 1Password account recovery |

**Retained despite the amendment:** the persistence schema stays **multi-credential** (a table holds N
rows at no extra cost, and a platform passkey is wanted as a backup should 1Password ever be
unavailable). Only the multi-device *management UI* leaves slice 1.

### New caveats introduced by this amendment
- **User-verification semantics are now provider-dependent.** With a platform authenticator, biometric
  per assertion is a given. With 1Password, the unlock depends on the vault's auto-lock state — an
  unattended device with an unlocked vault could let a child approve the prompt. `userVerification:
  "required"` *should* force a fresh check; whether 1Password re-prompts biometric on every UV-required
  assertion or trusts a recently-unlocked vault is **unverified**. Folded into OQ-PG-4 — must be
  established by trial, not assumed.
- **These are syncable credentials, not device-bound ones.** A passkey in a synced vault is exportable
  by design. Irrelevant at threat level Q2(a), but the design must not assume device-binding it does
  not have, and must not require attestation.

### Effect on pre-declared open questions
- **OQ-PG-1** — largely resolved. Downgraded from "does slice 1 need multi-device support?" to "confirm
  the multi-credential schema, defer the management UI". No longer a build-size risk.
- **OQ-PG-4** — widened. Now covers both the 20s re-prompt cadence *and* 1Password's UV behaviour.

---

## Amendment 2 to Batch 1 — Q7-i (recorded 2026-08-12T23:10Z)

**Trigger:** user explicitly confirmed Q7-i ("ok with 7i"), which batch 1 had recorded as *assumed*
rather than stated.

**Q7-i items 1–5 are confirmed OUT of scope:**
1. Changing Google OAuth login or the parent email allowlist — OUT
2. Per-child logins / any auth for children — OUT
3. Multi-parent / multi-family accounts — OUT
4. 2FA on the Google account itself — OUT
5. Rotating `AUTH_SECRET` or the cookie-signing scheme — OUT

**Interpretation adopted for item 1 (recorded so it is auditable rather than tacit):** the Q5=b recovery
path invokes the *existing* Google sign-in flow with `prompt=login`. This is **not** a scope violation,
because it does not change the provider, the allowlist (`src/features/auth/access.ts`), the session
shape, or the `signIn` callback. It re-uses the boundary as-is. Should implementation reveal that the
recovery path requires *modifying* any of those, that is a scope change and must come back to this
interview rather than being absorbed silently.

**OQ-PG-3 is CLOSED** by this amendment. Number not reused.

---

## Amendment 3 to Batch 1 — Q7-i item 1 (recorded 2026-08-13T00:05Z, during implementation)

**Trigger:** implementation surfaced exactly the case Amendment 2 said must return here rather than be
absorbed silently.

**The problem.** Enrolment must require a *fresh* Google re-authentication. A live session is not
enough: any device holding one — including an unattended laptop a child picks up — could otherwise
enrol a passkey and hold a permanent key to the admin gate. But `next-auth` carries no
authentication-time claim, and adding one touches the session shape that Q7-i item 1 placed out of
scope.

**Options put to the user:**
- **(a) Stamp `authTime` in the JWT** — a `jwt` callback recording when Google last authenticated;
  enrolment requires it to be under 5 minutes old.
- **(b) Nonce + dedicated OAuth return route** — zero session change, but weaker: capturing the nonce
  from the redirect URL would skip the Google round-trip.
- **(c) No freshness** — rejected as advice; an unattended logged-in device becomes a permanent bypass.

**Answer: (a).** Approved as a deliberate, additive scope amendment.

**Boundary reaffirmed.** The change adds one claim and nothing else. No provider change, no allowlist
change, no `signIn` callback change, no change to who may sign in. The recovery flow still re-uses the
existing Google sign-in as-is (`signIn("google", { redirectTo }, { prompt: "login" })`).

**Implemented as:** `authTime` stamped in `src/auth/config.ts` only when `account` is present (a real
sign-in, not a token refresh); validated at the session boundary rather than trusted, so a malformed or
absent claim reads as "not fresh"; `hasFreshAuth()` kept pure in `src/features/auth/fresh-auth.ts` with
a 5-minute window, and `requireFreshParent()` redirecting stale sessions to `/admin/enrol/reauth`.
