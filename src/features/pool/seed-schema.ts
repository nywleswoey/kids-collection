import { z } from "zod";
import { RARITIES } from "@/lib/types";

export const seedCardSchema = z.object({
  name: z.string().trim().min(1),
  rarity: z.enum(RARITIES as unknown as [string, ...string[]]),
  eduText: z.string().trim().min(1),
  imagePrompt: z.string().trim().min(1),
});

export const themeSeedSchema = z.object({
  name: z.string().trim().min(1),
  cards: z.array(seedCardSchema).min(1),
});

export const seedFileSchema = z.object({
  themes: z.array(themeSeedSchema).min(1),
});

export type SeedCard = z.infer<typeof seedCardSchema>;
export type ThemeSeed = z.infer<typeof themeSeedSchema>;
export type SeedFile = z.infer<typeof seedFileSchema>;
