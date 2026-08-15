# Card Collection (kids-collection)

A private, kid-safe collectible-card web app. A parent signs in with Google and
grants pull tokens as a reward; each child pulls cards from a shared,
pre-generated, rarity-tiered, themed pool — with pictures, short educational
facts, and holographic/3D card effects. Deployed on Vercel.

Increments 1–22 were built with the AI-DLC v1 workflow; those design and audit
artifacts are kept as history in `aidlc-docs/`. Current product definition lives
in `Product-Definition/`, produced by [aidlc-discovery](https://github.com/aws-samples/sample-aidlc-discovery)
v2 (`/aidlc-discovery`).

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Postgres (Neon) via Drizzle ORM, migrations with drizzle-kit
- Vercel Blob for card images
- Google OAuth (parent) — added in U2
- Card images generated once (seed-time) via free image providers behind a
  provider seam (`src/features/pool/providers/`) — added in U3

## Status (build units)
- **U1 Foundation & Data** — ✅ scaffold, schema, DB client, pure logic, tests
- **U2 Auth & Profiles** — ✅ Google sign-in (allowlist), child profiles, picker
- **U3 Pool & Seeding** — ✅ seed pipeline (image providers → Blob → DB), pool reader
- **U4 Pull & Rewards** — ✅ atomic pull (no double-spend), duplicates, token grants
- **U5 Binder** — ✅ collection by theme, progress, card detail
- **U6 Card UI & Effects** — ✅ holographic + 3D tilt cards, rarity styling, pull reveal
- **U7 Admin** — ✅ parent dashboard, token grants, oversight

## Seeding the card pool

To add a whole new theme, hand `seed/NEW-THEME-RUNBOOK.md` and a theme name to an agent — it authors the
30 cards, generates the art, and stops for your approval before publishing.

```bash
pnpm seed --check-urls # schema + every sourceUrl must return 200
pnpm seed --review     # generate preview images for NEW cards to seed/review/,
                       #   one per card PER PROVIDER (the bake-off)
pnpm contact-sheet "<Theme Name>"
                       # subject x provider grid to review, into seed/review/
pnpm seed --sync       # publish the picked provider's reviewed bytes (idempotent),
                       #   recording what drew them in seed/provenance.json
```

## Getting started
```bash
pnpm install

# env: provision Neon + Blob via Vercel Marketplace, then
cp .env.example .env.local   # or: vercel env pull .env.local

# database
pnpm db:migrate           # apply migrations to DATABASE_URL

# dev
pnpm dev                  # http://localhost:3000

# quality
pnpm typecheck
pnpm test                 # property-based tests (fast-check)
```

## Project layout
```
app/                  Next.js routes + layout
src/db/               Drizzle schema, client, migrations
src/lib/              env, types, avatars, pure business logic
tests/                property-based + integration tests
Product-Definition/   current vision, technical environment, open questions
aidlc-docs/           AI-DLC v1 design + audit artifacts (increments 1–22, history)
```

## Data model (U1)
- `themes` 1—* `cards` (shared pool; rarity ∈ common/rare/epic/legendary)
- `children` (per-family; `pull_tokens >= 0`, starts at 3)
- `collections` (childId+card_id PK, `count >= 1` for duplicates)
