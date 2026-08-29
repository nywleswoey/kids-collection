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

describe("coverCard (#107 category picker)", () => {
  it("picks the rarest owned card", () => {
    const cover = coverCard(
      section([
        bcard("a", "common", true),
        bcard("b", "legendary", true),
        bcard("c", "epic", true),
      ]),
    );
    expect(cover?.card.id).toBe("b");
  });

  it("ignores unowned cards even when they are rarer", () => {
    const cover = coverCard(
      section([bcard("a", "common", true), bcard("b", "legendary", false)]),
    );
    expect(cover?.card.id).toBe("a");
  });

  it("returns null when nothing is owned, so unearned art never leaks (U5-Q5)", () => {
    fc.assert(
      fc.property(fc.array(cardArb, { maxLength: 20 }), (cards) => {
        const locked = cards.map((c) => ({ ...c, owned: false, count: 0 }));
        expect(coverCard(section(locked))).toBe(null);
      }),
    );
  });

  it("never returns an unowned card", () => {
    fc.assert(
      fc.property(sectionArb, (s) => {
        const cover = coverCard(s);
        if (cover) expect(cover.owned).toBe(true);
      }),
    );
  });

  it("returns a card iff the category has at least one owned card", () => {
    fc.assert(
      fc.property(sectionArb, (s) => {
        const anyOwned = s.cards.some((c) => c.owned);
        expect(coverCard(s) !== null).toBe(anyOwned);
      }),
    );
  });

  it("is stable: no owned card in the section is rarer than the cover", () => {
    fc.assert(
      fc.property(sectionArb, (s) => {
        const cover = coverCard(s);
        if (!cover) return;
        const rank = (r: Rarity) => RARITIES.indexOf(r);
        for (const c of s.cards) {
          if (c.owned) {
            expect(rank(c.card.rarity)).toBeLessThanOrEqual(rank(cover.card.rarity));
          }
        }
      }),
    );
  });

  it("ties inside a rarity resolve to the first card in catalog order", () => {
    const cover = coverCard(
      section([
        bcard("first", "epic", true),
        bcard("second", "epic", true),
      ]),
    );
    expect(cover?.card.id).toBe("first");
  });
});
