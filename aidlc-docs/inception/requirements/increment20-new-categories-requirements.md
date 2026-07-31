# Increment 20 — Two New Card Categories

**Type**: Brownfield, content-only
**Depth**: Standard
**Date**: 2026-07-31

## Intent

> "i want to create a new category for things like werewolf, frankenstein, dracula
> etc and also a category deep sea creatures"

Two new card categories (themes) join the pool: a classic-monster/folklore theme
and a deep-ocean theme.

## Scope finding — why this is data-only

A "category" in this app is a row in `themes`, sourced entirely from
`seed/cards.json` and upserted by `scripts/seed/index.ts` (`upsertTheme`).
Grepping every existing theme name ("Animals", "Dinosaurs", "Superheroes",
"Mythic Creatures", "Country", "Famous People", "Weird Insects", "Special
Plants") across all `.ts`/`.tsx` returns **zero** hits — the galaxy tab bar,
pull chips, rarity filters and set-completion reward all read themes from the
DB. Therefore:

- **No schema migration.** `themes` / `cards` already model this.
- **No application code change.** Both categories appear in the galaxy tab bar,
  pull category chips and set-completion logic automatically.
- The unit of work is authoring 60 cards and running one seed pass.

## Decisions (from increment20-new-categories-questions.md)

| # | Decision |
|---|---|
| Q1=D | Monster theme is named **"Spooky Legends"** |
| Q2=B | Playfully spooky art — Halloween-costume vibe, big eyes, never frightening |
| Q3=A | Ocean theme is named **"Deep Sea Creatures"** |
| Q4=A | 30 cards per theme, pyramid 15 common / 8 rare / 5 epic / 2 legendary |
| Q5=A | No name overlap with `Animals`; deep-sea theme uses true deep/mid-water species only |
| Q6=A | Fictional monsters get a folklore/literary fact and a real Wikipedia `sourceUrl` |
| Q7=B | Publish straight through `pnpm seed --sync` (no `--review` pass) |
| Q8=A | Seed prod, then deploy to Vercel prod |
| Q9=B | Close Increment 19's Operations gate at the end of this increment |

## Functional Requirements

- **FR1** — `seed/cards.json` gains a theme `"Spooky Legends"` with exactly 30
  cards: 15 common, 8 rare, 5 epic, 2 legendary.
- **FR2** — `seed/cards.json` gains a theme `"Deep Sea Creatures"` with exactly
  30 cards at the same pyramid.
- **FR3** — Every new card carries all five seed fields (`name`, `rarity`,
  `eduText`, `imagePrompt`, `sourceUrl`) and validates against
  `seedFileSchema`.
- **FR4** — Card names are unique within each new theme, and no new card name
  collides with an existing card in **any** theme (Q5=A; also keeps the deep-sea
  theme disjoint from `Animals`, and Spooky Legends disjoint from
  `Mythic Creatures` — no Yeti, Banshee, Troll, Goblin, Basilisk or Kraken).
- **FR5** — Every `sourceUrl` is a real, resolvable Wikipedia article backing the
  fact or naming the legend's origin.
- **FR6** — Running `pnpm seed --sync` generates an image for each of the 60 new
  cards, uploads it to Blob and inserts the card. Existing cards are untouched
  (text-only update), and **nothing is pruned** — the seed is purely additive.

## Non-Functional Requirements

- **NFR1 (kid safety)** — No `imagePrompt` may contain weapons, blood, gore, or
  frightening imagery; the fixed `ART_STYLE` suffix
  ("vibrant kid-friendly cartoon trading-card illustration, bright colors,
  friendly, clean background, no text") is appended to all of them. Spooky
  Legends prompts explicitly steer cute/comical (a smiling vampire, a clumsy
  zombie, a gentle Frankenstein's monster holding a flower).
- **NFR2 (kid safety, content)** — Folklore chosen for wholesomeness. Excluded
  as too dark for the audience: La Llorona, Krampus, Wendigo.
- **NFR3 (truthfulness)** — `eduText` for real species is factually accurate;
  for fiction it describes the *story or folklore*, never presents fiction as
  fact.
- **NFR4 (readability)** — `eduText` ≤ ~120 characters, readable by a 7-year-old
  (matches the existing corpus, whose longest entry is 110 chars).
- **NFR5 (idempotence)** — Re-running the seed inserts nothing new
  (`insertCardIfNew` + `cardExists`).
- **NFR6 (no regression)** — `pnpm typecheck`, `pnpm test` (174) and
  `pnpm build` stay green; zero new dependencies.

## Out of Scope

- Any change to pull weighting, rarity odds or the easter-egg system.
- Reorganising the existing `Animals` theme (Q5=A explicitly rejects moving its
  sea life, which would delete cards out of children's collections).

## Stages skipped and why

| Stage | Decision |
|---|---|
| Reverse Engineering | SKIP — artifacts exist from earlier increments |
| User Stories | SKIP — no new user-facing behaviour; content only |
| Application Design | SKIP — no new components, methods or dependencies |
| Units Generation | SKIP — single unit |
| Functional / NFR / Infrastructure Design | SKIP — no new runtime surface |
