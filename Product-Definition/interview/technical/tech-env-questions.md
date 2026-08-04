# Technical Interview — Sections T8–T9 of 9: Example Code (part 2) · Existing System

Progress: `████████▎░` 27/33 questions  ·  ~5 min remaining

**Final Technical batch** — T28, T29 and the four existing-system questions.
Fill in the [Answer]: tags below, then reply with **"ready"**.

> Previous batches (T1–T27): ✅ saved in `tech-env-answers-history.md` — nothing is lost.
> This file shows only the active batch.

**TB2 is the technical counterpart to QB2** from the Business interview. I'll cross-check the two for
contradictions before the join — that's exactly what the join barrier exists to catch.

---

## Question T28: Example test pattern

Include setup/teardown conventions if relevant.

A) Paste a canonical snippet below
B) Point me to a file path
C) Skip — use framework defaults
X) Other

[Answer]:
**B** — three files, because there are three genuinely different test shapes here:

1. **`tests/sacrifice.pbt.test.ts`** — the property-based shape. Note the convention: **arbitraries are
   built as named helpers** (`cardArb(i)`, `poolArb`) rather than inlined, so generators compose and read
   like domain vocabulary. This is the pattern for any logic where a wrong answer costs the children real
   cards.
2. **`tests/contracts/child-store-contract.ts`** — the conformance-spec shape, and the most distinctive
   convention in the repo: an **exported function** `runChildStoreContract(makeStore)` rather than a
   bare `describe` block, so the same spec executes against both adapters. Its contract with the caller
   is explicit — *"`makeStore(seed)` must return a FRESH, isolated store each call."*
3. **`tests-pg/child-store.pg.test.ts`** — how that shared spec is invoked against the real pg adapter,
   with `tests-pg/setup.ts` handling the Neon-proxy wiring.

**Constraint for new work**: a new port gets a contract spec in `tests/contracts/` that runs against
both adapters — not two separate test files that can silently drift apart.
`[from: code — read directly]`

---

## Question T29: Example infrastructure-as-code snippet

(CDK / Terraform / CloudFormation / other)

A) Paste a snippet below
B) Point me to a file path
C) Not applicable — no IaC in scope
X) Other

[Answer]:
**C — Not applicable.** There is no infrastructure-as-code in this project and none is wanted.

Infrastructure is declared in three places, none of which is IaC:
- **`next.config.ts`** — app-level configuration.
- **The Vercel dashboard** — project settings, domains, environment variables.
- **`src/db/migrations/*.sql`** — the closest thing to declarative infrastructure here, and the one that
  actually matters, since the children's data lives behind it.

**Deliberate, per T4**: adding Terraform or CDK for a single Vercel project and one Neon database would
be pure operational overhead for a one-person team. `[from: code — no IaC files anywhere in the repo]`

---

## Question TB1: What's in the existing stack today?

"Direction" examples: Maintain | Upgrade to X | Migrate away | Deprecate.

[Answer]:

| Language / Framework | Current Usage | Direction |
|----------------------|---------------|-----------|
| TypeScript 5.7 (`strict`, now `allowJs: false`) | Entire codebase | **Maintain** |
| Next.js 15 (App Router) | Whole app — routing, Server Components, Server Actions, middleware | **Maintain** |
| React 19 | UI layer; Server Components default | **Maintain** |
| Tailwind CSS 4 | All styling; shared classes in `globals.css` | **Maintain** |
| Drizzle ORM 0.36 + drizzle-kit 0.28 | All DB access; migrations 0000–0006 applied to prod | **Maintain** |
| Neon Postgres 16 (`@neondatabase/serverless`) | Primary datastore — 6 tables | **Maintain** |
| Auth.js / NextAuth 5.0.0-beta.25 | Parent Google OAuth | **Maintain — but see note** |
| Vercel Blob 0.27 | 300 card images | **Maintain** |
| Zod 3 | Profile input + seed-file schema | **Maintain** |
| Vitest 2 + fast-check 3 | 41 unit/PBT files + 5 contract specs | **Maintain** |
| PostHog (`posthog-js` / `posthog-node`) | Analytics, error capture, scoped session replay | **Maintain** |
| Pollinations.ai | Seed-time image generation only | **Maintain** — Workers AI / Flux is the parked alternative |

⚠️ **One thing worth flagging**: `next-auth` is pinned to **`5.0.0-beta.25`** — a beta release sitting on
the one true security boundary in the system. Not a defect (v5 has been in beta a long time and is widely
used), but it's the dependency whose upgrade path deserves attention rather than a routine bump.
`[from: code — package.json; migrations dir; INFERRED direction column]`

---

## Question TB2: Which services, schemas, contracts, or configs must NOT be touched?

[Answer]:

The technical restatement of QB2. Anything here breaks either the children's data or a security boundary.

**Database — schema and data**
- **`collections` rows** — every pull the children have made. Never reset, re-seeded, or dropped. Any
  migration touching `collections`, `children` or `cards` needs an explicit data-preservation plan.
- **CHECK constraints** — `count_at_least_one` (`count >= 1`, BR9), `pull_tokens_non_negative`,
  `easter_egg_tickets_non_negative`, `epic_tickets_non_negative`, `lucky_tickets_non_negative`.
  These are the last line of defence for ticket and duplicate arithmetic.
- **`themes.sort_order`** — backfilled by migration 0006 to the exact order the children already saw.
  A contract, not a convenience.
- **Migrations 0000–0006** — already applied to prod. Never edited in place; only added to.

**Atomicity contracts** (proven by the dual-adapter contract suite)
- `spendOne` returns null on guard failure — no double-spend.
- `clampedGrant` floors at 0.
- `swapCards` is all-or-nothing — a trade must never half-apply.

**Security boundaries**
- The `signIn` fail-closed allowlist in `src/auth/config.ts`. A non-allowlisted account must never get a
  session.
- The admin passcode gate — middleware **and** `requireAdminGate()` in pages. Don't collapse to one layer.
- Child profile selection stays a **cookie convenience, never a security boundary**.
- HMAC-signed, expiring offers for easter-egg and quiz awards. Award decisions never move to the client.
- No secret in the client bundle. `ADMIN_PASSCODE` / `AUTH_SECRET` stay server-only.

**Config**
- `SACRIFICE_COST = 3` / `SACRIFICE_MIN = 4` remain a single source of truth in
  `src/features/pull/sacrifice.ts`, consumed by both the card detail page and the galaxy filter.
- PostHog session-replay scoping (child play area only, `maskAllInputs`, admin never recorded).

`[from: QB2 + code — src/db/schema.ts, migrations, src/auth/config.ts, middleware.ts, CONTEXT.md]`

---

## Question TB3: Which libraries or patterns conflict with your existing codebase?

A) I'll write a bulleted list
B) None beyond the language/library prohibitions already listed in T7/T10
X) Other

[Answer]:
**A** — patterns rather than libraries. These are the ways an AI agent most plausibly breaks this
codebase while writing perfectly reasonable-looking code:

- **Don't import the `db` singleton inside a feature service.** Services take ports. Bypassing the seam
  makes the service untestable without a database and silently defeats the contract suite.
- **Don't add a REST route under `app/api/` for an internal feature.** Compose `withParent` /
  `withActiveChild` instead. A new route is a new unauthenticated-by-default surface (T13/T26).
- **Don't hand-roll `requireParent()` / `revalidatePath()` in an action.** That policy lives in exactly
  one place — `src/features/actions/action.ts`.
- **Don't trust a client-supplied child identity.** The active child is resolved server-side and
  re-validated against the DB. The client says who to trade *with*, never who it *is*.
- **Don't hardcode `3` or `4` for sacrifice.** Import `SACRIFICE_COST` / `SACRIFICE_MIN`.
- **Don't write a test that duplicates a contract spec.** New port behaviour goes in
  `tests/contracts/` so it runs against both adapters.
- **Don't introduce client-side global state** for data the server already owns (T10).
- **Don't add a runtime generation call** of any kind into a child-facing path — the kid-safety rule is
  absolute, and it's the prohibition most likely to be violated with good intentions ("let's make the
  card text dynamic!").

`[INFERRED from: CONTEXT.md architecture vocabulary + the QB2/TB2 invariants. These are AI-proposed
guardrails, not previously recorded rules — cut any you disagree with.]`

---

## Question TB4: For the Example Code Patterns section, where do examples come from?

A) I'll point to real files in the repository (AI-DLC should load them)
B) I'll paste snippets pulled directly from existing files
C) Mix
X) Other

[Answer]:
**A** — real files, loaded from the repo. Every T26–T28 answer is a file path, and all of them were
verified to exist during this interview.

**Why A over B here**: pasted snippets go stale silently. A path stays correct as the code evolves, and
this codebase is actively changing — 22 increments in three weeks. The canonical set AI-DLC should load
before writing code:

- `src/features/actions/action.ts` — the Server Action shape
- `src/features/trade/trade-service.ts` + `.prod.ts` — the factory / port wiring
- `src/db/collection-reads.ts` — adapter-side read, `server-only` placement
- `tests/sacrifice.pbt.test.ts` — property-based shape
- `tests/contracts/child-store-contract.ts` — dual-adapter conformance shape
- `CONTEXT.md` — the domain and architecture vocabulary that names all of the above

`[from: code — all paths verified present]`

---

When you're done, reply with a single word: **ready**

(I'll re-read this file from disk and validate your answers.)
