# Restoring the children's collections

What to do when collection data is lost. Read the **first section** before touching anything —
the right move depends almost entirely on how long ago the damage happened.

---

## 1. How much can be recovered

| Time since the mistake | Recover with | What you lose |
|---|---|---|
| **0–6 hours** | **Neon point-in-time restore** — rewind to the exact second before | ~nothing |
| **6–24 hours** | Last night's dump | up to a day of pulls |
| **1–90 days** | An older nightly dump | up to a day of pulls, from that day |
| **> 90 days** | **Nothing exists** | everything |

**The 6–24 hour band has no point-in-time capability.** Recovery there means restoring last night's
dump and accepting that the day's pulls are gone. That is a known property of the design, not a
surprise — it was the accepted trade-off for a $0/month, zero-upkeep backup.

**Stop writing to the database first.** Every pull, trade and quiz makes the gap between "now" and
"the backup" wider.

---

## 2. Fast path — within 6 hours: Neon PITR

Best available option whenever it applies. It restores *everything*, to the second, with no loss.

1. Neon Console → your project → **Branches** → `main` → **Restore**.
2. Pick a timestamp **just before** the destructive action.
3. Confirm. Neon keeps the pre-restore state as a backup branch, so the restore itself is reversible.

Verified retention on the current (free) plan: **6 hours**. Do not assume it is longer.

---

## 3. Restoring from a nightly dump

### 3.1 Get the dump

GitHub → **Actions** → **backup** → the run for the day you want → **Artifacts** →
`db-backup-<run id>`. Retention is **90 days**.

Pick the last run that finished *before* the damage. Every run verifies itself, so a green run is a
dump that provably restored cleanly at the time it was made.

### 3.2 Look at it before you use it

```sh
gunzip -c dump-YYYYMMDD.sql.gz | grep '^COPY ' | sed 's/ FROM stdin;//'
```

You should see the six `public` tables plus `drizzle.__drizzle_migrations`. Count the collection rows
you are about to restore:

```sh
gunzip -c dump-YYYYMMDD.sql.gz \
  | awk '/^COPY public.collections /{f=1;next} f&&/^\\\.$/{exit} f{n++} END{print n" collection rows"}'
```

### 3.3 Rehearse locally (recommended)

Never let the first real restore be the one that matters.

```sh
docker run --rm -d --name kc-restore -e POSTGRES_PASSWORD=postgres -p 5555:5432 postgres:17
gunzip -c dump-YYYYMMDD.sql.gz | \
  docker run --rm -i --network host -e PGURL=postgres://postgres:postgres@localhost:5555/postgres \
    postgres:17-alpine psql "$PGURL" -v ON_ERROR_STOP=1
docker run --rm --network host -e PGURL=postgres://postgres:postgres@localhost:5555/postgres \
  postgres:17-alpine psql "$PGURL" -c "SELECT count(*) FROM collections"
docker rm -f kc-restore
```

### 3.4 Restore into Neon

**Restore into a new Neon branch, not over production.** A branch costs nothing, keeps the damaged
state available for comparison, and turns "restore" into a decision you can reverse.

1. Neon Console → **Branches** → **New branch** (e.g. `restore-2026-08-06`).
2. Copy its **direct** (non-pooler) connection string.
3. Load the dump:

   ```sh
   gunzip -c dump-YYYYMMDD.sql.gz | \
     docker run --rm -i -e PGURL="<branch connection string>" \
       postgres:17-alpine psql "$PGURL" -v ON_ERROR_STOP=1
   ```

4. Check the numbers look right (`children`, `collections`, `cards`, `themes`).
5. Point the app at the branch by updating `DATABASE_URL` in Vercel, or promote the branch to primary
   in the Neon Console.

The dump is taken with `--no-owner --no-privileges`, so it does not need the production roles to
exist in the target.

---

## 4. What the backup does not cover

- **Card images.** They live in Vercel Blob, not Postgres, and no `pg_dump` includes them. They are
  reproducible from `seed/cards.json` via the seeding pipeline. A restored database points at Blob
  URLs that are still live — image loss is a separate, independent failure.
- **Anything older than 90 days.** Artifact retention is the hard horizon.
- **The 6–24 hour window**, as above — no point-in-time recovery there.
- **Per-child restore.** The dump is whole-database and restores all-or-nothing. Recovering one
  child's cards means restoring everything to a branch and copying rows across by hand.

---

## 5. Keeping the backup alive

- **The schedule stops after 60 days of repository inactivity.** GitHub disables scheduled workflows
  in dormant repositories and emails the repository owner. If this project goes quiet for two months,
  re-enable the workflow from the Actions tab. Nothing else re-arms it.
- **Every run verifies itself.** The workflow restores its own dump into a throwaway Postgres and
  asserts every table is present with exactly the production row count. A failed run means the
  backup is not trustworthy — investigate it rather than waiting for the next night.
- **A failed run is your alert.** GitHub notifies on workflow failure by default. There is no other
  alerting, by design.
- **Take a dump before doing anything destructive.** Actions → backup → **Run workflow**. That is
  what the manual trigger is for.
- **The backup credential is read-only** (`kc_backup_ro`, direct non-pooler endpoint, stored as the
  `BACKUP_DATABASE_URL` secret). If it is ever rotated, update the secret or the next run fails.

---

## 6. Known concentration risk

The source code and every backup live in the same GitHub account. If that account is lost, both go
with it. This was a deliberate scoping decision (offsite copies are out of scope) and is tracked as
**OQ-CS-4**. The threat this backup was built for is operator error, which a single destination covers
completely. If you ever want to reduce it, the cheapest step is downloading one artifact to local or
removable storage occasionally — not a second automated destination.

---

## 7. Prevention — what now stops the common mistakes

- `resetPool()` **refuses to run** when any child owns a card. Deleting cards or themes cascades into
  `collections`, so a pool reset that would destroy the children's cards fails instead of proceeding.
  There is no override flag.
- `pnpm seed --sync` **aborts before writing anything** if it would prune themes or cards, unless
  `--allow-prune` is passed.
- Any destructive seed operation against production prints its blast radius — per child, by name —
  and requires the exact collection-row count typed in at an interactive terminal. It cannot be
  satisfied by an environment variable, a config file or a flag, and it always aborts when there is
  no TTY.
- Removing a child profile requires typing that child's name, with the card count shown.
