# U6 Card UI & Effects — Code Generation Plan

**Unit**: U6 Card UI & Effects
**Stories**: E1 (rarity styling), E2 (holo + 3D tilt), E3 (educational text, image-forward)
**Depends on**: U1 (Card type). Consumed by U4 (pull) + U5 (binder detail).
**Code at workspace root**; doc summary → `aidlc-docs/construction/U6-card-ui/code/`.

## Steps

- [ ] **Step 1 — Rarity styles + CSS**
  `src/features/card/rarity.ts` (pure `rarityClass(rarity)`, per-tier config), `src/features/card/card.css` (frames, holographic keyframes, tilt transform via CSS vars, `prefers-reduced-motion` disable).

- [ ] **Step 2 — useCardTilt hook**
  `src/features/card/useCardTilt.ts` — pointer + `deviceorientation` listeners, rAF-throttled writes to `--rx/--ry/--mx/--my`; no-op under reduced motion; cleanup; iOS permission-safe.

- [ ] **Step 3 — Card component**
  `src/features/card/Card.tsx` (client) — rarity frame + image (next/image, image-forward) + name + rarity badge + eduText; `interactive` wires useCardTilt + holo sheen; sizes sm/lg. testids.

- [ ] **Step 4 — RevealCard**
  `src/features/card/RevealCard.tsx` (client) — pack-open flip → front → interactive Card; reduced-motion skips flip.

- [ ] **Step 5 — Replace placeholders (Q4)**
  Update `src/features/pull/PullButton.tsx` → use `RevealCard`. Update `app/play/binder/[cardId]/page.tsx` → use `<Card interactive size="lg">`. Remove/retire `PullResultView` (or keep as fallback).

- [ ] **Step 6 — Tests**
  `tests/card.test.ts` — `rarityClass` mapping (pure); reduced-motion branch of tilt logic (extract the "should animate" decision as a pure helper).

- [ ] **Step 7 — Docs**
  `aidlc-docs/construction/U6-card-ui/code/summary.md`; README status.

## Story traceability
- E1 → Steps 1,3. E2 → Steps 1,2,3. E3 → Step 3. C2 reveal → Steps 4,5.

## Scope
7 steps, ~9 files. No new deps.

---
Approve to generate (**/aidlc:approve**), or request changes.
