# U6 — Business Rules (Card UI & Effects)

Presentational unit. `[a11y]` accessibility, `[res]` resiliency.

## Rarity styling (E1)
- **U6-BR1** Every card visually reflects its rarity (frame + badge + effect intensity); the four tiers are clearly distinguishable.
- **U6-BR2** Rarity is conveyed by label **and** styling, never color alone. `[a11y]`

## Effects (E2)
- **U6-BR3** Interactive cards respond to pointer move and device orientation with holographic sheen + 3D tilt.
- **U6-BR4** Effect intensity scales by rarity (common subtle → legendary strong/animated).
- **U6-BR5** `[a11y]` If `prefers-reduced-motion: reduce`, motion effects are disabled; the card renders static and fully legible.
- **U6-BR6** `[res]` Effects are pure CSS transforms/gradients that degrade gracefully on low-end devices; absence of effects never breaks the card or interaction.

## Content (E3)
- **U6-BR7** Card shows picture (image-forward), name, rarity, and short educational text.
- **U6-BR8** `[a11y]` UI is usable by a pre-reader: does not depend on reading the text; image + big visuals lead. Alt text = card name.

## Reveal (C2)
- **U6-BR9** A pull shows a reveal (pack-open flip) before the card front; reduced-motion skips straight to the card.
- **U6-BR10** After reveal, the card is interactive (effects active).

## Consistency
- **U6-BR11** One `<Card>` component is the single source of card rendering (pull result + binder detail).
