# INCREMENT 17 — Collection-Reward Modal Re-appears (Bugfix)

**Type**: Bugfix on Inc16 FR5. Cadence: LIGHT (minimal). No migration, no deps, no schema.

## Symptom
The collection-completion celebration dialog appears **every time** the child returns to "My Galaxy", instead of once per reward.

## Root cause
`markRewardsShown` (`src/features/rewards/service.ts`) used a raw
`sql\`${collectionRewards.id} = ANY(${ids})\`` predicate. Drizzle bound the JS
string array `ids` as a single parameter, so the `ANY(...)` matched **no rows** —
`shownAt` was never set. `getPendingRewards` (filters `shownAt IS NULL`) therefore
kept returning the same rewards on every galaxy load, re-triggering the modal.

## Fix
Replace the raw predicate with drizzle's `inArray(collectionRewards.id, ids)`,
which binds each id correctly. `shownAt` now persists → the modal shows once.

## Scope / impact
- One-line predicate change + import. No behaviour change beyond correct dedup.
- No migration, no seed, zero deps.
- Existing 99/99 tests stay green (the bug is in a DB query; no PBT harness for it —
  covered by manual QA below).

## Manual QA
1. Complete a rarity set → modal fires on next galaxy view.
2. Dismiss, navigate away, return to "My Galaxy" → modal does **not** re-appear.
3. A newly-earned reward still fires once.
