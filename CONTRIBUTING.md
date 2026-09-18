# Contributing

## `src/shared/` vs `src/features/`

`src/shared/` holds the leaf/near-leaf modules with zero outbound feature
imports: `pool` (catalog/seed/image pipeline, the foundation layer), `ui`
(AvatarBadge/CenteredModal/ErrorBanner), `sound`, `anim`, and `card`. Anything
under `src/features/` may import from `src/shared/`, but `src/shared/` must
never import from `src/features/`.

`src/features/` holds the true domain features: `admin`, `binder`, `quiz`,
`pull`, `trade`, `profiles`, `auth`, `rewards`. These may depend on each other
and on `src/shared/`.

Both are reached through the same `@/*` alias: `@/shared/...` and
`@/features/...`.

## Which test root to use

This repo runs one spec against multiple adapters, split across three top-level
directories. Each has its own vitest config (`vitest.config.ts`,
`vitest.pg.config.ts`, `vitest.live.config.ts`) whose `include` glob is
anchored to that directory only — do not rename any of the three without
updating its config, `package.json` script, and `.github/workflows/ci.yml` in
the same commit.

- **`tests/`** — unit + property-based (fast-check) tests over pure logic and
  in-memory store fakes. No external services needed. Run with `pnpm test`.
  Required in CI (`fast-gate`).
- **`tests-pg/`** — integration tests that run the same store contracts
  against a real, dockerized Postgres. Run with `pnpm test:pg`. Required in
  CI (`pg-gate`). See `tests-pg/README.md` for setup.
- **`tests-live/`** — opt-in tests against real external image-provider
  endpoints, gated behind `.env.local`. Run with `pnpm test:providers`.
  Deliberately **not** run in CI (quota cost + flakiness by construction).

**`tests/contracts/`** holds the shared behavioral specs — not run directly.
Both `tests/` and `tests-pg/` (and, for the provider contract, `tests-live/`)
import from here and exercise the same contract against a different adapter
(in-memory fake vs. real Postgres vs. real provider). Example: both
`tests/collection-store.pbt.test.ts` and `tests-pg/collection-store.pg.test.ts`
call `runCollectionStoreContract` from `tests/contracts/collection-store-contract.ts`.

When adding a new store or provider method, add/extend its contract in
`tests/contracts/` first, then wire it up from whichever adapter test file(s)
need to cover it.

Never add `--passWithNoTests` to `test`, `test:pg`, or `test:providers` — see
the comment block in `vitest.config.ts` for why.
