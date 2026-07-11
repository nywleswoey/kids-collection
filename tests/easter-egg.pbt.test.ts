import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  EGG_CHANCE,
  rollEasterEgg,
  pickEasterEggChoices,
} from "@/features/pull/easter-egg";
import { RARITIES, type Card } from "@/lib/types";

const cardArb = (i: number) =>
  fc.record({
    id: fc.constant(`c${i}`),
    themeId: fc.constant("t"),
    name: fc.constant(`n${i}`),
    rarity: fc.constantFrom(...RARITIES),
    imageUrl: fc.constant("x"),
    eduText: fc.constant("y"),
    sourceUrl: fc.constant("https://e/s"),
  });

const poolArb = fc
  .integer({ min: 0, max: 40 })
  .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => cardArb(i))))
  .map((cards) => cards as Card[]);

describe("easter egg (U6-FR2)", () => {
  it("rollEasterEgg fires below EGG_CHANCE, not at/above", () => {
    expect(rollEasterEgg(() => 0)).toBe(true);
    expect(rollEasterEgg(() => EGG_CHANCE / 2)).toBe(true);
    expect(rollEasterEgg(() => EGG_CHANCE)).toBe(false);
    expect(rollEasterEgg(() => 0.5)).toBe(false);
  });

  it("pickEasterEggChoices returns only epic+, at most n, distinct", () => {
    fc.assert(
      fc.property(poolArb, fc.integer({ min: 1, max: 6 }), (pool, n) => {
        const picks = pickEasterEggChoices(pool, n);
        const epicPlus = pool.filter(
          (c) => c.rarity === "epic" || c.rarity === "legendary",
        );
        expect(picks.length).toBe(Math.min(n, epicPlus.length));
        expect(picks.every((c) => c.rarity === "epic" || c.rarity === "legendary")).toBe(true);
        expect(new Set(picks.map((c) => c.id)).size).toBe(picks.length);
      }),
    );
  });
});
