# Personas

## P0 — Parent (Admin)
- **Who**: The account owner; signs in with Google. Only authenticated user.
- **Goals**: Set up the app, manage child profiles, use pull tokens as a reward/incentive, keep content safe and age-appropriate.
- **Motivations**: A fun, screen-time-worthy activity that doubles as an educational reward lever; low cost; low maintenance.
- **Constraints / Pains**: Limited time; wants safety guarantees; doesn't want runaway AI cost; not a developer during day-to-day use.
- **Devices**: Phone or laptop.

## P1 — Child, Pre-reader (~age 4)
- **Who**: Youngest child; cannot read fluently.
- **Goals**: Pull cards, look at the pictures and effects, feel the collection grow.
- **Motivations**: Visual delight, surprise of a pull, "shiny" rare cards.
- **Constraints / Pains**: Can't read descriptions (needs image-forward UI, large tap targets, minimal text, possibly read-aloud later); easily frustrated by small/fiddly controls.
- **Devices**: Tablet (touch) mostly.

## P2 — Child, Early reader (~age 7)
- **Who**: Middle child; reads simple text.
- **Goals**: Pull cards, read short facts, complete themes, compare rarities.
- **Motivations**: Collecting/completion, learning facts, chasing rares.
- **Constraints / Pains**: Short attention for long text; wants quick feedback and progress visibility.
- **Devices**: Tablet or phone.

## P3 — Child, Confident reader (~age 9)
- **Who**: Oldest child; reads comfortably.
- **Goals**: Complete themes, optimize pulls, enjoy educational content, show off legendaries.
- **Motivations**: Mastery, completion %, rarity hunting, learning.
- **Constraints / Pains**: Will notice unfairness/bugs in odds or duplicate handling; wants the collection to feel "real".
- **Devices**: Any (responsive).

## Persona → Feature relevance
| Feature | P0 Parent | P1 (4) | P2 (7) | P3 (9) |
|---|---|---|---|---|
| Google sign-in | ● | | | |
| Profile select | ● | ● | ● | ● |
| Pull a card | | ● | ● | ● |
| Binder/collection | | ● | ● | ● |
| Card view + effects | | ● | ● | ● |
| Educational text | | (read-aloud later) | ● | ● |
| Reward: grant tokens | ● | | | |
| Admin: manage profiles | ● | | | |
