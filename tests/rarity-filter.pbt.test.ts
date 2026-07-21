import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  countOwnedByRarity,
  filterCardsByRarity,
} from "@/features/binder/rarity-filter";
import { RARITIES, type Rarity } from "@/lib/types";
import type { BinderCard, ThemeSection } from "@/lib/types";

function bcard(id: string, rarity: Rarity, owned: boolean): BinderCard {
  return {
    card: { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" },
    owned,
    count: owned ? 1 : 0,
  };
}

const rarityArb = fc.constantFrom<Rarity>(...RARITIES);
const cardArb = fc
  .tuple(fc.string({ minLength: 1 }), rarityArb, fc.boolean())
  .map(([id, r, owned]) => bcard(id, r, owned));

const sectionArb: fc.Arbitrary<ThemeSection> = fc
  .array(cardArb, { maxLength: 20 })
  .map((cards) => ({
    theme: { id: "t", name: "T" },
    cards,
    progress: { owned: 0, total: cards.length, complete: false },
  }));

describe("countOwnedByRarity (Inc13 FR1, Q4.2=A owned-only)", () => {
  it("counts only owned cards, per rarity", () => {
    const sections: ThemeSection[] = [
      {
        theme: { id: "t", name: "T" },
        cards: [
          bcard("a", "common", true),
          bcard("b", "common", false),
          bcard("c", "epic", true),
        ],
        progress: { owned: 2, total: 3, complete: false },
      },
    ];
    const counts = countOwnedByRarity(sections);
    expect(counts.common).toBe(1);
    expect(counts.epic).toBe(1);
    expect(counts.rare).toBe(0);
    expect(counts.legendary).toBe(0);
  });

  it("total equals the number of owned cards across sections", () => {
    fc.assert(
      fc.property(fc.array(sectionArb, { maxLength: 6 }), (sections) => {
        const ownedCards = sections.flatMap((s) => s.cards).filter((c) => c.owned).length;
        const counts = countOwnedByRarity(sections);
        const total = RARITIES.reduce((sum, r) => sum + counts[r], 0);
        expect(total).toBe(ownedCards);
      }),
    );
  });
});

describe("filterCardsByRarity (Inc13 FR2, Q4.3=B keeps locked)", () => {
  it("null returns all cards unchanged", () => {
    fc.assert(
      fc.property(fc.array(cardArb, { maxLength: 20 }), (cards) => {
        expect(filterCardsByRarity(cards, null)).toBe(cards);
      }),
    );
  });

  it("returns exactly the cards of that rarity (owned or locked)", () => {
    fc.assert(
      fc.property(fc.array(cardArb, { maxLength: 20 }), rarityArb, (cards, r) => {
        const out = filterCardsByRarity(cards, r);
        expect(out.every((c) => c.card.rarity === r)).toBe(true);
        expect(out.length).toBe(cards.filter((c) => c.card.rarity === r).length);
      }),
    );
  });
});
