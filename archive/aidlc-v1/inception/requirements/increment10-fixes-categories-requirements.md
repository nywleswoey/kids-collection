# INCREMENT 10 — Requirements: Ticket Fixes, Buttons, New Categories

**Type**: Brownfield enhancement + bug fixes + content. **Cadence**: LIGHT (single increment).
**Scope decision (F1=B)**: This increment = items 1, 2, 3, 5, 6. Quizzes (item 4) deferred to **INCREMENT 11**.
**Source**: user request 2026-07-11 + answers in `increment10-quiz-categories-questions.md`.

## Extensions (from aidlc-state.md)
- Security Baseline: **Enabled** — N/A-heavy this increment (no new secrets/auth surface); reward grants stay parent-only server actions; category content is public.
- Resiliency Baseline: **Enabled** — seed sync stays idempotent/delta (existing behaviour).
- Property-Based Testing: **Enabled** — applies to any new pure logic (ticket-display selection, rarity assignment helper if added).

---

## FR1 — Show special tickets on child landing page (bug fix, item 1) — A1=C
- **Problem**: `/play/home` renders only `child.pullTokens`; epic/lucky special-ticket balances stored on `children` (Inc 9, migration 0002) are never shown → child with only special tickets sees "0 tickets ready".
- **Requirement**: Landing page shows the **normal pill** (`🎟️ N tickets ready`, unchanged) **plus one combined special pill** — e.g. `✨ N special tickets` — when the child has any epic+lucky > 0. Combined count = epic + lucky.
- **Detail**: Combined special pill hidden when epic+lucky = 0. Fetch special balances in the home page (currently not fetched) via `getSpecialBalances(child.id)`.
- **Acceptance**: Child with 2 epic + 1 lucky, 0 normal → home shows `🎟️ 0 tickets ready` and `✨ 3 special tickets`. Child with 0 special → no special pill.

## FR2 — Hide "ask parent" prompt when child has any ticket (item 2) — B1=A, B2=B
- **Problem**: pull screen shows *"You're out of tickets! Ask your parent for more."* gated on normal balance only; ignores special tickets.
- **Requirement (B1=A)**: Show the ask-parent message **only when the child has zero of every ticket type** (normal = 0 AND epic = 0 AND lucky = 0).
- **Requirement (B2=B)**: When normal = 0 but the child has special tickets → **do not** show ask-parent. Instead show the **special-egg buttons (✨/🍀)** and render the normal "Discover a card" button in a **disabled/greyed** state (child can see it but not use it without a normal ticket).
- **Acceptance**: normal=0, epic=1 → ask-parent hidden, ✨ button active, Discover button greyed/disabled. normal=0, epic=0, lucky=0 → ask-parent shown.

## FR3 — Buttons instead of text links everywhere (item 3) — C1=A
- **Requirement**: Convert **all** remaining user-facing text links (`link-soft` style) to button-styled controls (`btn`, e.g. `btn--ghost`). Known sites: binder card-detail back link (`app/play/binder/[cardId]/page.tsx`), profile-picker admin link (`app/play/page.tsx`). Audit for any other `link-soft`/bare `<a>` in the child-facing flow and convert.
- **Constraint**: Navigation semantics preserved (still routes via `<Link>`), only visual treatment becomes a button; keep it accessible (real link under the hood, button appearance).
- **Acceptance**: No `link-soft` text links remain in child-facing pages; each is a visible button.

## FR4 — New category: Country (item 5) — E1=A, E2=A, E3=A, E5=A, E6=A
- **Requirement**: Add a new theme **Country**, **30 cards**, uniform mix **15 common / 8 rare / 5 epic / 2 legendary**.
- **Card content (E2=A)**: each card = **one iconic landmark/item** of a country (NOT flag/map). ~30 kid-recognisable countries, globally spread. e.g. Japan→Mount Fuji, France→Eiffel Tower, Italy→Colosseum, Egypt→Pyramids, Australia→Sydney Opera House.
- **Rarity (E3=A)**: assigned by fame — most-recognised countries/items = common; lesser-known/exotic = higher rarity (legendary = 2 most obscure).
- **SG context (E5=A)**: global spread (Singapore may appear as one of the 30, e.g. Merlion).
- **Content pattern (E6=A)**: each card has `eduText` (true fact about the item/country) + `sourceUrl` + `imagePrompt`, same schema as existing themes. No schema change.

## FR5 — New category: Famous People (item 6) — E1=A, E4=A, E5=A, E6=A
- **Requirement**: Add a new theme **Famous People**, **30 cards**, uniform mix **15/8/5/2**.
- **Scope (E4=A)**: historical + inspiring figures across fields — scientists, explorers, artists, athletes, leaders. Kid-appropriate, educational. e.g. Einstein, Marie Curie, Neil Armstrong, Leonardo da Vinci, Nelson Mandela.
- **SG context (E5=A)**: global figures **plus a few Singapore figures** (e.g. Lee Kuan Yew, a notable SG athlete/artist).
- **Rarity**: by renown (most famous = common; niche = higher rarity).
- **Content pattern (E6=A)**: `eduText` (true fact) + `sourceUrl` + `imagePrompt`, same schema. No schema change.

## FR6 — Image generation for new categories (F2=A)
- **Requirement**: Generate ~**60 card images** (30 Country + 30 Famous People) via existing seed pipeline (`pnpm seed`, delta/`--sync` preserves existing kids' collections). Runs locally; costs image-gen API time.
- **Note**: Famous People images = respectful, kid-friendly portrait/illustration style; avoid photoreal likeness issues — use stylised illustration prompts.

---

## Non-Functional / Constraints
- **No DB schema migration** — both new categories reuse existing `themes`/`cards` tables; special-ticket columns already exist (Inc 9).
- Seed sync stays additive: adding two themes to `seed/cards.json` + `pnpm seed --sync` inserts new cards, existing themes/collections untouched. No theme pruning (all existing themes stay).
- Category count grows 4 → **6 themes** (Animals, Dinosaurs, Superheroes, Mythic Creatures, Country, Famous People) → 180 cards total. Galaxy tab bar + pull category chips (Inc 9) auto-render new themes (data-driven) — verify no layout break with 6 tabs.
- Zero new npm deps expected.
- Tests: keep suite green (currently 57/57); add coverage for FR1/FR2 ticket-display selection logic.

## Out of Scope (this increment)
- Educational quizzes (item 4) → INCREMENT 11.
- Quiz-topic dynamic generation / Claude API question banks (D7/D8) → INCREMENT 11.

## Traceability
| Item | FR | Key answer |
|---|---|---|
| 1 special tickets on landing | FR1 | A1=C combined pill |
| 2 hide ask-parent | FR2 | B1=A / B2=B |
| 3 buttons not links | FR3 | C1=A all |
| 5 Country category | FR4 | E2=A iconic item |
| 6 Famous People category | FR5 | E4=A global+SG |
| (content images) | FR6 | F2=A both |
