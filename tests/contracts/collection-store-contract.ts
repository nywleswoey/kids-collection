import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { CollectionSeed } from "@/db/stores/collection-store.fake";

/**
 * Shared CollectionStore conformance spec. Run it against BOTH adapters — the
 * in-memory fake here in Vitest, and the pg adapter in Build & Test against a
 * real Postgres — so the two can never silently disagree on the atomicity
 * contract. This is what makes the seam real rather than hypothetical.
 *
 * `makeStore(seed)` must return a FRESH, isolated store each call.
 */
export function runCollectionStoreContract(
  label: string,
  makeStore: (seed?: CollectionSeed) => CollectionStore | Promise<CollectionStore>,
  opts: { properties?: boolean } = {},
) {
  // Exhaustive fuzzing runs against the in-memory fake; the pg run sets
  // properties:false (adapter agreement on concrete cases, no DB hammering).
  const properties = opts.properties !== false;
  describe(`CollectionStore contract: ${label}`, () => {
    it("grantCard adds one copy and returns the new count", async () => {
      const store = await makeStore({ kid: { a: 1 } });
      expect(await store.grantCard("kid", "a")).toEqual({ count: 2 });
      expect(await store.grantCard("kid", "b")).toEqual({ count: 1 });
      expect(await store.cardCount("kid", "a")).toBe(2);
    });

    it("cardCount is 0 for an unheld card", async () => {
      const store = await makeStore();
      expect(await store.cardCount("kid", "nope")).toBe(0);
    });

    it("ownedCardIds is the set held with count >= 1", async () => {
      const store = await makeStore({ kid: { a: 1, b: 3 } });
      expect(await store.ownedCardIds("kid")).toEqual(new Set(["a", "b"]));
      expect(await store.ownedCardIds("ghost")).toEqual(new Set());
    });

    it("entries returns every owned (cardId, count) row", async () => {
      const store = await makeStore({ kid: { a: 1, b: 3 } });
      const entries = (await store.entries("kid")).sort((x, y) => x.cardId.localeCompare(y.cardId));
      expect(entries).toEqual([
        { cardId: "a", count: 1 },
        { cardId: "b", count: 3 },
      ]);
      expect(await store.entries("ghost")).toEqual([]);
    });

    it("ownedCounts reports 0 for absent ids", async () => {
      const store = await makeStore({ kid: { a: 3 } });
      expect(await store.ownedCounts("kid", ["a", "b"])).toEqual({ a: 3, b: 0 });
    });

    it("tradableDuplicates returns only count >= 2 rows", async () => {
      const store = await makeStore({ kid: { a: 1, b: 2, c: 5 } });
      const dups = (await store.tradableDuplicates("kid")).sort((x, y) =>
        x.cardId.localeCompare(y.cardId),
      );
      expect(dups).toEqual([
        { cardId: "b", count: 2 },
        { cardId: "c", count: 5 },
      ]);
    });

    it("removeCard no-ops (returns null) below minHeld, leaving the last copy", async () => {
      const store = await makeStore({ kid: { a: 1 } });
      expect(await store.removeCard("kid", "a")).toBeNull(); // default minHeld 2
      expect(await store.cardCount("kid", "a")).toBe(1);
    });

    it("removeCard decrements when the guard passes", async () => {
      const store = await makeStore({ kid: { a: 3 } });
      expect(await store.removeCard("kid", "a")).toEqual({ count: 2 });
      expect(await store.cardCount("kid", "a")).toBe(2);
    });

    it("removeCard to exactly 0 deletes the row (no CHECK violation)", async () => {
      const store = await makeStore({ kid: { a: 3 } });
      // Remove all 3 with minHeld = 3 (the sacrifice shape). Reaching 0 must
      // succeed by deleting the row, not throw on count >= 1.
      expect(await store.removeCard("kid", "a", 3, 3)).toEqual({ count: 0 });
      expect(await store.cardCount("kid", "a")).toBe(0);
      expect(await store.ownedCardIds("kid")).toEqual(new Set());
    });

    it("swapCards swaps two duplicates cleanly", async () => {
      const store = await makeStore({ A: { x: 2 }, B: { y: 2 } });
      expect(await store.swapCards({ aChildId: "A", aCardId: "x", bChildId: "B", bCardId: "y" })).toBe(true);
      // A: x 2→1 (gave), y 0→1 (got). B: y 2→1 (gave), x 0→1 (got).
      expect(await store.cardCount("A", "x")).toBe(1);
      expect(await store.cardCount("A", "y")).toBe(1);
      expect(await store.cardCount("B", "y")).toBe(1);
      expect(await store.cardCount("B", "x")).toBe(1);
    });

    it("swapCards is all-or-nothing when one side is not a duplicate", async () => {
      // A holds only 1 of x (raced away its duplicate). The swap cannot commit
      // atomically → returns false and nothing changes on either side.
      const store = await makeStore({ A: { x: 1 }, B: { y: 2 } });
      expect(await store.swapCards({ aChildId: "A", aCardId: "x", bChildId: "B", bCardId: "y" })).toBe(false);
      expect(await store.cardCount("A", "x")).toBe(1); // unchanged
      expect(await store.cardCount("A", "y")).toBe(0); // did NOT receive
      expect(await store.cardCount("B", "y")).toBe(2); // did NOT give
      expect(await store.cardCount("B", "x")).toBe(0); // did NOT receive
    });

    it("swapCards is all-or-nothing when a giver holds none of the card", async () => {
      // A no longer holds x at all (raced away its last copy). The swap must not
      // commit a lopsided trade → returns false and nothing changes.
      const store = await makeStore({ B: { y: 2 } });
      expect(await store.swapCards({ aChildId: "A", aCardId: "x", bChildId: "B", bCardId: "y" })).toBe(false);
      expect(await store.cardCount("A", "x")).toBe(0); // still absent
      expect(await store.cardCount("A", "y")).toBe(0); // did NOT receive
      expect(await store.cardCount("B", "y")).toBe(2); // did NOT give
      expect(await store.cardCount("B", "x")).toBe(0); // did NOT receive
    });

    it.runIf(properties)("property: a grant then a guarded remove round-trips the count", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (start) => {
            const store = await makeStore({ kid: { a: start } });
            await store.grantCard("kid", "a"); // start + 1
            const r = await store.removeCard("kid", "a"); // guard start+1 >= 2 always true
            expect(r).toEqual({ count: start });
            expect(await store.cardCount("kid", "a")).toBe(start);
          },
        ),
      );
    });
  });
}
