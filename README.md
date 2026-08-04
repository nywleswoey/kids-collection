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
- Card images generated once (seed-time) via a free service — added in U3

## Status (build units)
- **U1 Foundation & Data** — ✅ scaffold, schema, DB client, pure logic, tests
- **U2 Auth & Profiles** — ✅ Google sign-in (allowlist), child profiles, picker
- **U3 Pool & Seeding** — ✅ seed pipeline (Pollinations → Blob → DB), pool reader
- **U4 Pull & Rewards** — ✅ atomic pull (no double-spend), duplicates, token grants
- **U5 Binder** — ✅ collection by theme, progress, card detail
- **U6 Card UI & Effects** — ✅ holographic + 3D tilt cards, rarity styling, pull reveal
- **U7 Admin** — ✅ parent dashboard, token grants, oversight

## Seeding the card pool
```bash
# author data: paste seed/AUTHORING_PROMPT.md into claude.ai → save seed/cards.json
pnpm seed --review     # generate preview images to seed/review/
pnpm seed --publish    # upload to Blob + insert cards (idempotent)
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
