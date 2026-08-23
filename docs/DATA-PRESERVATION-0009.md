# Data-preservation plan — migration 0009 (`children.archived_at`)

Required by *What Must Not Change* in both `Product-Definition/vision-document.md` and
`Product-Definition/technical-environment.md`:

> Any migration touching `collections`, `children` or `cards` needs an explicit
> data-preservation plan.

Migration 0009 touches `children`. This is that plan. It is written **before** the
migration, per issue #97.

---

## 1. What the migration does

One statement, purely additive:

```sql
ALTER TABLE "children" ADD COLUMN "archived_at" timestamp with time zone;
```

Nullable, no default, no backfill, no constraint, no index. Every existing row keeps
`archived_at = NULL`, which is the encoding of "active" — so the migration is a no-op
for the children's visible state.

**Nothing is dropped, renamed, re-typed or re-seeded.** No other table is altered.
`collections`, `cards`, `quiz_completions`, `collection_rewards` and
`quiz_seen_questions` are untouched.

## 2. What data is at risk, and why the answer is "none"

| Risk | Why it does not apply here |
| --- | --- |
| Column drop / rename loses values | No column is dropped or renamed. |
| A backfill computes the wrong value | There is no backfill. `NULL` is correct for every existing row by construction. |
| A type change truncates | No existing column changes type. |
| A new `NOT NULL` rejects existing rows | The column is nullable. |
| A new CHECK rejects existing rows | No constraint is added. |
| Cascading FK deletes fire | No FK is added or altered. |

The migration cannot fail part-way in a damaging way: a single `ALTER TABLE ADD COLUMN`
of a nullable column is atomic in Postgres and, since PG 11, does not rewrite the table.

## 3. The behaviour change, and why it *increases* preservation

Before 0009, `ProfileStore.remove()` issued `DELETE FROM children`, and the
`ON DELETE CASCADE` on `collections`, `quiz_completions`, `quiz_seen_questions` and
`collection_rewards` destroyed every card that child had ever pulled. That cascade is
pinned in `tests-pg/delete-path.pg.test.ts` (BR14) — correct-as-designed, and exactly
the blast radius *What Must Not Change* exists to prevent.

After 0009 **no application path deletes a `children` row at all.** `remove()` is gone
from the port; the parent-facing action sets `archived_at` and can clear it again.
`collections` rows now survive an operation that previously destroyed them. The
cascade itself is unchanged at the schema level, and is still pinned — a purge remains
possible for a human at the SQL prompt, and disaster-recovery reasoning depends on
knowing what it takes with it.

## 4. Forward plan

1. Rehearse locally against a real Postgres:
   `pnpm pg:down && pnpm pg:up` replays every `src/db/migrations/*.sql` in order from
   an empty database, then `pnpm test:pg` runs the adapter contracts and the
   delete-path suite against it.
2. Take the ordinary pre-migration dump (`docs/RESTORE.md` §3) so the rollback in §5
   has a floor under it. The dump is a belt-and-braces step here, not a dependency —
   §2 is why.
3. Apply to production with `pnpm db:migrate`.
4. Verify (see §6).

Deploy order does not matter. The new code reads `archived_at IS NULL`, which an
un-migrated database cannot answer — so migrate first — but the *old* code ignores the
column entirely, so a migrated database serving old code behaves exactly as before.
There is no window in which either half of a deploy corrupts data.

## 5. Rollback

Reverting the code alone is safe and sufficient: old code never references
`archived_at`, so it treats archived children as active again. That is a visible
regression, not data loss.

If the column itself must go:

```sql
-- Only after reverting to pre-0009 code. Destroys nothing but the archived flag:
-- every child row, and every collection row, remains.
ALTER TABLE "children" DROP COLUMN "archived_at";
```

The only information lost is *which* profiles were archived and when. Capture it first
if it matters:

```sql
SELECT id, name, archived_at FROM children WHERE archived_at IS NOT NULL;
```

## 6. Verification queries

Run after applying. Compare the row counts against the same queries run before.

```sql
-- 1. The column exists, nullable, no default.
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name = 'children' AND column_name = 'archived_at';
-- expect: archived_at | timestamp with time zone | YES | NULL

-- 2. Every pre-existing child is still active and still present.
SELECT count(*) FILTER (WHERE archived_at IS NULL) AS active,
       count(*)                                    AS total
  FROM children;
-- expect: active = total = the pre-migration child count

-- 3. The thing that must not change: every collection row still there.
SELECT count(*) AS collection_rows, sum(count) AS total_copies FROM collections;
-- expect: identical to the pre-migration numbers
```

## 7. Scope note — what deliberately still sees archived children

Two offline paths read `children` without the `archived_at` predicate, both on
purpose:

- `pnpm reconcile` (`scripts/reconcile/index.ts`) — an audit of data that still
  exists. An archived child's collection is still real, and hiding it from the
  auditor would make the audit lie.
- `src/features/pool/blast-radius.ts` — the per-child row counts the seed CLI prints
  before a destructive operation. Those deletes cascade by `child_id` and do not
  care whether a profile is archived, so a filtered blast radius would under-report.

Neither is a screen. `docs/RESTORE.md` is likewise unaffected — a dump captures the
column like any other.

The **write** ports (`ChildStore`, `CollectionStore`) also carry no `archived_at`
predicate. They are reachable only with a child id that came from an already-filtered
read, so the only way to write to an archived child is a page that was rendered before
the archive. That is harmless by construction — nothing is deleted, and a restore
shows whatever landed — with one exception, which is guarded rather than tolerated:
`executeTrade` re-checks that both participants are active. The check happens
atomically within `swapCards` itself (the pg adapter's UPDATE statements join to
`children WHERE archived_at IS NULL`), closing the TOCTOU gap where an archive could
commit between an earlier check and the swap. A trade is the one operation where a
still-active child would give a card away to someone invisible, so the atomic guard
ensures the swap fails cleanly if either participant is archived when it commits.
