# `src/shared/` - leaf modules

Nothing here imports `src/features/`. Features and `app/` import from here.

| Module | What it is | Runs where |
|---|---|---|
| `card/` | The card itself: `Card.tsx`, reveal, modal, rarity styling, tilt hook, `card.css`. | web app |
| `anim/` | Confetti, fireworks, count-up, reduced-motion hook. | web app |
| `sound/` | SFX and background music engines, `SoundProvider`, settings. | web app |
| `ui/` | Tiny primitives: `AvatarBadge`, `CenteredModal`, `ErrorBanner`, shared class strings. | web app |
| `stale-deploy/` | Reload-once recovery for a page that outlived a deploy. | web app |
| `pool/` | The `Catalog` port (list themes, list cards, get card) and its Postgres adapter. The only pool reads the app makes. | web app |

Seeding, review and publish code is NOT here: it lives in `src/seed/`, which
the request path may never import (`tests/provider-boundary.test.ts`).
