import { describe, it, expect } from "vitest";
import { rarityClass, RARITY_LABEL } from "@/features/card/rarity";
import { RARITIES } from "@/lib/types";

describe("rarityClass (U6-BR1)", () => {
  it("maps each rarity to its own class", () => {
    const classes = RARITIES.map(rarityClass);
    expect(new Set(classes).size).toBe(RARITIES.length); // all distinct
    expect(rarityClass("legendary")).toBe("card--legendary");
    expect(rarityClass("common")).toBe("card--common");
  });
});

describe("rarity label (U6-BR2 non-color)", () => {
  it("provides a text label for every rarity", () => {
    for (const r of RARITIES) {
      expect(RARITY_LABEL[r]).toBeTruthy();
    }
    expect(RARITY_LABEL.legendary).toContain("Legendary");
  });
});
