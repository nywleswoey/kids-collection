# INCREMENT 21 — Pull Page: Most Recent 8 Categories + Random

**Status**: AWAITING APPROVAL (Requirements Analysis gate)
**Date**: 2026-07-31
**Type**: Brownfield Enhancement (+ small schema migration)
**Depth**: Standard
**Cadence**: LIGHT — single increment

---

## 1. Intent Analysis

| Dimension | Assessment |
|---|---|
| Raw request | "the pull page should always display the most recent 8 categories + random" |
| Clarification | "the current ordering that it appears is the 'recency'" · "yes, add a created date or some ordering index" |
| Request clarity | Clear (after Q1/Q1a resolved the recency definition) |
| Request type | Enhancement (UI cap) + minor schema addition |
| Scope | Multiple components — `themes` schema + migration, `listThemes()`, seed writer/script, pull page, `PullButton` |
| Complexity | Simple-to-Moderate |
| Risk | Low — no gameplay/economy change; pull odds and card pool untouched |

**Why now**: the catalog reached 10 categories in Increment 20. The pull screen renders one chip per
category plus Random, so the chip row keeps growing and crowds a small phone screen. Capping the row to
the 8 most recent keeps it readable while surfacing the newest content, which is what a returning child
is most likely to want.

---

## 2. Current Behaviour (verified 2026-07-31)

- `app/play/pull/page.tsx:38` passes **every** theme from `listThemes()` into `PullButton`.
- `PullButton.tsx:119–143` renders `🎲 Random` then one `CategoryChip` per theme — currently 11 chips.
- `listThemes()` (`src/features/pool/service.ts:20`) is `select().from(themes)` with **no `ORDER BY`**;
  `themes` (`src/db/schema.ts:24`) has only `id` and `name` — **no ordering column**.
- Observed prod order today (this is what children see, and per Q1 it *is* the recency order):

  `0 Animals · 1 Mythic Creatures · 2 Dinosaurs · 3 Superheroes · 4 Country · 5 Famous People ·
   6 Weird Insects · 7 Special Plants · 8 Spooky Legends · 9 Deep Sea Creatures`

- This differs from `seed/cards.json` array order (Dinosaurs 1, Mythic Creatures 3), so the two
  definitions disagree about which categories are "oldest". Q2 resolved this in favour of the
  observed order.
- Chip selection is component state (`useState("")`), not persisted — no stale-selection edge case.
- `upsertTheme(name)` (`src/features/pool/writer.ts:26`) creates themes by name; `seed --sync` walks
  `seed.themes` in array order.

**Defect this increment also closes**: relying on an unordered `SELECT` is not a stable contract.
`seed --sync` updates rows in place, and an update rewrites the tuple, which can move it in a heap
scan — so the chip order (and, once capped, *which* categories vanish) could reshuffle silently.

---

## 3. Confirmed Decisions

| # | Question | Answer |
|---|---|---|
| Q1 | Durable recency | **C** — explicit ordering column on `themes`, backfilled to observed order |
| Q1a | Timestamp vs index | **A** — integer `sort_order` |
| Q2 | Which 2 drop off today | **A** — Animals, Mythic Creatures |
| Q3 | Count of 8 | **A** — named constant `MAX_PULL_CATEGORIES = 8` |
| Q4 | Random draw pool | **A** — all 10 categories, unchanged |
| Q5 | Blast radius | **A** — pull page only |
| Q6 | Easter Egg pick pool | **A** — unchanged, all categories |
| Q7 | Delivery | **A** — build, test, migrate, deploy to Vercel prod |
| Q8 | Extensions | **A** — Security, Resiliency, PBT all carried forward |

---

## 4. Functional Requirements

### FR1 — Explicit theme ordering
`themes` gains a non-null integer `sort_order` column (migration 0006). Higher value = more recent.
Existing rows are backfilled to the observed order in §2 (Animals = 0 … Deep Sea Creatures = 9), so no
child sees the chip order change apart from the cap in FR3.

### FR2 — Ordering is maintained by the seed
`upsertTheme` accepts the theme's position in `seed/cards.json` and writes it to `sort_order` on both
insert and update. `seed/cards.json` is reordered to match the backfilled order in FR1, so a
`seed --sync` immediately after the migration is a no-op with respect to ordering. A category appended
to the end of `seed/cards.json` therefore becomes the most recent.

### FR3 — Pull page shows only the most recent 8 categories
The pull screen renders `🎲 Random` plus at most `MAX_PULL_CATEGORIES = 8` category chips, selected as
the highest `sort_order` values. With today's data that hides **Animals** and **Mythic Creatures**.
When 8 or fewer categories exist, every category is shown (no behaviour change).

### FR4 — Chip order within the visible set
The 8 visible chips keep the same relative order children see today (oldest-of-the-visible first,
newest last) — i.e. `Dinosaurs · Superheroes · Country · Famous People · Weird Insects ·
Special Plants · Spooky Legends · Deep Sea Creatures`. Random stays first.

### FR5 — Hidden categories remain fully obtainable
🎲 Random continues to draw from all cards in all categories. Easter Egg ticket pick-1-of-5, rarity
weighting, sacrifice-upgrade and set-completion rewards are unchanged. No child's collection becomes
uncompletable.

### FR6 — Everything outside the pull page is unchanged
My Galaxy category tab bar, rarity filters, binder, set-completion rewards and the admin catalog
continue to show all categories. Ordering there follows the new `sort_order` for consistency, but no
category is hidden.

### FR7 — Explicit selection of a hidden category is impossible from the pull page
Since a hidden category has no chip and selection is component state, no code path can submit a pull
scoped to a hidden theme from this screen. Server-side pull remains capable of a themed pull (used by
Random and other flows) — no server restriction is added.

---

## 5. Non-Functional Requirements

- **NFR1 (Usability)** — the chip row must remain readable and tappable on a small phone screen;
  no horizontal overflow introduced.
- **NFR2 (Correctness / Property-Based Testing extension)** — the selection rule is pure and
  unit-testable: given N categories and a cap of K, it returns `min(N, K)` categories, always the
  highest `sort_order`, order-preserving, and never returns a category absent from the input.
- **NFR3 (Data integrity / Resiliency extension)** — migration 0006 is additive with a deterministic
  backfill; it must leave all 10 themes, 300 cards and every child collection untouched. Verify
  row counts before and after.
- **NFR4 (Security extension)** — no new user input, no new network surface, no secret handling;
  the increment is expected to be N/A against most security rules, to be confirmed at each gate.
- **NFR5 (No regression)** — typecheck clean, full suite green (174/174 today, plus new tests),
  `next build` succeeds, zero new dependencies.
- **NFR6 (Reversibility)** — hiding is presentation-only. Reverting the constant or re-ordering
  `seed/cards.json` restores prior behaviour without data loss.

---

## 6. Out of Scope

- Changing pull odds, rarity weights, ticket economics or card content.
- Any per-child or admin-configurable category visibility.
- Pagination, scrolling or a "show all" affordance for hidden categories on the pull page.
- Retiring or deleting the hidden categories from the pool.

---

## 7. Acceptance Criteria

1. `themes.sort_order` exists, is non-null, and matches §2's order for the 10 existing themes.
2. `listThemes()` returns themes deterministically ordered by `sort_order`.
3. The pull screen shows exactly 9 chips: `🎲 Random` + 8 categories, ending with Deep Sea Creatures.
4. Animals and Mythic Creatures have no chip on the pull screen.
5. My Galaxy still shows all 10 categories.
6. A pull with Random can still yield an Animals or Mythic Creatures card.
7. `pnpm seed --sync` after the migration reports 0 pruned themes/cards and leaves ordering unchanged.
8. Typecheck clean, all tests green (including new tests for the selection rule and ordering), build ✅.

---

## 8. Traceability

| Requirement | Source |
|---|---|
| FR3, FR4 | Raw intent + Q2 |
| FR1, FR2 | Q1 = C, Q1a = A |
| FR5 | Q4 = A, Q6 = A |
| FR6 | Q5 = A |
| FR7 | Derived from FR3 (verification-only) |
| NFR2 | Property-Based Testing extension (Q8) |
| NFR3 | Resiliency Baseline extension (Q8) |
| NFR4 | Security Baseline extension (Q8) |

---

## 9. Extension Compliance Summary (Requirements stage)

| Extension | Status | Rationale |
|---|---|---|
| Security Baseline | **N/A at this stage** | No new input, auth surface, secret or external call. Re-checked at Design and Code Generation. |
| Resiliency Baseline | **Compliant** | NFR3 mandates an additive migration with deterministic backfill and pre/post row-count verification. |
| Property-Based Testing | **Compliant** | NFR2 defines the pure selection rule and its invariants for property tests. |

---

**Requirements analysis complete. Do you approve these requirements?**

A) Request Changes (describe what to change)
B) Approve and continue to Application Design

[Answer]:
