# U1 Foundation & Data — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Vercel-native; Server Components + Server Actions. |
| Styling | Tailwind CSS | Decided in Inception. |
| Database | **Postgres on Neon** (Vercel Marketplace) | Serverless, free tier, great Vercel integration; managed backups. |
| ORM / migrations | **Drizzle ORM** + drizzle-kit migrations | Type-safe, SQL-first, lightweight, test-friendly; migrations versioned in repo. |
| Image storage | **Vercel Blob** | Card images; public read URLs; reviewed-before-publish. |
| Server interaction | Server Actions (mutations) + Server Components (reads) | Least boilerplate; keeps DB server-side. |
| IDs | DB-generated (uuid or serial) — finalize at Code Gen | Simplicity. |
| Validation | Schema constraints + Zod at service boundaries (later units) | Defense in depth. |
| Runtime | Node.js (Fluid Compute) on Vercel | Full Node; default. |

## Constraints
- Secrets via Vercel env (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, auth secrets in U2).
- Single deployable app (monolith) per Units Generation.

## Deferred to later stages
- Exact column types/indexes → Code Gen (U1).
- Auth secrets/provider config → U2.
- Seed pipeline runtime → U3.
