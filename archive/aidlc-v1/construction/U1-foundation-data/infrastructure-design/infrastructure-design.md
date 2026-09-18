# U1 Foundation & Data — Infrastructure Design

Maps U1 logical components (LC1–LC5) to actual managed services. This infra is **shared by all units** — see `construction/shared-infrastructure.md`.

> No open questions — provider choices fixed in Inception/NFR Requirements (Vercel + Neon + Blob). Mapped directly.

## Logical → Physical mapping
| Logical (LC) | Service | Notes |
|---|---|---|
| LC1 Schema & Migrations | **Neon Postgres** (Vercel Marketplace) | drizzle-kit applies migrations. |
| LC2 DB Client | Drizzle + Neon serverless driver | pooled; runs in Vercel Functions (Fluid Compute). |
| LC3 Env / Config | Vercel Environment Variables | `DATABASE_URL` (Neon), `BLOB_READ_WRITE_TOKEN`. Validated server-side. |
| LC4 Data Access Helpers | App code (Vercel Functions) | no separate service. |
| LC5 Blob Accessor | **Vercel Blob** | card image storage; public-read URLs. |

## Provisioning approach
- Provision via **Vercel Marketplace integrations** (`vercel integration add neon`, Blob enabled in project) → env vars auto-injected into the Vercel project.
- Local dev: `vercel env pull .env.local` to mirror env.
- Migrations: `drizzle-kit generate` + `drizzle-kit migrate` (run locally / in a setup script against `DATABASE_URL`).

## Compute / Networking
- **Compute**: Vercel Functions (Node, Fluid Compute) — Server Actions + Server Components. No separate servers.
- **Networking**: Vercel-managed (HTTPS, CDN for static + Blob). No custom LB/API gateway.

## Monitoring
- Vercel observability (function logs/metrics) — sufficient at this scale. No custom APM.

## Cost
- Neon free tier + Vercel Blob free tier + Hobby/Pro hosting. Zero per-pull AI cost (pool pre-generated). Effectively free for family use.
