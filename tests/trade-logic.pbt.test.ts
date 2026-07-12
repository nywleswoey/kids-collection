import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateTrade,
  filterTradable,
  isTradable,
  type TradeSide,
  type TradableCard,
} from "@/features/trade/trade-logic";
import { RARITIES, type Rarity } from "@/lib/types";

const rarityArb = fc.constantFrom<Rarity>(...RARITIES);

function tcard(id: string, rarity: Rarity, count: number): TradableCard {
  return {
    card: { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" },
    count,
  };
}

describe("validateTrade (Inc14 FR1/FR2/FR7)", () => {
  it("accepts a valid same-rarity duplicate swap", () => {
    const a: TradeSide = { childId: "A", cardId: "c1", rarity: "rare", count: 2 };
    const b: TradeSide = { childId: "B", cardId: "c2", rarity: "rare", count: 3 };
    expect(validateTrade(a, b)).toEqual({ ok: true });
  });

  it("rejects same child, non-dup either side, rarity mismatch, same card", () => {
    const base: TradeSide = { childId: "A", cardId: "c1", rarity: "rare", count: 2 };
    expect(validateTrade(base, { ...base, childId: "A", cardId: "c2" }).ok).toBe(false); // A=B
    expect(validateTrade({ ...base, count: 1 }, { childId: "B", cardId: "c2", rarity: "rare", count: 2 }).ok).toBe(false);
    expect(validateTrade(base, { childId: "B", cardId: "c2", rarity: "rare", count: 1 }).ok).toBe(false);
    expect(validateTrade(base, { childId: "B", cardId: "c2", rarity: "epic", count: 2 }).ok).toBe(false); // rarity
    expect(validateTrade(base, { childId: "B", cardId: "c1", rarity: "rare", count: 2 }).ok).toBe(false); // same card
  });

  it("ok iff all rules hold (property)", () => {
    fc.assert(
      fc.property(
        fc.record({
          ac: fc.string({ minLength: 1 }),
          bc: fc.string({ minLength: 1 }),
          acard: fc.string({ minLength: 1 }),
          bcard: fc.string({ minLength: 1 }),
          ar: rarityArb,
          br: rarityArb,
          an: fc.nat({ max: 9 }),
          bn: fc.nat({ max: 9 }),
        }),
        (r) => {
          const a: TradeSide = { childId: r.ac, cardId: r.acard, rarity: r.ar, count: r.an };
          const b: TradeSide = { childId: r.bc, cardId: r.bcard, rarity: r.br, count: r.bn };
          const expected =
            r.ac !== r.bc &&
            r.an >= 2 &&
            r.bn >= 2 &&
            r.ar === r.br &&
            r.acard !== r.bcard;
          expect(validateTrade(a, b).ok).toBe(expected);
        },
      ),
    );
  });
});

describe("filterTradable / isTradable (Inc14 FR2/FR5)", () => {
  it("keeps only same-rarity duplicates", () => {
    const cards = [
      tcard("a", "rare", 2),
      tcard("b", "rare", 1), // not a dup
      tcard("c", "epic", 3), // wrong rarity
      tcard("d", "rare", 5),
    ];
    const out = filterTradable(cards, "rare");
    expect(out.map((t) => t.card.id)).toEqual(["a", "d"]);
  });

  it("every survivor is a same-rarity duplicate (property)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string({ minLength: 1 }), rarityArb, fc.nat({ max: 6 })), { maxLength: 30 }),
        rarityArb,
        (rows, target) => {
          const cards = rows.map(([id, r, n]) => tcard(id, r, n));
          for (const t of filterTradable(cards, target)) {
            expect(t.card.rarity).toBe(target);
            expect(isTradable(t.count)).toBe(true);
          }
        },
      ),
    );
  });
});
