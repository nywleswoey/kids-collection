# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- New card themes follow `seed-content/NEW-THEME-RUNBOOK.md`. Lanes are the registry in `src/shared/pool/providers/index.ts`. `supergrok-manual` is an opt-in drop folder (`pnpm seed --supergrok-export`); there is no xAI API key.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
