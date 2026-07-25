import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { nextTier, pickUpgradeCard } from "@/features/pull/sacrifice";
import { RARITIES, type Card, type Rarity } from "@/lib/types";

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

describe("tier helpers (nextTier + pickUpgradeCard, used by collection rewards)", () => {
  it("nextTier caps at legendary, else steps up exactly one", () => {
    expect(nextTier("common")).toBe("rare");
    expect(nextTier("rare")).toBe("epic");
    expect(nextTier("epic")).toBe("legendary");
    expect(nextTier("legendary")).toBe("legendary");
  });

  it("pickUpgradeCard returns a card in the tier, preferring unowned", () => {
    fc.assert(
      fc.property(
        poolArb,
        fc.constantFrom(...RARITIES),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (pool, tier, u) => {
          const inTier = pool.filter((c) => c.rarity === tier);
          // Own half of them.
          const ownedIds = new Set(
            inTier.filter((_, i) => i % 2 === 0).map((c) => c.id),
          );
          const pick = pickUpgradeCard(pool, tier, ownedIds, () => u);
          if (inTier.length === 0) {
            expect(pick).toBeNull();
            return;
          }
          expect(pick).not.toBeNull();
          expect(pick!.rarity).toBe(tier);
          const unowned = inTier.filter((c) => !ownedIds.has(c.id));
          if (unowned.length > 0) {
            expect(ownedIds.has(pick!.id)).toBe(false);
          }
        },
      ),
    );
  });
});
