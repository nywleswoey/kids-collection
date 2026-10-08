import { describe, expect, it } from "vitest";
import { planLegendaryVideoEntries } from "../scripts/supergrok-helper/video-plan";
import { ThemeNotFoundError } from "../scripts/supergrok-helper/plan";
import { buildPrompt } from "@/shared/pool/prompt";
import { animatedStem } from "@/shared/pool/animated-brief";
import { reviewFileName } from "@/shared/pool/review-files";
import { providerById } from "@/shared/pool/providers";
import type { SeedFile } from "@/shared/pool/seed-schema";

const CLOUDFLARE = providerById("cloudflare-sdxl")!;

const seed = {
  themes: [
    {
      name: "Warriors",
      provider: "cloudflare-sdxl",
      cards: [
        { name: "Longbowman", rarity: "common", imagePrompt: "a cheerful archer" },
        { name: "Paladin", rarity: "legendary", imagePrompt: "a knight on grass" },
        { name: "Berserker", rarity: "legendary", imagePrompt: "a wild warrior", provider: "cloudflare-sdxl" },
      ],
    },
    {
      name: "Outer Space",
      cards: [{ name: "The Sun", rarity: "legendary", imagePrompt: "a bright star" }],
    },
  ],
} as SeedFile;

describe("planLegendaryVideoEntries", () => {
  it("only plans legendary cards, in seed order", () => {
    const { entries } = planLegendaryVideoEntries(seed, "Warriors");
    expect(entries.map((e) => e.card)).toEqual(["Paladin", "Berserker"]);
  });

  it("resolves the still's review filename from the card's (or theme's) provider", () => {
    const { entries } = planLegendaryVideoEntries(seed, "Warriors");
    const paladin = entries.find((e) => e.card === "Paladin")!;
    const card = seed.themes[0]!.cards[1]!;
    expect(paladin.prompt).toBe(buildPrompt(card));
    expect(paladin.stillReviewFileName).toBe(
      reviewFileName("Warriors", card, CLOUDFLARE),
    );
    expect(paladin.fileName).toBe(
      `${animatedStem("Warriors", "Paladin", paladin.prompt, CLOUDFLARE.id)}.webp`,
    );
  });

  it("reports a legendary card with no resolved provider as unresolved, not planned", () => {
    const { entries, unresolved } = planLegendaryVideoEntries(seed, "Outer Space");
    expect(entries).toEqual([]);
    expect(unresolved).toEqual(["The Sun"]);
  });

  it("throws ThemeNotFoundError for an unknown theme", () => {
    expect(() => planLegendaryVideoEntries(seed, "Nowhere")).toThrow(ThemeNotFoundError);
  });
});
