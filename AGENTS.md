# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.
- Project layout (top-level dirs and what lives where) is documented in `README.md`'s "Project layout" section — treat it as authoritative and keep it current on any top-level move/rename. Notably: AI-DLC v1 history lives at `archive/aidlc-v1/` (not `aidlc-docs/`), and the card/theme seed data lives at `seed-content/` (not `seed/`) — `scripts/seed/` is the unrelated code entry point for `pnpm seed` and was not renamed.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
