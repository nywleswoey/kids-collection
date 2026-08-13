# Passkey cutover — replacing the admin passcode

Concrete steps for moving the `/admin/*` gate from `ADMIN_PASSCODE` to a WebAuthn passkey.

**Read §1 before deploying anything.** One check is genuinely blocking, and the two-deploy order is a
safety mechanism rather than tidiness — collapsing it into one deploy is how you end up locked out of
your own admin area with no way back except a laptop you may not have.

Background and the reasoning behind each decision: `Product-Definition/features/parent-gate-auth/`.

---

## 1. Before you start

### 1.1 The measured result (OQ-PG-4) — read this first

This was tested on production on 2026-08-13, and **it came back negative.** With 1Password already
unlocked, the passkey assertion completed on a **single button click, with no biometric prompt.**

That is not a bug. `requireUserVerification: true` is set, and `verifyAuthenticationResponse` rejects any
assertion whose UV flag is false — so 1Password asserted UV=true. It treats an unlocked vault as the user
having already been verified. A legitimate reading of the spec, just a weaker one than assumed. WebAuthn
gives a relying party no way to demand a *fresh* check; the authenticator alone decides what counts.

**What still holds.** Nothing is typed, so nothing is observable. A child watching learns nothing
reusable — that was the decisive argument for this whole change, and it survives intact.

**What does not.** An unattended device with an unlocked vault now opens the gate on one click. Under the
passcode that required having *seen* the passcode. The risk shifts from *observation, permanent once
seen* to *physical access, transient* — and both sit inside the stated threat model of a curious child at
your desk.

**Consequence: §3.5 is now a required step before deploy 2**, not an optional hardening.

### 1.2 What must be true

- You can reach the Vercel dashboard and the Neon database.
- You are signed in to Google as an allowlisted parent (`PARENT_EMAILS`).
- 1Password is installed and working on the device you will enrol from.
- `git revert` + redeploy is available to you — this is the safety net, and after deploy 2 it is the
  *only* one (§6).

---

## 2. Deploy 1 — passkey and passcode side by side

The code for this is written and green. Deploy 1 changes nothing about how you currently get in: the
passcode still works, and the passkey is added alongside it.

> **Production only — previews cannot test this.** Vercel builds production from `main`; a feature
> branch gets a generated hostname like `kids-collection-git-<branch>-….vercel.app`. A passkey is bound
> to one exact host, so `passkeyRp()` returns `null` there and the passkey path is switched off
> entirely — no setup button, no ceremony, nothing to verify. That is the design (previews fall back to
> Google re-auth), not a limitation to work around. **§3 can only be run after merging to `main`.**

### 2.1 Do these three in order

The order is not cosmetic — two of the three orderings can lock you out of the admin area.

| # | Step | Why it must come here |
|---|---|---|
| 1 | **Apply migration 0008** (§2.2) | `/admin/unlock` queries `admin_credentials`. Deploying first means the query runs against a table that does not exist. The lookup fails soft (see below), but migrating first avoids the situation entirely. The migration is additive and invisible to the currently-deployed code, so it is safe to run early |
| 2 | **Set `WEBAUTHN_RP_ID`** (§2.2.1) | Vercel only picks up a new variable on a deploy. Set it after merging and production runs with the `localhost` default, the host never matches, and passkeys stay silently off until you redeploy |
| 3 | **Merge to `main`** (§2.3) | Triggers the production deploy with both of the above already in place |

> The unlock page's credential lookup **fails soft**: if the query throws, it is reported to PostHog and
> treated as "no passkeys enrolled" rather than propagating. So a missed step 1 degrades to "the passkey
> button is missing" instead of a 500 that would take the passcode form down with it. Belt and braces —
> still do step 1 first.

### 2.2 Apply the migration

```sh
pnpm db:migrate      # applies src/db/migrations/0008_admin_credentials.sql against DATABASE_URL
```

Creates `admin_credentials` (schema goes 7 → 8 tables). Confirm:

```sh
psql "$DATABASE_URL" -c '\d admin_credentials'
```

The nightly dump is a full DB dump, so the new table is covered from the next run onward — nothing to
configure.

#### 2.2.1 Set the Relying Party ID

A passkey is bound to one exact hostname. `vercel.app` is on the Public Suffix List, so this must be the
full host — not `vercel.app`, and not a wildcard.

Vercel → project → Settings → Environment Variables → **Production**:

```
WEBAUTHN_RP_ID = kids-collection.vercel.app
```

Leave it **unset** for Preview and Development. Unset defaults to `localhost`, which is what local dev
wants, and previews then have no passkey path at all — by design.

### 2.3 Merge to `main`

Production deploys from the default branch, so this is a merge, not a branch push.

```sh
pnpm typecheck && pnpm test && pnpm build   # the same gates CI runs
gh pr create --base main --title "feat(admin): passkey unlock alongside the passcode"
# review, then merge → production deploy
```

CI additionally runs `pnpm pg:up && pnpm test:pg`, which includes the new `AdminCredentialStore`
contract suite against real Postgres.

Pushing the branch first is still worth doing — CI runs on the PR, and the preview deploy confirms
nothing else regressed. It just cannot exercise the passkey flow.

---

## 3. Enrol and verify — on production, from a real device

There is no staging environment and no browser E2E test, so **production is first contact** with the
WebAuthn ceremony. This checklist is the compensating control. Work through all of it.

| # | Step | Expected |
|---|---|---|
| 1 | Visit `https://kids-collection.vercel.app/admin` | Redirected to `/admin/unlock` |
| 2 | The unlock page offers **Set up a passkey** | Passkey path is live on this host |
| 3 | Click it | Redirected to `/admin/enrol/reauth` — "Confirm it's you" |
| 4 | **Continue with Google** | Google forces a real re-authentication (`prompt=login`), even though you were already signed in |
| 5 | Back at `/admin/enrol`, name it (e.g. "1Password") and **Create passkey** | 1Password offers to save a passkey |
| 6 | Save it | "Passkey ready" |
| 7 | **Continue** → `/admin/unlock` | Now offers **Unlock with passkey** |
| 8 | Unlock with the passkey | Lands on `/admin` |
| 9 | Wait 20+ seconds idle, then navigate within `/admin` | Sent back to unlock; passkey works again |
| 10 | Run the §1.1 verification-behaviour check | See the table there |
| 11 | Open the app on your **other** device (the different ecosystem) | 1Password offers the same passkey — this is the sync that made a second enrolment unnecessary |
| 12 | Unlock there too | Success |

If step 11 fails, 1Password sync is not covering both devices. Enrol a second passkey on that device
(repeat 3–7) before continuing — it is why the schema is multi-credential.

**Do not proceed to §3.5 until every row passes.**

---

## 3.5 Swap to platform passkeys — required before deploy 2

Because of the §1.1 result, a 1Password passkey opens the gate on one click. The fix is not in code —
WebAuthn cannot force a fresh check — it is **which authenticator is enrolled**. A platform authenticator
(Touch ID, Windows Hello, Android biometric) verifies per assertion.

Do this **on each device you use `/admin` from**:

| # | Step | Notes |
|---|---|---|
| 1 | `/admin/unlock` → **Manage passkeys** | Sends you through Google re-auth again |
| 2 | Name it for the device, e.g. "MacBook Touch ID" | Optional; defaults to "This device" |
| 3 | **Add this device (Touch ID / Windows Hello)** | Restricts the picker to a platform authenticator |
| 4 | **Confirm the prompt actually asked for a biometric** | `authenticatorAttachment: "platform"` is a hint, not a guarantee — some systems register a password manager as a platform provider |
| 5 | Repeat on your other device | Platform passkeys do **not** sync across ecosystems. That is the cost of this route |

Then, **once every device you use has its own platform passkey**:

| # | Step | Notes |
|---|---|---|
| 6 | `/admin/unlock` → **Manage passkeys** → **Remove** the 1Password entry | Leaving it enrolled defeats the point: it stays offerable at the unlock prompt, so anyone at an unlocked device can just pick it |
| 7 | Unlock again on each device | The biometric must fire every time |

> **Do not do step 6 before step 5 on every device.** Removing the synced credential while a device has
> no platform passkey of its own leaves that device with no passkey at all. Not a lockout — Google
> re-auth still enrols a new one — but an avoidable detour.

If a device cannot do platform passkeys at all, keep a 1Password credential for it and accept the
one-click behaviour there, or reconsider removing the passcode (§6.3).

---

## 4. Deploy 2 — remove the passcode

Only after §3 is fully green **and** §3.5 is complete — every device has its own platform passkey and
the 1Password credential has been removed.

### 4.1 Code removals

| File | Action |
|---|---|
| `src/features/admin/gate.ts` | Delete `verifyPasscode()`. Keep everything else — the cookie, TTL, and `requireAdminGate()` are unchanged by this whole project |
| `src/features/admin/unlock-action.ts` | Delete the file |
| `src/features/admin/UnlockForm.tsx` | Delete the passcode `<form>`, the "or use the passcode" divider, the `error`/`pending` state, and the `passkeyEnrolled` branch that offers the passcode as an alternative |
| `app/admin/unlock/page.tsx` | Drop the now-unused prop |
| `.env.example` | Remove the `ADMIN_PASSCODE` block |

Comment-only mentions of "passcode" in `app/admin/layout.tsx`, `app/admin/page.tsx`,
`src/features/admin/gate-token.ts` and `src/lib/webcrypto.ts` should be reworded, not deleted —
`timingSafeEqual` is still used by `signed-token.ts`.

### 4.2 The invariant that changes

`Product-Definition/vision-document.md:269` currently reads:

> "Admin actions stay behind the passcode gate."

Replace with:

> "Admin actions stay behind the admin gate, which requires a fresh proof of parent identity."

Also close **OQ-T-3** in `Product-Definition/open-questions.md` and correct its stale `beta.25` to
`beta.32` — there is no stable Auth.js v5 to upgrade to (`npm view next-auth dist-tags` → `latest:
4.24.15`).

### 4.3 Ship, then remove the variable

Order matters. Deploy first, delete the environment variable second — the reverse leaves a window where
the passcode form exists and cannot succeed.

```sh
pnpm typecheck && pnpm test && pnpm build
gh pr create --base main --title "feat(admin): remove the admin passcode"
# review, then merge → production deploy
```

Then Vercel → Settings → Environment Variables → delete `ADMIN_PASSCODE` from Production.

**Verify once more** that the passkey unlocks `/admin`. After this point there is no passcode.

---

## 5. Ongoing — the yearly drill

The Google re-auth path is now the only way back into admin without a working passkey, and in normal use
it is never exercised. An untested recovery path is the failure this repo already learned about with
backups (`docs/RESTORE.md`) — a mitigation that fails silently is worse than a known gap.

**Once a year**, or whenever you change phone or laptop:

1. Delete your enrolled passkey from 1Password (or use a device that does not have it).
2. Go to `/admin` and enrol again through `/admin/enrol/reauth`.
3. Confirm the Google re-authentication actually prompts.

Takes two minutes and converts an assumption into a fact.

---

## 6. If you get locked out

### 6.1 Between deploy 1 and deploy 2

The passcode still works. Use it, then diagnose. This is the entire reason for the two-deploy order.

### 6.2 After deploy 2

**Restoring `ADMIN_PASSCODE` in Vercel will not help** — the code that reads it is gone. The only route
back is:

```sh
git revert <deploy-2-commit>
git push
```

Then set `ADMIN_PASSCODE` again in Vercel and wait for the deploy. This needs a working development
environment, which is precisely the risk: lockout is most likely to happen when you are away from the
laptop.

Before that, try the cheaper things:

| Symptom | Try |
|---|---|
| Passkey prompt never appears | Is 1Password unlocked and the browser extension enabled? Is the URL exactly `kids-collection.vercel.app`? |
| "Passkeys aren't available on this address" | You are on a preview deployment or a different hostname. Go to the production URL |
| "Couldn't verify that passkey" | The credential is not enrolled for this account. Enrol via `/admin/enrol` |
| Enrolment loops back to "Confirm it's you" | The Google re-auth is not stamping `authTime`. Sign out completely and sign in again |
| Nothing works, but Google sign-in does | Enrol a fresh passkey via `/admin/enrol` — this is the designed recovery path and needs no passcode |

### 6.3 If §3.5 cannot be completed

§3.5 is the chosen answer to the §1.1 result. If a device cannot do platform passkeys, or the per-device
enrolment is not worth it to you, these are the alternatives that were weighed:

| Option | What it buys | What it costs |
|---|---|---|
| **Shorten 1Password's auto-lock** to ~1–5 min | Shrinks the unlocked window | Does not close it — while unlocked, one click still opens the gate |
| **Keep the passcode** as a second factor; cancel deploy 2 | Defence in depth | Keeps a secret the kids may already have seen. Reopens OQ-PG-2 |
| **Accept the one-click behaviour** and do deploy 2 anyway | Simplest end state, no standing secret | An unattended unlocked device opens the gate |

None of these is wrong. The first is cheapest, the second most conservative, the third cleanest. What
would be wrong is doing deploy 2 while believing the biometric fires when it does not.

---

## 7. Reference

| Thing | Where |
|---|---|
| RP resolution + host guard | `src/features/admin/webauthn/rp.ts` |
| Challenge signing (60s, purpose-bound) | `src/features/admin/webauthn/challenge.ts` |
| Both ceremonies | `src/features/admin/webauthn/passkey-actions.ts` |
| Credential persistence | `src/db/stores/credential-store{,.pg,.fake}.ts` |
| Freshness rule (5 min) | `src/features/auth/fresh-auth.ts` |
| Gate cookie + 20s TTL (unchanged) | `src/features/admin/gate-token.ts`, `middleware.ts` |
| Decisions and open questions | `Product-Definition/features/parent-gate-auth/` |
