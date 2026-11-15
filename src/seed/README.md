# `src/seed/` - the offline seed and image pipeline

Library code behind the `scripts/` CLIs (`pnpm seed`, `contact-sheet`,
`supergrok`, `theme-images`, `theme-picks`, `pokemon-anim`). Nothing in the web
app imports it, and `tests/provider-boundary.test.ts` fails if that changes.

| Area | Files |
|---|---|
| Authoring input | `seed-schema.ts` (zod shape of `cards.json`), `loader.ts`, `url-check.ts` |
| Prompts and keys | `prompt.ts`, `keys.ts` (content-addressed review keys), `manual-brief.ts`, `animated-brief.ts` |
| Image lanes | `providers/` (registry in `providers/index.ts`), `image.ts`, `image-size.ts`, `blank-frame.ts` |
| Review and pick | `review-files.ts`, `bake-off.ts`, `contact-sheet.ts`, `judge.ts`, `judge-table.ts`, `theme-picks.ts`, `cards-json-edit.ts` |
| Publish | `publish-plan.ts`, `completeness.ts`, `writer.ts`, `provenance.ts`, `pool-reads.ts`, `prune-predicate.ts`, `db-target.ts` |
| Audits | `blank-audit.ts`, `blob-budget.ts`, `blast-radius.ts`, `animation-eligibility.ts` |
| Pokémon tables | `pokemon-dex-numbers.ts`, `pokemon-types.ts` |

Pure modules (no `db`, no network) are the default here so `tests/` can cover
them; the few that read the database (`pool-reads.ts`, `writer.ts`) say so in
their header. How it all fits: `docs/IMAGE-PIPELINE.md`. Procedure:
`docs/NEW-THEME-RUNBOOK.md`.
