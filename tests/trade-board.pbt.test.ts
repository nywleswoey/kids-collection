import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildColumns,
  applyMissingFilter,
  missingCount,
  isPickable,
} from "@/features/trade/board";
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

  it("preserves both inventories card-for-card, in order", () => {
    fc.assert(
      fc.property(inventoryArb, inventoryArb, ownedArb, ownedArb, (mine, theirs, myOwned, theirOwned) => {
        const cols = buildColumns({ mine, theirs, myOwnedIds: myOwned, theirOwnedIds: theirOwned });
        expect(cols.mine.map((c) => c.card.id)).toEqual(mine.map((t) => t.card.id));
        expect(cols.theirs.map((c) => c.card.id)).toEqual(theirs.map((t) => t.card.id));
        expect(cols.mine.map((c) => c.count)).toEqual(mine.map((t) => t.count));
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
