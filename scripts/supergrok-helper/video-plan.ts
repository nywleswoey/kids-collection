/**
 * Pure planning for the `--auto-video` walker (the manual animation lane,
 * `data/kcanim/report.md`): legendary cards in one theme that already have an
 * APPROVED still in `seed-content/review/` — `image_to_video` animates that
 * still, it does not draw from the prompt itself, so a card whose bake-off was
 * never judged has nothing to animate yet and is reported, not silently
 * skipped.
 */
import { animatedStem } from "@/shared/pool/animated-brief";
import { buildPrompt } from "@/shared/pool/prompt";
import { reviewFileName, resolveProviderId } from "@/shared/pool/review-files";
import { providerById } from "@/shared/pool/providers";
import type { SeedFile } from "@/shared/pool/seed-schema";
import { ThemeNotFoundError } from "./plan";

export interface VideoEntry {
  theme: string;
  card: string;
  /** Exact `buildPrompt` output for the still this animates — the join key. */
  prompt: string;
  /** The approved still's filename, relative to `seed-content/review/`. */
  stillReviewFileName: string;
  /** Destination filename inside the animation drop folder. */
  fileName: string;
}

/**
 * Legendary cards in `themeName`, split into those with a resolved provider
 * (ready to animate, once the still itself is confirmed present on disk by
 * the caller) and those with none (bake-off not judged — `--sync` would also
 * refuse these, same FR9 reason).
 */
export function planLegendaryVideoEntries(
  seed: SeedFile,
  themeName: string,
): { entries: VideoEntry[]; unresolved: string[] } {
  const theme = seed.themes.find((t) => t.name === themeName);
  if (!theme) {
    throw new ThemeNotFoundError(
      themeName,
      seed.themes.map((t) => t.name),
    );
  }

  const entries: VideoEntry[] = [];
  const unresolved: string[] = [];
  for (const card of theme.cards) {
    if (card.rarity !== "legendary") continue;
    const providerId = resolveProviderId(theme, card);
    const provider = providerId ? providerById(providerId) : undefined;
    if (!provider) {
      unresolved.push(card.name);
      continue;
    }
    const prompt = buildPrompt(card);
    entries.push({
      theme: theme.name,
      card: card.name,
      prompt,
      stillReviewFileName: reviewFileName(theme.name, card, provider),
      fileName: `${animatedStem(theme.name, card.name, prompt)}.webp`,
    });
  }
  return { entries, unresolved };
}
