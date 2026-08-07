import { z } from "zod";
import { RARITIES, zeroRarityCount, type Rarity } from "@/lib/types";

/**
 * The seed file's shape AND its authoring rules (Inc24 FR2–FR5).
 *
 * The rules live here rather than in a separate predicate module (D1) because
 * `loadSeed` runs this schema on every seed command and fails fast — the schema
 * IS the gate, and a second source of truth is a second thing to drift. They are
 * pure in-memory checks: `loadSeed` stays synchronous and network-free (NFR4),
 * which is why the sourceUrl *reachability* check is a separate `--check-urls`
 * flag rather than a rule here.
 *
 * All four rules were verified against the committed seed/cards.json before being
 * added: 10 themes x 30 cards, every pyramid 15/8/5/2, 300/300 unique names,
 * longest eduText 110 chars. They are forward guards, not retro-fixes.
 */

/** Every theme is exactly this shape. Set-completion rewards and the rarity
 * filters assume it, so an off-pyramid theme breaks the symmetry permanently. */
export const CARDS_PER_THEME = 30;
export const RARITY_PYRAMID: Record<Rarity, number> = {
  common: 15,
  rare: 8,
  epic: 5,
  legendary: 2,
};

export const seedCardSchema = z.object({
  name: z.string().trim().min(1),
  rarity: z.enum(RARITIES as unknown as [string, ...string[]]),
  // <=120 chars: readable by a 7-year-old and fits the card face (FR5).
  eduText: z.string().trim().min(1).max(120),
  imagePrompt: z.string().trim().min(1),
  // Source backing the fact / legend origin — must be a real URL (U4-FR5, NFR4).
  sourceUrl: z.string().url(),
});

export const themeSeedSchema = z
  .object({
    name: z.string().trim().min(1),
    cards: z.array(seedCardSchema).min(1),
  })
  .superRefine((theme, ctx) => {
    // FR2 — exactly 30 cards.
    if (theme.cards.length !== CARDS_PER_THEME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cards"],
        message: `${theme.name}: expected ${CARDS_PER_THEME} cards, found ${theme.cards.length}`,
      });
    }

    // FR3 — exactly 15 common / 8 rare / 5 epic / 2 legendary.
    const found = zeroRarityCount();
    for (const card of theme.cards) found[card.rarity as Rarity]++;
    const off = RARITIES.filter((r) => found[r] !== RARITY_PYRAMID[r]);
    if (off.length > 0) {
      const expected = RARITIES.map((r) => RARITY_PYRAMID[r]).join("/");
      const actual = RARITIES.map((r) => `${r}=${found[r]}`).join(" ");
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cards"],
        message: `${theme.name}: expected ${expected}, found ${actual}`,
      });
    }
  });

export const seedFileSchema = z
  .object({
    themes: z.array(themeSeedSchema).min(1),
  })
  .superRefine((file, ctx) => {
    // FR4 — card names unique across the ENTIRE pool, not just within a theme.
    //
    // This is the rule a large authoring session is most likely to break by
    // accident, and the one with no other backstop: `insertCardIfNew` returns
    // "skipped" on a collision rather than failing, so without this the theme
    // would publish 29 cards and quietly break its own pyramid, silently.
    const seen = new Map<string, string>(); // card name -> first theme that used it
    for (const theme of file.themes) {
      for (const card of theme.cards) {
        const first = seen.get(card.name);
        if (first !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["themes"],
            message: `duplicate card name "${card.name}" in themes: ${first}, ${theme.name}`,
          });
        } else {
          seen.set(card.name, theme.name);
        }
      }
    }
  });

export type SeedCard = z.infer<typeof seedCardSchema>;
export type ThemeSeed = z.infer<typeof themeSeedSchema>;
export type SeedFile = z.infer<typeof seedFileSchema>;
