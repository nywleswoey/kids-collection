# OQ-T-3: `next-auth` is pinned to a beta on the only security boundary

Research for **OQ-T-3**, 2026-08-12. The open question asks: *"What is the upgrade path for
`next-auth@5.0.0-beta.25`, and what would a stable-release migration involve?"*

**Headline: the question is asking about the wrong risk.** There is no stable v5 to migrate to, and
the beta pin is not the problem. The problem is that the installed version is inside the affected
range of **three published security advisories, two of them HIGH**, and the fix is a patch bump that
was available before this was looked at.

---

## 1. State of the release line

| Channel | Version | Notes |
|---|---|---|
| `latest` | **4.24.15** | the v4 line, published 2026-07-20 as a **security patch** |
| `beta` | **5.0.0-beta.32** | the v5 line |
| installed here | **5.0.0-beta.31** | with `@auth/core@0.41.2` |
| declared here | `^5.0.0-beta.25` | `package.json` |

**No stable 5.0.0 exists.** "Wait for stable, then migrate" is not an available plan and has not been
for the two years this pin has existed. Auth.js v5 is widely used in production in beta; the version
string is not itself the risk, and OQ-T-3's framing — *"its upgrade deserves deliberate attention
rather than a routine bump"* — is right for a reason it did not anticipate.

## 2. The actual finding: the installed version is affected by three advisories

All three were published against the 4.x line's 2026-07-20 patch and apply to the v5 beta line too.

| Advisory | Severity | Affected | Fixed in |
|---|---|---|---|
| [GHSA-7rqj-j65f-68wh](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-7rqj-j65f-68wh) — email normalizer validates before Unicode normalization, allowing a homoglyph `@` bypass | **HIGH** | `next-auth` `>= 5.0.0-beta.1, <= 5.0.0-beta.31`; `@auth/core < 0.41.3` | beta.32 / 0.41.3 |
| [GHSA-xmf8-cvqr-rfgj](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-xmf8-cvqr-rfgj) — `getToken()` throws an uncaught exception on a malformed `Bearer` header | **HIGH** | `next-auth` `>= 5.0.0-beta.0, <= 5.0.0-beta.31`; `@auth/core < 0.41.3` | beta.32 / 0.41.3 |
| [GHSA-x445-f3h2-j279](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279) — OAuth `state`, `nonce` and PKCE check cookies are not bound to the provider that created them | medium | `next-auth` `>= 5.0.0-beta.1, <= 5.0.0-beta.31`; `@auth/core <= 0.41.2` | beta.32 / 0.41.3 |

`5.0.0-beta.32` depends on `@auth/core@0.41.3` — the patched core — where beta.31 depends on `0.41.2`.

## 3. Exposure in *this* app — checked, not assumed

Being inside an affected range is not the same as being exploitable. Each was traced to this app's
actual configuration (`src/auth/config.ts`, `middleware.ts`, `src/features/auth/`):

**GHSA-7rqj (homoglyph email) — not reachable.** The fix normalizes addresses NFKC *"in the email
sign-in flow"*. This app configures `providers: [Google]` and no Email provider, so that code path
does not run. The identity it trusts is a Google-verified account, not a user-typed address.

> **But a related weakness in this repo's OWN code is worth noting**, because it is the same class and
> is not covered by the upstream fix: `isParentEmail` (`src/features/auth/policy.ts`) normalizes with
> `trim().toLowerCase()` and **no Unicode normalization**, then does an exact `includes`. The
> allowlist is the app's only real authorization boundary. It is defended today by the fact that the
> address arrives from a verified Google account rather than from an attacker's keyboard — which is a
> property of the *provider*, not of this function. Adding `.normalize("NFKC")` costs one call and
> removes the dependence. Not a live vulnerability; a cheap hardening with an obvious test.

**GHSA-xmf8 (`getToken()` Bearer) — not reachable.** The app never calls `getToken`. `middleware.ts`
wraps `auth()`, and every server check goes through `auth()`/`requireParent()`. Verified by grep
across `src/` and `middleware.ts`.

**GHSA-x445 (provider-unbound check cookies) — not reachable *in this configuration*.** The bug is a
check cookie created by provider A being accepted when provider B handles the callback. With exactly
**one** provider configured there is no second provider to confuse it with.

> ⚠️ **This is a configuration-dependent safety, and those go stale silently** — the same shape as the
> *"the repo must stay private"* claim corrected in #46. The day a second provider is added (Apple,
> email magic links, anything), this becomes live with no signal that it did.

## 4. Recommendation

**Bump to `5.0.0-beta.32` now**, and treat the "not reachable" analysis above as a reason it is not an
emergency — not as a reason to skip it.

- It is a patch-level move within the same beta line, `@auth/core 0.41.2 → 0.41.3`.
- Peer dependencies are unchanged and already satisfied (`next ^15`, `react ^19`; this repo runs
  `next@15.5.20`, `react@19.2.7`).
- The published notes describe security fixes only — no API changes.
- It is gated by `fast-gate` and `pg-gate` like any other PR, and the auth surface has its own
  property tests (`tests/auth-policy.pbt.test.ts`, `tests/auth-access.test.ts`).

**Also consider pinning exactly.** `^5.0.0-beta.25` matches every `5.0.0-beta.*` and any future
`5.x` stable — verified with `semver.satisfies`. The lockfile plus `--frozen-lockfile` means this
cannot drift in CI or in a Vercel build, so it is not urgent; but the declared range says the security
boundary may float across prereleases, which is not what anyone intends. It is also how the installed
version arrived at beta.31 while the file still says beta.25.

## 5. What OQ-T-3 should be replaced with

The original question — *"what would a stable-release migration involve?"* — cannot be answered and is
not the risk. The residual question worth carrying is narrower:

> **The auth dependency has no mechanism watching it.** Three advisories were published on 2026-07-20
> and were still unnoticed on 2026-08-12, on the only real security boundary in the application.

`.github/dependabot.yml` currently watches **`github-actions` only**, deliberately (a full npm watch
would be noise). But that reasoning does not extend to this one package. A Dependabot entry scoped to
`next-auth` alone — or GitHub's **security** updates, which are separate from version updates and open
PRs only for advisories — would have surfaced this the day it was published, at approximately zero
noise.

---

### Method

`npm view` / the npm registry for dist-tags and dependency graphs;
`gh api /repos/nextauthjs/next-auth/security-advisories` for the affected/patched ranges (the release
notes themselves name no GHSA ids); the repo's own `src/auth/`, `middleware.ts` and
`src/features/auth/` for reachability. Nothing here was taken from memory.
