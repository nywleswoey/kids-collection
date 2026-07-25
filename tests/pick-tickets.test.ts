import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { pickRarityChoices, rollWeightedRarity } from "@/features/pull/easter-egg";
import { RARITIES, RARITY_WEIGHTS, type Rarity } from "@/lib/types";
import type { Card } from "@/lib/types";

function card(id: string, rarity: Rarity): Card {
  return { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" };
}

describe("pickRarityChoices (Inc16 FR2)", () => {
  it("returns up to n cards, all of the exact rarity", () => {
    const pool = [
      card("a", "rare"),
      card("b", "rare"),
      card("c", "epic"),
      card("d", "rare"),
      card("e", "common"),
      card("f", "rare"),
      card("g", "rare"),
    ];
    fc.assert(
      fc.property(fc.constantFrom<Rarity>(...RARITIES), (rarity) => {
        const out = pickRarityChoices(pool, rarity, 5);
        expect(out.length).toBeLessThanOrEqual(5);
        expect(out.every((c) => c.rarity === rarity)).toBe(true);
        // no more than the pool has of that rarity
        const avail = pool.filter((c) => c.rarity === rarity).length;
        expect(out.length).toBe(Math.min(5, avail));
      }),
    );
  });
});

describe("rollWeightedRarity (Inc19 FR3)", () => {
  it("only ever returns a valid rarity, for any rng() in [0,1)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }).filter((u) => u < 1), (u) => {
        expect(RARITIES).toContain(rollWeightedRarity(() => u));
      }),
    );
  });

  it("maps the weight bands to the right tier (60/25/12/3)", () => {
    // total = 100; cumulative bands: common [0,60), rare [60,85), epic [85,97), legendary [97,100)
    expect(rollWeightedRarity(() => 0)).toBe("common");
    expect(rollWeightedRarity(() => 0.59)).toBe("common");
    expect(rollWeightedRarity(() => 0.6)).toBe("rare");
    expect(rollWeightedRarity(() => 0.84)).toBe("rare");
    expect(rollWeightedRarity(() => 0.85)).toBe("epic");
    expect(rollWeightedRarity(() => 0.96)).toBe("epic");
    expect(rollWeightedRarity(() => 0.97)).toBe("legendary");
    expect(rollWeightedRarity(() => 0.999)).toBe("legendary");
  });

  it("empirical distribution tracks RARITY_WEIGHTS", () => {
    const N = 20_000;
    const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    // Deterministic sweep across [0,1) so the test is stable (no Math.random).
    for (let i = 0; i < N; i++) counts[rollWeightedRarity(() => i / N)]++;
    for (const r of RARITIES) {
      expect(counts[r] / N).toBeCloseTo(RARITY_WEIGHTS[r] / 100, 2);
    }
  });
});
