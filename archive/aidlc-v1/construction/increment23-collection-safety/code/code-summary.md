# INCREMENT 23 — Code Generation Summary: Collection Safety

**Status**: DONE — awaiting approval at the Code Generation gate
**Date**: 2026-08-06
**Design**: `aidlc-docs/inception/application-design/increment23-collection-safety-design.md`
(D1–D8 all = A)
**Gate results**: `pnpm typecheck` clean · **229/229** unit tests (was 206, +23) ·
**40 passed / 3 skipped** on `pnpm test:pg` (was 34/3, +6) · `pnpm build` ✅ ·
no secret in the client bundle · zero new npm dependencies · no migration · no seed change

---

## 1. What shipped

### New

| File | Purpose |
|---|---|
| `src/features/pool/db-target.ts` | Fail-closed production predicate + `describeTarget`. Pure. |
| `src/features/pool/blast-radius.ts` | `previewReset` / `previewPrune` — what a destructive op would destroy, per child. |
| `scripts/seed/guard.ts` | Blast-radius report + typed confirmation. The only module that prompts. |
| `src/features/profiles/confirm-name.ts` | `namesMatch` — one definition of "typed it correctly". |
| `src/features/profiles/RemoveProfileDialog.tsx` | Type-the-name modal with the card count. |
| `src/features/backup/count-report.ts` | Parse/diff psql counts; no DB driver. |
| `scripts/backup/verify.ts` | Restore-drill assertion; non-zero exit on any difference. |
| `.github/workflows/backup.yml` | Nightly dump → artifact → restore → assert. |
| `docs/RESTORE.md` | Recovery runbook. |
| `tests/db-target.pbt.test.ts` | 7 cases, property-based. |
| `tests/count-report.pbt.test.ts` | 9 cases, property-based. |
| `tests/confirm-name.test.ts` | 6 cases. |
| `tests-pg/pool-writer.pg.test.ts` | 6 cases against real Postgres. |

### Modified

| File | Change |
|---|---|
| `src/features/pool/writer.ts` | `resetPool()` no longer deletes `collections`; added `countCollections()` and `PoolResetBlockedError`; refuses an owned pool, with no override parameter. |
| `scripts/seed/index.ts` | Guards wired; `--allow-prune`; prune decision hoisted above the write loop. |
| `app/admin/profiles/page.tsx` | Reads `adminService.getAdminOverview()` — the owned count already lived there. |
| `src/features/profiles/ProfileRow.tsx` | Forwards `ownedCount`. |
| `src/features/profiles/RemoveProfileButton.tsx` | `window.confirm` → dialog. |

**No file deleted. No port method added. No Server Action, guard, or store contract changed.**

---

## 2. Verified by hand, not just by tests

### Guards, against the local Postgres with an owned pool (2 children, 3 cards, 3 collection rows)

- `previewReset()` → `{themes: 2, cards: 3, collectionRows: 3, perChild: [Ben 2, Mia 1]}` ✅
- `resetPool()` → **BLOCKED**, and `3 collections / 3 cards / 2 themes` still present afterwards ✅
- `previewPrune()` with a seed dropping one theme and one card → correctly identified
  `Dinosaurs`/`T-Rex` and `Animals`/`Snow Leopard`, **2** collection rows, and **excluded the surviving
  card Ben owns**. The preview is precise, not conservative ✅
- `confirmDestructive` on a local target → prints the report, no prompt, resolves ✅
- `confirmDestructive` on a production target with stdin not a TTY → **aborted** ✅

### Restore drill, against real production data

Full pipeline rehearsed exactly as the workflow runs it:

1. production counts captured (7 tables)
2. `pg_dump --no-owner --no-privileges` → **55 KB gzipped**
3. restored into a bare `postgres:17` container
4. counts re-read
5. `verify.ts` → **"Restore verified: every table present, every row count exact. 7 tables, 1159 rows"** ✅

Negative cases also exercised: one row short → fail; an **empty** table missing → fail (the case row
counts alone cannot see); a genuinely broken restore → fail. Every failure exited non-zero.

---

## 3. Three bugs the rehearsal caught in the workflow

Written into the YAML, invisible to typecheck and tests, and all three would have produced a **silently
useless backup job**:

1. **`psql "$PGURL"` expanded in the runner's shell, not the container** — psql would have received an
   empty argument and tried a local socket. Fixed by deferring expansion inside `sh -c '...'`.
2. **The env var was passed as `-e PGURL` while the step set `BACKUP_DATABASE_URL`** — nothing would
   have reached the container. Fixed by naming the step env `PGURL`, which also keeps the value off the
   command line.
3. **`-F $'\t'` produced a literal `\t`** inside the container's POSIX `sh`, so every count line would
   have failed to parse. Fixed with `-F "$(printf "\t")"`.

A fourth was found and avoided: bind-mounting the dump into the container failed on this machine
(Docker path sharing). Replaced with a stdin pipe, which removes the volume from the workflow entirely
and is what the rehearsal proved.

---

## 4. Corrections to the record

- **The delete-site inventory was wrong.** Requirements said "exactly three" `collections`-deleting
  sites; there are **four**. The original grep matched `db.delete` and missed
  `collection-store.pg.ts:32`, where the chain splits across lines. The fourth is `removeCard`'s
  guarded single-row delete at zero copies — scoped, owner-only, and covered by the existing contract
  suite, so **the vectors are unchanged**. Corrected in the requirements document and the state file.
- **`previewReset` grouped by child *name*.** Caught by the pg suite, which seeds two children both
  named `test` and got one line back instead of two. `children.name` has no UNIQUE constraint, so two
  same-named profiles would have collapsed into one under-reported line — in the very number the
  operator is asked to weigh. Now grouped by `children.id`.
- One test property was too loose: a 1-character generated password can appear inside a port number
  (`"2"` in `5432`), failing a "does not contain the password" substring check for no real reason.
  Replaced with structural equality (`describeTarget(url) === "host:port"`), which is the stronger claim.

---

## 5. Requirements coverage

| FR | Where | Verified |
|---|---|---|
| FR1 pool-only reset + owned-pool refusal | `writer.ts` | pg test + manual |
| FR2 no CLI path wipes collections | `writer.ts`, `index.ts` | grep + manual |
| FR3 fail-closed production predicate | `db-target.ts` | PBT (incl. the `includes("localhost")` trap) |
| FR4 blast radius per child | `blast-radius.ts`, `guard.ts` | pg test + manual |
| FR5 typed row-count confirmation | `guard.ts` | manual |
| FR6 non-TTY aborts, no bypass | `guard.ts` | manual |
| FR7 `--sync` aborts before any write | `index.ts` | manual (preview) |
| FR8 `--allow-prune` + typed confirmation | `index.ts`, `guard.ts` | manual |
| FR9 type-the-name + card count | dialog, `confirm-name.ts` | unit tests |
| FR10 schedule + dispatch | `backup.yml` | YAML validated |
| FR11 full dump, v17, direct endpoint, read-only role | `backup.yml` | rehearsed against prod |
| FR12 90-day artifact | `backup.yml` | — (first run) |
| FR13 restore drill, exact equality | `backup.yml`, `verify.ts` | rehearsed end to end |
| FR14 no credential in a public log | `backup.yml` | env-by-name + redaction |
| FR15 runbook | `docs/RESTORE.md` | written |
| FR16 cold-start tolerance | `backup.yml` | retry loop |

**Not covered, by approved decision**: the general "no unowned delete" property test — **OQ-CS-3 stays
open**, and the parent's blocking-PBT constraint remains unmet for the general delete path (Q2=A).

---

## 6. Outstanding before this is real

1. **Add the `BACKUP_DATABASE_URL` secret** (direct non-pooler endpoint, `kc_backup_ro`). The workflow
   cannot connect without it. Value is in the session scratchpad; it is not committed anywhere.
2. **Delete the leftover `neondb_reader`** from the Neon console — console-created, therefore
   `neon_superuser`-equivalent, and unused. Only the owner can remove it.
3. **Watch the first scheduled run**, or trigger it manually, and confirm the drill passed.
4. Visual check of the delete dialog on `/admin/profiles` — needs a Google-authenticated session, so it
   was not run from here.
