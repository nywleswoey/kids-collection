# INCREMENT 7 — UX Polish: Code Summary

Cadence LIGHT. typecheck clean · 52/52 tests · build ✅ · zero new deps.

## FR1 — Pull cycling (slot-machine)
- NEW `src/features/pull/CardRoulette.tsx` — flashes real card fronts (ease-out schedule ~2.5s), lands on pulled card, calls `onDone`. Reduced-motion skips (`shouldAnimate()`).
- `src/features/pull/PullButton.tsx` — new `flashPool` prop + `cycling` state; normal (non-egg) pull shows `CardRoulette` before `RevealCard`. Egg path unchanged.
- `app/play/pull/page.tsx` — passes `flashPool` = `listCards()` fronts `{id,imageUrl,rarity}`.

## FR2 — Larger picker avatar
- `src/features/profiles/ProfileCard.tsx` — avatar `h-20 w-20 text-4xl` → `h-28 w-28 text-7xl`; card `h-44 w-40` → `h-52 w-44`. (Cat preset already existed.)

## FR3 — Edit profile name/icon (admin)
- NEW `src/features/profiles/ProfileRow.tsx` (client) — read row with Edit/Remove; Edit toggles inline `ProfileForm(initial)` + Cancel.
- `src/features/profiles/ProfileForm.tsx` — optional `onDone` (collapse editor on submit).
- `app/admin/profiles/page.tsx` — rows render `ProfileRow`. Reuses existing `updateProfileAction`/`updateChild` (parent + passcode gated; no new server logic).

## FR4 — Stable ordering
- `src/features/profiles/service.ts` — `listChildren()` now `.orderBy(asc(children.name))`. Fixes grant re-shuffle (heap-order). No migration.

## FR5 — Accessible galaxy back
- `app/play/binder/page.tsx` — `← Home` moved into sticky header (`sticky top-3 z-10`); removed bottom link.

## Test note
FR4 is a DB order-by clause; test harness is pure-logic (no DB), so verified by inspection + build. FR1/FR2/FR5 presentational — covered by typecheck + existing suite.
