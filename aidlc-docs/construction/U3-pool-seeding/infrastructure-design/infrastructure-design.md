# U3 Pool & Seeding — Infrastructure Design

U3 adds **no new managed services**. It uses the shared stack (Blob, Neon) and an external **free image endpoint**. The seed runs offline (developer machine / CI), not in the request path.

> No open questions — services fixed.

## Components → infra
| Logical (LC) | Where it runs | Service |
|---|---|---|
| LC-S1/S2 Loader/PromptBuilder | seed script (Node) | local |
| LC-S3 Image Generator | seed script | **Pollinations.ai** (HTTPS GET, no key) |
| LC-S4 Blob Uploader | seed script | **Vercel Blob** (`@vercel/blob`) |
| LC-S5 Pool Writer | seed script | **Neon Postgres** (Drizzle) |
| LC-S6 Orchestrator | CLI: `npm run seed` | local/CI |
| LC-S7 CardPool Reader | Vercel Functions | runtime app |

## Execution environment
- **Seed**: run on a dev machine (or one-off CI job) with `DATABASE_URL` + `BLOB_READ_WRITE_TOKEN` in env. Not part of the deployed request path.
- **Runtime read**: `CardPoolService` queries Neon from Vercel Functions (no generation).

## External dependency
- **Pollinations.ai**: `https://image.pollinations.ai/prompt/<prompt>` — free, unauthenticated. Treated as best-effort (retry + skip); availability not guaranteed, which is why generation is one-time + reviewed, not on the pull path.

## Network / cost
- Seed makes ~36 outbound HTTPS calls (one-time). Runtime serves images from Blob CDN.
- Cost: $0 (Pollinations free, Blob/Neon free tier).

## No new env
- Reuses `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`.
