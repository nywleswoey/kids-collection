import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { findBrokenSets, type RewardRow } from "../scripts/reconcile/find-broken-sets";
import { RARITIES, type Rarity } from "@/lib/types";
import type { Card } from "@/lib/types";

function card(id: string, themeId: string, rarity: Rarity): Card {
  return { id, themeId, name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" };
}

const raritySetArb = fc
  .array(
    fc.record({
      id: fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/),
      themeId: fc.constantFrom("t1", "t2"),
      rarity: fc.constantFrom<Rarity>(...RARITIES),
    }),
    { minLength: 1, maxLength: 12 },
  )
  .map((rows) => {
    const seen = new Set<string>();
    return rows
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .map((r) => card(r.id, r.themeId, r.rarity));
  })
  .filter((cs) => cs.length > 0);

describe("findBrokenSets (reconcile's pure core)", () => {
  it("a reward for a fully-owned set is never broken", () => {
    fc.assert(
      fc.property(raritySetArb, (pool) => {
        const target = pool[0];
        const owned = new Set(
          pool.filter((c) => c.themeId === target.themeId && c.rarity === target.rarity).map((c) => c.id),
        );
        const rewardRows: RewardRow[] = [{ childId: "c1", themeId: target.themeId, rarity: target.rarity }];
        const broken = findBrokenSets({
          pool,
          rewardRows,
          ownedByChild: new Map([["c1", owned]]),
          themeName: new Map(),
          childName: new Map(),
        });
        expect(broken).toEqual([]);
      }),
    );
  });

  it("a reward for a set missing at least one card is broken, listing exactly what's missing", () => {
    fc.assert(
      fc.property(raritySetArb, fc.nat(), (pool, seed) => {
        const target = pool[0];
        const inSet = pool.filter((c) => c.themeId === target.themeId && c.rarity === target.rarity);
        const dropIdx = seed % inSet.length;
        const owned = new Set(inSet.filter((_, i) => i !== dropIdx).map((c) => c.id));
        const rewardRows: RewardRow[] = [{ childId: "c1", themeId: target.themeId, rarity: target.rarity }];
        const broken = findBrokenSets({
          pool,
          rewardRows,
          ownedByChild: new Map([["c1", owned]]),
          themeName: new Map(),
          childName: new Map(),
        });
        expect(broken).toHaveLength(1);
        expect(broken[0].missing.map((m) => m.id)).toEqual([inSet[dropIdx].id]);
      }),
    );
  });

  it("a child with no ownedByChild entry is treated as owning nothing, not skipped", () => {
    const pool = [card("a", "t1", "rare")];
    const broken = findBrokenSets({
      pool,
      rewardRows: [{ childId: "ghost", themeId: "t1", rarity: "rare" }],
      ownedByChild: new Map(),
      themeName: new Map(),
      childName: new Map(),
    });
    expect(broken).toHaveLength(1);
    expect(broken[0].missing.map((m) => m.id)).toEqual(["a"]);
  });

  it("falls back to the raw id when a theme or child name is unmapped", () => {
    const pool = [card("a", "t1", "rare"), card("b", "t1", "rare")];
    const broken = findBrokenSets({
      pool,
      rewardRows: [{ childId: "c1", themeId: "t1", rarity: "rare" }],
      ownedByChild: new Map([["c1", new Set(["a"])]]),
      themeName: new Map(),
      childName: new Map(),
    });
    expect(broken).toEqual([
      {
        childId: "c1",
        childName: "c1",
        themeId: "t1",
        themeName: "t1",
        rarity: "rare",
        missing: [{ id: "b", name: "b" }],
      },
    ]);
  });

  it("a reward for a set the pool no longer has any cards of is not reported as broken", () => {
    // Set became empty (all its cards pruned) — not a loss, per the module's doc comment.
    const pool = [card("a", "t2", "rare")];
    const broken = findBrokenSets({
      pool,
      rewardRows: [{ childId: "c1", themeId: "t1", rarity: "rare" }],
      ownedByChild: new Map(),
      themeName: new Map(),
      childName: new Map(),
    });
    expect(broken).toEqual([]);
  });
});
