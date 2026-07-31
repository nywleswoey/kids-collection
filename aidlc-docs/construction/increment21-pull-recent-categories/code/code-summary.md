# INCREMENT 21 — Code Summary: Pull Page Most Recent 8 Categories + Random

**Status**: CODE GENERATION COMPLETE — awaiting approval at the Code Generation gate
**Date**: 2026-07-31
**Plan**: `aidlc-docs/construction/plans/increment21-pull-recent-categories-code-generation-plan.md` (12/12 steps [x])

---

## Files

### Added (4)

| File | Purpose |
|---|---|
| `src/features/pull/categories.ts` | `MAX_PULL_CATEGORIES = 8` + pure generic `recentCategories<T>()` (FR3/FR4) |
| `tests/pull-categories.pbt.test.ts` | 5 property tests + 3 edge/unit tests (NFR2) |
| `src/db/migrations/0006_theme_sort_order.sql` | Add `sort_order` + `ctid`-ordered backfill (FR1) |
| `src/db/migrations/meta/0006_snapshot.json` | Hand-authored drizzle snapshot (idx 6) |

### Modified (6)

| File | Change |
|---|---|
| `src/db/schema.ts` | `themes.sortOrder` — `integer("sort_order").notNull().default(0)` |
| `src/features/pool/service.ts` | `listThemes()` → `.orderBy(asc(themes.sortOrder))` |
| `src/features/pool/writer.ts` | `upsertTheme(name, sortOrder)` — writes on insert, refreshes on update, still idempotent |
| `scripts/seed/index.ts` | `for (const [sortOrder, theme] of seed.themes.entries())` → passes array position |
| `seed/cards.json` | `themes` array reordered only (215 insertions / 215 deletions — a pure block move) |
| `src/db/migrations/meta/_journal.json` | Journal entry idx 6 |

`src/features/pull/PullButton.tsx` and `src/lib/types.ts` are deliberately untouched (D2, D3).

---

## Implementation Notes

- **Ordering is now a contract.** Before this increment the chip order came from an unordered
  `SELECT`, so it was incidental and could reshuffle whenever `seed --sync` rewrote a row. Migration
  0006 snapshots that order with `row_number() OVER (ORDER BY ctid)`, which reproduces exactly what
  children see on any database without hardcoding theme names, and `listThemes()` sorts by it from
  then on.
- **The seed file owns ordering going forward.** `seed/cards.json` was reordered to match the
  backfill, so the first `seed --sync` after the migration writes each `sort_order` back to the value
  it already has. Without that reorder the sync would renumber by authoring order and swap which two
  categories are hidden (Dinosaurs instead of Mythic Creatures). Appending a theme to the file makes
  it the most recent.
- **Reorder verified as content-preserving**: per-theme SHA-256 of the canonicalised JSON is identical
  before and after, the (theme, card) name multiset is unchanged, and the count is still
  10 themes × 30 cards = 300. `git diff --stat` is a symmetric 215/215.
- **Cap applied server-side** in `app/play/pull/page.tsx`, so hidden themes never enter the client
  payload. `PullButton` still renders whatever list it is handed, so there is no client-side path that
  can select a hidden theme (FR7).
- **`Theme` type unchanged** — ordering alone answers "most recent 8" (it is just the last 8), which
  avoided rippling a required field through the 5 test catalog fakes for no functional gain (D2=A).
- **`upsertTheme` only issues an `UPDATE` when the order actually differs**, keeping the common
  no-op sync cheap.

---

## Verification

| Check | Result |
|---|---|
| `pnpm typecheck` | Clean |
| `pnpm test` (run 1) | 38 files / **182 passed** (174 prior + 8 new) |
| `pnpm test` (run 2) | 38 files / **182 passed** — stable |
| `pnpm build` | Success; `/play/pull` 6.01 kB |
| `pnpm db:generate` | "No schema changes, nothing to migrate" — snapshot matches schema |
| New dependencies | Zero |
| Duplicate / `*_new` files | None — all brownfield edits in place |
| `upsertTheme` call sites | Only `scripts/seed/index.ts`, updated to the new signature |
| Other `listThemes` consumers | Binder, rewards, admin catalog untouched — still receive all 10 (FR5/FR6) |

---

## Requirement Traceability

| Req | Where |
|---|---|
| FR1 explicit ordering | `schema.ts`, `0006_theme_sort_order.sql`, `service.listThemes` |
| FR2 seed maintains order | `writer.upsertTheme`, `scripts/seed/index.ts`, `seed/cards.json` |
| FR3 cap at 8 | `categories.ts`, `app/play/pull/page.tsx` |
| FR4 visible-chip order | `recentCategories` preserves order; covered by property + fixture tests |
| FR5 hidden stay obtainable | No change to draw/ticket/reward paths |
| FR6 other screens unchanged | Only the pull page calls `recentCategories` |
| FR7 hidden unselectable | Cap applied server-side; `PullButton` unchanged |
| NFR2 | `tests/pull-categories.pbt.test.ts` |
| NFR5 | 182/182 tests ×2, typecheck, build, zero deps |

---

## Extension Compliance (Code Generation stage)

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **N/A** | No new input, auth surface, secret or external call. The server-side cap keeps hidden themes out of the client payload. |
| Resiliency Baseline | **Compliant** | Migration is additive with a deterministic backfill and no data loss; pre/post row-count verification is scheduled for Build & Test per NFR3. |
| Property-Based Testing | **Compliant** | 5 fast-check properties over the pure selection rule. |

---

## Outstanding Operational Actions (Build & Test / Operations)

1. `pnpm db:migrate` — apply 0006 to Neon (needs DB auth), with a theme/card row count before and after.
2. Verify `sort_order` reads back as Animals 0 … Deep Sea Creatures 9.
3. `pnpm seed --sync` — expect an ordering no-op: 0 inserted, 0 pruned themes/cards, 300 cards intact.
4. Manual check: pull screen shows 9 chips ending in Deep Sea Creatures with no Animals /
   Mythic Creatures chip; My Galaxy still lists all 10; a Random pull can still yield an Animals card.
5. Deploy to Vercel prod (Q7=A).

⚠️ **Migration 0006 is NOT yet applied.** Until it is, `listThemes()` orders by a column the deployed
database does not have — so the migration must be applied **before** this code is deployed.
