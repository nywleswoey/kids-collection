# pg-contract tests

Runs the shared store contracts (`tests/contracts/*`) against the **real** pg
adapters (`src/db/stores/*.pg.ts`) — the second adapter that makes the Store seam
real. `pnpm test` needs no database; this suite does.

Because `swapCards` uses the neon-http-only `db.batch`, the adapters run unchanged
against a local Postgres fronted by a **Neon HTTP proxy** (see `docker-compose.yml`).
Exhaustive property fuzzing runs against the in-memory fake in `pnpm test`; this run
verifies adapter agreement on the concrete contract cases, including the guarded
`db.batch` atomicity.

## Run

```bash
pnpm pg:up      # start postgres + neon proxy, apply migrations (needs docker + psql)
pnpm test:pg    # run the contracts against the pg adapters
pnpm pg:down    # tear the containers down
```

Ports (published by `docker-compose.yml`, matched in `setup.ts`): Postgres `5499`,
proxy `4499`.
