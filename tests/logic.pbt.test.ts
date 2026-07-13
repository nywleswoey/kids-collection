import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  drawCard,
  applyPull,
  grantTokens,
  themeProgress,
  type Rng,
} from "@/lib/logic";
import {
  type Card,
  type Child,
  type CollectionEntry,
  type Rarity,
  RARITIES,
  RARITY_WEIGHTS,
} from "@/lib/types";

const cardArb = (i: number): fc.Arbitrary<Card> =>
  fc.record({
    id: fc.constant(`card-${i}-${Math.random()}`),
    themeId: fc.constantFrom("t1", "t2"),
    name: fc.string(),
    rarity: fc.constantFrom(...RARITIES),
    imageUrl: fc.constant("https://example/i.png"),
    eduText: fc.string(),
    sourceUrl: fc.constant("https://example/s"),
  });

const poolArb = fc
  .array(fc.integer(), { minLength: 1, maxLength: 30 })
  .chain((arr) => fc.tuple(...arr.map((_, i) => cardArb(i))));

const childArb: fc.Arbitrary<Child> = fc.record({
  id: fc.constant("child-1"),
  name: fc.string(),
  avatar: fc.constant("fox"),
  pullTokens: fc.integer({ min: 0, max: 1000 }),
  epicTickets: fc.integer({ min: 0, max: 10 }),
  luckyTickets: fc.integer({ min: 0, max: 10 }),
  pickTickets: fc.constant({ common: 0, rare: 0, epic: 0, legendary: 0 }),
});

describe("drawCard (BR1, BR2)", () => {
  it("always returns a card from the pool", () => {
    fc.assert(
      fc.property(poolArb, fc.double({ min: 0, max: 0.999, noNaN: true }), (pool, r) => {
        const rng: Rng = () => r;
        const card = drawCard(pool, rng);
        expect(pool.map((c) => c.id)).toContain(card.id);
      }),
    );
  });

  it("approximates configured rarity weights over many draws", () => {
    // Pool with every rarity present.
    const pool: Card[] = RARITIES.map((rarity, i) => ({
      id: `c-${i}`,
      themeId: "t1",
      name: rarity,
      rarity,
      imageUrl: "x",
      eduText: "y",
      sourceUrl: "",
    }));
    const counts: Record<Rarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
    const N = 40000;
    for (let i = 0; i < N; i++) {
      const card = drawCard(pool); // real RNG
      counts[card.rarity]++;
    }
    for (const r of RARITIES) {
      const observed = (counts[r] / N) * 100;
      // within 3 percentage points of the configured weight
      expect(Math.abs(observed - RARITY_WEIGHTS[r])).toBeLessThan(3);
    }
  });
});

describe("applyPull (BR6, BR8, BR9)", () => {
  it("spends exactly one token and adds exactly one to count", () => {
    fc.assert(
      fc.property(
        childArb.filter((c) => c.pullTokens >= 1),
        fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
        (child, existingCount) => {
          const card: Card = {
            id: "card-x",
            themeId: "t1",
            name: "n",
            rarity: "common",
            imageUrl: "x",
            eduText: "y",
            sourceUrl: "",
          };
          const existing: CollectionEntry | undefined =
            existingCount === undefined
              ? undefined
              : { childId: child.id, cardId: card.id, count: existingCount };

          const res = applyPull(child, card, existing);

          expect(res.child.pullTokens).toBe(child.pullTokens - 1);
          expect(res.entry.count).toBe((existingCount ?? 0) + 1);
          expect(res.entry.count).toBeGreaterThanOrEqual(1);
          expect(res.isDuplicate).toBe(existing !== undefined);
        },
      ),
    );
  });

  it("throws when no tokens", () => {
    const child: Child = {
      id: "c",
      name: "n",
      avatar: "fox",
      pullTokens: 0,
      epicTickets: 0,
      luckyTickets: 0,
      pickTickets: { common: 0, rare: 0, epic: 0, legendary: 0 },
    };
    const card: Card = {
      id: "card-x",
      themeId: "t1",
      name: "n",
      rarity: "common",
      imageUrl: "x",
      eduText: "y",
      sourceUrl: "",
    };
    expect(() => applyPull(child, card, undefined)).toThrow();
  });
});

describe("grantTokens (BR5, BR7)", () => {
  it("never produces a negative balance", () => {
    fc.assert(
      fc.property(childArb, fc.integer({ min: -2000, max: 2000 }), (child, delta) => {
        const res = grantTokens(child, delta);
        expect(res.pullTokens).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("adds exactly delta when result stays non-negative", () => {
    fc.assert(
      fc.property(childArb, fc.integer({ min: 0, max: 2000 }), (child, delta) => {
        const res = grantTokens(child, delta);
        expect(res.pullTokens).toBe(child.pullTokens + delta);
      }),
    );
  });
});

describe("themeProgress (BR11)", () => {
  it("0 <= owned <= total and complete iff owned == total", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string(), { minLength: 0, maxLength: 20 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (themeCardIds, ownFraction) => {
          const ownCount = Math.floor(themeCardIds.length * ownFraction);
          const ownedIds = themeCardIds.slice(0, ownCount);
          const entries: CollectionEntry[] = ownedIds.map((cardId) => ({
            childId: "c",
            cardId,
            count: 1,
          }));
          const prog = themeProgress(entries, themeCardIds);
          expect(prog.owned).toBeGreaterThanOrEqual(0);
          expect(prog.owned).toBeLessThanOrEqual(prog.total);
          expect(prog.complete).toBe(
            prog.total > 0 && prog.owned === prog.total,
          );
        },
      ),
    );
  });
});
