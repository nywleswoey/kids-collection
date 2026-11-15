# Image pipeline - implementation notes

How the seed-time card-art lanes are built. The step-by-step procedure for a
new theme is `docs/NEW-THEME-RUNBOOK.md`; this file is the "why is the code
shaped like this" companion that the runbook points at. Nothing here runs in the
web app: the modules live in `src/seed/` and are only reachable from `scripts/`
(`tests/provider-boundary.test.ts` enforces that).

## Lanes

A lane is one registered image provider in `src/seed/providers/index.ts`.
`ai-horde`, the first escape hatch, was retired. Today:

| id | what it does | key |
|---|---|---|
| `cloudflare-sdxl` | draws from the prompt | Cloudflare token in `.env.local` |
| `supergrok-manual` | imports pictures you made in Grok from a drop folder | none |
| `pokeapi-official-artwork` | fetches real official Pokémon art instead of drawing | none |

### `pokeapi-official-artwork` (escape hatch, Pokémon themes only)

- Fetches from PokéAPI's sprites repo for the cards listed in
  `src/seed/pokemon-dex-numbers.ts` (about 540 cards: *Kanto* through
  *Paldea Pokémon* plus each region's "Pokémon 2" part-2 theme, 18 themes over
  nine regions, all via one table with no per-theme code). A region's part-2
  theme never repeats a card name from its part-1 theme or any other theme.
- It reads the Pokémon's name back out of `buildPrompt`'s leading
  `"<Name>, the Pokémon:"` text, because `generate()` only ever receives the
  built prompt string, never `cards.json`.
- Any other theme's card is an honest `ProviderNotDrawn`. A Pokémon-shaped card
  with no table entry is a loud, non-retryable failure, not a silent skip.
- `GeneratedImage.model` carries the exact dex number and source URL fetched (no
  invented model name), so `provenance.json` records it per card.
- Background: `src/seed/pokemon-types.ts` maps each card to a primary
  type and a fixed pastel centre/edge colour pair per type (all 18 types are in
  the palette). `generate()` rasterises an SVG radial gradient at those colours,
  then composites the still-transparent artwork at `MARGIN_RATIO` (0.82) of the
  frame, centred. It never flattens onto white.
- `params.background` carries a version tag (`"type-gradient-v2"`), not a
  literal colour, so bumping the normalisation invalidates old reviews the same
  way a colour change would.
- Every Pokémon theme pins `provider: pokeapi-official-artwork` at theme level
  in `cards.json`, so publishing needs no per-card picks.
- `tests/pokeapi-official-artwork.test.ts` finds the themes it checks by
  filtering `cards.json` on `provider === "pokeapi-official-artwork"`, so a new
  region needs only dex-number and primary-type table entries, no test edit.
- Copyright caveat (Nintendo / Game Freak / The Pokémon Company art, private
  use only): runbook section "The official-artwork escape hatch". Do not use
  this lane outside those themes.

### `supergrok-manual` and `pnpm supergrok`

- There is no xAI API key. `supergrok-manual` is an opt-in drop folder; the
  brief comes from `pnpm seed --supergrok-export`.
- `pnpm supergrok "<Theme Name>"` (`scripts/supergrok-helper/`) scripts the
  hand-drawn side: copies each card's prompt to the clipboard, watches
  `~/Downloads` for the saved picture, moves it into
  `seed-content/supergrok-drop/` under the expected name, then hands off to
  `pnpm seed --review --providers=supergrok-manual` and `pnpm contact-sheet`.
  It reads only `seed-content/cards.json` and never opens `DATABASE_URL`.
  Manual mode never calls Grok or automates a browser. It is the default.
- `--auto` drives the locally installed, signed-in Grok Build CLI (`grok -p`,
  headless) per card instead. That CLI has a built-in image-gen tool and
  reliably saves a square 1:1 image to an exact path when told to (confirmed by
  probing it). `--always-approve` is needed for unattended runs. Same plan,
  naming and resume logic; still no API key or HTTP calls, only the `grok` CLI.

## `pnpm theme-images` - both lanes plus an advisory judge

- `scripts/theme-images/` runs the Grok (`supergrok --auto`) and Cloudflare
  (`seed --review --themes=... --providers=cloudflare-sdxl`) lanes concurrently
  for one theme, reusing both commands unchanged.
- It then judges each card's candidates with the local, signed-in `claude` CLI
  headless (`claude -p`, no API key or SDK): `scripts/theme-images/judge-runner.ts`
  spawns it. The judging logic, `src/seed/judge.ts`, never spawns anything
  itself and caches verdicts by candidate content hash in
  `seed-content/review/<theme-slug>-judge-cache.json`.
- Output: `seed-content/review/<theme-slug>-images-review.html`, a two-column
  advisory table badging the judge's pick. It sits alongside `pnpm contact-sheet`,
  not instead of it. Each row's dropdown can switch the pick, and the page shows
  the exact `theme-picks` command for the current selections.
- Advisory only: nothing is written to `cards.json`, nothing is published.

## `pnpm theme-picks` - record the pick

- `pnpm theme-picks "<Theme Name>" [--use "<Card Name>=<provider>"]...`
  (`scripts/theme-picks/`, runbook Step 8) writes the bake-off pick into
  `cards.json` so nobody hand-edits it. Hand-editing is a documented fallback only.
- Default pick per card: `theme-images`'s judge recommendation, read from its
  cache (never re-invoking `claude`). `--use` overrides any card by name with a
  registered provider id or a short alias (`src/seed/theme-picks.ts`).
- Only the theme's majority provider and a sparse per-card override list are
  written. `src/seed/cards-json-edit.ts` edits just those lines and keeps
  the rest of the file byte-for-byte. Re-running is idempotent and replaces the
  theme's previous picks.
- A card with no recommendation and no override refuses the whole run, by name,
  before any write.

## Animations

### What is eligible

One predicate, `isAnimationEligible` in
`src/seed/animation-eligibility.ts`, gates both `--review`'s import and
`--sync`'s upload (`scripts/seed/commands/review.ts` and `commands/sync.ts`). A card is eligible when it is
legendary, OR its resolved provider is `pokeapi-official-artwork`. Never re-check
`rarity === "legendary"` ad hoc, so the two gates cannot drift apart.

### Storage and naming

- `cards.animated_url` is nullable. Existing legendary cards are NOT backfilled;
  they get the CSS-only glow/sparkle/tilt in `card.css`'s `.card--legendary`.
- Drop folder: `seed-content/supergrok-drop-anim/`, keyed by `animatedStem`
  (`src/seed/animated-brief.ts`, reuses `manualDropStem`): the SAME
  prompt hash as the still plus the still's provider id. Changing a card's pick
  therefore orphans its old animation.
- `pnpm seed --review` imports it into `seed-content/review/` as
  `<stem>.anim.webp`. No bake-off: there is one candidate, not a provider grid.
- `pnpm contact-sheet` shows it in its own column.
- `pnpm seed --sync` uploads it to a SEPARATE blob key (`cards/<key>-anim.webp`,
  via `uploadAnimation`) only on a card's first insert. An existing card is
  never revisited.
- Only a card with an already-APPROVED still in `seed-content/review/` is
  animated. One with none is reported, not fabricated.

### Legendary lane: `pnpm supergrok "<Theme Name>" --auto-video`

Drives `grok`'s `image_to_video` tool on each legendary card's approved still
(it animates existing art, not a prompt), then converts the MP4 to a seamless
bounce-loop animated WebP with local `ffmpeg` (frame extraction only; Homebrew
ffmpeg has no libwebp encoder) plus `img2webp`. Install with
`brew install ffmpeg webp`. Recipe: `runFfmpegConvert` in
`scripts/supergrok-helper/index.ts`.

### Pokémon lane: `pnpm pokemon-anim` (local, no AI)

Grok's `image_to_video` is blocked by content moderation on this art, so
`scripts/pokemon-anim/` recomposites the still provider's exact transparent
artwork and type-gradient background (`buildBackgroundSvg` / `MARGIN_RATIO`,
exported from `providers/pokeapi-official-artwork.ts`) across one synthesized
motion period: float, breathing scale pulse, sway, type-coloured sparkles. Pure
`sharp` work, no video, no bounce-loop trick, no `ffmpeg`. Only `img2webp`
(`brew install webp`) encodes the frames, at the same
`-loop 0 -d 100 -lossy -q 50` flags as the legendary lane for a comparable size.
It writes into the same drop folder under the same `animatedStem` naming, so
`--review`, `--sync` and the contact sheet pick it up through the one predicate.

### In the app

`Card.tsx` (pull reveal and the card detail modal only; the collection grid
renders `RarityThumb` and never sees `animatedUrl`) swaps in a plain `<img>`
for the animation, because `next/image` flattens animated WebP to its first
frame. It is gated on `useReducedMotion` and falls back to the still.

## Seed CLI sharp edges

- Flags are parsed by `scripts/seed/args.ts` (`parseSeedArgs`, strict
  `node:util parseArgs`). Add a new flag or command there, never via
  `process.argv.includes` in `main()` or `runSeed()`. Each command's body is
  one file under `scripts/seed/commands/`; `index.ts` only parses and dispatches.
- The only commands are `--review` and `--sync`, plus the standalone read-only
  or export ones. `--publish`, `--reset` and `--allow-unreviewed` were removed as
  dead or unsafe; `resetPool` / `previewReset` survive only for `tests-pg`.
- `--themes=<Name 1>,<Name 2>` scopes `--review` / `--sync` to exactly the named
  themes (exact `cards.json` names). Pruning and the unscoped default are
  unaffected, and an out-of-scope theme is never counted against FR9/FR12. This
  is how several themes land in one PR and publish in smaller batches later
  (runbook: "Authoring several themes, publishing fewer at a time").
- Any code that deletes pool rows by a keep-list (prune previews or the real
  pruners) must share `notKept()` in `src/seed/prune-predicate.ts` rather
  than re-implement the empty-keep-list rule.
- `pnpm seed --check-urls` imports `src/db/index.ts` at module load even though
  it never queries the database. A worktree with no real `DATABASE_URL` still
  needs some syntactically valid connection string or it throws before checking
  one URL. The unused `postgres://postgres:postgres@localhost:5499/main` (the
  `tests-pg` proxy string) satisfies it with no container running.
- `bulbapedia.bulbagarden.net` 403s every automated fetch (curl, Node `fetch`,
  spoofed User-Agent alike) even for live pages, so it fails `--check-urls`.
  Use `pokemon.com/us/pokedex/<name>` (lowercase, hyphenated for multi-word
  names, e.g. `ho-oh`) for Pokémon `sourceUrl`s.
