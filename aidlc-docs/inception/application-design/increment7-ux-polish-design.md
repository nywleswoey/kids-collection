# INCREMENT 7 — UX Polish & Fixes: Application Design (LIGHT)

Design decisions per FR. Minimal-surface, reuse-first.

## FR1 — Pull cycling (slot-machine)
**New component**: `src/features/pull/CardRoulette.tsx` (client).
- Props: `finalCard: Card`, `pool: Card[]` (card fronts to flash), `onDone: () => void`.
- Behavior: render a single card-sized frame swapping the shown card art on an interval that **starts fast (~60ms) and eases out** over ~2.5s, ending on `finalCard`. Use `requestAnimationFrame` or escalating `setTimeout` (no new dep).
- Sound: reuse a tick/whoosh from `useSound` (e.g. `flip`/`click`) on cadence; no new assets required.
- Reduced-motion: if `!shouldAnimate()`, call `onDone()` immediately (no cycle).

**Wiring in `PullButton`**: after `pullAction()` returns a non-egg outcome, gate the `RevealCard` behind a `cycling` state. Show `CardRoulette` first; on its `onDone`, render existing `RevealCard`. Pool source: pass the card list already available client-side, or a lightweight subset from the outcome. If no pool handy, flash from a small static set of fronts fetched with the outcome — keep it simple: reuse `outcome.choices`-style data if present, else the pulled card repeated with rarity-frame flicker.
- **Decision**: fetch/flash real fronts from the existing binder/pool data already loaded on the pull page; if not trivially available, `CardRoulette` accepts an optional `pool` and degrades to a rarity-frame shuffle. Implementer picks the cleanest available data source on the pull page.

## FR2 — Larger avatar (ProfileCard)
- Bump `hero-avatar` from `h-20 w-20 text-4xl` → `h-28 w-28 text-6xl` (or similar), widen card if needed (`w-40`→`w-44`) so layout stays balanced. Purely presentational.

## FR3 — Edit profile (admin)
- In `app/admin/profiles/page.tsx`, per row add an **Edit** toggle. Since the page is a server component, add a tiny client wrapper `ProfileRow.tsx` (client) that holds `editing` state and renders either the read row or `<ProfileForm initial={{id,name,avatar}} />`.
- No server changes — `updateProfileAction` + `updateChild` already exist and are guarded.
- After save, `ProfileForm`'s action revalidates/redirects as it already does.

## FR4 — Stable ordering
- `listChildren()`: add `.orderBy(children.name)` (Drizzle `asc`). Deterministic, migration-free.
- Test: insert profiles out of order, grant tokens to a middle one, assert `listChildren()` order unchanged and alphabetical.

## FR5 — Galaxy back button
- Move `<Link href="/play/home">← Home</Link>` into the `<header>` panel of `app/play/binder/page.tsx` (left side, before/around the title). Make header `sticky top-0 z-10` with a subtle backdrop so it stays reachable. Remove the trailing bottom link.

## Test Impact
- FR4: new unit/integration test for ordering.
- FR1/FR2/FR5: presentational — smoke/component render assertions if cheap; rely on typecheck + existing suite otherwise.
- No test regressions expected elsewhere.

## Risk
- Low. FR1 is the only netnew logic; isolated behind a `cycling` gate with reduced-motion escape hatch. All others are small edits/reuse.
