# INCREMENT 23 — Application Design: Collection Safety

**Status**: AWAITING APPROVAL
**Date**: 2026-08-06
**Requirements**: `aidlc-docs/inception/requirements/increment23-collection-safety-requirements.md`
(FR1–FR16, NFR1–8, 20 acceptance criteria) — APPROVED 2026-08-06
**Schema impact**: none — no migration, no seed change, no new npm dependency

---

## 1. Design scope

Three independent slices in one increment. They share no module.

| Slice | Surface | New pure module | Port change |
|---|---|---|---|
| **A — Seed guards** (V1, V2) | `pnpm seed` CLI | `src/features/pool/db-target.ts` | none |
| **B — Profile-delete confirmation** (V3) | `/admin/profiles` | `src/features/profiles/confirm-name.ts` | none |
| **C — Verified backup** (V5) | `.github/workflows/` | `src/features/backup/count-report.ts` | none |

Untouched by design: every Server Action, `withParent` / `requireAdminGate`, the `ProfileStore` and
`CollectionStore` ports, the atomicity contracts, `onDelete: cascade`, and the entire request path.
**Nothing in this increment runs in the deployed app except slice B's UI.**

---

## 2. Component inventory

### 2.1 New

| Component | Kind | Responsibility |
|---|---|---|
| `src/features/pool/db-target.ts` | pure logic (PBT) | Classify a `DATABASE_URL` as production or local, fail-closed. No I/O. |
| `src/features/pool/blast-radius.ts` | db read | Count what a reset or prune would destroy, per child by name. |
| `scripts/seed/guard.ts` | script-level | Print the report, demand the typed row count, abort on non-TTY. The only module that prompts. |
| `src/features/profiles/confirm-name.ts` | pure logic | `namesMatch(typed, actual)` — the one definition of "typed it correctly". |
| `src/features/profiles/RemoveProfileDialog.tsx` | client component | The type-the-name modal. |
| `src/features/backup/count-report.ts` | pure logic (PBT) | Parse `psql` count output; diff two reports; classify a run pass/fail. No DB driver. |
| `scripts/backup/verify.ts` | script (tsx) | Read two count files, call `count-report`, exit non-zero on any difference. |
| `.github/workflows/backup.yml` | workflow | dump → upload → restore → assert. |
| `docs/RESTORE.md` | runbook | FR15. |

### 2.2 Modified

| Component | Change |
|---|---|
| `src/features/pool/writer.ts` | `resetPool()` drops its `collections` delete and gains the owned-pool precondition (FR1). |
| `scripts/seed/index.ts` | Prune set computed up front; `--allow-prune` flag; guard invoked before any write. |
| `app/admin/profiles/page.tsx` | Reads `adminService.getAdminOverview()` instead of `profileService.listChildren()` — the owned count already exists there. |
| `src/features/profiles/ProfileRow.tsx` | Accepts and forwards `ownedCount`. |
| `src/features/profiles/RemoveProfileButton.tsx` | `window.confirm` → `RemoveProfileDialog`. |

### 2.3 Deleted

- The `window.confirm` call at `RemoveProfileButton.tsx:27`.
- `db.delete(collections)` at `writer.ts:82`.

Nothing else. No file is removed.

---

## 3. Slice A — Seed guards

### 3.1 The cascade problem, restated as design

`themes → cards → collections` are both `ON DELETE CASCADE`, so **any** pool delete destroys the
children's rows. The guard therefore cannot live only at the CLI: a future caller of `resetPool()` would
bypass it. The design puts a hard precondition **in the function** and the operator interaction **in the
script**, which is exactly the altitude split the technical environment demands (*"a port method must
never prompt"*).

```text
scripts/seed/index.ts
  |
  +-- db-target.isProductionDatabaseUrl(process.env.DATABASE_URL)   [pure]
  +-- blast-radius.previewReset() | previewPrune(seed)              [reads]
  +-- guard.confirmDestructive(report)                              [prompts, TTY only]
  |
  v
writer.resetPool()          -- throws if the pool is owned, regardless of caller
writer.deleteThemesNotIn()  -- unchanged
```

### 3.2 `db-target.ts` — pure, property-tested

```ts
/** Hosts that are unambiguously a developer's own machine. Everything else is production. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Fail-closed: a URL that is absent, malformed, or points anywhere other than
 * localhost is production. A false negative silently disables every guard, so
 * the unknown case must resolve to the safe answer.
 */
export function isProductionDatabaseUrl(url: string | undefined): boolean;

/** Host for display in the report; "(unparseable)" when the URL will not parse. */
export function describeTarget(url: string | undefined): string;
```

**Properties to assert** (`tests/db-target.pbt.test.ts`):
- every `LOCAL_HOSTS` member, with any port / user / password / query string, is **not** production;
- every other hostname is production;
- `undefined`, `""`, and arbitrary non-URL strings are production;
- a URL whose *path or query* merely contains "localhost" is still production
  (e.g. `postgres://u@prod.example.com/db?opts=localhost`).

That last one is the property most likely to catch a naive `url.includes("localhost")` implementation.

### 3.3 `blast-radius.ts`

```ts
export interface BlastRadius {
  themes: number;
  cards: number;
  collectionRows: number;                       // the number the operator must type
  perChild: { name: string; rows: number }[];   // FR4 / Q10=A
}

export function previewReset(): Promise<BlastRadius>;
export function previewPrune(seed: Seed): Promise<BlastRadius & {
  themeNames: string[];
  cardNames: { theme: string; card: string }[];
}>;
```

`previewPrune` resolves the *same* predicate the pruners use (`notInArray(name, keepNames)`), scoped per
theme, so the preview cannot drift from the deletion. **D3** covers where this lives.

### 3.4 `resetPool()` — the precondition

```ts
export class PoolResetBlockedError extends Error {}

/**
 * Wipe the card pool. Deletes cards then themes — never collections.
 *
 * Refuses outright when any child owns a card, because both FKs cascade: deleting
 * cards (or themes) destroys collections rows regardless of what this function
 * names. There is deliberately NO override parameter — see "What Must NOT Change".
 */
export async function resetPool(): Promise<void> {
  const owned = await countCollections();
  if (owned > 0) throw new PoolResetBlockedError(...);
  await db.delete(cards);
  await db.delete(themes);
}
```

Because a reset deletes *every* card, "collections rows in scope" is simply "any collections row" — no
join needed, and no way for the check to be subtly narrower than the delete.

### 3.5 `guard.ts` — the only module that prompts

```ts
export async function confirmDestructive(input: {
  operation: "reset" | "prune";
  target: string;            // host, from describeTarget
  isProduction: boolean;
  radius: BlastRadius;
}): Promise<void>;            // resolves on success, throws on refusal
```

- Prints the report (FR4), then: `Type the number of collection rows to destroy (N):`
- Reads **only** from an interactive `node:readline` on a TTY. `process.stdin.isTTY` false → throw
  immediately (FR6). No `--yes`, no env var, no config file — the guard has no other input channel by
  construction, which is stronger than checking for one.
- Non-production targets skip the prompt but still print the report.

### 3.6 `scripts/seed/index.ts` — control flow

```text
loadSeed()
  |
  +-- mode === "publish" && --reset
  |     -> previewReset() -> confirmDestructive() -> resetPool()
  |
  +-- mode === "sync"
        -> previewPrune(seed)                       BEFORE the first write
        -> prunes pending && !--allow-prune  ->  ABORT, nothing written  (FR7)
        -> prunes pending && --allow-prune   ->  confirmDestructive()    (FR8)
        -> then the existing insert/update loop and the existing prune calls, unchanged
```

The only structural change is hoisting the prune *decision* above the write loop. The prune *execution*
stays exactly where it is, so the existing ordering (per-theme cards, then whole themes) is untouched.

### 3.7 Tests

| Test | Where | Why |
|---|---|---|
| production predicate properties (§3.2) | `tests/db-target.pbt.test.ts` | pure, no DB — PBT per NFR3 |
| `resetPool()` refuses an owned pool and writes nothing | `tests-pg/pool-writer.pg.test.ts` | `writer.ts` imports the `db` singleton, so the honest test is against real Postgres — and only a real DB proves the cascade did not fire |
| `resetPool()` on an unowned pool clears cards + themes | same | the permitted path still works |
| prune preview equals what the pruners delete | same | stops the report drifting from reality |

**Note**: this adds a file to `pnpm test:pg`, which is currently run manually at Build & Test.

---

## 4. Slice B — Profile-delete confirmation

### 4.1 The count comes free

`adminService.getAdminOverview()` already returns, per child, `owned: (await
collections.ownedCardIds(c.id)).size` — exactly FR9's number, through an existing port method. The
manage-profiles page switches to that read. **No new port method, no new query, no new service method.**

```text
app/admin/profiles/page.tsx  (server, requireParent + requireAdminGate — unchanged)
  |
  +-- adminService.getAdminOverview()  ->  rows[{ child, balance, easterEggTickets, owned, total }]
  v
ProfileRow(..., ownedCount)  ->  RemoveProfileButton(id, name, ownedCount)
                                    |
                                    +-- opens RemoveProfileDialog
                                          typed name === child name  ->  enable
                                          submit -> removeProfileAction   [UNCHANGED]
```

### 4.2 `confirm-name.ts`

```ts
/** Exact match after trimming surrounding whitespace. Case-sensitive: "Ben" != "ben". */
export function namesMatch(typed: string, actual: string): boolean;
```

Trivial, but it is the whole security value of the dialog, and having it in one tested place stops the
comparison being re-implemented slightly differently in a future component.

### 4.3 Dialog behaviour

- Shows: `Remove {name}? This permanently deletes their collection — {ownedCount} different cards.`
- Text input, delete button `disabled` until `namesMatch`.
- Cancel and `Esc` close without submitting; focus starts in the input.
- On confirm, submits the existing form → `removeProfileAction`. **`withParent` gating, the action, the
  service and the store are untouched** — this is additive friction, never a replacement for
  authorization (NFR2).
- Not a `window.confirm` and not a native `<dialog>` blocking call, honouring the original comment's
  intent while replacing the mechanism.

---

## 5. Slice C — Verified backup

### 5.1 Workflow shape

```yaml
on:
  schedule: [{ cron: "0 18 * * *" }]   # 02:00 SGT (UTC+8)
  workflow_dispatch:
services:
  restore-target: postgres:17          # empty; migrations NOT applied
```

```text
1. wait-for-neon      psql SELECT 1, retried — tolerates idle-suspend (FR16)
2. counts-before      per-table counts from prod            -> prod-counts.tsv
3. dump               pg_dump --no-owner --no-privileges | gzip -> dump.sql.gz
4. upload             actions/upload-artifact, retention-days: 90
5. restore            gunzip | psql into the postgres:17 service
6. counts-after       same query against the restored DB    -> restored-counts.tsv
7. verify             tsx scripts/backup/verify.ts prod-counts.tsv restored-counts.tsv
```

**All client tooling runs from the `postgres:17-alpine` image** (`docker run --rm --network host`)
rather than apt-installing a client on the runner. Production is PostgreSQL 17.10 and a v16 `pg_dump`
refuses to run; pinning the image pins the version exactly, and this is the path already validated by
hand on 2026-08-06.

### 5.2 What "verified" asserts

Two assertions, because they fail for different reasons:

1. **Table-set equality** — the set of `schema.table` names in the restored database equals the set in
   production. Catches a schema falling outside the dump (the drift the no-allowlist rule exists to
   prevent). Immune to concurrent writes, since table existence does not change when a child pulls.
2. **Exact per-table row-count equality** (Q15=A). Catches a truncated or partial dump.

A mismatch of either fails the run. There is deliberately **no tolerance window**: a child pulling a card
in the ~2 s between the count and the dump would fail the run, which is the correct direction of failure —
a visible failure that re-runs, rather than a silent weakening of the assertion. At 02:00 local the
children are asleep; assertion 1 is unaffected by the race regardless.

### 5.3 `count-report.ts` — keeping logic out of YAML (NFR7)

```ts
export interface TableCount { schema: string; table: string; rows: number }

export function parseCounts(tsv: string): TableCount[];
export function diffCounts(before: TableCount[], after: TableCount[]): {
  missingTables: string[];   // in prod, absent from restore
  extraTables: string[];     // in restore, absent from prod
  rowMismatches: { table: string; before: number; after: number }[];
};
export function isClean(d: ReturnType<typeof diffCounts>): boolean;
```

Pure string-and-array work, property-tested: a report always equals itself; any injected row delta is
reported; any removed table appears in `missingTables`. **No `pg` driver** — the prohibited-libraries
rule stands, `psql` produces the numbers, TypeScript compares them.

### 5.4 Credential handling (FR14)

- One secret, `BACKUP_DATABASE_URL`: the **direct, non-pooler** endpoint as `kc_backup_ro`
  (provisioned and verified read-only on 2026-08-06).
- Passed as an env var to each `docker run`, never interpolated into a logged command line.
- `pg_dump` stderr is captured to a file and, on failure, filtered through a redaction pass before
  anything is printed — a `pg_dump` error can echo the connection string, and this repository's Actions
  logs are world-readable.
- `set +x` discipline: no `run:` step echoes a command containing the secret.

### 5.5 `docs/RESTORE.md`

Four recovery bands (0–6 h Neon PITR / 6–24 h last nightly / >24 h–90 d older nightlies / >90 d nothing);
step-by-step restore of an artifact into Neon; the note that **card images are Blob-hosted and outside
any `pg_dump`**, reproducible from `seed/cards.json`; the 60-day scheduled-workflow auto-disable and that
GitHub emails the owner; OQ-CS-4 as an accepted single-account concentration.

---

## 6. Design decisions to confirm

### D1 — Where does the production predicate live?
A) `src/features/pool/db-target.ts` (as designed) — under `@/`, so `tests/` imports it the way every other
   pure module is imported, and Vitest picks it up with no config change
B) `scripts/seed/db-target.ts` — nearer its caller, but `vitest.config.ts` only includes `tests/**` and the
   `@/` alias maps to `src/` only, so a test would need a relative import reaching outside `src`

**Recommended: A** — the predicate is the single point of failure for every guard; it belongs where the
existing PBT convention already reaches.

[Answer]: A

### D2 — How does `resetPool()` decide it is blocked?
A) Any `collections` row at all blocks it (as designed) — a reset deletes every card, so "in scope" is
   "all of them"; one `count(*)`, impossible to make narrower than the delete
B) Join `collections → cards` and count only rows referencing cards that exist — same answer, more SQL
C) Take a parameter so callers can opt out

**Recommended: A**. **C is explicitly rejected**: an override parameter re-arms V1 the moment someone
finds it convenient, which is exactly what the feature's "What Must NOT Change" forbids.

[Answer]: A

### D3 — Where does the blast-radius read live?
A) New `src/features/pool/blast-radius.ts` (as designed) — reads stay out of the writer module
B) Add the counts to `writer.ts` beside the deletes
C) Inline the queries in `scripts/seed/index.ts`

**Recommended: A** — the preview must resolve the *same* predicate as the pruners; a shared module keeps
the report and the deletion from drifting, and C would duplicate the `notInArray` logic in a second place.

[Answer]: A

### D4 — Where does the profile page get the owned count?
A) Switch to `adminService.getAdminOverview()` (as designed) — the count already exists there, computed
   from the existing `ownedCardIds` port method; costs one extra catalog read on an admin-only page
B) Add a `profileService.listChildrenWithCounts()`
C) Add a `CollectionStore.ownedCountsForChildren` port method

**Recommended: A** — reuse over rebuild, and it is the only option that adds no new persistence surface.
The technical environment treats reaching for a new port method here as a signal the guard is at the
wrong altitude, which rules out C.

[Answer]: A

### D5 — What does the drill assert?
A) Table-set equality **plus** exact per-table row-count equality (as designed)
B) Row counts only (the literal reading of Q15=A)
C) Row counts plus a content checksum over `collections`

**Recommended: A** — B alone cannot distinguish "table absent from the dump" from "table legitimately
empty", which is the precise failure the no-allowlist rule exists to prevent. C is deferrable: the row
counts already catch truncation, and a checksum adds a second thing to keep in step.

[Answer]: A

### D6 — Where does the count-comparison logic live?
A) `src/features/backup/count-report.ts` + a thin `scripts/backup/verify.ts` (as designed) — pure,
   property-tested, importable via `@/`, no DB driver
B) Inline `awk` / `diff` in the workflow YAML
C) A TS script using the `pg` driver directly

**Recommended: A**. **C is prohibited** — raw `pg` is on the parent's prohibited-libraries list. B puts
the assertion that guards the children's data into untested shell.

[Answer]: A

### D7 — How is the dialog rendered?
A) New `RemoveProfileDialog.tsx` client component (as designed), with `RemoveProfileButton` reduced to a
   trigger
B) Inline the modal markup inside `RemoveProfileButton.tsx`
C) Expand the profile row in place instead of a modal

**Recommended: A** — keeps the button a button, and the dialog is the thing that will grow an
`archived_at` variant in Increment 24 (OQ-CS-2).

[Answer]: A

### D8 — Does `--reset` keep existing at all?
A) Yes, unchanged in name and purpose; FR1's precondition simply makes it fail against an owned pool (as
   designed). Against production today it aborts — which is the intended outcome
B) Remove `--reset` from the CLI entirely

**Recommended: A** — the flag is still correct for an unowned pool (a fresh database, a local dev reset),
and removing it would push operators toward hand-written SQL, which is less safe, not more.

[Answer]: A

---

## 7. Extension compliance

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **Compliant** | No auth boundary is touched. Slice B is a client-component UX change with `withParent` intact. Slice C adds one read-only credential, never echoed, with redaction on failure paths (§5.4) — necessary because this repository's Actions logs are public (Q1=D). |
| Resiliency Baseline | **Compliant** | FR16's idle-suspend retry (§5.1 step 1). A late backup is acceptable; a silently wrong one is not, hence no tolerance window in §5.2. |
| Property-Based Testing | **Partial, by approved decision** | The production predicate (§3.2) and the count report (§5.3) are pure and property-tested. The general *"no service path deletes an unowned `collections` row"* PBT is **out of this slice** — **OQ-CS-3 stays open**, and the parent's blocking-PBT constraint therefore remains unmet for the general delete path. Approved at Requirements (Q2=A); recorded here so it is not mistaken for compliance. |

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| A future caller re-arms V1 by calling `resetPool()` from new code | The precondition lives in the function, not the CLI (D2=A); no override parameter exists; `tests-pg` pins it |
| The blast-radius report drifts from what is actually deleted | Shared predicate module (D3=A) plus a pg test asserting preview == deletion |
| The production predicate has a false negative | Fail-closed by construction (§3.2) and property-tested against the `includes("localhost")` trap |
| A concurrent pull fails the drill | Accepted (§5.2). Direction of failure is visible-and-retryable, not silent. Table-set equality is immune |
| A new schema silently falls outside the dump | Impossible to do silently: the reader role lacks privileges on a new schema, so `pg_dump` fails loudly; table-set equality is the second net |
| The connection string leaks into a public Actions log | §5.4 — env-var passing, no command echo, redacted stderr, and a read-only role so a leak cannot destroy data |
| Prune preview needs a query per theme | 10 themes, 300 cards, an offline script — no meaningful cost |
| `test:pg` still runs manually | Pre-existing (parent OQ-T-2); noted, and CI gates are explicitly out of scope (Q19=A) |
| The contract suite runs on PG16 while prod is PG17 | Pre-existing drift, recorded in the requirements' write-backs; out of scope here |
