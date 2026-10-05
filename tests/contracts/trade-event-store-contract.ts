import { describe, it, expect } from "vitest";
import type { TradeEventStore } from "@/db/stores/trade-event-store";

/**
 * Shared TradeEventStore conformance spec — run against BOTH the in-memory
 * fake and the pg adapter. `makeStore()` must return a FRESH, isolated store
 * each call.
 */
export function runTradeEventStoreContract(
  label: string,
  makeStore: () => TradeEventStore | Promise<TradeEventStore>,
) {
  describe(`TradeEventStore contract: ${label}`, () => {
    it("records a trade and reads it back", async () => {
      const store = await makeStore();
      await store.record({ aChildId: "a", aCardId: "x", bChildId: "b", bCardId: "y" });

      const [row] = await store.recentForChild("a", 10);
      expect(row).toMatchObject({ aChildId: "a", aCardId: "x", bChildId: "b", bCardId: "y" });
      expect(row.createdAt).toBeInstanceOf(Date);
    });

    it("is visible from EITHER side of the trade", async () => {
      const store = await makeStore();
      await store.record({ aChildId: "a", aCardId: "x", bChildId: "b", bCardId: "y" });

      const [fromA] = await store.recentForChild("a", 10);
      const [fromB] = await store.recentForChild("b", 10);
      expect(fromA.id).toBe(fromB.id); // same row
    });

    it("recentForChild excludes a bystander not party to the trade", async () => {
      const store = await makeStore();
      await store.record({ aChildId: "a", aCardId: "x", bChildId: "b", bCardId: "y" });

      expect(await store.recentForChild("c", 10)).toEqual([]);
    });

    it("recentForChild returns newest first and respects the limit", async () => {
      const store = await makeStore();
      await store.record({ aChildId: "a", aCardId: "x1", bChildId: "b", bCardId: "y1" });
      await store.record({ aChildId: "a", aCardId: "x2", bChildId: "b", bCardId: "y2" });
      await store.record({ aChildId: "a", aCardId: "x3", bChildId: "b", bCardId: "y3" });

      const limited = await store.recentForChild("a", 2);
      expect(limited).toHaveLength(2);
      expect(limited[0].aCardId).toBe("x3");
    });
  });
}
