import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { orderCategoryCards } from "@/features/binder/card-order";
import { filterCardsByRarity } from "@/features/binder/rarity-filter";
import { RARITIES, type Rarity } from "@/lib/types";
import type { BinderCard } from "@/lib/types";

function bcard(id: string, rarity: Rarity, name = id, owned = false): BinderCard {
  return {
    card: { id, themeId: "t", name, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" },
    owned,
    count: owned ? 1 : 0,
  };
}

const rarityArb = fc.constantFrom<Rarity>(...RARITIES);

/** Distinct ids, so a shuffled input is a genuine permutation to compare against. */
const cardsArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { maxLength: 30 })
  .chain((ids) =>
    fc.tuple(
      fc.constant(ids),
      fc.array(rarityArb, { minLength: ids.length, maxLength: ids.length }),
      fc.array(fc.string({ minLength: 1, maxLength: 6 }), {
        minLength: ids.length,
        maxLength: ids.length,
      }),
      fc.array(fc.boolean(), { minLength: ids.length, maxLength: ids.length }),
    ),
  )
  .map(([ids, rarities, names, owns]) =>
    ids.map((id, i) => bcard(id, rarities[i]!, names[i]!, owns[i]!)),
  );

function key(c: BinderCard) {
  return `${c.card.id} ${c.card.rarity} ${c.card.name} ${c.owned}`;
}

describe("orderCategoryCards (#123 - rarity ascending, then name, then id)", () => {
  it("lays a real theme out commons first, legendaries last", () => {
    const out = orderCategoryCards([
      bcard("l1", "legendary", "Zephyr"),
      bcard("c2", "common", "Beetle"),
      bcard("e1", "epic", "Marlin"),
      bcard("c1", "common", "Ant"),
      bcard("r1", "rare", "Heron"),
    ]);
    expect(out.map((c) => c.card.name)).toEqual([
      "Ant",
      "Beetle",
      "Heron",
      "Marlin",
      "Zephyr",
    ]);
  });

  it("breaks a rarity tie by name, not by input position", () => {
    const out = orderCategoryCards([
      bcard("x", "common", "Wolf"),
      bcard("y", "common", "Ant"),
    ]);
    expect(out.map((c) => c.card.name)).toEqual(["Ant", "Wolf"]);
  });

  it("falls through to the id when rarity AND name tie", () => {
    const out = orderCategoryCards([
      bcard("b", "common", "Same"),
      bcard("a", "common", "Same"),
    ]);
    expect(out.map((c) => c.card.id)).toEqual(["a", "b"]);
  });

  it("is a permutation - nothing added, dropped or altered", () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const out = orderCategoryCards(cards);
        expect(out.length).toBe(cards.length);
        expect(out.map(key).sort()).toEqual(cards.map(key).sort());
      }),
    );
  });

  it("never mutates its input", () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const before = cards.map(key);
        orderCategoryCards(cards);
        expect(cards.map(key)).toEqual(before);
      }),
    );
  });

  it("rarity never decreases down the grid", () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const ranks = orderCategoryCards(cards).map((c) =>
          RARITIES.indexOf(c.card.rarity),
        );
        for (let i = 1; i < ranks.length; i += 1) {
          expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
        }
      }),
    );
  });

  it("is TOTAL - any permutation of the same cards sorts identically", () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const a = orderCategoryCards(cards);
        const b = orderCategoryCards([...cards].reverse());
        expect(b.map(key)).toEqual(a.map(key));
      }),
    );
  });

  it("is stable under collection state - flipping every `owned` moves no tile", () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const flipped = cards.map((c) => ({
          ...c,
          owned: !c.owned,
          count: c.owned ? 0 : 1,
        }));
        expect(orderCategoryCards(flipped).map((c) => c.card.id)).toEqual(
          orderCategoryCards(cards).map((c) => c.card.id),
        );
      }),
    );
  });

  it("composes with the rarity filter either way round (Inc13 Q4.1=A)", () => {
    fc.assert(
      fc.property(cardsArb, fc.option(rarityArb, { nil: null }), (cards, r) => {
        const filterThenSort = orderCategoryCards(filterCardsByRarity(cards, r));
        const sortThenFilter = filterCardsByRarity(orderCategoryCards(cards), r);
        expect(filterThenSort.map(key)).toEqual(sortThenFilter.map(key));
      }),
    );
  });
});
