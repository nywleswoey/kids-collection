# U6 Card UI & Effects — Functional Design Plan

**Unit**: U6 Card UI & Effects
**Stories**: E1 (rarity reflected on card), E2 (holographic + 3D tilt + rarity-scaled), E3 (educational text, image-forward)
**Depends on**: U1 (Card type), consumed by U4 (pull reveal) + U5 (binder detail)
**Extensions**: Accessibility (reduced-motion) + Resiliency (low-end degrade).

Custom CSS + pointer/device-orientation (decided in Application Design — no animation lib). Defaults recommended. Answer, then **/aidlc:approve**.

## Proposed shape (defaults)
- `<Card card interactive reveal? />` — one component used everywhere.
- Rarity frame + holographic shimmer + 3D tilt from pointer/`deviceorientation`; intensity scales by rarity; honors `prefers-reduced-motion`.
- Replaces the U4/U5 `PullResultView` placeholders.

## Questions

## Question 1 — Effect triggers `[a11y]`
A) **Pointer move (mouse/touch drag) + device tilt (`deviceorientation`)**, disabled under reduced-motion (recommended)

B) Pointer only (skip device tilt)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Pull reveal animation (C2)
A) **Pack-open flip**: card back → suspense flip → front with a rarity flash (recommended)

B) Simple fade/scale-in

C) Card "burst" from a pack image

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Rarity intensity model
A) **Scaled by tier**: common = subtle sheen; legendary = strong holo + glow + animated shimmer (recommended)

B) Same effect for all rarities (just different frame color)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Replace placeholders
A) **Yes — replace `PullResultView` in both pull result and binder detail with `<Card>`** (recommended; single component)

B) Keep placeholders; add `<Card>` only for detail

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Anything else for card visuals?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [x] `U6-card-ui/functional-design/frontend-components.md` (Card, effect hooks, reveal)
- [x] `U6-card-ui/functional-design/business-rules.md` (rarity styling + a11y rules)

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
