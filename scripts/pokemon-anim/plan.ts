/**
 * Pure planning for `pnpm pokemon-anim`: every card across all themes whose
 * resolved provider is `pokeapi-official-artwork` (today, every Kanto
 * Pokémon / Johto Pokémon card — both pinned at theme level in
 * `seed-content/cards.json`), in seed order.
 *
 * Mirrors `scripts/supergrok-helper/video-plan.ts`'s shape, scoped by
 * provider id instead of rarity: this lane has no "unresolved" case, because
 * the provider is already known by construction (it is what makes a card
 * eligible in the first place), not something a bake-off still needs to pick.
 */
import { animatedStem } from "@/shared/pool/animated-brief";
import { buildPrompt } from "@/shared/pool/prompt";
import { reviewFileName, resolveProviderId } from "@/shared/pool/review-files";
import { providerById } from "@/shared/pool/providers";
import type { SeedFile } from "@/shared/pool/seed-schema";

export const POKEAPI_PROVIDER_ID = "pokeapi-official-artwork";

export interface PokemonAnimEntry {
  theme: string;
  card: string;
  /** Exact `buildPrompt` output for the still this animates — the join key. */
  prompt: string;
  /** The approved still's filename, relative to `seed-content/review/`. */
  stillReviewFileName: string;
  /** Destination filename inside the animation drop folder. */
  fileName: string;
}

/** Every card, in any theme, whose resolved provider is `pokeapi-official-artwork`. */
export function planPokemonAnimEntries(seed: SeedFile): PokemonAnimEntry[] {
  const provider = providerById(POKEAPI_PROVIDER_ID);
  if (!provider) return [];

  const entries: PokemonAnimEntry[] = [];
  for (const theme of seed.themes) {
    for (const card of theme.cards) {
      if (resolveProviderId(theme, card) !== POKEAPI_PROVIDER_ID) continue;
      const prompt = buildPrompt(card);
      entries.push({
        theme: theme.name,
        card: card.name,
        prompt,
        stillReviewFileName: reviewFileName(theme.name, card, provider),
        fileName: `${animatedStem(theme.name, card.name, prompt, provider.id)}.webp`,
      });
    }
  }
  return entries;
}
