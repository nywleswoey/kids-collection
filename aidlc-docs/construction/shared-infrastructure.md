# Shared Infrastructure

Infrastructure provisioned once in U1 and **shared by all units (U1–U7)**. Later units consume it; they do not re-provision.

| Service | Purpose | Env var | Provisioned in |
|---|---|---|---|
| **Vercel** (hosting + Functions) | Run the app (RSC + Server Actions) | — | U1 |
| **Neon Postgres** | All persistent data (themes, cards, children, collections, tokens) | `DATABASE_URL` | U1 |
| **Vercel Blob** | Card image storage | `BLOB_READ_WRITE_TOKEN` | U1 (seeded U3) |
| **Google OAuth** | Parent sign-in | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` | U2 |
| **Auth allowlist** | Restrict to parent email(s) | `PARENT_EMAILS` | U2 |

## Conventions
- All secrets in Vercel env; mirrored locally via `vercel env pull .env.local`. Never committed.
- One Vercel project, one Neon database, one Blob store.
- Migrations: drizzle-kit, files committed under `src/db`.

## Per-unit infra additions
- **U2** adds Google OAuth app + auth env vars (still on shared Vercel/Neon).
- **U3** uses Blob (already provisioned) + calls Pollinations.ai at seed time (no provisioning, no key).
- **U4–U7** add no new infrastructure — pure app code on the shared stack.
