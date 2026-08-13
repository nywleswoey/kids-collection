---
description: Author and publish a new 30-card theme (category) end-to-end, per seed/NEW-THEME-RUNBOOK.md
argument-hint: <Theme Name>
---

Add the theme **$ARGUMENTS** to the card pool.

Read `seed/NEW-THEME-RUNBOOK.md` in full **before doing anything else**, then follow it step by step. It
is the only authority on how a theme is authored — do not fall back on general knowledge about the seed
pipeline, and do not skip ahead.

If no theme name was given above, ask for one and stop.

Non-negotiables, restated so they cannot be lost mid-run — the runbook has the detail:

- **Exactly 30 cards, pyramid 15 common / 8 rare / 5 epic / 2 legendary.** Schema-enforced.
- **Two human checkpoints, both blocking**: the 30-name list before any JSON is written, and the image
  contact sheet before publishing. Never answer either on the human's behalf; never proceed on silence.
- **`pnpm seed --sync` writes to the production DB and Blob store the children play against.** Only after
  approval. Never pass `--allow-prune`, `--allow-unreviewed` or `--reset`; stop and report instead.
- Branch first, never author on `main`.
