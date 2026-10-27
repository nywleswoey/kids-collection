import { describe, expect, it } from "vitest";
import { planPokemonAnimEntries } from "../scripts/pokemon-anim/plan";
import { buildPrompt } from "@/shared/pool/prompt";
import { animatedStem } from "@/shared/pool/animated-brief";
import { reviewFileName } from "@/shared/pool/review-files";
import { providerById } from "@/shared/pool/providers";
import type { SeedFile } from "@/shared/pool/seed-schema";

const POKEAPI = providerById("pokeapi-official-artwork")!;

const seed = {
  themes: [
    {
      name: "Kanto Pokémon",
      provider: "pokeapi-official-artwork",
      cards: [
        { name: "Pikachu", rarity: "rare", imagePrompt: "Pikachu, the Pokémon: an electric mouse" },
        { name: "Mewtwo", rarity: "legendary", imagePrompt: "Mewtwo, the Pokémon: a psychic clone" },
      ],
    },
    {
      name: "Warriors",
      provider: "cloudflare-sdxl",
      cards: [{ name: "Paladin", rarity: "legendary", imagePrompt: "a knight on grass" }],
    },
  ],
} as SeedFile;

describe("planPokemonAnimEntries", () => {
  it("plans every card using the pokeapi-official-artwork provider, in seed order", () => {
    const entries = planPokemonAnimEntries(seed);
    expect(entries.map((e) => e.card)).toEqual(["Pikachu", "Mewtwo"]);
  });

  it("includes a non-legendary card (eligibility is not rarity-gated here)", () => {
    const entries = planPokemonAnimEntries(seed);
    const pikachu = entries.find((e) => e.card === "Pikachu")!;
    expect(pikachu.theme).toBe("Kanto Pokémon");
  });

  it("resolves the still's review filename and the drop-folder filename", () => {
    const entries = planPokemonAnimEntries(seed);
    const pikachu = entries.find((e) => e.card === "Pikachu")!;
    const card = seed.themes[0]!.cards[0]!;
    expect(pikachu.prompt).toBe(buildPrompt(card));
    expect(pikachu.stillReviewFileName).toBe(reviewFileName("Kanto Pokémon", card, POKEAPI));
    expect(pikachu.fileName).toBe(
      `${animatedStem("Kanto Pokémon", "Pikachu", pikachu.prompt, POKEAPI.id)}.webp`,
    );
  });

  it("never plans a card from a theme using a different provider", () => {
    const entries = planPokemonAnimEntries(seed);
    expect(entries.some((e) => e.card === "Paladin")).toBe(false);
  });
});
