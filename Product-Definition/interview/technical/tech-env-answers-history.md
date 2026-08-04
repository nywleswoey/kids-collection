# Technical Interview — Answers History

Append-only durable record of every validated batch (questions + answers, caveats verbatim).
NEVER rewritten or truncated. The active-batch buffer `tech-env-questions.md` may be overwritten
freely because confirmed answers already live here.

---

## Sections T1–T2: Project Technical Summary · Programming Languages — T1–T7
**Validated**: 2026-08-03T09:36:44Z
**Depth**: full · **Pre-fill**: enabled (v1 `aidlc-docs/` + the repo) · **Interaction**: batch
**User edits**: none — batch accepted verbatim as pre-filled.

### T1 [CORE] — Runtime environment
**Answer**: **A** — Cloud only. Vercel for the app, Neon for Postgres, Vercel Blob for images. Nothing
self-hosted. The only local runtime is the dev loop and a throwaway Docker Postgres used by the
`test:pg` contract suite.
**Source**: `package.json`, `drizzle.config.ts`, `tests-pg/docker-compose.yml`.

### T2 [CORE] — Cloud provider
**Answer**: **X — Vercel**, with **Neon** (managed Postgres) alongside. Neither is AWS/Azure/GCP from the
project's point of view, though they run on top of them. Google is present only as the OAuth identity
provider, not as a hosting provider.
**Source**: `@neondatabase/serverless`, `@vercel/blob`, `next-auth` Google provider.

### T3 [CORE] — Deployment model
**Answer**: **A** — Serverless. Next.js App Router on Vercel Functions (Fluid Compute), with Edge
middleware for auth and admin-gate checks. Neon's serverless driver runs over HTTP, so there is no
connection pool to manage. No containers in production — the only Docker in the repo is the local pg
test harness.
**Source**: `middleware.ts`, `@neondatabase/serverless`, `next ^15.1.3`.

### T4 — Team size and experience
**Answer**: **One person** — the parent, who is also the only operator and the only authenticated user.
All development is AI-assisted through the AI-DLC workflow; there is no second reviewer, no on-call
rotation, and no separate ops function.

**Binding consequence for all downstream recommendations**: prefer boring, low-maintenance,
zero-ceremony choices. Anything requiring ongoing operational attention (a cluster, a queue broker, a
self-hosted service) is the wrong answer here regardless of technical merit.
**Source**: INFERRED from `personas.md` P0 ("not a developer during day-to-day use") and the
single-account auth model.

### T5 [CORE] — Required languages

| Language | Version | Purpose | Rationale |
|----------|---------|---------|-----------|
| TypeScript | 5.7.x, `strict` | Everything — app, server actions, DB layer, tests, seed/reconcile scripts | Single language across the whole stack; type safety is the main defect filter given there's no second reviewer |
| SQL (PostgreSQL dialect) | PG 16-compatible | Migrations in `src/db/migrations/*.sql`, CHECK constraints | Drizzle generates them, but they're committed and reviewed as real artifacts — the invariants live here |

**Verification performed at validation time** (both claims were asserted in the pre-fill before being
checked, then confirmed):
- `strict` — **CONFIRMED**: `tsconfig.json` has `"strict": true`.
- PG 16 — **CONFIRMED**: `tests-pg/docker-compose.yml` pins `postgres:16-alpine`.

**Note**: no separate "backend language" row. Server Actions mean server code is the same TypeScript as
client code, split by `"use server"` / `server-only` rather than by language.

### T6 — Permitted languages
**Answer**: **B** — None. TypeScript and SQL cover the whole system, and a one-person team has no
capacity to carry a second toolchain. Adding a language would be a real cost with no offsetting benefit
at this size.
**Source**: INFERRED from T4; no other language present anywhere in the repo.

### T7 [CORE] — Prohibited languages

| Language | Reason |
|----------|--------|
| JavaScript (plain `.js`/`.jsx` source) | The type checker is the primary safety net here. Untyped source silently opts out of it. `tsc --noEmit` must stay clean and meaningful. |
| Python | No runtime for it on Vercel in this project, and no reason to add one. Seed/reconcile tooling is already TypeScript via `tsx`. |
| Any second backend language | Would need its own deploy target, dependency management and test setup — unaffordable for a one-person team. |

**Provenance**: these are AI-proposed prohibitions, not observed ones — the repo contains no non-TS
source, so there was nothing to observe. The user accepted all three verbatim, making them declared
constraints.
**Scope**: source code only. Config files (`.mjs`, `.json`) and generated output are exempt.

⚠️ **GAP FOUND DURING VALIDATION — the JavaScript prohibition is not currently enforced.**
`tsconfig.json` sets **`"allowJs": true`**, so plain `.js`/`.jsx` source would compile today without
complaint. The T7 row is therefore a *convention*, not a *mechanism*. Two ways to close it, user's choice:
1. Set `"allowJs": false` — makes the constraint real and fails the build if JS source appears.
2. Leave it and treat T7 as documented intent only.
Not raised as blocking; recorded for the Technical completion gate and carried to `open-questions.md`
as **OQ-T-1**.

**Prohibition-list check** (validation guidance for T7/T10/T12): T7 is non-empty, so the "all three
empty → AI-DLC will reach for its defaults" warning does not apply so far. T10 and T12 are still pending.

---

**Sections T1–T2 Complete** — 2026-08-03T09:36:44Z · 7/33 questions answered.

---

## RESOLUTION — OQ-T-1 (`allowJs`), raised against T7
**Applied**: 2026-08-03T10:35:08Z
**User Input**: "approve and set allowJs to true" → clarified to **"Set it to false — enforce the prohibition"**

**Ambiguity and how it was handled**: the literal instruction was a no-op — `tsconfig.json` already had
`allowJs: true`. The two plausible readings pointed opposite ways (enforce the T7 JS prohibition via
`false`, vs. keep JS permitted and drop the T7 row). No file was edited on a guess; the user was asked
and chose enforcement.

**Change made to the repository** (not just a discovery artifact):
`tsconfig.json` → `"allowJs": false`.

**Pre-change safety check**: searched for `.js`/`.jsx` source outside `node_modules`/`.next`/`.claude` —
**none found**. `postcss.config.mjs` is `.mjs` and is not matched by the tsconfig `include` patterns
(`**/*.ts`, `**/*.tsx`), so it is unaffected.

**Verification performed**: `pnpm typecheck` → **exit 0, clean**.
**Verification NOT performed**: the unit test suite was not run — the user declined that command.
No claim is made here about test status.

**Effect on T7**: the "plain JavaScript source" prohibition is now an enforced mechanism rather than a
convention. `tsc --noEmit` fails if `.js`/`.jsx` source enters the project.
**OQ-T-1 status**: **RESOLVED — do NOT carry to `open-questions.md`.**

---

## Sections T3–T5: Frameworks · Cloud Services · Architecture (part 1) — T8–T14
**Validated**: 2026-08-03T10:35:08Z
**User edits**: none — batch accepted verbatim as pre-filled.

### T8 [CORE] — Required frameworks

| Framework | Domain | Rationale |
|-----------|--------|-----------|
| Next.js 15 (App Router) | Whole app — routing, rendering, Server Actions, middleware | Already the entire application; Server Components keep secrets server-side by default |
| React 19 | UI | Bundled with Next; Server Components are the default, Client Components opt in |
| Tailwind CSS 4 | Styling | Utility-first, no separate CSS build to maintain; shared classes like `.badge-new` live in `globals.css` |
| Drizzle ORM + drizzle-kit | All DB access and migrations | Typed schema is the single source of truth; migrations are committed SQL, reviewable as real artifacts |
| Auth.js / NextAuth v5 | Parent Google OAuth + session | The only auth boundary; `auth()` wraps middleware |
| Zod | Schema validation | Used at the seed boundary and in profile input |
| Vitest | Unit/logic tests | Fast, ESM-native, two configs (default + pg contract) |
| fast-check | Property-based tests | **Required** — PBT is a blocking constraint carried from the Business role |

**Source**: `package.json`, `middleware.ts`, `drizzle.config.ts`, `vitest.config.ts`, `vitest.pg.config.ts`.

### T9 — Preferred frameworks

| Framework | Conditions for Use |
|-----------|--------------------|
| PostHog (`posthog-js` / `posthog-node`) | Already wired. Analytics + session replay, but only under the T11 constraints — replay scoped to the child play area, all inputs masked, parent/admin pages never recorded. |
| `tsx` | Running TypeScript scripts directly (`seed`, `reconcile`). Not for application runtime. |

Nothing else is "preferred but optional" — at one-person scale the T8 list is effectively the whole toolkit.

### T10 [CORE] — Prohibited libraries

| Prohibited | Reason | Use Instead |
|------------|--------|-------------|
| A second ORM or query builder (Prisma, Kysely, TypeORM, raw `pg`) | Two ORMs means two schema sources of truth; the DB invariants (CHECK constraints, atomic contracts) live in the Drizzle schema and its committed migrations | Drizzle ORM + `drizzle-kit generate` |
| `axios` and other HTTP client libs | Bundle weight for zero benefit; Next.js extends native `fetch` with its own caching semantics | Native `fetch` |
| `moment.js` | Large, mutable, long-deprecated | `Intl.DateTimeFormat` / native `Date` |
| `lodash` (whole-package import) | Ships far more than is used; nearly all of it is native now | Native array/object methods |
| Client-side global state libraries (Redux, MobX, Zustand) | The app is Server Components + Server Actions; client-side global state would duplicate server state and invite client/server drift | Server Components for reads, Server Actions for writes, `useState` for genuinely local UI state |
| Any runtime LLM or image-generation SDK in the deployed app | Hard violation of two constraints at once: the $0/month cost cap, and kid-safety (no unreviewed generated content reaches a child) | Offline seeding pipeline only — `seed/cards.json` authored via claude.ai, images generated at seed time |
| Any paid-tier or metered third-party service | Breaks the $0/month cost cap (Business Q9/Q10) | Free-tier services only; raise as an open question first if a need arises |

**Validation**: every row carries BOTH a reason and a recommended alternative — passes the T10 rule.
**Design note**: the last two rows deliberately restate the $0-cost cap and the kid-safety rule as
*library-level* prohibitions. A stated budget constraint is easy for an agent to overlook; a named
prohibition is not.

### T11 — Cloud services allow-list

| Service | Constraints / Notes |
|---------|---------------------|
| Vercel (hosting, Functions, Edge middleware) | Free tier. Production deploys only from the approved flow; no new paid add-ons. |
| Neon Postgres | Free tier. Migrations 0000–0006 applied to prod — new migrations must preserve `collections`, `children` and `cards` data (QB2 item 1). |
| Vercel Blob | Free tier. Stores the 300 card images. Written by the seeding pipeline, never at runtime. |
| Google OAuth (identity only) | Parent sign-in with an email allowlist. Identity provider only — not hosting or storage. |
| PostHog | Analytics + error capture. Session replay restricted: enabled only inside the child play area, `maskAllInputs: true`, `recordCrossOriginIframes: false`, off by default so parent/admin pages (including the passcode screen) are never recorded. **Any change to this scoping is a kid-safety decision, not a config tweak.** |
| Pollinations.ai | Seed-time only, never at runtime. Free, no API key. Generates card images offline before parent review. |

### T12 — Cloud services disallow-list

| Service | Reason |
|---------|--------|
| Any metered or paid-tier service | Breaks the $0/month cap, the product's single success metric |
| Managed queues / brokers (SQS, Kafka, Vercel Queues) | Nothing in the app is async across services; adds operational surface a one-person team can't justify (T4) |
| Redis / managed cache (Upstash, ElastiCache) | Three users. No load to cache for, and it adds a second data store to keep consistent |
| Kubernetes / container orchestration | No containers in production; enormous operational overhead for a family app |
| A second database or data store | The Postgres schema holds every invariant protecting the children's collections; a second store splits that guarantee |
| Any runtime AI/image-generation service | Same violation as T10: $0 cost cap + kid-safety |

**Prohibition-list check (T7/T10/T12)**: all three are non-empty. The "AI-DLC will reach for its own
defaults" warning does not apply.

### T13 [CORE] — API style
**Answer**: **X — Next.js Server Actions**, not a conventional API.

The app exposes exactly one HTTP route: `app/api/auth/[...nextauth]/route.ts`, owned by NextAuth. Every
other mutation is a Server Action (`src/features/{trade,pull,rewards,quiz,profiles,admin}/actions.ts`),
called directly from components. Reads happen in Server Components. No public API surface, no OpenAPI
document, no external consumer.

**Constraint implied**: do NOT add REST routes under `app/api/` for internal features. A new route is a
new unauthenticated-by-default surface that must re-implement the checks Server Actions inherit from
`requireParent()` / `requireAdminGate()`.
**Source**: `app/api/` contains only the NextAuth route; 6 `actions.ts` files under `src/features/`.

### T14 [CORE] — Data patterns
**Answer**: **A only** — Relational / SQL.

Postgres holds everything: `themes`, `cards`, `children`, `collections`, `quizCompletions`,
`collectionRewards`. The guarantees protecting the children's data are relational features — CHECK
constraints (`count >= 1`, non-negative ticket columns) and transactional batches for atomic trades.

**Explicitly NOT** B/C/D/E/F: no document store, no key-value store, no search index (300 cards need
none), no cache (three users), no event log. Blob holds card *images* — object storage for static
assets, not a data pattern the app queries.
**Source**: `src/db/schema.ts` (6 tables), migrations 0000–0006.

---

**Sections T3–T5 (part) Complete** — 2026-08-03T10:35:08Z · 14/33 questions answered.

---

## Sections T5–T6: Architecture (part 2) · Security — T15–T21
**Validated**: 2026-08-03T11:06:20Z
**User edits**: none — batch accepted verbatim as pre-filled.
**Note**: Security Baseline is a BLOCKING constraint carried from Business Q9, so T17–T21 are hard rules
for all future work, not preferences.

### T15 — Messaging / integration patterns
**Answer**: **A** — Synchronous only, and there are no "services" as such. Single deployable Next.js app:
Server Components read, Server Actions write, both in-process. The only network hops are Neon (HTTP
driver), Vercel Blob, Google OAuth, PostHog.
**Constraint**: no queue, no broker, no background worker, no cron-driven async. If future work appears
to need one, re-examine the design first — at three users there is no throughput problem async solves.

### T16 — Project structure conventions
**Answer**: **C** — Single repo, single app, organised by **feature module** with a deliberate
persistence seam.

- `src/features/<feature>/` — one directory per feature (trade, pull, binder, quiz, rewards, admin,
  profiles, card, pool, auth, sound, anim, ui, actions). Within a feature: `actions.ts` (`"use server"`
  entry points), pure logic modules, components.
- `app/` — routing only. Pages stay thin and delegate to feature modules.
- `src/db/` — schema, migrations, pg adapters. **The only place `import "server-only"` lives.**
- **The Store seam**: services accept **ports** (`ChildStore`, `CollectionStore`, `RewardStore`,
  `QuizStore`, `Catalog`) rather than importing the `db` singleton. Two adapters per port — pg for prod,
  in-memory fake for tests. Feature services are built by factories (`makeTradeService(deps)`) binding
  ports once; prod wires a singleton, tests construct with fakes.
- **Contract suite** — one shared property-based conformance spec runs against BOTH adapters (fake in
  Vitest, pg in `test:pg`) proving they agree on the atomicity contracts.

**Constraints implied**: keep pure logic separate from persistence so it is testable without a database;
do not reach for the `db` singleton inside a feature service; new persistence operations get a port
method rather than an inline query.
**Source**: `CONTEXT.md` + `src/features/`, `src/db/`, `tests-pg/`.

### T17 [CORE] — Authentication method
**Answer**: **A — Google OAuth2/OIDC via Auth.js (NextAuth v5)**, with two layers on top:

1. **Fail-closed parent allowlist** — the `signIn` callback returns `isAllowlistedParent(user.email)`, so
   a non-allowlisted Google account never receives a session. Denied at authentication, not filtered
   later. Source of truth: `PARENT_EMAILS`.
2. **Admin passcode gate** — `/admin/*` requires a second factor beyond parent sign-in: an HMAC-signed,
   20-second sliding cookie (`ADMIN_PASSCODE` → `makeToken`/`verifyGateToken`, signed with `AUTH_SECRET`).
   Enforced in middleware AND re-checked in pages via `requireAdminGate()`.

**Child profile selection is NOT authentication** — an httpOnly cookie re-validated against the DB, never
to be treated as a security boundary (QB2 item 5).
**Standing rule — defence in depth**: middleware gates, and pages re-check with `requireParent()` /
`requireAdminGate()`. Never rely on middleware alone.
**Source**: `src/auth/config.ts`, `middleware.ts`, `.env.example`.

### T18 — Encryption
**Answer**: **A** — everything at rest and in transit, though almost entirely inherited rather than
implemented.
- **In transit**: HTTPS throughout on Vercel; `DATABASE_URL` carries `sslmode=require`; Blob and PostHog
  over HTTPS.
- **At rest**: provided by the managed services (Neon, Vercel Blob). The app stores no secrets in the
  database and writes nothing to local disk.

⚠️ **Confidence marker**: the at-rest claim describes the managed platforms' standard behaviour and is
**INFERRED, not repo-verified** — it is not the kind of fact a repository can demonstrate. Recorded
distinctly so it is not mistaken for a checked fact.
**Also**: no field-level encryption, and none needed — no passwords stored (OAuth only), no payment data,
no PII beyond child display names and a parent email.
**T18 + T21 cross-check**: T21 = E (none), so the HIPAA/encryption contradiction rule does not apply.

### T19 — Input validation approach
**Answer**: **C — both**, with the split stated precisely because the strongest guarantee is not schema
validation at all.

- **Zod schema validation** where structured user input enters: `profileSchema` (name trimmed, 1–40
  chars; avatar constrained to `AVATAR_KEYS`) and the seed-file schema (`src/features/pool/seed-schema.ts`).
- **Application-layer authorization guards on every Server Action**: `withActiveChild`,
  `requireParent()`, `requireAdminGate()`.
- **The real protection — the client never asserts identity.** The active child is resolved server-side
  from the cookie and re-validated against the DB. In `getTradeBoardAction` the client says who to trade
  *with*, never who it *is*. This structurally removes the largest class of input-tampering attacks
  rather than validating against them.
- **Server-authoritative offers** — HMAC-signed, expiring tokens pin the exact cards a claim may award,
  so a tampered claim cannot request an un-offered card (QB2 item 3).

⚠️ **Honest gap, recorded deliberately**: Zod covers profile input and the seed file — **not every Server
Action argument**. Most other inputs are IDs that are authorized rather than schema-checked. Defensible
given server-resolved identity, but this is NOT "schema validation at every boundary" and must not be
recorded as if it were.
**Source**: `profiles/service.ts`, `trade/actions.ts`, `pool/seed-schema.ts`.

### T20 [CORE] — Secrets management
**Answer**: **C** — Vercel-managed environment variables, pulled locally with `vercel env pull .env.local`.

- Server-only secrets: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `PARENT_EMAILS`,
  `ADMIN_PASSCODE`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`.
- Deliberately public (`NEXT_PUBLIC_` prefix): PostHog project token and host — public by design.

**Standing constraint, verified every increment**: no secret may reach the client bundle. `ADMIN_PASSCODE`
and `AUTH_SECRET` are server-only; the admin gate ships a *signed cookie*, never the passcode.

**Verification performed at validation time** (claim asserted in the pre-fill, then checked):
`.env.local` is gitignored — matched by three patterns in `.gitignore` (`.env*.local`, `.env*`,
`.env.local` at line 32) — and `git ls-files` confirms it is **not tracked**. `.env.example` is
explicitly re-included via `!.env.example`. **CONFIRMED.**

### T21 — Compliance framework
**Answer**: **E — None.** Private family application: one parent account, three child profiles, no
third-party users, no payment data, no health data, no public sign-up. The parent is simultaneously the
operator, the data controller and the children's guardian.

⚠️ **Reasoning dependency worth preserving**: this holds *because the app is private*. A children's
service collecting personal information from under-13s **publicly** would engage COPPA (US) and
equivalents such as the UK Age Appropriate Design Code. Nothing to act on now, but "make it public" or
"let other families sign up" is a **compliance decision, not a feature**. This is independently why T12
lists multi-tenancy as **Never**, and why the PostHog replay scoping in T11 matters.
**Provenance**: INFERRED — no compliance framework is named anywhere in v1 or the repo. AI reasoning,
accepted verbatim by the user, not a previously recorded decision.
**Collector note**: because T21 = E (no framework selected), the "ensure T17–T20 align with the chosen
framework" reminder does not apply.

---

**Sections T5–T6 Complete** — 2026-08-03T11:06:20Z · 21/33 questions answered.

---

## Sections T7–T8: Testing · Example Code Patterns (part 1) — T22–T27
**Validated**: 2026-08-03T11:12:15Z
**User edits**: T25 switched to reading (ii) by chat instruction — *"fill 25 as ii. will automate later on."*
T22–T24, T26–T27 accepted verbatim as pre-filled.

### T22 [CORE] — Test types required
**Answer**: **A, B, C, and X — property-based.**
- **A Unit**: 41 files under `tests/`, `pnpm test` (Vitest, node env, no DB needed).
- **B Integration**: `pnpm test:pg` runs store adapters against real Postgres 16 in Docker via a local
  Neon HTTP proxy (`tests-pg/`, 5 adapter suites, serial, 30s timeout).
- **C Contract**: not Pact-style, but a genuine contract suite — `tests/contracts/` (5 conformance specs)
  run against BOTH adapters (in-memory fake in Vitest, pg adapter in `test:pg`) proving they agree on the
  atomicity contracts (`spendOne` null-on-guard-fail, `clampedGrant` floors at 0, `swapCards`
  all-or-nothing).
- **X Property-based — REQUIRED and BLOCKING**: ~14 `*.pbt.test.ts` files covering logic where a wrong
  answer costs the children real cards — logic, sacrifice, trade-logic, offer, signed-token, gate-token,
  auth-policy, quiz-cap, quiz-offer, quiz-math-gen, collection-reward, rarity-filter, pull-categories,
  easter-egg.

**Explicitly NOT required, with reasons**: D end-to-end (no browser harness; the manual visual check
covers it), E performance/load (three users — no load exists), F SAST/DAST (no public attack surface;
behind a Google allowlist).

### T23 — Coverage targets
**Answer**: **D** — no numeric target. **No coverage tooling is configured at all**: neither vitest
config sets `coverage`, and no provider is installed. Verified in `vitest.config.ts`,
`vitest.pg.config.ts`, `package.json`.

**Recorded as a deliberate position, not a gap.** The bar is behavioural rather than numeric:

> Every invariant that protects the children's data must be covered by a property-based test or a
> contract test — ticket arithmetic, duplicate accounting, trade atomicity, offer signing, sacrifice
> eligibility, rarity weighting, quiz caps.

Rationale: a line-coverage percentage can be satisfied without ever asserting an invariant holds across
the input space. The existing 14 PBT files already meet the behavioural bar. AI recommended against
adding a number for its own sake; user did not request one.

### T24 — Tooling per test type

| Test Type | Tool |
|-----------|------|
| Unit | Vitest 2 (`pnpm test`, node environment, `tests/**/*.test.ts`) |
| Property-based | fast-check 3, via Vitest (`tests/**/*.pbt.test.ts`) |
| Integration (real DB) | Vitest with `vitest.pg.config.ts` (`pnpm test:pg`) against Postgres 16 in Docker + `local-neon-http-proxy`; `fileParallelism: false` because the DB is shared |
| Adapter contract | One shared conformance spec in `tests/contracts/`, run against the in-memory fake AND the pg adapter |
| Type checking | `tsc --noEmit` (`pnpm typecheck`) — with `allowJs: false` as of this session, so untyped source cannot slip in |
| Local DB lifecycle | `pnpm pg:up` / `pnpm pg:down` (docker compose; applies all migrations in order) |

### T25 — CI/CD gates  ⚠️ USER DECISION: reading (ii)
**User instruction, verbatim**: *"fill 25 as ii. will automate later on."*

**Observed fact**: there is **no automated CI**. `.github/workflows/` does not exist. The gates recorded
in every increment of `aidlc-state.md` ("typecheck clean, 206/206 tests, build ✅") are real but **run
manually**; nothing enforces them and nothing blocks a deploy that skipped them.

**Recorded answer — (ii) declared intent to automate**: the required gates are
**A (unit tests) + B (integration tests) + typecheck + build**, with `pnpm test:pg` when the persistence
layer changes. **No code review** (single developer, T4). **No security scanning** (per T22 — F not required).

These are the gates that **must** pass. The intent is to enforce them via a GitHub Actions workflow on
push/PR. **Not yet implemented — the user has deferred the work ("will automate later on").**

**Why this matters specifically here**: Property-Based Testing is a **BLOCKING** constraint carried from
Business Q9. Until automation exists, that blocking rule is enforced only by the developer's own
discipline. This is a known, accepted state — not an oversight.
**Carried to `open-questions.md` as OQ-T-2.**

### T26 — Example endpoint pattern
**Answer**: **B — point to file paths.** Chosen over pasting snippets so AI-DLC reads live code that
stays correct as the codebase evolves.

- **`src/features/actions/action.ts`** — the single most important file to read before writing any
  mutation. The one Server Action shape: **gate → run → revalidate**. Exposes `withParent` and
  `withActiveChild` so features compose the guard + `revalidatePath` dance instead of re-inventing it.
  Its own comment: *"the gating and cache-busting policy lives in exactly one place."* Also wires
  `captureServerException`.
- **`src/features/trade/actions.ts`** — a representative feature using it, including the convention that
  the client names who to trade *with*, never who it *is*.

**Constraint for new work**: a new mutation composes `withParent` / `withActiveChild`. It does NOT call
`requireParent()` by hand, and does NOT add an `app/api/` route (T13).

### T27 — Example function / module pattern
**Answer**: **B — point to file paths.** The Store-seam trio, in reading order:

1. **`src/features/trade/trade-service.ts`** — the factory pattern: `makeTradeService(deps)` takes ports,
   binds them once, returns the function cluster. Dependency injection with no DI container — just a
   factory closing over its ports.
2. **`src/features/trade/trade-service.prod.ts`** — production wiring: which concrete adapters bind into
   the singleton.
3. **`src/db/collection-reads.ts`** — an adapter-side read, and where `import "server-only"` belongs.

**Conventions encoded**: pure logic modules take no `db` import so they are testable without a database;
services accept ports rather than reaching for the singleton; a new persistence operation becomes a port
method with two implementations (pg + fake), never an inline query. Action error handling is centralised
in `action.ts` (T26) rather than repeated per feature.

**Path verification performed at validation time**: all six cited paths confirmed to exist on disk —
`src/features/actions/action.ts`, `src/features/trade/actions.ts`, `src/features/trade/trade-service.ts`,
`src/features/trade/trade-service.prod.ts`, `src/db/collection-reads.ts`, `tests/contracts/` (5 files).
A "point to a file" answer is worthless if the pointers are wrong, so they were checked rather than assumed.

**T26–T29 skip-risk rule**: T26 and T27 are answered B, not C. The "all four skipped → AI-DLC code quality
drops significantly" warning does not apply so far. T28–T29 pending.

---

**Sections T7–T8 (part) Complete** — 2026-08-03T11:12:15Z · 27/33 questions answered.

---

## Sections T8–T9: Example Code (part 2) · Existing System — T28, T29, TB1–TB4
**Validated**: 2026-08-03T11:16:45Z
**User edits**: none — batch accepted verbatim as pre-filled.

### T28 — Example test pattern
**Answer**: **B — point to file paths.** Three files, because there are three genuinely different test
shapes:

1. **`tests/sacrifice.pbt.test.ts`** — the property-based shape. Convention: **arbitraries are named
   helpers** (`cardArb(i)`, `poolArb`) rather than inlined, so generators compose and read like domain
   vocabulary. The pattern for any logic where a wrong answer costs the children real cards.
2. **`tests/contracts/child-store-contract.ts`** — the conformance-spec shape, and the most distinctive
   convention in the repo: an **exported function** `runChildStoreContract(makeStore)` rather than a bare
   `describe` block, so one spec executes against both adapters. Explicit caller contract:
   *"`makeStore(seed)` must return a FRESH, isolated store each call."*
3. **`tests-pg/child-store.pg.test.ts`** — how that shared spec is invoked against the real pg adapter,
   with `tests-pg/setup.ts` handling Neon-proxy wiring.

**Constraint for new work**: a new port gets a contract spec in `tests/contracts/` that runs against both
adapters — never two separate test files that can silently drift apart.

### T29 — Example infrastructure snippet
**Answer**: **C — Not applicable.** No infrastructure-as-code exists and none is wanted.
Infrastructure is declared in three non-IaC places: `next.config.ts` (app config), the Vercel dashboard
(project settings, domains, env vars), and `src/db/migrations/*.sql` (the closest thing to declarative
infrastructure, and the one that matters since the children's data lives behind it).
**Rationale**: per T4, Terraform or CDK for a single Vercel project and one Neon database would be pure
operational overhead for a one-person team.

### TB1 [CORE] — Existing stack inventory

| Language / Framework | Current Usage | Direction |
|----------------------|---------------|-----------|
| TypeScript 5.7 (`strict`, now `allowJs: false`) | Entire codebase | Maintain |
| Next.js 15 (App Router) | Whole app — routing, Server Components, Server Actions, middleware | Maintain |
| React 19 | UI layer; Server Components default | Maintain |
| Tailwind CSS 4 | All styling; shared classes in `globals.css` | Maintain |
| Drizzle ORM 0.36 + drizzle-kit 0.28 | All DB access; migrations 0000–0006 applied to prod | Maintain |
| Neon Postgres 16 (`@neondatabase/serverless`) | Primary datastore — 6 tables | Maintain |
| Auth.js / NextAuth 5.0.0-beta.25 | Parent Google OAuth | Maintain — but see note |
| Vercel Blob 0.27 | 300 card images | Maintain |
| Zod 3 | Profile input + seed-file schema | Maintain |
| Vitest 2 + fast-check 3 | 41 unit/PBT files + 5 contract specs | Maintain |
| PostHog (`posthog-js` / `posthog-node`) | Analytics, error capture, scoped session replay | Maintain |
| Pollinations.ai | Seed-time image generation only | Maintain — Workers AI / Flux parked alternative |

⚠️ **Flagged**: `next-auth` is pinned to **`5.0.0-beta.25`** — a beta release sitting on the one true
security boundary in the system. Not a defect (v5 has been in beta a long time and is widely used), but
it is the dependency whose upgrade path deserves attention rather than a routine bump.
**Carried to `open-questions.md` as OQ-T-3.**

### TB2 [CORE] — What must stay unchanged (technical restatement of QB2)

**Database — schema and data**
- `collections` rows — every pull the children have made. Never reset, re-seeded, or dropped. Any
  migration touching `collections`, `children` or `cards` needs an explicit data-preservation plan.
- CHECK constraints — `count_at_least_one` (`count >= 1`, BR9), `pull_tokens_non_negative`,
  `easter_egg_tickets_non_negative`, `epic_tickets_non_negative`, `lucky_tickets_non_negative`.
- `themes.sort_order` — backfilled by migration 0006 to the exact order the children already saw.
- Migrations 0000–0006 — already applied to prod. Never edited in place; only added to.

**Atomicity contracts** (proven by the dual-adapter contract suite)
- `spendOne` returns null on guard failure — no double-spend.
- `clampedGrant` floors at 0.
- `swapCards` is all-or-nothing — a trade must never half-apply.

**Security boundaries**
- The `signIn` fail-closed allowlist in `src/auth/config.ts`.
- The admin passcode gate — middleware AND `requireAdminGate()` in pages. Never collapsed to one layer.
- Child profile selection stays a cookie convenience, never a security boundary.
- HMAC-signed, expiring offers for easter-egg and quiz awards. Award decisions never move to the client.
- No secret in the client bundle. `ADMIN_PASSCODE` / `AUTH_SECRET` stay server-only.

**Config**
- `SACRIFICE_COST = 3` / `SACRIFICE_MIN = 4` remain a single source of truth in
  `src/features/pull/sacrifice.ts`.
- PostHog session-replay scoping (child play area only, `maskAllInputs`, admin never recorded).

### TB3 [CORE] — Prohibited patterns (codebase-specific)
**Answer**: **A** — patterns rather than libraries. The ways an AI agent most plausibly breaks this
codebase while writing perfectly reasonable-looking code:

- Don't import the `db` singleton inside a feature service. Services take ports; bypassing the seam makes
  the service untestable without a database and silently defeats the contract suite.
- Don't add a REST route under `app/api/` for an internal feature. Compose `withParent` /
  `withActiveChild` instead (T13/T26).
- Don't hand-roll `requireParent()` / `revalidatePath()` in an action — that policy lives in exactly one
  place, `src/features/actions/action.ts`.
- Don't trust a client-supplied child identity. The active child is resolved server-side and re-validated
  against the DB.
- Don't hardcode `3` or `4` for sacrifice. Import `SACRIFICE_COST` / `SACRIFICE_MIN`.
- Don't write a test that duplicates a contract spec — new port behaviour goes in `tests/contracts/`.
- Don't introduce client-side global state for data the server already owns (T10).
- Don't add a runtime generation call of any kind into a child-facing path. The kid-safety rule is
  absolute, and this is the prohibition most likely to be violated with good intentions
  ("let's make the card text dynamic!").

**Provenance**: AI-proposed guardrails derived from `CONTEXT.md` and the QB2/TB2 invariants — not
previously recorded rules. Accepted verbatim by the user, making them declared constraints.

### TB4 — Source of example code
**Answer**: **A** — real files, loaded from the repo. Every T26–T28 answer is a file path, and all were
verified to exist during this interview.

**Rationale for A over B**: pasted snippets go stale silently; a path stays correct as the code evolves,
and this codebase is actively changing (22 increments in three weeks).

**Canonical set AI-DLC should load before writing code**:
- `src/features/actions/action.ts` — the Server Action shape
- `src/features/trade/trade-service.ts` + `trade-service.prod.ts` — factory / port wiring
- `src/db/collection-reads.ts` — adapter-side read, `server-only` placement
- `tests/sacrifice.pbt.test.ts` — property-based shape
- `tests/contracts/child-store-contract.ts` — dual-adapter conformance shape
- `CONTEXT.md` — the domain and architecture vocabulary naming all of the above

**Path verification**: all six confirmed present on disk at validation time, plus `tests-pg/setup.ts`,
`tests-pg/child-store.pg.test.ts` and `next.config.ts`.

**T26–T29 skip-risk rule**: T26/T27/T28 = B, T29 = C. NOT all four skipped, so the "AI-DLC code quality
drops ~20%" warning does not apply.

---

**Sections T8–T9 Complete** — 2026-08-03T11:16:45Z
**TECHNICAL INTERVIEW COMPLETE — 33/33 questions answered.**

---

## CROSS-ROLE CHECK — QB2 (Business) vs TB2 (Technical)
**Performed**: 2026-08-03T11:16:45Z
**Purpose**: the join barrier exists to catch vision ↔ constraints contradictions. Checked before the
Technical gate rather than after, so any conflict surfaces while it is still cheap to fix.

| QB2 item (Business) | TB2 coverage (Technical) | Verdict |
|---|---|---|
| 1. Children's collection data above all else | `collections` rows never reset/re-seeded/dropped; migration data-preservation plan required | **Consistent** — TB2 adds the migration-level rule |
| 2. Atomicity contracts | All three restated verbatim (`spendOne`, `clampedGrant`, `swapCards`) + all five CHECK constraints named | **Consistent** — TB2 is more specific |
| 3. Server-authoritative HMAC-signed offers | Restated; "award decisions never move to the client" | **Consistent** |
| 4. `themes.sort_order` is a contract | Restated with migration 0006 provenance | **Consistent** |
| 5. Auth boundary; profile selection is NOT one | Restated, plus the fail-closed `signIn` allowlist and the two-layer admin gate | **Consistent** — TB2 adds the fail-closed detail |
| 6. Kid-safety: no unreviewed content path | Enforced via T10/T12 prohibitions and TB3's "no runtime generation into a child-facing path" | **Consistent** — expressed as prohibitions rather than a QB2-style rule |
| 7. `SACRIFICE_COST`/`SACRIFICE_MIN` single source of truth | Restated; TB3 adds "don't hardcode 3 or 4" | **Consistent** |

**Result: NO CONTRADICTIONS.** TB2 is a strict technical superset of QB2 — every business invariant has a
technical restatement, and the technical role added enforcement detail without weakening any of them.
**Additions TB2 makes beyond QB2** (not conflicts): migrations 0000–0006 never edited in place; the five
named CHECK constraints; PostHog replay scoping.

---
