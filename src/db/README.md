# `src/db/` - schema, migrations, stores

| Path | Role |
|---|---|
| `schema.ts` | Drizzle table definitions. The one source of truth for columns. |
| `index.ts` | The `db` client (neon-http). Importing it reads `DATABASE_URL` at module load. |
| `migrations/` | Schema migrations come from `pnpm db:generate`; hand-written migrations also exist (`docs/DATA-PRESERVATION-0009.md` documents one). |
| `stores/` | One port per table group, with a fake and a Postgres adapter (below). |
| `child-reads.ts`, `collection-reads.ts`, `collection-writes.ts` | Loose SQL helpers used by one store or feature each. Prefer adding to a store. |

## Stores

Each store is three files:

```
x-store.ts        the port: an interface the services depend on
x-store.fake.ts   in-memory adapter for unit tests
x-store.pg.ts     Postgres adapter, bound in *.prod.ts wiring
```

The admin passkey code under `src/features/admin/webauthn/` imports
`credential-store.pg` directly; it has no service factory.

Ports today: `child`, `claim`, `collection`, `credential`, `offer-claim`,
`profile`, `quiz`, `reward`, `ticket-grant`, `trade-event`.

Most ports have a contract in `tests/contracts/<x>-store-contract.ts`;
`tests/<x>-store*.test.ts` runs it on the fake and
`tests-pg/<x>-store.pg.test.ts` on real Postgres. `claim` and `offer-claim`
have no contract file: they are exercised through `tests/pull-service.test.ts`
and `tests-pg/pull-idempotency.pg.test.ts`. A behaviour added to a port goes
into its tests first (`CONTRIBUTING.md`).

## Rules that bite

- No `db.transaction`: neon-http has no interactive transactions. Atomic
  multi-table writes are one chained-CTE `db.execute(sql\`...\`)`.
- Inside one CTE statement a table can be written once. Two writes to the same
  table need two statements. Details and examples: `AGENTS.md`, "Sharp edges:
  database".
- Add a table: edit `schema.ts`, run `pnpm db:generate`, apply the new file to
  the shared test Postgres with `psql` (not `pnpm pg:up`), and run
  `pnpm db:migrate` on production before the PR merges.
