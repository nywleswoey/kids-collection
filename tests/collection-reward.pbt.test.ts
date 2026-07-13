import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  isRaritySetComplete,
  raritySetsFor,
} from "@/features/rewards/collection-reward";
import { RARITIES, type Rarity } from "@/lib/types";
import type { Card } from "@/lib/types";

function card(id: string, themeId: string, rarity: Rarity): Card {
  return { id, themeId, name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" };
}

describe("isRaritySetComplete (Inc16 FR5)", () => {
  it("true only when every card of (theme,rarity) is owned; false for empty set", () => {
    const cards = [
      card("a", "t1", "rare"),
      card("b", "t1", "rare"),
      card("c", "t1", "epic"),
      card("d", "t2", "rare"),
    ];
    expect(isRaritySetComplete(cards, "t1", "rare", new Set(["a"]))).toBe(false);
    expect(isRaritySetComplete(cards, "t1", "rare", new Set(["a", "b"]))).toBe(true);
    expect(isRaritySetComplete(cards, "t1", "rare", new Set(["a", "b", "c"]))).toBe(true);
    // no legendary cards in t1 → not "complete"
    expect(isRaritySetComplete(cards, "t1", "legendary", new Set(["a", "b"]))).toBe(false);
  });

  it("owning all of a set ⇒ complete (property)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.constantFrom<Rarity>(...RARITIES)), { minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1 }),
        fc.constantFrom<Rarity>(...RARITIES),
        (rows, theme, rarity) => {
          const cards = rows.map(([id, t, r], i) => card(`${id}-${i}`, t, r));
          const allOwned = new Set(cards.map((c) => c.id));
          const inSet = cards.filter((c) => c.themeId === theme && c.rarity === rarity);
          expect(isRaritySetComplete(cards, theme, rarity, allOwned)).toBe(inSet.length > 0);
        },
      ),
    );
  });
});

describe("raritySetsFor (Inc16 FR5)", () => {
  it("returns the distinct (theme,rarity) pairs touched by the ids", () => {
    const cards = [
      card("a", "t1", "rare"),
      card("b", "t1", "rare"),
      card("c", "t2", "epic"),
    ];
    const sets = raritySetsFor(cards, ["a", "b", "c"]);
    expect(sets).toHaveLength(2);
    expect(sets).toContainEqual({ themeId: "t1", rarity: "rare" });
    expect(sets).toContainEqual({ themeId: "t2", rarity: "epic" });
  });

  it("ignores unknown ids", () => {
    const cards = [card("a", "t1", "rare")];
    expect(raritySetsFor(cards, ["zzz"])).toEqual([]);
  });
});
