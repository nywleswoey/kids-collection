# INCREMENT 21 — Code Generation Plan: Pull Page Most Recent 8 Categories + Random

**Status**: PLAN APPROVED 2026-07-31 · ALL 12 STEPS EXECUTED
**Date**: 2026-07-31
**Unit**: single unit (LIGHT cadence) — no per-unit NFR/Infrastructure design
**Design**: `aidlc-docs/inception/application-design/increment21-pull-recent-categories-design.md` (D1=A, D2=A, D3=A, D4=A)
**Requirements**: FR1–FR7, NFR1–6

This plan is the single source of truth for Code Generation. Every step is checked off in the same
interaction in which it is completed.

---

## Context

- **Workspace root**: `/Users/selwynyeow/personal/kids-collection` (Next.js 15 App Router, Drizzle + Neon, pnpm)
- **Application code**: workspace root — never `aidlc-docs/`
- **Dependencies**: zero new npm packages
- **Schema change**: yes — migration 0006 (`themes.sort_order`)
- **Seed change**: yes — `seed/cards.json` themes array reordered (no card content touched)
- **Deployment**: Q7=A — migrate + deploy to Vercel prod in the Operations stage

---

## Business Logic (pure, no I/O)

### Step 1 — Category selection helper
- [x] Create `src/features/pull/categories.ts` exporting `MAX_PULL_CATEGORIES = 8` and a generic
      `recentCategories<T>(themes: T[], cap = MAX_PULL_CATEGORIES): T[]` that returns the last `cap`
      items, order-preserving, with `cap <= 0` and empty input guarded to `[]`. (FR3, FR4)

### Step 2 — Property + unit tests for the selection helper
- [x] Create `tests/pull-categories.pbt.test.ts` covering: length is `min(n, cap)`; every result item
      comes from the input with order preserved; the result is always the **last** `cap` items;
      `n <= cap` returns the list unchanged; `cap <= 0` and empty input return `[]`; and
      `MAX_PULL_CATEGORIES === 8` with a 10-theme fixture ending in the newest. (NFR2)

---

## Repository / Data Layer

### Step 3 — Schema
- [x] Add `sortOrder: integer("sort_order").notNull().default(0)` to the `themes` table in
      `src/db/schema.ts`. (FR1)

### Step 4 — Migration 0006
- [x] Create `src/db/migrations/0006_theme_sort_order.sql`: `ALTER TABLE … ADD COLUMN`, then the
      generic backfill `UPDATE themes t SET sort_order = s.rn FROM (SELECT id,
      row_number() OVER (ORDER BY ctid) - 1 AS rn FROM themes) s WHERE t.id = s.id;` (D1=A, FR1)
- [x] Hand-author `src/db/migrations/meta/_journal.json` entry (idx 6) and `meta/0006_snapshot.json`
      in the same style as 0005.
- [x] Verify `pnpm db:generate` reports "No schema changes" (snapshot matches schema).

### Step 5 — Ordered read
- [x] `listThemes()` in `src/features/pool/service.ts` → `.orderBy(asc(themes.sortOrder))`; return
      shape unchanged. (FR1, FR6, D2=A, D4=A)

### Step 6 — Writer keeps ordering in step
- [x] `upsertTheme(name: string, sortOrder: number)` in `src/features/pool/writer.ts` — writes
      `sortOrder` on insert and updates it for an existing theme, staying idempotent (U3-BR8). (FR2)

---

## Seed / Content

### Step 7 — Seed script passes position
- [x] `scripts/seed/index.ts` — iterate `seed.themes` with its index and pass it to `upsertTheme`.
      `review` mode unaffected. (FR2)

### Step 8 — Reorder the seed themes array
- [x] Reorder `seed/cards.json` `themes` to the backfilled order: Animals, Mythic Creatures,
      Dinosaurs, Superheroes, Country, Famous People, Weird Insects, Special Plants, Spooky Legends,
      Deep Sea Creatures. **Reorder only** — no card, image, eduText or sourceUrl content changes.
- [x] Verify with a diff/count check: still 10 themes × 30 cards = 300, and the multiset of card names
      is byte-identical to before the reorder.

---

## Frontend

### Step 9 — Apply the cap server-side
- [x] `app/play/pull/page.tsx` — `const visibleThemes = recentCategories(themes);` and pass
      `visibleThemes` to `PullButton`, so hidden themes are never serialized to the client. (FR3, D3=A)
- [x] Confirm `src/features/pull/PullButton.tsx` needs no change (it renders whatever it is given).
      (FR7)

---

## Verification

### Step 10 — Static checks and suite
- [x] `pnpm typecheck` clean
- [x] `pnpm test` — all existing 174 tests plus the new ones green, run twice for stability (NFR5)
- [x] `pnpm build` succeeds
- [x] Confirm zero new dependencies and no `*_new` / duplicate files (brownfield: modify in place)

### Step 11 — Regression sanity on unchanged surfaces
- [x] Grep-verify no other call site of `listThemes` / `upsertTheme` was left with a stale signature
- [x] Confirm My Galaxy, rarity filters, set-completion rewards, Easter Egg pick and the admin catalog
      still receive all 10 categories (FR5, FR6)

### Step 12 — Code summary
- [x] Write `aidlc-docs/construction/increment21-pull-recent-categories/code/code-summary.md`
      (files added/modified, requirement traceability, test results, extension compliance,
      and the outstanding operational actions)

---

## Deferred to Build & Test / Operations (not this stage)

- Applying migration 0006 to Neon (needs DB auth) — with a pre/post row-count check per NFR3
- Running `pnpm seed --sync` and confirming an ordering no-op: 0 inserted, 0 pruned themes/cards
- Manual verification: 9 chips ending in Deep Sea Creatures; no Animals / Mythic Creatures chip;
  My Galaxy still shows 10; a Random pull can still yield an Animals card
- Deploy to Vercel prod (Q7=A)

---

## Traceability

| Step | Requirement |
|---|---|
| 1, 9 | FR3, FR4, FR7 |
| 2 | NFR2 |
| 3, 4, 5 | FR1 |
| 6, 7, 8 | FR2 |
| 5, 11 | FR5, FR6 |
| 10 | NFR5 |
| 4 (deferred apply) | NFR3, NFR6 |

---

## Extension Compliance (planning stage)

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **N/A** | No new input, auth surface, secret or external call; Step 9 keeps hidden themes out of the client payload |
| Resiliency Baseline | **Compliant** | Step 4 is additive with a deterministic backfill; row-count verification deferred to Build & Test per NFR3 |
| Property-Based Testing | **Compliant** | Step 2 property-tests the pure selection rule |

---

**Scope**: 12 steps · 2 new files (1 source, 1 test) · 6 modified files (schema, service, writer, seed
script, seed data, pull page) · 1 new migration + 2 hand-authored drizzle meta files · 0 new dependencies.

**Plan approved 2026-07-31 (option B). All steps executed — see
`aidlc-docs/construction/increment21-pull-recent-categories/code/code-summary.md`.**
