# U3 Pool & Seeding — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Image generation | **Pollinations.ai** (free, no key, HTTP GET) | Zero setup/cost; one-time seed; output human-reviewed for safety. |
| Image storage | **Vercel Blob** (`@vercel/blob`) | Already provisioned (U1); public-read card URLs. |
| Seed runner | **Node/tsx script** under `scripts/seed/` | Runs offline (CLI), not in request path. |
| Seed data | `seed/cards.json` (committed) | Text authored via a claude.ai prompt (Q16b); reviewable. |
| DB writes | Drizzle (U1 client) | Idempotent upserts of themes/cards. |
| HTTP | global `fetch` | Built-in; bounded retry wrapper. |

## New dependency
- `@vercel/blob` (upload to Blob).
- (dev) `tsx` to run the TS seed script, or run via `node --experimental-strip-types`.

## No new env
- Reuses `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`. Pollinations needs no key.
