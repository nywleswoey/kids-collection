/**
 * Pure planning for the SuperGrok manual-lane walker.
 *
 * Builds the same per-card entries `--supergrok-export` would (reusing
 * `planManualBrief` and its naming), scoped to one theme chosen by name.
 *
 * Deliberately does NOT read the database to exclude already-published
 * cards the way `--supergrok-export` does: this tool's hard rule is it never
 * connects to the database. In practice that is harmless — the walker is
 * meant for a theme mid-authoring, before any of its cards are published —
 * and a card that happens to already be published just sits unused in the
 * drop folder (`--review` only imports cards it is about to insert).
 */
import { cardKey } from "@/shared/pool/publish-plan";
import { planManualBrief, type ManualBriefEntry } from "@/shared/pool/manual-brief";
import type { SeedFile } from "@/shared/pool/seed-schema";

export class ThemeNotFoundError extends Error {
  constructor(
    public readonly themeName: string,
    public readonly knownThemes: readonly string[],
  ) {
    super(
      `No theme named "${themeName}" in seed-content/cards.json.\n` +
        `Themes: ${knownThemes.join(", ")}`,
    );
    this.name = "ThemeNotFoundError";
  }
}

/** Every manual-lane entry for one theme, in seed (card) order. */
export function planThemeEntries(seed: SeedFile, themeName: string): ManualBriefEntry[] {
  const theme = seed.themes.find((t) => t.name === themeName);
  if (!theme) {
    throw new ThemeNotFoundError(
      themeName,
      seed.themes.map((t) => t.name),
    );
  }
  const planned = new Set(theme.cards.map((c) => cardKey(theme.name, c.name)));
  return planManualBrief([theme], planned);
}
