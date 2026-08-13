# Vision Interview — Parent Gate Auth (Business role)

- **Progress**: Batch 1 (Q1–Q7), all CORE. This is a `quick` pass, so this is expected to be the only
  business batch. Answers are appended to `vision-answers-history.md` on validation — nothing is lost
  when this buffer is overwritten.
- **Scope**: the admin passcode gate on `/admin/*` **only**. Google OAuth login stays as-is.

---

## What exists today (so the questions are concrete)

| Thing | Reality in the code |
|---|---|
| The secret | `ADMIN_PASSCODE`, a server env var. Never sent to the client. SHA-256 digests compared in constant time (`src/features/admin/gate.ts:20`) |
| The session | A signed httpOnly cookie carrying only an expiry — no secret material (`gate-token.ts`) |
| How long it lasts | **20 seconds of idle**, slid forward on every valid `/admin/*` request (`gate-token.ts:17`, `middleware.ts:30`) |
| What it protects | 4 pages: `/admin`, `/admin/profiles`, `/admin/preview`, `/admin/child/[id]/binder` |
| Where it's checked | Twice — middleware (edge) and `requireAdminGate()` in each page, defence in depth |
| State it holds | **None.** Zero DB tables involved; the whole gate is one env var plus a cookie |

Two consequences worth naming before you answer:

1. **The 20s TTL is the dominant fact.** Anything slower than typing a short passcode gets worse, not
   better, at that TTL. Any mechanism choice and the TTL are really one decision.
2. **"Biometric" on the web means WebAuthn passkeys.** The browser never hands a site your fingerprint
   or face. Touch ID / Face ID / Android biometric / Windows Hello unlock a private key held by the
   device, which signs a challenge. Practically: it feels like biometric, but what you are storing is a
   **public key per device** — which means the gate would need persistent storage it does not have today
   (a new table, in a schema that currently has 7 and none auth-related), and a story for what happens
   when the device is gone.

---

### Q1 [CORE]: What is actually wrong with the passcode today?

The mechanism choice depends entirely on which of these is true. Pick all that apply.

a) **Typing it is annoying** — especially on a phone, and the 20s TTL means doing it over and over.
b) **I forget it / it lives in a password manager** and fetching it is the friction.
c) **The kids can watch me type it** — shoulder-surfing is a live risk in a house with kids in it.
d) **It's a shared secret in an env var** — I dislike that it is one string that never rotates and that
   anyone with Vercel dashboard access can read.
e) **Nothing is really wrong** — I saw biometric was possible and wondered if it would be nicer.

**Recommendation:** answer honestly even if it is (e). (e) is a legitimate answer and would push this
toward "improve the TTL/UX, skip the new mechanism" rather than a build. But if (c) is true, that is
the strongest possible argument for passkeys — a Face ID prompt is the only option here that is
*unobservable* by a child standing next to you.

[Answer]: a & c

---

### Q2 [CORE]: Who is the gate defending against?

Be blunt — this decides whether passkeys are proportionate or over-engineering.

a) **My own kids** — stopping a curious 7-year-old from granting themselves 500 pull tokens. Casual, not
   adversarial; they will not run a script.
b) **My kids, treated as adversarial** — assume they will try guessing, watching, and searching the
   device for a saved passcode.
c) **Visitors / anyone who picks up an unlocked device** where I am already signed in to Google.
d) **A real remote attacker** who has somehow got past Google OAuth + the email allowlist.

**Recommendation:** (a) + (c) is my read of the system — the parent's Google session is the real security
boundary, and the passcode is a "not-by-accident, not-by-a-curious-child" speedbump. Note the honest
consequence: if (a)+(c) is the answer, then **any** mechanism that is fast and unguessable satisfies it,
and passkeys win on *convenience*, not on security. If you pick (b) or (d), the argument changes and
security becomes the driver.

[Answer]: a

---

### Q3 [CORE]: Where do you actually use the admin pages?

Passkeys are device-bound credentials. This determines how much enrolment burden the change carries.

a) **Phone only** (iPhone / Android) — one device, one enrolment, Face ID or fingerprint.
b) **Laptop/desktop only** — Touch ID, Windows Hello, or a security key.
c) **Both, regularly.**
d) **Both, plus occasionally a device I don't control** (a work machine, someone else's tablet).

**Context that softens (c):** modern passkeys **sync** — iCloud Keychain across Apple devices, Google
Password Manager across Android/Chrome. If your devices are all one ecosystem, one enrolment covers
them. If you are mixed (iPhone + Windows laptop, say), that is genuinely two enrolments, and (d) means
you would need the cross-device QR flow or a fallback.

**Recommendation:** if the true answer is (d), keep a non-passkey fallback path — otherwise you will one
day be locked out of your own admin area on the one device you have with you.

[Answer]: c

---

### Q4 [CORE]: The 20-second idle window — keep it?

This is half the felt experience and it is cheap to change independently of the mechanism.

a) **Keep 20s.** The re-prompt frequency is fine / I want it that tight.
b) **Lengthen it** (5 minutes? the browser session?) — the re-prompting is the actual pain, and fixing
   it alone might make this whole discovery unnecessary.
c) **Keep it tight but make re-entry near-free** — 20s is the right security posture, and the answer is
   a mechanism that costs one glance rather than one typed string.
d) **Make it "trust this device"** — unlock once, stay unlocked on this device for days; re-prompt only
   on a new device.

**Recommendation:** (c) if Q1 was (a) or (c) — it is the combination that makes passkeys genuinely worth
building, and it preserves the security property the 20s window exists for. Flagging the trap in (b):
lengthening the TTL is a one-line change and free, so if it alone would satisfy you, say so now and save
the build. Flagging the trap in (d): a long-lived device trust cookie on a device your kids can also
reach re-opens exactly the hole Q2(a) describes.

[Answer]: c

---

### Q5 [CORE]: Lockout and recovery — the crux

A passkey lives on a device. Phones get lost, reset, upgraded, dropped in the sea. Today, recovery is
trivial: you read `ADMIN_PASSCODE` from Vercel. With passkeys, what should happen when the enrolled
device is gone?

a) **Keep the passcode as a permanent fallback** — passkey is the fast path, passcode still works.
   Honest cost: the shared secret you may dislike in Q1(d) never goes away, and the gate is only as
   strong as its weakest path.
b) **Re-enrol via Google** — no passkey? Prove you are the allowlisted parent by re-authenticating with
   Google (`prompt=login`), then register a new passkey. No standing secret, but it leans entirely on
   the Google account.
c) **Enrol two devices from day one**, no other fallback. Clean, but two devices lost/reset = locked out.
d) **Break-glass via env** — a recovery code in Vercel env, used once, then rotated.

**Recommendation:** (b). It removes the shared secret rather than keeping it alongside the passkey, and
it re-uses a boundary that already exists and is already fail-closed (the allowlist in
`src/features/auth/access.ts`). It also has a pleasing property: the fallback is *strictly stronger* than
the thing it backs up, which is unusual and good. (a) is the lowest-effort answer and a perfectly
defensible one if you would rather not remove anything.

[Answer]: b

---

### Q6 [CORE]: Which mechanism, then?

The full menu, with honest costs. Passkeys are one option, not the foregone conclusion.

| | Option | What it feels like | Real cost |
|---|---|---|---|
| a | **WebAuthn passkey** (Touch/Face ID) | One glance, ~1s, unobservable | New DB table for credentials, enrolment flow, recovery flow, a WebAuthn library. Biggest build here |
| b | **Re-auth with Google** (`prompt=login`) | Full OAuth redirect round-trip, possibly a password/2FA prompt | Small build, zero new storage, no new secret. But **slow** — bad at a 20s TTL, fine at a long one |
| c | **Longer TTL, same passcode** | Type it once, rarely again | ~One line. Free |
| d | **"Trust this device" cookie + passcode** | Type it once per device per N days | Small build. Weakens Q2(a) if kids use that device |
| e | **Passcode, but nicer** — numeric keypad UI, autofill from password manager, longer TTL | Still typing, but less of it | Small UI build |
| f | Something else / combination |

**Recommendation:** depends sharply on Q1 and Q2, which is why they come first. My prior, given the
system: if Q1 is (c) shoulder-surfing → **(a)**, it is the only option that solves it. If Q1 is (a)
typing friction → **(c) + (e)** first, and only then (a) if it still annoys you. If Q1 is (d) dislike of
the shared secret → **(b)**, which is the only option that actually deletes the secret. Combining (a)
with (b) as its recovery path is the strongest end state, and also the most work.

[Answer]: my q1 is a & c

---

### Q7 [CORE]: Scope OUT and the effort ceiling

**Q7-i — confirm these are OUT** (say if any should be IN):
1. Changing Google OAuth login or the parent email allowlist.
2. Per-child logins, or any auth for children (children are a profile selection, not a security
   boundary — `CONTEXT.md`).
3. Multi-parent / multi-family accounts (multi-tenancy is on the parent definition's disallow list).
4. 2FA on the Google account itself (that is a Google setting, not this app).
5. Rotating `AUTH_SECRET` or the cookie-signing scheme.
6. Resolving OQ-T-3 (`next-auth` beta → stable) as part of this work.

**Q7-ii — effort ceiling.** The parent definition's cost posture is near-zero running cost.
a) **Strictly $0 and no new external service** — anything needed must be self-hosted in the existing
   Neon/Vercel footprint.
b) $0 running cost, but a free tier of a managed auth service (e.g. Clerk/WorkOS passkeys) is acceptable.
c) A few $/month is fine if it removes meaningful work.

**Recommendation:** (a). WebAuthn on Next.js needs no external service — `@simplewebauthn/server` plus one
table does it, and the parent definition treats new external dependencies on the security boundary as a
significant decision (see OQ-T-3's reasoning). Note item 6 above deserves a real answer: this *is* the
auth-adjacent work OQ-T-3 was waiting for, so "out of scope" is a defensible choice but should be
deliberate, not accidental.

[Answer]: a

---

When every `[Answer]:` tag is filled, reply **`ready`**.
