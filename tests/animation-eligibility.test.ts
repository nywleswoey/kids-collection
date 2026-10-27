import { describe, expect, it } from "vitest";
import { isAnimationEligible } from "@/shared/pool/animation-eligibility";

describe("isAnimationEligible", () => {
  it("is true for a legendary card regardless of provider", () => {
    expect(isAnimationEligible({ provider: "cloudflare-sdxl" }, { rarity: "legendary" })).toBe(
      true,
    );
    expect(isAnimationEligible({}, { rarity: "legendary", provider: "supergrok-manual" })).toBe(
      true,
    );
  });

  it("is true for a non-legendary card using the pokeapi-official-artwork escape hatch", () => {
    expect(
      isAnimationEligible({ provider: "pokeapi-official-artwork" }, { rarity: "common" }),
    ).toBe(true);
    expect(
      isAnimationEligible(
        { provider: "cloudflare-sdxl" },
        { rarity: "rare", provider: "pokeapi-official-artwork" },
      ),
    ).toBe(true);
  });

  it("is false for a non-legendary card in an unrelated theme/provider", () => {
    expect(isAnimationEligible({ provider: "cloudflare-sdxl" }, { rarity: "common" })).toBe(
      false,
    );
    expect(isAnimationEligible({ provider: "supergrok-manual" }, { rarity: "epic" })).toBe(false);
    expect(isAnimationEligible({}, { rarity: "rare" })).toBe(false);
  });
});
