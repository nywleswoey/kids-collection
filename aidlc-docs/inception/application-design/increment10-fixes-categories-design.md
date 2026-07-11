# INCREMENT 10 — Application Design

Brownfield, LIGHT. No new components/services beyond edits + seed data. No DB migration.

## FR1 — Special-ticket pill on landing (`app/play/home/page.tsx`)
- Add `getSpecialBalances(child.id)` fetch (import from `@/features/pull/token-service`).
- After the existing `token-balance` pill, render a **combined special pill** when `epic + lucky > 0`:
  - `<p className="pill pill--gold" data-testid="special-balance">✨ {epic+lucky} special ticket{n===1?"":"s"}</p>`
- Hidden when `epic+lucky === 0`. Normal pill unchanged.

## FR2 — Ask-parent gate (`src/features/pull/PullButton.tsx`)
- Add derived: `const hasAnyTicket = balance > 0 || epic > 0 || lucky > 0;`
- Replace the `outOfTokens ? <ask-parent> : <Discover button>` block:
  - Show **ask-parent message only when `!hasAnyTicket`** (all three = 0).
  - Otherwise always render the **Discover button**, but `disabled={pending || balance < 1}` and add a greyed class when `balance < 1` (e.g. append `btn--disabled`/`opacity-50`), so a child with only special tickets sees it greyed (B2=B). Keep `data-testid="pull-button"`.
- Special-egg buttons block (epic/lucky) unchanged — already renders when `epic>0||lucky>0`.
- Add small hint text under Discover when `balance<1 && (epic>0||lucky>0)`: "Use a special ticket! ✨" (optional, aids discoverability).
- Property-tested pure helper (PBT extension): extract `shouldShowAskParent(balance, epic, lucky) => balance===0&&epic===0&&lucky===0` for unit/PBT coverage.

## FR3 — Links → buttons (5 sites, C1=A)
Convert every `.link-soft` to button-styled control. Internal nav keeps `<Link>` with `className="btn btn--ghost"` (small where fitting); external source link keeps `<a>` with button style.
1. `app/play/binder/[cardId]/page.tsx:34` — "← Back to My Galaxy" → `btn btn--ghost` (the "binder" example).
2. `app/play/page.tsx:24` — profile-picker "Add one" → `btn btn--ghost btn--sm` (or inline button).
3. `app/admin/page.tsx:43` — admin "profiles" link → `btn btn--ghost`.
4. `src/features/card/CardModal.tsx:66` — source link (external) → `<a className="btn btn--ghost btn--sm">` (keep target/rel).
5. `src/features/admin/AdminCardSlot.tsx:51` — admin card-name source link → keep as small ghost button (`btn btn--ghost`), preserve truncate.
- Leave `.link-soft` CSS class in `globals.css` (harmless) or remove if unused after — verify no other refs.

## FR4/FR5 — Two new themes (seed `seed/cards.json`, 30 cards each, mix 15c/8r/5e/2l)
Data-only. Galaxy tabs (`GalaxyView`) + pull chips render themes from DB automatically → no UI code for new categories. Each card: `{name, rarity, eduText (true kid fact), imagePrompt (stylised illustration), sourceUrl (real Wikipedia URL)}`.

### Country roster (card = iconic item; rarity by fame)
**common (15)**: France·Eiffel Tower, Italy·Colosseum, Egypt·Pyramids of Giza, USA·Statue of Liberty, China·Great Wall, Japan·Mount Fuji, India·Taj Mahal, Australia·Sydney Opera House, UK·Big Ben, Brazil·Christ the Redeemer, Greece·Parthenon, Singapore·Merlion, Netherlands·Windmill, Mexico·Chichén Itzá, Russia·St. Basil's Cathedral
**rare (8)**: Germany·Neuschwanstein Castle, Spain·Sagrada Família, Peru·Machu Picchu, Jordan·Petra, Thailand·Wat Arun, South Korea·Gyeongbokgung Palace, Canada·CN Tower, UAE·Burj Khalifa
**epic (5)**: Cambodia·Angkor Wat, Turkey·Hagia Sophia, Indonesia·Borobudur, Morocco·Koutoubia Mosque, Ireland·Cliffs of Moher
**legendary (2)**: Bhutan·Tiger's Nest Monastery (Paro Taktsang), Mali·Great Mosque of Djenné

### Famous People roster (kid-appropriate; rarity by renown; global + 3 SG per E5=A)
**common (15)**: Albert Einstein, Isaac Newton, Leonardo da Vinci, Marie Curie, Neil Armstrong, Nelson Mandela, Mahatma Gandhi, William Shakespeare, Charles Darwin, Thomas Edison, Wolfgang Amadeus Mozart, Vincent van Gogh, Abraham Lincoln, Cleopatra, **Lee Kuan Yew (SG)**
**rare (8)**: Galileo Galilei, Florence Nightingale, The Wright Brothers, Rosa Parks, Amelia Earhart, Nikola Tesla, Ada Lovelace, **Joseph Schooling (SG)**
**epic (5)**: Katherine Johnson, Jane Goodall, Ferdinand Magellan, Confucius, **Yusof Ishak (SG)**
**legendary (2)**: Hypatia, Zheng He

SG figures = Lee Kuan Yew, Joseph Schooling, Yusof Ishak (3, satisfies E5=A). Famous-People images: stylised illustrated portraits (not photoreal) — kid-friendly, avoids likeness issues.

## FR6 — Image generation
Append both themes to `seed/cards.json`; run `pnpm seed --sync` locally (delta: inserts new cards, existing themes/collections untouched). ~60 image-gen calls. Prod: run seed against prod after deploy (same as prior content work).

## Layout check
6 themes now → verify GalaxyView tab bar + PullButton category chips wrap cleanly (flex-wrap already present). No code change expected; visual QA in Build & Test.

## Tests
- New PBT/unit: `shouldShowAskParent` (FR2) + special-pill visibility helper (FR1).
- Keep 57/57 green. Seed-schema unchanged → loader test still valid with 6 themes.

## Files touched
Edits: `app/play/home/page.tsx`, `src/features/pull/PullButton.tsx`, `app/play/binder/[cardId]/page.tsx`, `app/play/page.tsx`, `app/admin/page.tsx`, `src/features/card/CardModal.tsx`, `src/features/admin/AdminCardSlot.tsx`, `seed/cards.json`. New: small helper (FR2) + its test. Zero new deps. No migration.
