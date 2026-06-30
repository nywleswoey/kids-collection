# U1 Foundation & Data — Functional Design Plan

**Unit**: U1 Foundation & Data
**Scope**: Domain model + data schema that every other unit builds on (themes, cards, children, collections, tokens). Technology-agnostic business logic here; Drizzle/SQL specifics come at Code Gen.

A few data-model decisions need your call (defaults recommended). Answer the `[Answer]:` tags, then **/aidlc:approve**.

---

## Proposed domain entities (defaults)
- **Theme**: id, name. (one-to-many cards)
- **Card**: id, themeId, name, rarity ∈ {common, rare, epic, legendary}, imageUrl, eduText.
- **Child**: id, name, avatar, pullTokens (balance).
- **CollectionEntry**: childId, cardId, count (unique per child+card). Duplicates = count++.

---

## Questions

## Question 1 — Rarity drop weights (the pull distribution) `[PBT]`
Drives `drawCard`. Proposed:

A) **Common 60% / Rare 25% / Epic 12% / Legendary 3%** (recommended)

B) Flatter: 50 / 30 / 15 / 5

C) I'll specify exact numbers

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — New child starting token balance
A) **0** — parent must grant pulls (matches your reward-system intent) (recommended)

B) Small starter (e.g. 3) so a new child can try immediately

X) Other (please describe after [Answer]: tag below)

[Answer]: 3

## Question 3 — Avatars for child profiles
A) **Preset set** — choose from a fixed pack of fun illustrations/emoji (no upload; simplest + safest) (recommended)

B) Photo upload (parent uploads a picture → Blob)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Duplicate storage model `[PBT]`
A) **One row per child+card with a `count`** (xN); increment on duplicate (recommended)

B) One row per pulled instance (multiple rows)

X) Other (please describe after [Answer]: tag below)

[Answer]:A

## Question 5 — Anything else for the data model? (e.g. track pull history/timestamps?)
A) **No history** — just balances + collection counts (simplest) (recommended)

B) Keep a pull log (timestamped pulls) for a future "recent pulls" view

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Artifacts to generate after approval
- [x] `U1-foundation-data/functional-design/domain-entities.md`
- [x] `U1-foundation-data/functional-design/business-rules.md`
- [x] `U1-foundation-data/functional-design/business-logic-model.md`

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
