/**
 * Whether a card may carry a manual animation lane entry: today, either the
 * legendary Grok `image_to_video` lane or the local Kanto/Johto Pokémon lane
 * (`pnpm pokemon-anim`).
 *
 * One predicate so `--review`'s import gate and `--sync`'s upload gate in
 * `scripts/seed/index.ts` can never answer differently for the same card.
 * Scoped to the `pokeapi-official-artwork` escape hatch rather than to the two
 * theme names, so any future theme that opts into the same escape hatch is
 * eligible too, and every other theme's behaviour is unchanged.
 */
import { POKEAPI_OFFICIAL_ARTWORK_PROVIDER_ID } from "./providers/pokeapi-official-artwork";
import { resolveProviderId } from "./review-files";

export interface EligibilityTheme {
  provider?: string;
}

export interface EligibilityCard {
  rarity: string;
  provider?: string;
}

export function isAnimationEligible(
  theme: EligibilityTheme,
  card: EligibilityCard,
): boolean {
  if (card.rarity === "legendary") return true;
  return resolveProviderId(theme, card) === POKEAPI_OFFICIAL_ARTWORK_PROVIDER_ID;
}
