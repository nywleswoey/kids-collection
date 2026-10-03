# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- New card themes follow `seed-content/NEW-THEME-RUNBOOK.md`. Lanes are the registry in `src/shared/pool/providers/index.ts`; no escape hatch is currently registered (ai-horde, the first one, was retired). `supergrok-manual` is an opt-in drop folder (`pnpm seed --supergrok-export`); there is no xAI API key.
- `scripts/seed/index.ts`'s CLI flags are parsed by `scripts/seed/args.ts` (`parseSeedArgs`, strict `node:util parseArgs`). Add a new flag or command there, not via `process.argv.includes` in `main()`/`runSeed()`. Any code that deletes pool rows by a keep-list (prune previews or the real pruners) should share `notKept()` in `src/shared/pool/prune-predicate.ts` rather than re-implementing the empty-keep-list rule. The only commands are `--review` and `--sync` (plus the standalone read-only/export ones) — `--publish`, `--reset` and `--allow-unreviewed` were removed as dead/unsafe; `resetPool`/`previewReset` survive only for `tests-pg` to call directly.
- Prototype scripts live in `archive/prototypes/` (not `scripts/prototypes/`) once retired — run them with `tsx`, not a `pnpm prototype:*` script, which no longer exists.
- Passkey cutover is done: `docs/PASSKEY-CUTOVER.md`'s deploy 2 is cancelled and `ADMIN_PASSCODE` stays (see the decision note at the top of that doc).
- `scripts/backup/*.ts` must stay dependency-free (only `node:fs`/`node:crypto`/`node:path`/`node:url`): `backup.yml` runs them with plain `node` (Node 24's built-in type stripping), not `tsx`, so the nightly job needs no `pnpm install` next to `secrets.BACKUP_DATABASE_URL`. A relative import between them needs an explicit `.ts` extension (`tsconfig.json`'s `allowImportingTsExtensions`) because Node's ESM resolver, unlike `tsx`, requires one. `backup.yml` also gates on `drizzle.__drizzle_migrations` vs. `src/db/migrations/meta/_journal.json` (`scripts/backup/check-migrations.ts`) — see CONTRIBUTING.md's Migrations section.
- `tests-pg/db.ts`'s `resetAll()` derives its `TRUNCATE` table list from `src/db/schema.ts` via `drizzle-orm`'s `isTable`/`getTableName` — a new table needs no edit there.
- To warm the browser's image cache for a card ahead of when `CardImage` actually renders it (`src/shared/card/preload-image.ts`), go through `next/image`'s `getImageProps` + `react-dom`'s `preload`, passing the same `width`/`height` `CardImage` will use — never build a `/_next/image` URL by hand, since the query params (size snapping, quality) are next/image's own derived logic. `vitest.config.ts`'s `node` env sets `NODE_ENV=test`, which makes `next/image`'s default loader skip its `images.remotePatterns` hostname check and fall back to Next's *default* `imageConfigDefault` sizes/qualities (not this repo's `next.config.ts` allowlist) — so a test asserting on `getImageProps` output must compare two calls against each other (as `tests/preload-image.test.ts` does), not assert literal `w=`/`q=` values.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
