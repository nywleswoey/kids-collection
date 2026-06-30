# U3 Pool & Seeding — Functional Design Plan

**Unit**: U3 Card Pool & Seeding
**Story**: G2 (pool seeded & safe), provides the pool for C1 (pulling)
**Depends on**: U1 (themes/cards tables, Blob). Resiliency: directional (seed retries/fallback).

This unit builds the **offline seed pipeline**: card text authored via a claude.ai prompt → JSON; images via **Pollinations.ai** (free, no key) → Vercel Blob; loaded into Postgres. Reviewed before publish. Answer the questions, then **/aidlc:approve**.

## Proposed shape (defaults)
- `seed/cards.json` — authored card data (theme, name, rarity, eduText, imagePrompt).
- `scripts/seed/` — generate images (Pollinations) → upload Blob → upsert themes+cards (idempotent).
- Review step: generate images to a local/preview folder first; publish on confirm.

## Questions

## Question 1 — Launch themes + size
A) **3 themes × ~12 cards** = 36 cards: **Animals**, **Superheroes**, **Mythic Creatures** (pokemon-like) (recommended — enough to collect, small to seed)

B) Bigger: 4–5 themes × ~15 cards

C) Start tiny: 2 themes × 8 cards (fastest to test)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Rarity spread per theme `[PBT-adjacent]`
A) **Pyramid**: ~6 common / 3 rare / 2 epic / 1 legendary per 12-card theme (recommended)

B) Even-ish spread

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Art style for the images
A) **Vibrant kid-friendly cartoon/illustration** (bright, friendly, trading-card look) (recommended)

B) Painterly/realistic

C) Pixel/retro game art

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Card text authoring
A) **I (Claude) provide a single prompt** you paste into claude.ai; it outputs the full `cards.json`; you commit it. I scaffold the schema + a sample. (recommended; matches your Q16b)

B) You give me the card names; I write the JSON text directly here

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Seed run + safety
A) **Idempotent + review-before-publish**: re-running is safe (skip existing); images generated for review first, published on confirm (recommended)

B) Simple one-shot seed (no review gate)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6 — Anything else for the pool/seeding?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [ ] `U3-pool-seeding/functional-design/domain-entities.md` (seed card shape)
- [ ] `U3-pool-seeding/functional-design/business-rules.md` (seed/publish rules)
- [ ] `U3-pool-seeding/functional-design/business-logic-model.md` (pipeline steps)

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
