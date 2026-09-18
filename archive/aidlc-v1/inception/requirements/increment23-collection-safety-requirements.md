# INCREMENT 23 — Requirements: Collection Safety

**Status**: AWAITING APPROVAL
**Date**: 2026-08-06
**Type**: Brownfield — defect correction (V1) + guards (V2, V3) + new capability (verified backup)
**Cadence**: LIGHT-MEDIUM (single increment)
**Schema impact**: **None** — no migration, no seed change, no new npm dependency
**Source**: `Product-Definition/features/collection-safety/` (aidlc-discovery, 2026-08-05).
Parent `Product-Definition/{vision-document,technical-environment}.md` (2026-08-03) **not superseded**.
**Answers**: Q1=D, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A, Q8=A, Q9=A, Q10=A, Q11=A, Q12=A, Q13=A,
Q14=A, Q15=A, Q16=A, Q17=A (SGT UTC+8 → 02:00 local), Q18=A, Q19=A, Q20=A, Q21=A, Q22=A
**Open questions carried forward**: OQ-CS-2 (soft-delete → Increment 24), OQ-CS-3 (general delete-path
PBT, stays open), OQ-CS-4 (single vendor, accepted)

---

## 1. Intent Analysis

| | |
|---|---|
| **Request type** | Defect correction (V1) + Enhancement (V2, V3 guards) + New capability (backup + verified restore) |
| **Scope** | `src/features/pool/writer.ts`, `scripts/seed/index.ts`, a new pure guard module, `src/features/profiles/RemoveProfileButton.tsx`, `app/admin/profiles/page.tsx`, NEW `.github/workflows/backup.yml`, NEW `docs/RESTORE.md`, new tests |
| **Complexity** | Moderate. One new runtime surface (a scheduled GitHub Actions workflow). **Nothing is added to the deployed request path.** No schema change, no new port method |
| **Requirements depth** | Standard |
| **User Stories** | **SKIPPED** (Q18=A) — no new persona, no new child-facing journey. The children never see this feature; success here is invisible to them by definition |

---

## 2. Grounding facts (verified in code, 2026-08-05/06)

### The vectors, confirmed

- **V1** — `resetPool()` `[writer.ts:81-85]` runs `db.delete(collections)` → `db.delete(cards)` →
  `db.delete(themes)`, called from `[scripts/seed/index.ts:71-73]` on `--publish --reset`, with no
  confirmation, dry-run or environment check. `pnpm seed` loads `.env.local` `[package.json:20]`, which
  holds the production Neon URL.
- **V2** — `--sync` prunes via `deleteCardsNotIn` / `deleteThemesNotIn` → `pruneNotIn` `[writer.ts:14-23]`,
  at `[scripts/seed/index.ts:149-165]`.
- **V3** — `window.confirm` `[RemoveProfileButton.tsx:27]` → `removeProfileAction` →
  `pgProfileStore.remove` → `db.delete(children)` `[profile-store.pg.ts:38]`.
- **V4** — migrations 0000–0006 applied to prod; no mechanism prevents a destructive 0007.
- **V5** — no backup of any kind; `.github/` does not exist.

Whole-repo inventory of `collections`-deleting code (excluding migrations) — **corrected at
Construction, 2026-08-06**: **four sites**, not three. The original grep matched `db.delete` and so
missed a chain split across lines.

| Site | Shape | Bulk? |
|---|---|---|
| `writer.ts:82` (`resetPool`) | unscoped `db.delete(collections)` | **yes — V1** |
| `writer.ts:21` (`pruneNotIn`) | deletes cards/themes; reaches `collections` by cascade | **yes — V2** |
| `profile-store.pg.ts:38` (`remove`) | deletes one `children` row; cascades | **yes — V3** |
| `collection-store.pg.ts:32` (`removeCard`) | single `(child, card)` row, guarded by `held >= minHeld`, deleting only when copies reach 0 | no — scoped, owner-only |

Only the first three can destroy rows the caller does not own, so the vectors themselves are unchanged.
The fourth is the atomicity contract working as designed (`count >= 1` is a CHECK, so zero copies means
row absence) and is covered by the existing dual-adapter contract suite.

### ⚠️ Finding that reshapes FR1: the split alone does not work

`cards.theme_id → themes.id` is `onDelete: cascade` `[schema.ts:43]` and
`collections.card_id → cards.id` is `onDelete: cascade` `[schema.ts:84]`.

**Therefore `db.delete(themes)` alone destroys every `collections` row**, through two cascade hops, and
so does `db.delete(cards)`. Removing line 82 from `resetPool()` changes *nothing* about its blast
radius — it only removes the word `collections` from the source.

The feature vision calls this item *"the only item that makes a total wipe structurally impossible
rather than merely harder."* To actually be that, the function must **refuse to run when the pool it is
about to delete is owned**. FR1 below is written that way. This is a strengthening of the vision's
intent, not a change of scope — flagged here because it is a decision made at Requirements stage and
should be confirmed at this gate.

The same cascade is why FR7's prune guard must run **before** any write, not alongside the prune.

### Prune ordering

Today `--sync` inserts and updates first `[index.ts:92-146]` and prunes afterwards `[149-165]`. Q9=A
("abort before any write") therefore requires the prune set to be **computed up front**, by comparing
`seed/cards.json` against the live DB before the first insert.

### Backup mechanics — **empirically validated against production, 2026-08-06**

A read-only role was provisioned and a real full dump taken end-to-end. Everything below is measured,
not assumed.

- **Production Neon runs PostgreSQL 17.10, not 16.** `pg_dump` 16.3 refuses outright:
  *"aborting because of server version mismatch"*. So the workflow must pin **postgresql-client 17**,
  and the restore drill's throwaway container must be **`postgres:17`**. This also means the drill
  **cannot reuse `tests-pg/docker-compose.yml`'s `postgres:16-alpine`** as originally planned.
  *Pre-existing drift, outside this increment's scope but worth recording*: the `test:pg` contract suite
  runs against PG16 while production is PG17, and both Product-Definition documents state "Neon
  Postgres 16".
- **The database has more than one schema.** At grounding time there were three — `public` (6 tables),
  `drizzle` (`__drizzle_migrations`, migration bookkeeping) and `neon_auth` (9 tables, an unused Neon
  platform feature, **since removed** — see below). A full dump needs `USAGE` + `SELECT` on **every
  schema and its sequences**; granting only `public` failed with *permission denied for schema
  neon_auth*, then *for sequence `__drizzle_migrations_id_seq`*. **Current state: two schemas**,
  `public` and `drizzle`, both covered.
- **A future new schema would break the dump — loudly.** That is the acceptable direction of failure:
  a failed run is visible, a silently-narrowed backup is not. Per-schema `ALTER DEFAULT PRIVILEGES`
  covers future *tables*, not future *schemas*.
- **`--no-owner --no-privileges` is required**, since the dump is restored into a throwaway database
  where `neondb_owner` and the reader role do not exist.
- **Direct (non-pooler) endpoint confirmed working** for `pg_dump` (Q13=A validated).
- **Measured**: full dump = **57 KB gzipped**, ~2 s. Row counts in the dump matched live exactly on all
  six application tables (collections 637, children 3, cards 300, themes 10, quiz_completions 159,
  collection_rewards 43), so FR13's exact-equality assertion is demonstrably achievable. Re-verified
  after the `neon_auth` removal: 55 KB, 7 `COPY` blocks, no permission errors.
- `pnpm pg:up` `[package.json:15]` also applies every migration, which a full-dump restore must not do —
  the drill stands up a bare `postgres:17` container instead. The compose file's `neon-proxy` service
  is not needed either.
- Scheduled workflows auto-disable after 60 days of repository inactivity (accepted, Q16=A).
- Neon free tier may idle-suspend; a cold start must not fail the run.

### The backup role — provisioned 2026-08-06

- **Neon console-created roles are automatically members of `neon_superuser`**, giving them
  INSERT/UPDATE/DELETE on every table. `neondb_owner` holds no ADMIN option on `neon_superuser`, so it
  can neither revoke that membership nor drop such a role — verified by attempting both. **A read-only
  role on Neon must therefore be created via SQL**, not through the console UI.
- `kc_backup_ro` was created via SQL as `neondb_owner`, granted `CONNECT` + per-schema `USAGE`/`SELECT`
  on tables and sequences across `public`, `drizzle` and `neon_auth`, with matching
  `ALTER DEFAULT PRIVILEGES` so tables added by future migrations are covered without anyone
  remembering. `default_transaction_read_only` is set on the role as a second layer; the real boundary
  is the privilege grid.
- **Verified as the role itself**: reads succeed; `DELETE`, `INSERT` and `DROP TABLE` all fail; zero
  role memberships; `has_table_privilege` returns SELECT-only on all six application tables.
- ⚠️ **Left over**: the console-created `neondb_reader` still exists and is `neon_superuser`-equivalent.
  Nothing here uses it. **Only the owner can delete it, from the Neon console** — no SQL available to
  this project can.

### Repository visibility (Q1=D)

`nywleswoey/kids-collection` is **public**. The owner classifies the collection data as **non-sensitive**,
so the dump artifact is stored unencrypted and the repo stays public. The feature's
`technical-environment.md` §Security ("the repo must stay private, and that is now a security property")
and its "2,000 minutes/month" line are superseded — see §8. **The `DATABASE_URL` is not covered by that
reclassification**: Actions logs on a public repo are world-readable, so the credential boundary stands.

**Edge found and closed during Requirements (2026-08-06).** The full-dump rule means new data is
included *automatically* — which cut against Q1=D while the unused `neon_auth` schema existed, since it
carries secret-bearing columns (`jwks.private_key`, `account.access_token` / `refresh_token` /
`password`, `session.token`). They were empty, but enabling Neon Auth later would have started
publishing auth secrets to a world-readable artifact with no signal.

**Resolved by removing Neon Auth**, which nothing in this codebase referenced (authentication is
NextAuth). Verified after removal: the database now holds exactly two schemas, `public` (6 tables) and
`drizzle` (1), and a full dump re-run cleanly at **55 KB gzipped** with 7 `COPY` blocks and no
permission errors. No "assert those tables stay empty" guard is needed in the drill.

What remains true: every table in the dump is app data the owner classifies as non-sensitive, and the
credential — not the dump — is the confidentiality boundary.

### V3 confirmation data

`app/admin/profiles/page.tsx` renders `profileService.listChildren()` — name / avatar / tokens /
tickets, **no card count**. `CollectionStore.ownedCardIds(childId)` is an existing port method
(`pgCollectionStore` already wired into five prod services) giving distinct cards owned. Total copies
including duplicates has no existing read; Q11=A avoids needing one.

---

## 3. Functional Requirements — Prevention

**FR1 — `resetPool()` becomes pool-only and refuses an owned pool.** (V1)
`resetPool()` no longer issues `db.delete(collections)`, and gains a precondition: it counts the
`collections` rows that its deletes would cascade away and **throws without writing anything** when that
count is greater than zero. There is **no override parameter** — a caller that wants both behaviours
does not exist (Q5=A). Rebuilding a pool the children own cards from is done with `--sync`, or by hand
in SQL, never by this function.

**FR2 — No CLI path wipes `collections`.** (Q5=A) No flag on `pnpm seed` has wiping the children's rows
as its purpose or its permitted side effect. `--publish --reset` survives only for an **unowned** pool;
against production today it will fail FR1's precondition, which is the intended outcome.

**FR3 — Production detection is a pure, fail-closed predicate.**
A pure function (no `db`, no I/O) classifies a connection string: a host of `localhost`, `127.0.0.1` or
`::1` is local; **everything else — including an unparseable or absent URL — is production** (Q6=A).
A false negative silently disables every guard, so the predicate defaults to the safe answer.

**FR4 — Blast-radius report before any destructive seed operation.** (Q10=A)
Printed before the confirmation prompt, from live counts: themes to delete, cards to delete, total
`collections` rows to be destroyed, **broken down per child by name**.

**FR5 — Destructive operations against production require a fresh CLI argument *and* a typed
confirmation.** (Q7=A) The typed value is the **exact number of `collections` rows** from FR4's report —
proving the operator read the blast radius. A mismatch aborts. The guard reads **only** from an
interactive prompt; it must never be satisfiable by an environment variable or a config file, since the
failure mode being defended against is a stale value in the very file that supplies the production
credential.

**FR6 — Non-interactive means abort.** (Q8=A) When stdin is not a TTY the run aborts. **There is no
bypass flag of any kind** — a confirmation that can be piped in is not a confirmation.

**FR7 — `--sync` computes its prune set before writing anything.** (V2, Q9=A)
Before the first insert or text update, `--sync` compares `seed/cards.json` against the live database and
determines every theme and card it would prune. If that set is non-empty and `--allow-prune` was not
passed, the run **aborts before any write**, printing FR4's report. Nothing is inserted, updated or
deleted on an aborted run.

**FR8 — `--allow-prune` against production still requires the typed confirmation.** With the flag
present and FR3 saying production, the run prints FR4 and demands FR5's typed row count before
proceeding. The prune itself then executes in the existing order.

**FR9 — Type-the-name profile deletion.** (V3, Q11=A, Q12=A)
`window.confirm` is replaced by an in-page modal on the admin profiles screen showing the child's name
and **the number of distinct cards they own**, with a text input requiring an exact match of the child's
name before the delete button enables. The count comes from the existing `ownedCardIds` port method —
**no new port method** (the feature's technical environment treats reaching for one as a signal the guard
sits at the wrong altitude). `removeProfileAction`, its `withParent` gating and the `ProfileStore` port
are **unchanged**; this is additive friction, never a replacement for authorization.

---

## 4. Functional Requirements — Backup and recovery

**FR10 — Nightly scheduled workflow.** (Q17=A) One GitHub Actions workflow, `schedule: '0 18 * * *'`
(UTC) = **02:00 SGT**, plus `workflow_dispatch` so a dump can be taken on demand immediately before
running anything destructive.

**FR11 — Full dump, no allowlist of any kind.** `pg_dump` with **no `-t` / `--table` and no `-n` /
`--schema`, ever**, gzipped, plus `--no-owner --no-privileges` so the output restores into a database
where the production roles do not exist. It runs against the **direct (non-pooler)** Neon endpoint
supplied by a new Actions secret (Q13=A), as the SQL-created read-only role `kc_backup_ro`, already
provisioned and verified (Q14=A). **`postgresql-client` is pinned to major version 17** — production is
PostgreSQL 17.10 and a v16 `pg_dump` refuses to run at all.

**FR12 — Artifact retention.** The gzipped dump is uploaded as a workflow artifact with 90-day
retention, unencrypted (Q1=D).

**FR13 — Restore drill in the same run.** (Q15=A) The workflow captures per-table row counts from
production at dump time, restores the dump into a throwaway **`postgres:17`** container (bare, **no
migrations applied** — the dump recreates the schema itself), recounts **every table in every schema**,
and asserts **exact equality**. Any mismatch **fails the run**. The drill is not optional and not a
separate job — a dump that cannot be restored must fail the run that produced it. Validated by hand on
2026-08-06: all six application tables matched live counts exactly.

**FR14 — The credential never reaches a public log.** `pg_dump` / `psql` verbose output is suppressed or
redacted so a failure cannot print the connection string into a world-readable Actions log. The dump's
*contents* are public by decision; the credential is not.

**FR15 — Restore runbook.** (Q20=A) `docs/RESTORE.md`, covering: how to restore an artifact into Neon;
Neon PITR at its verified **6-hour** window and what it does and does not cover; the **6–24 h band with
no point-in-time capability** (recovery means last night's dump and losing that day's pulls); the 90-day
horizon beyond which nothing exists; that **card images are Blob-hosted and outside any `pg_dump`**,
reproducible from `seed/cards.json`; that scheduled workflows auto-disable after 60 days of repository
inactivity and GitHub emails the owner (Q16=A); and OQ-CS-4's single-account concentration as an
accepted, recorded risk (Q4=A).

**FR16 — Tolerate a cold database.** A Neon free-tier instance that has idle-suspended must be waited
out, not treated as a failure. A backup that runs late is fine; one that runs silently wrong is not.

---

## 5. Non-Functional Requirements

**NFR1 — No schema change.** No migration, no `seed/cards.json` change, no new npm dependency. The
workflow may install `postgresql-client` on the runner; that is not an application dependency.

**NFR2 — Security.** *(Security Baseline)* The new secret surface is one Actions secret holding a
read-only, direct-endpoint connection string. No application security boundary is touched: the
fail-closed `signIn` allowlist, the two-layer admin gate, child-profile-cookie-is-not-auth, HMAC-signed
offers and "no secret in the client bundle" all stand unchanged. FR9 is a client-component UX change
only. FR14 keeps the credential out of public logs.

**NFR3 — Property-based and pinned tests.** *(Property-Based Testing)*
- FR3's predicate is pure and gets a **property-based test**: every localhost form classifies local;
  every other host, and every malformed input, classifies production. A false negative is the failure
  that silently disables the whole guard layer.
- FR1 gets a test pinning that `resetPool()` leaves `collections` untouched and refuses an owned pool,
  so the split cannot be quietly re-merged (feature T7).
- **Recorded limitation**: the general *"no service path can delete a `collections` row it doesn't own"*
  property test is **not in this slice** (Q2=A). The parent Technical Environment makes PBT blocking, so
  **OQ-CS-3 remains open and unmet** for the general delete path. This is carried deliberately, not
  closed, and should be re-examined rather than inherited.

**NFR4 — Resiliency.** *(Resiliency Baseline)* FR16's cold-start tolerance. Backup **timeliness** is
explicitly not a priority; backup **correctness** is, which is why FR13 fails the run rather than
warning.

**NFR5 — Cost.** Strictly $0/month. Public repos get unlimited standard-runner minutes; artifacts and
Neon PITR are already included. No paid or metered service is introduced.

**NFR6 — Zero touch.** After a one-time manual secret setup, no recurring human step exists. A backup
that depends on remembering something is one that stops happening.

**NFR7 — Minimal YAML and shell.** Logic that can live in a TypeScript script run via `tsx` (the existing
`seed` / `reconcile` pattern) goes there, not into the workflow file.

**NFR8 — No regression.** `pnpm typecheck` clean, the full suite green (206 existing plus new), `pnpm
build` succeeds, no secret in the client bundle.

---

## 6. Acceptance Criteria

1. `resetPool()` contains no `delete(collections)` call, and a test fails if one is reintroduced.
2. `resetPool()` throws and writes nothing when any card in scope is owned by any child.
3. Against the production database today, `pnpm seed --publish --reset` destroys nothing.
4. No `pnpm seed` flag exists whose effect is wiping `collections`.
5. The production predicate classifies `localhost` / `127.0.0.1` / `::1` as local and everything else —
   including malformed input — as production, proven by a property-based test.
6. A destructive run against production prints themes, cards and `collections` rows to be destroyed,
   broken down per child by name, before prompting.
7. That run proceeds only after the exact `collections` row count is typed in; a wrong number aborts.
8. No environment variable, config file or flag can satisfy the confirmation.
9. With stdin not a TTY, a destructive run aborts.
10. `--sync` with pending prunes and no `--allow-prune` aborts **before any insert, update or delete**.
11. `--sync --allow-prune` against production still requires the typed confirmation.
12. Removing a child profile requires typing that child's exact name; the button is disabled until it
    matches, and the dialog shows how many distinct cards will be destroyed.
13. `removeProfileAction` and the `ProfileStore` port are byte-for-byte unchanged in behaviour.
14. The workflow runs on schedule at 02:00 SGT and can be triggered manually.
15. The `pg_dump` invocation contains no `-t` / `--table` **and no `-n` / `--schema`**, uses a v17
    client, and targets the non-pooler endpoint as `kc_backup_ro`.
16. Every run restores its own dump into a throwaway **`postgres:17`** and asserts exact per-table
    row-count equality across all three schemas; an induced mismatch fails the run.
16a. The dump contains `drizzle.__drizzle_migrations` as well as the six `public` tables — proving no
    schema silently fell outside the backup.
17. No connection string appears in the workflow log on either a successful or a failed run.
18. `docs/RESTORE.md` exists and covers the four recovery bands, the Blob-images boundary, and the
    60-day inactivity behaviour.
19. `pnpm typecheck` clean, full suite green, `pnpm build` succeeds.

---

## 7. Out of Scope

Everything in the feature vision's *Features OUT* table, restated:
soft-delete / archive for child profiles (**Increment 24**, OQ-CS-2); the general "no unowned delete"
property test (OQ-CS-3, open); full audit log of deletions; undo / restore UI in the app; per-child
export; versioned snapshots; offsite or second-region copies; alerting when a destructive command runs;
selective per-child restore (the full-dump decision makes restore whole-database, all-or-nothing); card
images in the backup (Blob-hosted, reproducible from `seed/cards.json`).

Additionally out (Q19=A): **CI gates** (`typecheck → test → build`, `test:pg`). This increment creates
`.github/workflows/`, which was parent **OQ-T-2**'s only blocker — the marginal cost of a second
workflow file is now near zero, but adding it is a separate decision.

Also unchanged: the `onDelete: cascade` chain itself, the atomicity contracts, `themes.sort_order`, and
every parent security boundary.

---

## 8. Deltas to `Product-Definition/` (write-backs, not yet applied)

1. **Feature `technical-environment.md` §Security — superseded.** *"Artifacts contain a full copy of the
   production database. Repository visibility is what protects them; the repo must stay private, and that
   is now a security property, not merely a preference"* → the repository is **public**, the collection
   data is classified **non-sensitive** by the owner, and the only confidentiality boundary in this
   feature is the `DATABASE_URL` secret and the public Actions log (Q1=D).
2. **Feature `technical-environment.md` §Cloud Services — factually wrong.** "Private repo … 2,000
   minutes/month included" → public repos get **unlimited** standard-runner minutes; the shared-budget
   caveat against future CI does not apply.
3. **Feature `vision-document.md` — FR1 strengthened.** "Split `resetPool()` so pool reset never deletes
   `collections`" is insufficient on its own because of the two-hop cascade; the function must refuse an
   owned pool. Same intent, real mechanism.
4. **Parent `open-questions.md` — OQ-B-1 RESOLVED** once this ships: Neon PITR at 6 h plus a nightly full
   dump with a 90-day retention and an automated restore drill. Carry the four-band recovery table into
   the parent verbatim.
5. **Parent "What Must NOT Change" — four additions**: a pool reset must never delete `collections` rows;
   destructive seed operations must detect production and require a fresh typed confirmation, never an
   environment variable; the backup must be a full dump with no `-t` allowlist, ever; the restore drill
   runs on every backup run.
6. **Parent risk register**: downgrade *"No known backup / restore path"* from High to the narrower
   residuals (the 6–24 h point-in-time gap, the 90-day horizon, OQ-CS-4); **add** that `DATABASE_URL`
   now also lives as a GitHub Actions secret in a public repository.
7. **Parent OQ-T-2** — unchanged, but its blocker is gone: `.github/workflows/` now exists.
8. **Both documents say "Neon Postgres 16" — production is PostgreSQL 17.10.** The feature document's
   "postgresql-client ≥ 16" is wrong in the direction that matters: a v16 `pg_dump` cannot dump a v17
   server at all.
9. **New risk for the parent register**: the `test:pg` contract suite runs against `postgres:16-alpine`
   while production is PG17. The dual-adapter suite is the mechanism that proves the atomicity contracts
   protecting the children's data, and it is proving them on a different major version than the one that
   holds the data. Out of scope here; recorded because it was found while grounding this increment.
10. **New fact for the parent's data inventory**: the production database contains **two** schemas, not
    one — `public` and `drizzle` (`__drizzle_migrations`). Neither Product-Definition document mentions
    the latter. A third, `neon_auth` (unused Neon Auth platform feature), existed at grounding time and
    **was removed on 2026-08-06** as part of closing the Q1=D edge.

---

## 9. Extension Compliance

| Extension | Enabled | Applicability |
|---|---|---|
| Security Baseline | Yes | **Applicable** — NFR2, FR14 (credential boundary in a public repo, read-only role, no log leakage, app boundaries untouched) |
| Resiliency Baseline | Yes | **Applicable** — NFR4, FR16 (cold Neon tolerated; correctness never traded for speed) |
| Property-Based Testing | Yes | **Applicable but partial** — NFR3 covers FR3's predicate; the general delete-path PBT stays open as **OQ-CS-3**, an unmet blocking parent constraint carried deliberately |

---

## 10. Delivery

Q21=A — build → test → deploy to Vercel production in this increment. The deploy is code-only (no
migration, no seed, no post-deploy step); only FR9 reaches the running app.

**Two manual steps are yours and cannot be automated from here**:
1. Create the read-only Neon role (FR11) and add its **direct, non-pooler** connection string as a
   GitHub Actions secret. Until then the workflow has nothing to connect with.
2. Verify the first scheduled run — including its restore drill — actually passed.
