import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  nextTier,
  rollUpgradeTier,
  pickUpgradeCard,
} from "@/features/pull/sacrifice";
import { RARITIES, type Card, type Rarity } from "@/lib/types";

const rank = (r: Rarity) => RARITIES.indexOf(r);

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

describe("sacrifice-to-upgrade (Inc8 FR2)", () => {
  it("nextTier caps at legendary, else steps up exactly one", () => {
    expect(nextTier("common")).toBe("rare");
    expect(nextTier("rare")).toBe("epic");
    expect(nextTier("epic")).toBe("legendary");
    expect(nextTier("legendary")).toBe("legendary");
  });

  it("rollUpgradeTier is same tier or exactly one higher, never lower", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RARITIES),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (r, u) => {
          const t = rollUpgradeTier(r, () => u);
          expect(rank(t)).toBeGreaterThanOrEqual(rank(r));
          expect(rank(t)).toBeLessThanOrEqual(Math.min(rank(r) + 1, RARITIES.length - 1));
        },
      ),
    );
  });

  it("rollUpgradeTier: <0.5 same tier, >=0.5 one up", () => {
    expect(rollUpgradeTier("common", () => 0)).toBe("common");
    expect(rollUpgradeTier("common", () => 0.5)).toBe("rare");
    expect(rollUpgradeTier("legendary", () => 0.9)).toBe("legendary");
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
