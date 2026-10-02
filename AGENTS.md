# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- New card themes follow `seed-content/NEW-THEME-RUNBOOK.md`. Lanes are the registry in `src/shared/pool/providers/index.ts`; no escape hatch is currently registered (ai-horde, the first one, was retired). `supergrok-manual` is an opt-in drop folder (`pnpm seed --supergrok-export`); there is no xAI API key.
- `scripts/seed/index.ts`'s CLI flags are parsed by `scripts/seed/args.ts` (`parseSeedArgs`, strict `node:util parseArgs`). Add a new flag or command there, not via `process.argv.includes` in `main()`/`runSeed()`. Any code that deletes pool rows by a keep-list (prune previews or the real pruners) should share `notKept()` in `src/shared/pool/prune-predicate.ts` rather than re-implementing the empty-keep-list rule. The only commands are `--review` and `--sync` (plus the standalone read-only/export ones) — `--publish`, `--reset` and `--allow-unreviewed` were removed as dead/unsafe; `resetPool`/`previewReset` survive only for `tests-pg` to call directly.
- Prototype scripts live in `archive/prototypes/` (not `scripts/prototypes/`) once retired — run them with `tsx`, not a `pnpm prototype:*` script, which no longer exists.
- Passkey cutover is done: `docs/PASSKEY-CUTOVER.md`'s deploy 2 is cancelled and `ADMIN_PASSCODE` stays (see the decision note at the top of that doc).

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
