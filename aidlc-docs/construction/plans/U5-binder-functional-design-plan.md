# U5 Binder & Collection — Functional Design Plan

**Unit**: U5 Binder & Collection
**Stories**: D1 (view binder grouped by theme), D2 (theme completion progress)
**Depends on**: U1 (schema, `themeProgress`), U2 (active child), U3 (pool reader)
**Extension**: PBT (progress math) — blocking.

Defaults recommended. Answer `[Answer]:` tags, then **/aidlc:approve**.

## Proposed shape (defaults)
- `app/play/binder/page.tsx` — active child's collection, grouped by theme.
- Per theme: progress (owned/total), owned cards with `xN`, unowned as locked slots.
- Tap owned card → detail (full card via U6 later; placeholder now).

## Questions

## Question 1 — Unowned cards in a theme
A) **Show locked silhouettes** for cards not yet owned (shows what's left to collect — motivating) (recommended)

B) Show only owned cards (hide the rest)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Progress display (D2)
A) **Count + bar**: "7 / 12" with a progress bar per theme, ✅ when complete (recommended)

B) Percentage only

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Card detail interaction
A) **Tap an owned card → detail view** (big card + fact + rarity; U6 adds effects) (recommended)

B) No detail; grid only

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Empty binder state
A) **Friendly nudge**: "No cards yet — go pull your first!" with a link to pull (recommended)

B) Just an empty grid

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Anything else for the binder?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [x] `U5-binder/functional-design/business-logic-model.md` (collection query + progress)
- [x] `U5-binder/functional-design/business-rules.md`
- [x] `U5-binder/functional-design/frontend-components.md` (binder grid, theme section, card slot, detail)

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
