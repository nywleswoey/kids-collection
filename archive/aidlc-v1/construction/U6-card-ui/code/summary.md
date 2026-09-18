# U6 Card UI & Effects — Code Summary

## Files created
- `src/features/card/rarity.ts` — `rarityClass`, `RARITY_LABEL`, `shouldAnimate` (reduced-motion check)
- `src/features/card/card.css` — rarity frames, holographic sheen (CSS vars), legendary shimmer keyframes, reveal flip, `prefers-reduced-motion` disables
- `src/features/card/useCardTilt.ts` — pointer + `deviceorientation` → CSS vars (`--rx/--ry/--mx/--my`), rAF-throttled, reduced-motion no-op, cleanup
- `src/features/card/Card.tsx` — client `<Card>`: rarity frame + image-forward + name + rarity label + eduText; interactive tilt/holo; sizes; count badge
- `src/features/card/RevealCard.tsx` — pack-open flip → interactive Card; reduced-motion skips flip

## Files changed
- `src/features/pull/PullButton.tsx` — uses `RevealCard` (was `PullResultView`)
- `app/play/binder/[cardId]/page.tsx` — uses `<Card interactive size="lg">`
- **Removed** `src/features/pull/PullResultView.tsx` (placeholder retired)

## Tests
- `tests/card.test.ts` — `rarityClass` distinct-per-tier, `RARITY_LABEL` text for every rarity

## Story closure
- **E1** rarity styling ✅ · **E2** holo + 3D tilt (rarity-scaled) ✅ · **E3** educational text/image-forward ✅ · **C2** pull reveal ✅

## Notes
- Effects are pure CSS transforms/gradients; reduced-motion → static legible card; degrades gracefully on low-end.
- Single `<Card>` is now the source of card rendering (pull + binder).
