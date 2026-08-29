import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  bandsByTier,
  buildColumns,
  applyMissingFilter,
  missingCount,
  isPickable,
  oneAwayFromBurn,
  orderByValue,
  type BoardCard,
  type SwapTier,
} from "@/features/trade/board";
import { SACRIFICE_MIN } from "@/features/pull/sacrifice";
import { validateTrade, type TradableCard } from "@/features/trade/trade-logic";
import { RARITIES, type Rarity } from "@/lib/types";

const rarityArb = fc.constantFrom<Rarity>(...RARITIES);

function tcard(id: string, rarity: Rarity, count: number): TradableCard {
  return {
    card: { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" },
    count,
  };
}

const tcardArb = fc
  .tuple(fc.string({ minLength: 1 }), rarityArb, fc.integer({ min: 2, max: 9 }))
  .map(([id, r, count]) => tcard(id, r, count));

const inventoryArb = fc.array(tcardArb, { maxLength: 15 });
const ownedArb = fc.array(fc.string({ minLength: 1 }), { maxLength: 20 }).map((ids) => new Set(ids));

describe("buildColumns (Inc22 FR4 — badge only what's new to the other side)", () => {
  it("newToOther is exactly the complement of the other party's owned set", () => {
    fc.assert(
      fc.property(inventoryArb, inventoryArb, ownedArb, ownedArb, (mine, theirs, myOwned, theirOwned) => {
        const cols = buildColumns({ mine, theirs, myOwnedIds: myOwned, theirOwnedIds: theirOwned });
        for (const c of cols.mine) expect(c.newToOther).toBe(!theirOwned.has(c.card.id));
        for (const c of cols.theirs) expect(c.newToOther).toBe(!myOwned.has(c.card.id));
      }),
    );
  });

  it("preserves both inventories card-for-card — the sort reorders, never drops", () => {
    // Order is #109's business; membership is not. A column that loses a card
    // silently removes a swap the child could have made.
    fc.assert(
      fc.property(inventoryArb, inventoryArb, ownedArb, ownedArb, (mine, theirs, myOwned, theirOwned) => {
        const cols = buildColumns({ mine, theirs, myOwnedIds: myOwned, theirOwnedIds: theirOwned });
        expect(sortedPairs(cols.mine)).toEqual(sortedPairs(mine));
        expect(sortedPairs(cols.theirs)).toEqual(sortedPairs(theirs));
      }),
    );
  });

  it("tags each column against the OPPOSITE set, never its own", () => {
    // A card I own and they don't must be badged in my column; the reverse must
    // not leak. This is the bug the two-column layout invites.
    const shared = tcard("shared", "rare", 2);
    const onlyMine = tcard("mine-only", "rare", 3);
    const cols = buildColumns({
      mine: [shared, onlyMine],
      theirs: [shared],
      myOwnedIds: new Set(["shared", "mine-only"]),
      theirOwnedIds: new Set(["shared"]),
    });
    expect(cols.mine.find((c) => c.card.id === "mine-only")!.newToOther).toBe(true);
    expect(cols.mine.find((c) => c.card.id === "shared")!.newToOther).toBe(false);
    expect(cols.theirs[0].newToOther).toBe(false);
  });
});

describe("applyMissingFilter (Inc22 FR5)", () => {
  it("off is the identity", () => {
    fc.assert(
      fc.property(inventoryArb, ownedArb, (mine, owned) => {
        const cols = buildColumns({ mine, theirs: [], myOwnedIds: new Set(), theirOwnedIds: owned });
        expect(applyMissingFilter(cols.mine, false)).toBe(cols.mine);
      }),
    );
  });

  it("on keeps exactly the badged cards", () => {
    fc.assert(
      fc.property(inventoryArb, ownedArb, (mine, owned) => {
        const cols = buildColumns({ mine, theirs: [], myOwnedIds: new Set(), theirOwnedIds: owned });
        const out = applyMissingFilter(cols.mine, true);
        expect(out.every((c) => c.newToOther)).toBe(true);
        expect(out.length).toBe(cols.mine.filter((c) => c.newToOther).length);
      }),
    );
  });
});

describe("missingCount (Inc22 FR7 — friend chip counts)", () => {
  it("always equals the number of badged cards on the board", () => {
    // The chip on the friend strip and the badges on the board are computed at
    // different times from different data; they must never disagree.
    fc.assert(
      fc.property(inventoryArb, ownedArb, (mine, theirOwned) => {
        const cols = buildColumns({
          mine,
          theirs: [],
          myOwnedIds: new Set(),
          theirOwnedIds: theirOwned,
        });
        expect(missingCount(mine, theirOwned)).toBe(cols.mine.filter((c) => c.newToOther).length);
      }),
    );
  });

  it("is 0 when they own everything, and the full inventory when they own nothing", () => {
    fc.assert(
      fc.property(inventoryArb, (mine) => {
        expect(missingCount(mine, new Set(mine.map((t) => t.card.id)))).toBe(0);
        expect(missingCount(mine, new Set())).toBe(mine.length);
      }),
    );
  });
});

describe("isPickable (Inc22 FR6 — agrees with validateTrade)", () => {
  it("everything is pickable while the other side is empty", () => {
    fc.assert(
      fc.property(tcardArb, (t) => {
        expect(isPickable(t.card, null)).toBe(true);
      }),
    );
  });

  it("never offers a pick validateTrade would reject on rarity", () => {
    fc.assert(
      fc.property(tcardArb, tcardArb, (a, b) => {
        const verdict = validateTrade(
          { childId: "A", cardId: a.card.id, rarity: a.card.rarity, count: a.count },
          { childId: "B", cardId: b.card.id, rarity: b.card.rarity, count: b.count },
        );
        // Distinct children, both duplicates by construction — so the only rule
        // left that can fail (beyond an identical card id) is the rarity clause.
        if (a.card.id !== b.card.id) {
          expect(isPickable(a.card, b.card)).toBe(verdict.ok);
        }
        // And whenever the board says pickable, rarities genuinely match.
        if (isPickable(a.card, b.card)) expect(a.card.rarity).toBe(b.card.rarity);
      }),
    );
  });

  it("is symmetric", () => {
    fc.assert(
      fc.property(tcardArb, tcardArb, (a, b) => {
        expect(isPickable(a.card, b.card)).toBe(isPickable(b.card, a.card));
      }),
    );
  });
});

// ---- #109: what a swap is worth to whoever receives the card ----

function sortedIds(cards: BoardCard[]): string[] {
  return cards.map((c) => c.card.id).sort();
}

/**
 * Membership as a multiset of (id, count) pairs. Ids repeat in a generated
 * inventory, so a first-match lookup would check one entry's count twice and
 * miss the other entirely.
 */
function sortedPairs(cards: { card: { id: string }; count: number }[]): string[] {
  return cards.map((c) => `${c.card.id}\u0000${c.count}`).sort();
}

const TIER_RANK: Record<SwapTier, number> = { new: 0, "one-away": 1, rest: 2 };

describe("oneAwayFromBurn (#109 tier 2 — expressed through SACRIFICE_MIN, never a literal)", () => {
  it("is true for exactly one holding: one below the burn minimum", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (count) => {
        expect(oneAwayFromBurn(count)).toBe(count === SACRIFICE_MIN - 1);
      }),
    );
  });

  it("one more copy always lands exactly on the burn minimum", () => {
    // The whole promise of the tier: accept this swap and the receiver can burn.
    // If SACRIFICE_MIN ever moves, this stays true and the literal would not.
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (count) => {
        if (oneAwayFromBurn(count)) expect(count + 1).toBe(SACRIFICE_MIN);
      }),
    );
  });
});

describe("tiers (#109 — mirrored, receiver-valued)", () => {
  it("tier 'new' is exactly newToOther, on both columns", () => {
    fc.assert(
      fc.property(inventoryArb, inventoryArb, ownedArb, ownedArb, (mine, theirs, myOwned, theirOwned) => {
        const cols = buildColumns({ mine, theirs, myOwnedIds: myOwned, theirOwnedIds: theirOwned });
        for (const c of [...cols.mine, ...cols.theirs]) {
          expect(c.tier === "new").toBe(c.newToOther);
        }
      }),
    );
  });

  it("tier 'one-away' means the RECEIVER — not the giver — is one copy from burning", () => {
    // The mirror is the easy thing to get backwards: my column is tiered by the
    // friend's shelf, theirs by mine.
    fc.assert(
      fc.property(inventoryArb, inventoryArb, ownedArb, ownedArb, (mine, theirs, myOwned, theirOwned) => {
        const cols = buildColumns({ mine, theirs, myOwnedIds: myOwned, theirOwnedIds: theirOwned });
        const theirCount = new Map(theirs.map((t) => [t.card.id, t.count]));
        const myCount = new Map(mine.map((t) => [t.card.id, t.count]));
        for (const c of cols.mine) {
          const held = theirCount.get(c.card.id);
          expect(c.tier === "one-away").toBe(
            theirOwned.has(c.card.id) && held !== undefined && oneAwayFromBurn(held),
          );
        }
        for (const c of cols.theirs) {
          const held = myCount.get(c.card.id);
          expect(c.tier === "one-away").toBe(
            myOwned.has(c.card.id) && held !== undefined && oneAwayFromBurn(held),
          );
        }
      }),
    );
  });

  it("a card the receiver owns but holds only once is 'rest', never 'one-away'", () => {
    // Single copies never reach the duplicate list, so the count is simply absent.
    // Absent must read as "not one away", not as "unknown, assume yes".
    const card = tcard("solo", "rare", 4);
    const cols = buildColumns({
      mine: [card],
      theirs: [],
      myOwnedIds: new Set(["solo"]),
      theirOwnedIds: new Set(["solo"]),
    });
    expect(cols.mine[0].tier).toBe("rest");
  });

  it("puts a receiver holding SACRIFICE_MIN - 1 in tier 2, and one more copy in tier 3", () => {
    const oneAway = tcard("one-away", "rare", 2);
    const already = tcard("already", "rare", 2);
    const cols = buildColumns({
      mine: [oneAway, already],
      theirs: [tcard("one-away", "rare", SACRIFICE_MIN - 1), tcard("already", "rare", SACRIFICE_MIN)],
      myOwnedIds: new Set(["one-away", "already"]),
      theirOwnedIds: new Set(["one-away", "already"]),
    });
    expect(cols.mine.find((c) => c.card.id === "one-away")!.tier).toBe("one-away");
    expect(cols.mine.find((c) => c.card.id === "already")!.tier).toBe("rest");
  });
});

describe("orderByValue (#109 — best swap first, and it never moves under a thumb)", () => {
  const boardCardArb = fc
    .tuple(tcardArb, fc.constantFrom<SwapTier>("new", "one-away", "rest"))
    .map(([t, tier]) => ({ ...t, tier, newToOther: tier === "new" }) satisfies BoardCard);
  const columnArb = fc.array(boardCardArb, { maxLength: 20 });

  it("is a permutation — nothing added, nothing lost", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        expect(sortedIds(orderByValue(cards))).toEqual(sortedIds(cards));
      }),
    );
  });

  it("never mutates its input", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        const before = cards.map((c) => c.card.id);
        orderByValue(cards);
        expect(cards.map((c) => c.card.id)).toEqual(before);
      }),
    );
  });

  it("orders new → one-away → rest, then rarest, then id", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        const out = orderByValue(cards);
        for (let i = 1; i < out.length; i += 1) {
          const [a, b] = [out[i - 1], out[i]];
          expect(TIER_RANK[a.tier]).toBeLessThanOrEqual(TIER_RANK[b.tier]);
          if (a.tier !== b.tier) continue;
          expect(RARITIES.indexOf(a.card.rarity)).toBeGreaterThanOrEqual(
            RARITIES.indexOf(b.card.rarity),
          );
          if (a.card.rarity !== b.card.rarity) continue;
          expect(a.card.id <= b.card.id).toBe(true);
        }
      }),
    );
  });

  it("is a TOTAL order: the same cards in any arrival order give the same column", () => {
    // The property that matters at the thumb — a re-render must not reshuffle
    // tiles, so distinct cards can never compare equal.
    fc.assert(
      fc.property(columnArb, (cards) => {
        const unique = [...new Map(cards.map((c) => [c.card.id, c])).values()];
        const shuffled = [...unique].reverse();
        expect(orderByValue(shuffled).map((c) => c.card.id)).toEqual(
          orderByValue(unique).map((c) => c.card.id),
        );
      }),
    );
  });
});

describe("bandsByTier (#110 — the tier is said once above a band, not on every tile)", () => {
  const boardCardArb = fc
    .tuple(tcardArb, fc.constantFrom<SwapTier>("new", "one-away", "rest"))
    .map(([t, tier]) => ({ ...t, tier, newToOther: tier === "new" }) satisfies BoardCard);
  const columnArb = fc.array(boardCardArb, { maxLength: 20 });

  it("reading the bands top to bottom is exactly the ordered column", () => {
    // The whole point of the shape: the bands make #109's order LEGIBLE, so
    // they must never re-do it. If this ever fails, a child's best swap has
    // moved because of a heading.
    fc.assert(
      fc.property(columnArb, (cards) => {
        const column = orderByValue(cards);
        expect(bandsByTier(column).flatMap((b) => b.cards)).toEqual(column);
      }),
    );
  });

  it("every card lands in exactly one band, and it's the band of its tier", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        const bands = bandsByTier(orderByValue(cards));
        expect(sortedIds(bands.flatMap((b) => b.cards))).toEqual(sortedIds(cards));
        for (const band of bands) {
          for (const c of band.cards) expect(c.tier).toBe(band.tier);
        }
      }),
    );
  });

  it("never emits a heading over nothing", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        for (const band of bandsByTier(cards)) expect(band.cards.length).toBeGreaterThan(0);
      }),
    );
  });

  it("bands come out best-swap-first, matching the tier ranking", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        const ranks = bandsByTier(cards).map((b) => TIER_RANK[b.tier]);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      }),
    );
  });

  it("never mutates its input", () => {
    fc.assert(
      fc.property(columnArb, (cards) => {
        const before = cards.map((c) => c.card.id);
        bandsByTier(cards);
        expect(cards.map((c) => c.card.id)).toEqual(before);
      }),
    );
  });
});
