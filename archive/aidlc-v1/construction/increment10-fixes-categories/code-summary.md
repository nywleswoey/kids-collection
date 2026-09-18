# INCREMENT 10 — Code Generation Summary

Status: typecheck clean · **61/61 tests** (stable ×3) · build ✅ · zero new npm deps · no migration · no client-bundle secret leak · no `link-soft` left in views.

## Changes

### FR1 — special-ticket pill on landing
- `app/play/home/page.tsx`: fetch `getSpecialBalances(child.id)`; render combined `✨ N special ticket(s)` pill when `epic+lucky > 0`. Fixes the "0 tickets" bug for children holding only special tickets.

### FR2 — ask-parent gate + greyed Discover
- `src/features/pull/ticket-display.ts` (NEW): pure `shouldShowAskParent(balance, epic, lucky)` + `specialTicketTotal(epic, lucky)` (property-tested).
- `src/features/pull/PullButton.tsx`: ask-parent message shows only when `shouldShowAskParent` (all ticket types 0). Otherwise Discover button always renders — disabled + greyed (`opacity-50`) when `balance < 1`. Added hint "use a special ticket below! ✨" when out of normal but holding special (B2=B).

### FR3 — links → buttons (all 5 `link-soft` sites)
- `app/play/binder/[cardId]/page.tsx` (back-to-galaxy — the "binder" case), `app/play/page.tsx` + `app/admin/page.tsx` (Add-one → button in a flex column), `src/features/card/CardModal.tsx` + `src/features/admin/AdminCardSlot.tsx` (source links → `btn btn--ghost`). `.link-soft` CSS left in `globals.css` (now unused, harmless).

### FR4/FR5 — two new themes (`seed/cards.json`)
- **Country** (30: 15/8/5/2) — iconic item per country, rarity by fame (Eiffel/Colosseum/Pyramids → Angkor Wat/Hagia Sophia → Bhutan Tiger's Nest, Mali Djenné).
- **Famous People** (30: 15/8/5/2) — global figures + 3 SG (Lee Kuan Yew common, Joseph Schooling rare, Yusof Ishak epic). Stylised cartoon-portrait `imagePrompt`s (not photoreal).
- Each card: true kid-friendly `eduText` + real Wikipedia `sourceUrl`. Validated by `loadSeed` (6 themes, 180 cards).

### Incidental fix
- `src/features/pull/sacrifice.ts`: clamp `pickUpgradeCard` index — `rng()` returning exactly 1 (fast-check `fc.double({max:1})`) indexed out of bounds, making `sacrifice.pbt` flaky. `Math.random()` never hits 1 so prod was safe; clamp makes the helper robust and the suite deterministic.

### Tests
- `tests/ticket-display.pbt.test.ts` (NEW): PBT for both helpers.

## Remaining (Build & Test / Operations)
- **Image generation not yet run** — `pnpm seed --sync` locally to generate ~60 Country + Famous People card images (delta: existing themes/collections untouched), then run against prod DB after deploy. Until seeded, the two new categories have no cards in the DB.
- Visual QA: 6-tab GalaxyView + pull chips wrap.
