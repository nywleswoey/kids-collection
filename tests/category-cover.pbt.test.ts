import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { coverCard } from "@/features/binder/category-cover";
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
    progress: {
      owned: cards.filter((c) => c.owned).length,
      total: cards.length,
      complete: cards.length > 0 && cards.every((c) => c.owned),
    },
  }));

function section(cards: BinderCard[]): ThemeSection {
  return {
    theme: { id: "t", name: "T" },
    cards,
    progress: { owned: 0, total: cards.length, complete: false },
  };
}

describe("coverCard (#107 category picker, reversed by #122)", () => {
  it("picks the theme's first legendary in catalog order", () => {
    const cover = coverCard(
      section([
        bcard("a", "common", true),
        bcard("b", "legendary", false),
        bcard("c", "legendary", true),
      ]),
    );
    expect(cover?.card.id).toBe("b");
  });

  // The whole point of the reversal. A cover that depends on what the child owns
  // is a trophy; a landmark has to be the same picture on every visit, including
  // the first, when they own nothing here.
  it("does not depend on ownership at all", () => {
    fc.assert(
      fc.property(sectionArb, (s) => {
        const allLocked = { ...s, cards: s.cards.map((c) => ({ ...c, owned: false, count: 0 })) };
        const allOwned = { ...s, cards: s.cards.map((c) => ({ ...c, owned: true, count: 1 })) };
        expect(coverCard(allLocked)?.card.id).toBe(coverCard(allOwned)?.card.id);
      }),
    );
  });

  // What replaced "returns null when nothing is owned". A theme with cards
  // always has a cover, which is what let the 🪐 placeholder be deleted rather
  // than kept as an unreachable branch.
  it("returns a card for any non-empty category", () => {
    fc.assert(
      fc.property(sectionArb, (s) => {
        expect(coverCard(s) !== null).toBe(s.cards.length > 0);
      }),
    );
  });

  it("prefers a legendary over every other rarity, wherever it sits", () => {
    fc.assert(
      fc.property(sectionArb, (s) => {
        const cover = coverCard(s);
        if (!cover) return;
        const hasLegendary = s.cards.some((c) => c.card.rarity === "legendary");
        if (hasLegendary) expect(cover.card.rarity).toBe("legendary");
      }),
    );
  });

  // Stability is the property the tile is bought for. Note the guard: it holds
  // ONCE THE THEME HAS A LEGENDARY, and the unconditional version is false —
  // appending a legendary to a section that had none moves the cover off the
  // catalog-order fallback. That case cannot occur for real data (the pyramid
  // puts two legendaries in every theme before it can publish), so the guard is
  // the honest statement of the invariant rather than a weakening of it.
  it("is stable when the catalog grows behind it", () => {
    fc.assert(
      fc.property(sectionArb, fc.array(cardArb, { maxLength: 5 }), (s, extra) => {
        if (!s.cards.some((c) => c.card.rarity === "legendary")) return;
        const cover = coverCard(s);
        if (!cover) return;
        expect(coverCard({ ...s, cards: [...s.cards, ...extra] })?.card.id).toBe(cover.card.id);
      }),
    );
  });

  it("falls back to catalog order for a section with no legendary", () => {
    // Unreachable for real data — the pyramid guarantees two per theme — but it
    // is what makes the function total, so the tile has no placeholder branch.
    const cover = coverCard(section([bcard("first", "epic", false), bcard("second", "rare", true)]));
    expect(cover?.card.id).toBe("first");
  });

  it("returns null only for an empty category", () => {
    expect(coverCard(section([]))).toBe(null);
  });
});
