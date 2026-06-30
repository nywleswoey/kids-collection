# U1 Foundation & Data — Code Generation Plan

**Unit**: U1 Foundation & Data
**Project type**: Greenfield monolith (single Next.js app). Workspace root: `/Users/selwynyeow/personal/kids-collection`.
**Stories**: none directly (enabling infra); underpins all units.
**Owns (DB entities)**: themes, cards, children, collections.
**This plan is the single source of truth for U1 generation.**

## Code location
- App code at workspace **root** (NEVER in aidlc-docs/). Feature-based structure from unit-of-work.md: `app/`, `src/db/`, `src/lib/`, `tests/`.
- Doc summaries → `aidlc-docs/construction/U1-foundation-data/code/`.

## Approach
Hand-create config + source (deterministic, no network). `npm install`, migrations, and test runs happen in **Build & Test** (after all units). Pure logic written with a clean seam for property-based tests (PBT extension, blocking).

## Steps

- [x] **Step 1 — Project structure setup (scaffold)**
  Files: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind` setup, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder home), `src/lib/env.ts` (server-only env validation).

- [x] **Step 2 — Database schema (Drizzle)**
  File: `src/db/schema.ts` — tables themes, cards, children, collections; rarity enum; constraints: unique(childId,cardId), FKs, `pullTokens >= 0` (default 3), `count >= 1`, cascade child→collections. (domain-entities.md, business-rules.md BR1–BR16)

- [x] **Step 3 — DB client + Drizzle config**
  Files: `src/db/index.ts` (Neon + Drizzle client, server-only), `drizzle.config.ts` (migrations dir, `DATABASE_URL`).

- [x] **Step 4 — Pure business-logic seam**
  File: `src/lib/logic.ts` — `drawCard(pool, rng?)`, `applyPull(child, card)`, `grantTokens(child, n)`, `themeProgress(entries, theme)`; rarity weights 60/25/12/3. Pure, no I/O. (business-logic-model.md)

- [x] **Step 5 — Avatar presets + shared types**
  Files: `src/lib/avatars.ts` (preset keys), `src/lib/types.ts` (Rarity, Card, Theme, Child, etc.).

- [x] **Step 6 — Business-logic unit tests (PBT)**
  File: `tests/logic.pbt.test.ts` — property tests (fast-check) for BR1 (draw distribution), BR5/BR6 (token non-negative, exactly-one spend), BR8/BR9 (duplicate count), BR11 (progress bounds). Executed in Build & Test.

- [x] **Step 7 — Initial migration**
  Generate/author initial SQL migration under `src/db/migrations/` (or note `drizzle-kit generate` to run in Build & Test).

- [x] **Step 8 — Documentation**
  `aidlc-docs/construction/U1-foundation-data/code/summary.md` (files created + how to run) and root `README.md` (project overview, setup, env).

## Story traceability
- Infra unit — no user stories closed here; enables C/D/F/G logic + all persistence.

## Scope
8 steps. ~12–15 files. No runtime deps installed yet (Build & Test).

---
Approve to generate (**/aidlc:approve**), or request changes.
