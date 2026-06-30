import type { SeedCard } from "./seed-schema";

/** Kid-friendly art style appended to every image prompt (U3-BR5). */
export const ART_STYLE =
  "vibrant kid-friendly cartoon trading-card illustration, bright colors, " +
  "friendly, clean background, no text";

/** Build the full Pollinations prompt for a card (pure). */
export function buildPrompt(card: Pick<SeedCard, "imagePrompt">): string {
  return `${card.imagePrompt}, ${ART_STYLE}`;
}
