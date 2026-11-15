# `src/shared/` - leaf modules

Nothing here imports `src/features/`. Features and `app/` import from here.

| Module | What it is | Runs where |
|---|---|---|
| `card/` | The card itself: `Card.tsx`, reveal, modal, rarity styling, tilt hook, `card.css`. | web app |
| `anim/` | Confetti, fireworks, count-up, reduced-motion hook. | web app |
| `sound/` | SFX and background music engines, `SoundProvider`, settings. | web app |
| `ui/` | Tiny primitives: `AvatarBadge`, `CenteredModal`, `ErrorBanner`, shared class strings. | web app |
| `stale-deploy/` | Reload-once recovery for a page that outlived a deploy. | web app |
| `pool/` | The card pool. See below. | mostly seed CLI |

## `pool/` - read this before opening it

Only three files are part of the running app:

- `catalog.ts` - the `Catalog` port (list themes, list cards, get card).
- `catalog.pg.ts` - its Postgres adapter.
- `service.ts` - the SQL reads `catalog.pg.ts` wraps.

Every other file in `pool/` and all of `pool/providers/` is the offline
seed and image pipeline, only reachable from `scripts/`:
`tests/provider-boundary.test.ts` fails the build if the request path ever
imports a provider. How those pieces fit together: `docs/IMAGE-PIPELINE.md`.
