# Build Instructions

## Prerequisites
- **Runtime**: Node.js 24, **pnpm** (package manager; `pnpm-lock.yaml`)
- **Env vars** (`.env.local`; pull with `vercel env pull .env.local`):
  `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `PARENT_EMAILS`, `AUTH_TRUST_HOST`
- **Services**: Neon Postgres + Vercel Blob (provisioned via Vercel Marketplace)

## Build Steps

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
vercel env pull .env.local        # or copy .env.example and fill in
```

### 3. Apply database schema
```bash
pnpm db:migrate                   # drizzle-kit migrate (uses DATABASE_URL)
```

### 4. Build
```bash
pnpm build                        # next build
```

## Verify build success
- Expected: `✓ Compiled successfully`, `✓ Generating static pages (11/11)`
- Routes: `/`, `/signin`, `/play`, `/play/home`, `/play/pull`, `/play/binder`, `/play/binder/[cardId]`, `/admin`, `/admin/profiles`, `/admin/child/[childId]/binder`, `/api/auth/[...nextauth]`
- Middleware bundle emitted (auth gate)

## Troubleshooting
- **`Missing required environment variable`**: env not loaded — run `vercel env pull` or check `.env.local`.
- **drizzle-kit migrate `url undefined`**: `DATABASE_URL` not in shell env — export it or ensure `.env.local` present.
- **Two lockfiles**: only `pnpm-lock.yaml` should exist (no `package-lock.json`).
