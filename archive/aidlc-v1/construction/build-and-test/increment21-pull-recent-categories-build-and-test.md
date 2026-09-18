# INCREMENT 21 — Build & Test: Pull Page Most Recent 8 Categories + Random

**Status**: BUILD & TEST COMPLETE — awaiting approval to proceed to Operations
**Date**: 2026-07-31
**Code summary**: `aidlc-docs/construction/increment21-pull-recent-categories/code/code-summary.md`

---

## 1. Prerequisites

- Node + pnpm; `.env.local` with `DATABASE_URL` (prod Neon), `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `PARENT_EMAILS`, `AUTH_TRUST_HOST`
- No new dependencies, no new environment variables

---

## 2. Build

```bash
pnpm install
pnpm typecheck        # → clean
pnpm test             # → 38 files / 182 tests passed
pnpm build            # → success
pnpm db:generate      # → "No schema changes, nothing to migrate"
```

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ clean |
| `pnpm test` (×2) | ✅ 182/182 (174 prior + 8 new), stable |
| `pnpm build` | ✅ success — `/play/pull` 6.01 kB |
| `pnpm db:generate` | ✅ "No schema changes" — hand-authored 0006 snapshot matches `schema.ts` |
| New dependencies | ✅ zero |

---

## 3. Unit / Property Tests

`tests/pull-categories.pbt.test.ts` — 8 tests:

- **Property** `recentCategories` returns `min(n, cap)` items
- **Property** the result is always the *last* `cap` items (i.e. the most recent)
- **Property** order is preserved and nothing is invented (indexes strictly increasing)
- **Property** `n <= cap` returns the list unchanged
- **Property** the input array is never mutated
- **Unit** empty input → `[]`; non-positive cap → `[]`
- **Unit** `MAX_PULL_CATEGORIES === 8`, and the live 10-theme pool yields Dinosaurs → Deep Sea Creatures

The remaining 174 tests ran as regression; none needed modification, which confirms the `Theme` type
and every catalog fake were left untouched (D2=A).

---

## 4. Migration 0006 — applied to prod Neon

**Pre-check** (before applying):

```
themes: 10   cards: 300   sort_order column present: false
scan order: Animals | Mythic Creatures | Dinosaurs | Superheroes | Country |
            Famous People | Weird Insects | Special Plants | Spooky Legends | Deep Sea Creatures
```

The scan order matched the order recorded at Requirements Analysis exactly, confirming the `ctid`
snapshot would capture the intended sequence.

**Apply**:

```bash
set -a; . ./.env.local; set +a      # drizzle-kit reads DATABASE_URL from the shell, not .env.local
pnpm db:migrate                     # → "migrations applied successfully!"
```

**Post-verify**:

```
themes: 10   cards: 300   duplicate sort_order groups: 0   nulls: 0
0 Animals · 1 Mythic Creatures · 2 Dinosaurs · 3 Superheroes · 4 Country ·
5 Famous People · 6 Weird Insects · 7 Special Plants · 8 Spooky Legends · 9 Deep Sea Creatures
```

Row counts unchanged (10 themes / 300 cards), `sort_order` dense, unique and non-null — NFR3 satisfied.

---

## 5. Seed sync — ordering no-op

```bash
pnpm seed --sync
# → inserted: 0, updated: 300, skipped: 0, failed: 0, prunedThemes: 0, prunedCards: 0
```

`updated: 300` is the expected text-only refresh every sync performs; **0 inserted and 0 pruned** is the
result that matters. Re-verifying afterwards showed `sort_order` unchanged (Animals 0 … Deep Sea
Creatures 9), proving the `seed/cards.json` reorder matches the backfill and that the seed file can now
own ordering without disturbing it (acceptance criterion 7).

---

## 6. End-to-End Data-Path Check

Running the real read path (`ORDER BY sort_order`) plus `recentCategories()` against prod data:

```
chips: 🎲 Random | Dinosaurs | Superheroes | Country | Famous People |
       Weird Insects | Special Plants | Spooky Legends | Deep Sea Creatures
count: 9   hidden: Animals, Mythic Creatures
```

Matches acceptance criteria 3 and 4 exactly.

---

## 7. Integration / Regression Surfaces

| Surface | Expectation | Status |
|---|---|---|
| My Galaxy category tabs | all 10 categories | ✅ unchanged code path; `recentCategories` is called only by the pull page |
| Rarity filters, binder | all 10 | ✅ unchanged |
| Set-completion rewards | all 10 | ✅ unchanged (`rewards/service.ts` uses `listThemes` directly) |
| Admin catalog | all 10 | ✅ unchanged |
| Easter Egg pick-1-of-5 | draws from all categories | ✅ unchanged |
| 🎲 Random pull | can still yield Animals / Mythic Creatures | ✅ `listCards()` without a theme filter is untouched |

---

## 8. Remaining Manual Check (post-deploy)

On a child profile in production: open Discover / pull and confirm 9 chips ending in Deep Sea Creatures
with no Animals or Mythic Creatures chip; open My Galaxy and confirm all 10 categories are still
listed; take a Random pull and confirm an Animals card is still obtainable.

Nothing in this list is expected to differ from §6, which already exercised the same data through the
same functions — it is a visual confirmation only.

---

## 9. Deployment Notes (Operations)

- **Migration 0006 is already applied to prod Neon**, so the ordered `listThemes()` is safe to deploy.
- Push `main` → Vercel production (Q7=A). No new env vars, no new dependencies.
- The `seed --sync` has already run, so no post-deploy seed is required.
- **Rollback**: revert the commit; `sort_order` can stay in place harmlessly (the column is additive
  and unused by the reverted code).

---

## 10. Extension Compliance (Build & Test stage)

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **N/A** | No new input, auth surface, secret or external call in this increment |
| Resiliency Baseline | **Compliant** | Pre/post row counts captured around the migration; counts unchanged, no nulls or duplicates; documented rollback |
| Property-Based Testing | **Compliant** | 5 fast-check properties green in both runs |

---

**Build and test instructions complete. Ready to proceed to the Operations stage?**

A) Request Changes
B) Approve and continue to Operations (deploy to Vercel prod)

[Answer]:
