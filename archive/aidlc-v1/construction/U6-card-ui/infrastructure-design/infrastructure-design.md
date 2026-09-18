# U6 Card UI & Effects — Infrastructure Design

**No infrastructure.** U6 is client-side rendering only — CSS + browser APIs (pointer, `deviceorientation`). No server, DB, env, or external services.

| Logical (LC) | Where | Notes |
|---|---|---|
| LC-C1 Card / C3 RevealCard | Browser (client components) | render + effects |
| LC-C2 useCardTilt | Browser | pointer + deviceorientation |
| LC-C4 rarity styles | Bundled CSS | ships with app |

## Runtime
- Card images already served from Blob (U3) via `next/image`.
- Effects execute entirely on the client; zero server/infra cost.

## No new infra / env / deps.
