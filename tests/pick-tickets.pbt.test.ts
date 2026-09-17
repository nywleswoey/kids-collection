import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { pickRarityChoices, rollWeightedRarity } from "@/features/pull/easter-egg";
import { RARITIES, RARITY_WEIGHTS, type Rarity } from "@/lib/types";
import type { Card } from "@/lib/types";

function card(id: string, rarity: Rarity): Card {
  return { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" };
}

describe("pickRarityChoices (Inc16 FR2)", () => {
  it("returns up to n cards, all of the exact rarity", () => {
    const pool = [
      card("a", "rare"),
      card("b", "rare"),
      card("c", "epic"),
      card("d", "rare"),
      card("e", "common"),
      card("f", "rare"),
      card("g", "rare"),
    ];
    fc.assert(
      fc.property(fc.constantFrom<Rarity>(...RARITIES), (rarity) => {
        const out = pickRarityChoices(pool, rarity, 5);
        expect(out.length).toBeLessThanOrEqual(5);
        expect(out.every((c) => c.rarity === rarity)).toBe(true);
        // no more than the pool has of that rarity
        const avail = pool.filter((c) => c.rarity === rarity).length;
        expect(out.length).toBe(Math.min(5, avail));
      }),
    );
  });
});

describe("rollWeightedRarity (Inc19 FR3)", () => {
  it("only ever returns a valid rarity, for any rng() in [0,1)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }).filter((u) => u < 1), (u) => {
        expect(RARITIES).toContain(rollWeightedRarity(() => u));
      }),
    );
  });

  it("maps the weight bands to the right tier", () => {
    // Inc25 FR3: bands are DERIVED from RARITY_WEIGHTS, not restated. The old
    // version hardcoded 0.6/0.85/0.97, so it only asserted that someone had
    // retyped the constant correctly — it broke the moment the odds were tuned
    // and said nothing about rollWeightedRarity itself.
    //
    // Bands are accumulated in WEIGHT units (matching the implementation, which
    // rolls rng()*total and subtracts weights) and probed strictly inside each
    // band. Probing the exact edge would assert float identity on a boundary
    // the two sides compute differently — that tests IEEE-754, not the mapping.
    const total = RARITIES.reduce((s, r) => s + RARITY_WEIGHTS[r], 0);
    expect(total).toBe(100); // the constant's own invariant

    const EPS = 1e-6; // « the narrowest band (legendary, 2% = 0.02)
    let loW = 0;
    for (const r of RARITIES) {
      const hiW = loW + RARITY_WEIGHTS[r];
      expect(rollWeightedRarity(() => loW / total + EPS)).toBe(r); // just inside the low edge
      expect(rollWeightedRarity(() => hiW / total - EPS)).toBe(r); // just inside the high edge
      expect(rollWeightedRarity(() => (loW + hiW) / 2 / total)).toBe(r); // midpoint
      loW = hiW;
    }
    expect(loW).toBe(total); // the bands tile the whole range — no gap, no overlap
  });

  it("covers [0,1) with no gaps: every roll lands in the band the weights imply", () => {
    // The complement of the edge-probe above: a dense sweep proving no input is
    // unmapped or mapped to a neighbouring tier, without asserting on exact
    // boundary values.
    const total = RARITIES.reduce((s, r) => s + RARITY_WEIGHTS[r], 0);
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const w = u * total;
      let acc = 0;
      const expected = RARITIES.find((r) => {
        acc += RARITY_WEIGHTS[r];
        return w < acc;
      })!;
      const actual = rollWeightedRarity(() => u);
      // Skip the handful of points sitting within float-noise of a boundary.
      const nearEdge = RARITIES.some((_, i2) => {
        const edge = RARITIES.slice(0, i2 + 1).reduce((s, r) => s + RARITY_WEIGHTS[r], 0);
        return Math.abs(w - edge) < 1e-9;
      });
      if (!nearEdge) expect(actual).toBe(expected);
    }
  });

  it("empirical distribution tracks RARITY_WEIGHTS", () => {
    const N = 20_000;
    const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    // Deterministic sweep across [0,1) so the test is stable (no Math.random).
    for (let i = 0; i < N; i++) counts[rollWeightedRarity(() => i / N)]++;
    for (const r of RARITIES) {
      expect(counts[r] / N).toBeCloseTo(RARITY_WEIGHTS[r] / 100, 2);
    }
  });
});
