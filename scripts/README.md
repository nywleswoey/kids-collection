# `scripts/` - offline CLIs

None of this runs in the web app. Each folder is one `pnpm` script (see
`package.json`). Every entry point starts with a doc comment that is its usage
text; read that first.

| Command | Folder | Does |
|---|---|---|
| `pnpm seed --review` / `--sync` / `--check-urls` / `--check-images` / `--blob-budget` / `--supergrok-export` | `seed/` | The seed pipeline: validate `cards.json`, generate review images per lane, publish picked images to Blob and Postgres. Flags: `seed/args.ts`; one file per command in `seed/commands/`. |
| `pnpm contact-sheet "<Theme>"` | `contact-sheet/` | Subject x provider review grid for one theme. |
| `pnpm supergrok "<Theme>" [--auto\|--auto-video]` | `supergrok-helper/` | The Grok lane: manual clipboard walk, headless `grok` CLI drawing, or legendary animation. |
| `pnpm theme-images "<Theme>"` | `theme-images/` | Grok and Cloudflare lanes concurrently plus an advisory `claude` judge. |
| `pnpm theme-picks "<Theme>"` | `theme-picks/` | Write the judged picks into `cards.json`. |
| `pnpm pokemon-anim` | `pokemon-anim/` | Local, no-AI animation for Pokémon region cards. |
| `pnpm reconcile [--fix [--yes]]` | `reconcile/` | Audit broken sets in the live DB. Read-only until `--yes`. |
| `pnpm backup:verify`, nightly `backup.yml` | `backup/` | Restore-drill row-count checks and the migration gate. Must stay `node:`-only (runs under plain `node`). |

Procedure for a new theme: `docs/NEW-THEME-RUNBOOK.md`. How the lanes are
built: `docs/IMAGE-PIPELINE.md`.

Seed flags and commands are parsed by `scripts/seed/args.ts` (`parseSeedArgs`,
strict `node:util parseArgs`). Add a new one there, not via
`process.argv.includes`.
