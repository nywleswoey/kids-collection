# INCREMENT 21 — Pull Page: Most Recent 8 Categories + Random

## Requirement Verification Questions

**Intent (raw)**: "the pull page should always display the most recent 8 categories + random"
**Clarification already given**: "the current ordering that it appears is the 'recency'"

---

## Grounding facts (verified in code + prod DB, 2026-07-31)

- The chips live in `src/features/pull/PullButton.tsx` (lines 119–143): a `🎲 Random` chip
  followed by one chip per theme, fed by `themes` from `app/play/pull/page.tsx`.
- `listThemes()` (`src/features/pool/service.ts:20`) is `select().from(themes)` with **no `ORDER BY`**,
  and the `themes` table (`src/db/schema.ts:24`) has **no `createdAt` / sort column**.
- The order the child sees today is therefore whatever Postgres returns from an unordered scan.
  Queried against prod Neon just now, that is:

  | # | Theme (current on-page order) |
  |---|---|
  | 0 | Animals |
  | 1 | Mythic Creatures |
  | 2 | Dinosaurs |
  | 3 | Superheroes |
  | 4 | Country |
  | 5 | Famous People |
  | 6 | Weird Insects |
  | 7 | Special Plants |
  | 8 | Spooky Legends |
  | 9 | Deep Sea Creatures |

- Note this is **not** the same as `seed/cards.json` array order (there, Dinosaurs is index 1 and
  Mythic Creatures index 3). So "current order" and "seed order" disagree about which two categories
  fall off the end — hence Q2.
- Taking your clarification literally, "most recent 8" = rows 2–9 → **Dinosaurs … Deep Sea Creatures**,
  hiding **Animals** and **Mythic Creatures**.
- Chip selection is React state only (`useState("")`), not persisted — so there is no stale
  "selected but now hidden" category to handle.

**Concern to flag**: Postgres does not guarantee the order of an unordered `SELECT`. `pnpm seed --sync`
updates theme/card rows in place, and an update rewrites the tuple, which can move it in the heap scan.
So "the order it appears today" is observed behaviour, not a contract — it can silently reshuffle on a
future sync and change which 2 categories disappear. Q1 is about whether we pin it.

---

### Q1. How should "recency" be made durable?

- **A)** Freeze today's observed order into explicit data — reorder the `seed/cards.json` themes array
  to match the table above, add an explicit order to the theme rows, and make `listThemes()` sort by it.
  Children see exactly the order they see now, and it stops drifting. New categories append to the end
  = most recent. *(recommended)*
- **B)** Leave `listThemes()` unordered and just take the last 8 of whatever the DB returns.
  Zero schema change; accepts that a future `seed --sync` may reshuffle which 2 are hidden.
- **C)** Add a `created_at` timestamp column to `themes` (migration), backfill it to match today's
  order, and sort by it.
- **X)** Other (please describe after [Answer]: below)

[Answer]: C — "yes, add a created date or some ordering index" (2026-07-31).
Resolved as: add an explicit ordering column to `themes` (migration 0006), **backfilled to today's
observed on-page order** (the table above), `listThemes()` sorts by it, and `seed/cards.json` is
reordered to match so future `seed --sync` runs stay consistent and new categories append last.

---

### Q2. Which two categories should disappear from the pull page today?

- **A)** **Animals** and **Mythic Creatures** — i.e. literally the first two of the order the page
  shows right now. *(matches your clarification as written)*
- **B)** **Animals** and **Dinosaurs** — i.e. the first two in `seed/cards.json` authoring order,
  which is the true "oldest authored" pair.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — follows directly from Q1 ("the current ordering that it appears is the recency").
Confirm or override.

---

### Q1a (follow-up). Timestamp or integer?

You said "a created date **or** some ordering index" — these behave differently on backfill.

- **A)** `sort_order` **integer** on `themes` (0,1,2… = today's observed order; seed writes array
  position on every sync). Deterministic, no invented dates, and reordering later is a seed-file edit.
  *(recommended)*
- **B)** `created_at` **timestamp**. Truthful for future categories, but the backfill for the existing
  10 has to invent timestamps, since the real creation times were never recorded.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — integer `sort_order` column.

---

### Q3. Is the count of 8 fixed?

- **A)** Hardcode a named constant (`MAX_PULL_CATEGORIES = 8`) in code.
- **B)** Make it configurable via an env var so it can be changed without a deploy.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — named constant MAX_PULL_CATEGORIES = 8.

---

### Q4. What does 🎲 Random draw from once 2 categories are hidden?

- **A)** All 10 categories / all 300 cards — the hidden ones stay obtainable, just not directly
  pickable. *(recommended: nobody's existing collection becomes uncompletable)*
- **B)** Only the 8 visible categories — hidden categories become fully unobtainable from pulls.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — Random keeps drawing from all 10 categories, so no child's collection becomes uncompletable.

---

### Q5. How far does the change reach?

- **A)** Pull page only. My Galaxy (binder) tab bar, rarity filters, set-completion rewards and the
  admin catalog keep showing all 10 categories.
- **B)** Also cap the My Galaxy category tab bar to the same most-recent 8.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — pull page only; My Galaxy, rarity filters, set-completion rewards and admin catalog still show all 10.

---

### Q6. Easter Egg ticket pick-1-of-5 pool

The 🥚 Easter Egg ticket rolls a rarity and offers 5 cards of that rarity from across all categories.

- **A)** Unchanged — keeps drawing from all 10 categories.
- **B)** Restrict its 5 candidates to the 8 visible categories too.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — Easter Egg pick-1-of-5 unchanged (all categories).

---

### Q7. Delivery

- **A)** Build, test, and deploy to Vercel prod as part of this increment.
- **B)** Build and test locally only; I'll deploy later.
- **X)** Other (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — build, test, migrate and deploy to Vercel prod in this increment.

---

### Q8. Extension carry-forward

`aidlc-state.md` records Security Baseline = Yes, Resiliency Baseline = Yes, Property-Based Testing = Yes.

- **A)** Carry all three forward for this increment.
- **B)** Change one or more (please describe after [Answer]: below)

[Answer]: A (CONFIRMED 2026-07-31) — carry Security Baseline, Resiliency Baseline and Property-Based Testing forward.

---

**STATUS: all questions answered and confirmed 2026-07-31. No open ambiguities.**
