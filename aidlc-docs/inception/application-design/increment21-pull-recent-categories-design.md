# INCREMENT 21 — Application Design: Pull Page Most Recent 8 Categories + Random

**Status**: AWAITING APPROVAL (Application Design gate)
**Date**: 2026-07-31
**Requirements**: `aidlc-docs/inception/requirements/increment21-pull-recent-categories-requirements.md` (FR1–FR7, NFR1–6)
**Cadence**: LIGHT — single unit, no Units Generation, no per-unit NFR/Infrastructure design

---

## 1. Design Summary

Three seams, in dependency order:

1. **Data** — `themes` gains `sort_order integer NOT NULL DEFAULT 0` (migration 0006). Existing rows
   are backfilled to the order they physically scan in today, which is exactly the order children see.
2. **Read path** — `listThemes()` gains `ORDER BY sort_order`, making chip order a contract instead of
   an accident. `seed --sync` keeps `sort_order` in step with `seed/cards.json` array position.
3. **Presentation** — a pure `recentCategories()` helper caps the pull screen's chip list; the pull
   page (a server component) applies it so hidden themes never reach the client bundle.

No change to pull odds, the card pool, tickets, rewards, or any other screen.

---

## 2. Components

| Component | File | Change | Responsibility |
|---|---|---|---|
| Schema | `src/db/schema.ts` | MODIFY | Add `sortOrder` to the `themes` table |
| Migration 0006 | `src/db/migrations/0006_theme_sort_order.sql` | NEW | Add column + deterministic backfill |
| Pool read service | `src/features/pool/service.ts` | MODIFY | `listThemes()` orders by `sortOrder` |
| Pool writer | `src/features/pool/writer.ts` | MODIFY | `upsertTheme(name, sortOrder)` writes order on insert **and** update |
| Seed script | `scripts/seed/index.ts` | MODIFY | Pass the theme's array index as `sortOrder` |
| Seed data | `seed/cards.json` | MODIFY | Reorder the `themes` array to match the backfilled order |
| Category selection | `src/features/pull/categories.ts` | NEW | Pure `recentCategories(themes, cap)` + `MAX_PULL_CATEGORIES` |
| Pull page | `app/play/pull/page.tsx` | MODIFY | Apply the cap server-side before passing `themes` down |
| Tests | `tests/pull-categories.pbt.test.ts` | NEW | Property tests for the selection rule |

`src/features/pull/PullButton.tsx` is **unchanged** — it already renders whatever `themes` it is given.
`src/lib/types.ts` `Theme` is **unchanged** (see D2).

---

## 3. Component Methods

### 3.1 `src/features/pull/categories.ts` (NEW — pure, no I/O)

```ts
/** Max category chips on the pull screen, excluding 🎲 Random (Inc21 FR3). */
export const MAX_PULL_CATEGORIES = 8;

/**
 * The most recent `cap` categories, preserving input order.
 * Input MUST be ordered oldest → newest (as `listThemes()` returns it).
 */
export function recentCategories<T>(themes: T[], cap = MAX_PULL_CATEGORIES): T[];
```

Implementation is `cap >= themes.length ? themes : themes.slice(-cap)` with a non-positive `cap`
guarded to `[]`. Generic in `T` so it needs no dependency on the `Theme` shape and stays trivially
property-testable.

### 3.2 `src/features/pool/service.ts` (MODIFY)

```ts
export async function listThemes(): Promise<Theme[]>  // now: .orderBy(asc(themes.sortOrder))
```
Return shape unchanged. Ordering becomes deterministic: oldest (lowest `sortOrder`) first, newest last.

### 3.3 `src/features/pool/writer.ts` (MODIFY)

```ts
export async function upsertTheme(name: string, sortOrder: number): Promise<string>
```
Insert → writes `{ name, sortOrder }`. Existing → `UPDATE themes SET sort_order = $sortOrder` before
returning the id, so a reorder in `seed/cards.json` takes effect on the next `--sync`. Still idempotent
(U3-BR8). Sole caller is the seed script.

### 3.4 `app/play/pull/page.tsx` (MODIFY)

```ts
const visibleThemes = recentCategories(themes);
// …
themes={visibleThemes.map((t) => ({ id: t.id, name: t.name }))}
```

---

## 4. Data Design — Migration 0006

```sql
ALTER TABLE "themes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Freeze the order rows scan in today (= the order children see on the pull
-- screen) so it stops depending on an unordered SELECT.
UPDATE "themes" t SET "sort_order" = s.rn
FROM (SELECT "id", (row_number() OVER (ORDER BY ctid)) - 1 AS rn FROM "themes") s
WHERE t."id" = s."id";
```

Chosen over a hardcoded name→order list because it reproduces "the order as it appears" on *any*
database — prod Neon, a local dev DB, and the `tests-pg` container — without assuming a specific set of
theme names. On prod it yields exactly:

`Animals 0 · Mythic Creatures 1 · Dinosaurs 2 · Superheroes 3 · Country 4 · Famous People 5 ·
Weird Insects 6 · Special Plants 7 · Spooky Legends 8 · Deep Sea Creatures 9`

**Post-migration invariant**: `seed/cards.json` is reordered to this exact sequence, so the first
`seed --sync` after the migration rewrites every `sort_order` to the same value it already has — an
ordering no-op. Without that reorder the sync would renumber by authoring order and silently swap which
two categories are hidden (Dinosaurs instead of Mythic Creatures).

**Additive and reversible**: no data is dropped; reverting means dropping the column and the `ORDER BY`.
Drizzle journal + `0006_snapshot.json` are hand-authored in the same style as 0005, and `db:generate`
must then report "No schema changes".

---

## 5. Dependencies & Order of Work

```
schema.ts ─┬─> migration 0006 ──> apply to Neon
           └─> writer.upsertTheme ──> scripts/seed/index.ts ──> seed --sync
service.listThemes ──> app/play/pull/page.tsx <── categories.ts (independent)
```

`categories.ts` has no dependencies and can be built and tested first. The migration must be applied
before `seed --sync` runs, and `seed/cards.json` must be reordered before that same sync.

---

## 6. Test Plan

| Test | Type | Covers |
|---|---|---|
| `recentCategories` returns `min(n, cap)` items | Property (fast-check) | NFR2 |
| every returned item is from the input, order preserved | Property | NFR2 |
| returned items are always the **last** `cap` of the input (the most recent) | Property | FR3/FR4 |
| `n <= cap` → returns the whole list unchanged | Property | FR3 edge |
| `cap <= 0` → returns `[]`; empty input → `[]` | Unit | Edge cases |
| `MAX_PULL_CATEGORIES === 8`, and 10 themes → 8 ending in the newest | Unit | FR3 |
| existing 174 tests | Regression | NFR5 |

Manual verification after deploy: pull screen shows 9 chips ending in Deep Sea Creatures, no Animals /
Mythic Creatures chip; My Galaxy still lists all 10; a Random pull can still yield an Animals card.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| `seed --sync` renumbers ordering and swaps which 2 are hidden | Reorder `seed/cards.json` to the backfilled order in the same commit; acceptance criterion 7 checks a post-sync no-op |
| `ctid` snapshot taken after some future reshuffle | Migration is applied once, immediately, from the same order verified on 2026-07-31 |
| Hand-authored drizzle snapshot drifts from schema | `pnpm db:generate` must report "No schema changes" (same gate as 0005) |
| Children lose access to Animals / Mythic Creatures | FR5 — Random and every ticket flow still draw from all 10 categories |

---

## 8. Design Decisions (confirm or override)

### D1. Backfill strategy

- **A)** Generic `ctid` snapshot — captures today's actual scan order on any DB, no hardcoded names.
  *(recommended, used in §4)*
- **B)** Hardcoded `CASE name WHEN 'Animals' THEN 0 …` list for the 10 known themes.
- **X)** Other

[Answer]: PROPOSED A

### D2. Expose `sortOrder` on the `Theme` type?

- **A)** No — `listThemes()` returns themes already ordered, and "most recent 8" is just the last 8.
  Keeps `Theme` unchanged, so the 5 test catalog fakes and every consumer stay untouched.
  *(recommended)*
- **B)** Yes — add `sortOrder: number` to `Theme`; more explicit, but ripples into 5 test fakes and
  every construction site of a `Theme` for no functional gain.
- **X)** Other

[Answer]: PROPOSED A

### D3. Where is the cap applied?

- **A)** Server-side in `app/play/pull/page.tsx`, so hidden categories are never serialized into the
  client payload. *(recommended)*
- **B)** Client-side inside `PullButton`.
- **X)** Other

[Answer]: PROPOSED A

### D4. Ordering elsewhere (FR6)

`listThemes()` is shared with My Galaxy, rewards and the admin catalog. Ordering them by `sortOrder`
changes their display order slightly (nothing is hidden).

- **A)** Accept — one consistent ordering everywhere, and it matches what those screens effectively
  show today. *(recommended)*
- **B)** Add a separate ordered read used only by the pull page, leaving other screens on the unordered
  read.
- **X)** Other

[Answer]: PROPOSED A

---

## 9. Extension Compliance Summary (Application Design stage)

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **N/A** | No new input, auth surface, secret, or external call. D3 further reduces exposure by not shipping hidden themes to the client. |
| Resiliency Baseline | **Compliant** | Migration is additive with a deterministic backfill, no data loss, and a documented revert path (§4, §7). |
| Property-Based Testing | **Compliant** | `recentCategories` is pure and generic; §6 defines its invariants as property tests. |

---

**Application design complete. Do you approve this design?**

A) Request Changes (describe what to change)
B) Approve and continue to Code Generation

[Answer]:
