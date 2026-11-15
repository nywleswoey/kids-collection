# Project agent memory

Project-intrinsic agent knowledge that should travel with the code: build, test,
architecture and sharp edges. Each bullet is short and points at the file that
holds the detail. Longer background lives in `docs/` and in each folder's
`README.md`.

## Map

| Folder | What lives there | Start at |
|---|---|---|
| `app/` | Next.js App Router routes. Thin: each page calls one feature service. | `app/play/`, `app/admin/` |
| `src/features/` | Domain features (pull, binder, trade, quiz, rewards, profiles, admin, auth, activity). | `src/features/README.md` |
| `src/shared/` | Leaf modules with no feature imports: card UI, sound, anim, ui, and the seed/image pipeline (`pool`). | `src/shared/README.md` |
| `src/db/` | Drizzle schema, migrations, and the store ports with `.fake.ts` / `.pg.ts` adapters. | `src/db/README.md` |
| `src/lib/` | Small cross-cutting helpers: env, domain types, rng, signed tokens, server-action shape. | `src/lib/types.ts` |
| `scripts/` | Offline CLIs: seed, contact-sheet, supergrok, theme-images, theme-picks, pokemon-anim, reconcile, backup. | `scripts/README.md` |
| `tests/`, `tests-pg/`, `tests-live/` | Unit + property tests, dockerised Postgres tests, opt-in live provider tests. | `CONTRIBUTING.md` |
| `seed-content/` | `cards.json` (the authored pool), `provenance.json`, review and drop folders. | `docs/NEW-THEME-RUNBOOK.md` |
| `docs/` | Runbooks: new theme, image pipeline, restore, passkey cutover. | |

Layering rules: `src/shared/` never imports `src/features/` (convention,
`CONTRIBUTING.md`); two rules are enforced by tests: the request path never
reaches an image provider (`tests/provider-boundary.test.ts`) and binder never
imports admin (`tests/binder-admin-boundary.test.ts`).

## How a feature is wired

- A feature's logic is a factory, `makeXService(deps)`, in its service file
  (`service.ts` or `<name>-service.ts` today; PR "one naming rule" unifies these).
  The sibling `*.prod.ts` binds the factory to the Postgres adapters once. Pages
  and server actions import only the `.prod.ts` export.
- Every store has three files in `src/db/stores/`: the port (`x-store.ts`), an
  in-memory fake (`x-store.fake.ts`) and the Postgres adapter (`x-store.pg.ts`).
  Most stores have one contract in `tests/contracts/` that runs against both
  adapters; `claim` and `offer-claim` are covered through
  `tests/pull-service.test.ts` and `tests-pg/pull-idempotency.pg.test.ts`.
- Server actions live in `<feature>/actions.ts` and return the shape in
  `src/lib/actions.ts`.

## Commands

```bash
pnpm typecheck && pnpm test     # fast gate, no services needed
pnpm test:pg                    # needs the tests-pg Docker Postgres (see below)
pnpm dev                        # http://localhost:3000
```

## Sharp edges: database

- **No interactive transactions.** The neon-http driver throws on
  `db.transaction`. A multi-statement atomic write is ONE chained-CTE
  `db.execute(sql\`...\`)`. Examples: `swapCards` in `collection-store.pg.ts`,
  `claim-store.pg.ts`.
- **One write per table per CTE statement.** A later CTE's UPDATE gated on
  `EXISTS(earlier_insert_cte)` into the SAME table matches zero rows (confirmed
  against local Postgres). Insert-to-reserve then update-to-finish therefore
  needs TWO round-trips: `claimAndSpend` + `finishWithCardGrant` in
  `claim-store.pg.ts`, and `claimOffer` in `offer-claim-store.pg.ts`.
- `tests-pg/db.ts`'s `resetAll()` derives its TRUNCATE list from
  `src/db/schema.ts`, so a new table needs no edit there.
- Run `pnpm db:migrate` against production BEFORE merging a PR that adds a
  migration (`CONTRIBUTING.md`, Migrations).

## Sharp edges: the shared test Postgres

**`tests-pg/docker-compose.yml` binds FIXED host ports (5499/4499) as one
Compose project (`kc-pgtest`), shared by every worktree and session on the
machine.**

- Never run `pnpm pg:down`. Avoid `pnpm pg:up` unless you confirmed it is down.
- `pg:up` replays EVERY migration from 0000 with no applied-tracking, so on a
  running container it errors on the first existing table. To apply one new
  migration:
  ```bash
  PGPASSWORD=postgres psql -h localhost -p 5499 -U postgres -d main -v ON_ERROR_STOP=1 -f src/db/migrations/00NN_*.sql
  ```
- A sibling session's `resetAll()` can race your rows, and the proxy's pool
  (20 connections) degrades hard under several sessions. Before trusting an
  isolated, non-reproducing `test:pg` failure (FK violation, ECONNREFUSED,
  count mismatch), re-run that one file alone.

## Sharp edges: pull and claims

- `pull()` (`src/features/pull/pull-service.ts`) is request-idempotent via a
  `pull_claims` row with a fence-guarded "granting"/"done" lease. Do not reorder
  its deduct-then-draw steps without re-reading that file's doc comments.
- `pullAction` prefetches `pull()`'s catalog and owned-ids reads against the
  unvalidated cookie id, concurrently with the gate. See `pull()`'s `prefetch`
  doc comment before changing that.
- Mass draw (5-pack / 10-pack): the allow-list `[1, 5, 10]` lives once in
  `src/features/pull/pack-size.ts` (dependency-free so client components can
  import it) and is enforced in both `pullAction` and `pull()`. One claim row
  spends N tokens (`claimAndSpend`'s `count`); while `status='granting'` its
  `outcome` holds a transient `{packSize: N}` marker that `cleanupFailure` /
  `sweepAbandoned` read to refund the right amount. `finishWithPackGrant`
  pre-aggregates repeated card ids with GROUP BY before the `collections`
  upsert, or Postgres throws "ON CONFLICT affects the same row twice"; the
  "pre-aggregation regression" test in `tests-pg/pull-idempotency.pg.test.ts`
  is the only place that trap is provable. Single pull and pack use SEPARATE
  sessionStorage request-id keys (`pending-request.ts`).

## Sharp edges: server actions and React

- Any `revalidatePath` in a server action re-renders the CURRENT route into the
  action's own response (see `pullAction` in `src/features/pull/actions.ts`).
  If a server component conditionally mounts a client child on a value the
  action just changed, React unmounts it and drops its local state. Gate the
  child's visibility on that prop INSIDE the client component; see
  `SacrificePanel.tsx`.

## Activity log

`src/features/activity/activity-service.ts` merges six sources by `childId`:
`pull_claims` and `easter_egg_claims` (only rows whose `outcome` carries a
`card`), `collection_rewards`, `quiz_completions` (`awarded = true`), and the
append-only `ticket_grants` and `trade_events` tables. **There is no catch-all
event log.** A new "who did what when" fact that is not already a complete,
unpruned row somewhere needs its own append-only table and a write at the call
site. `getActivityLog(null, limit, filter?)` merges every active child. A pack emits one
`card_received` event per CARD (`outcomeCardEntries`).

## Franchise grouping (binder hub and pull picker)

- `themes.provider` (the theme's `cards.json` provider pin, backfilled by
  `upsertTheme` on every `--sync`) is the ONLY grouping signal, and only
  providers in `FRANCHISE_PROVIDERS` (`src/features/binder/franchise.ts`) form
  a tile. Never match on theme name. A new franchise needs only that one entry.
- Synthetic tile ids are `franchise:<key>`; `binder-place.ts`'s `Place` has a
  `{ kind: "franchise"; key }` arm (`?at=pokemon`). `CategoryPicker.tsx`'s
  design-notes comment records why this beat an authored `group` field.
- `MoreGalaxiesModal.tsx` groups the same way through `groupThemesByFranchise`,
  which shares the one private `groupByFranchise` loop with the hub's
  `groupFranchises`. The picker only ever receives `remainingCategories()`, so a
  chip-shown region is never duplicated into the group.

## Seed and image pipeline

Procedure: `docs/NEW-THEME-RUNBOOK.md`. Implementation notes (lanes, the
Pokémon official-artwork escape hatch, `theme-images`, `theme-picks`,
animations, seed CLI flags): `docs/IMAGE-PIPELINE.md`. Two rules worth
repeating here:

- Add a seed flag or command in `scripts/seed/args.ts` (`parseSeedArgs`), never
  via `process.argv.includes`.
- Any keep-list prune shares `notKept()` in `src/shared/pool/prune-predicate.ts`.

## Other

- `scripts/backup/*.ts` must stay dependency-free (`node:` imports only) and
  use explicit `.ts` extensions on relative imports: `backup.yml` runs them with
  plain `node`, not `tsx`, so the nightly job needs no `pnpm install`. It also
  gates on `drizzle.__drizzle_migrations` vs `src/db/migrations/meta/_journal.json`
  (`scripts/backup/check-migrations.ts`).
- Passkey cutover is done. `docs/PASSKEY-CUTOVER.md`'s deploy 2 is cancelled and
  `ADMIN_PASSCODE` stays (decision note at the top of that doc).
- Retired prototype scripts live in `archive/prototypes/`; run them with `tsx`.
  There is no `pnpm prototype:*` script.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session.
Do not repeat what the codebase already shows; point to the authoritative file.
One fact per bullet, a few lines each. Longer material goes in `docs/` or the
folder's `README.md` with a pointer from here.
Prefer rewriting or pruning existing entries over appending new ones.
