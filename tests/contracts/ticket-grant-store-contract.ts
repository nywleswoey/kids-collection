import { describe, it, expect } from "vitest";
import type { TicketGrantStore } from "@/db/stores/ticket-grant-store";

/**
 * Shared TicketGrantStore conformance spec — run against BOTH the in-memory
 * fake and the pg adapter. `makeStore()` must return a FRESH, isolated store
 * each call.
 */
export function runTicketGrantStoreContract(
  label: string,
  makeStore: () => TicketGrantStore | Promise<TicketGrantStore>,
) {
  describe(`TicketGrantStore contract: ${label}`, () => {
    it("records a grant and reads it back", async () => {
      const store = await makeStore();
      await store.record("kid", "pullTokens", 4, "admin", "Parent Name");

      const [row] = await store.recentForChild("kid", 10);
      expect(row).toMatchObject({
        childId: "kid",
        column: "pullTokens",
        amount: 4,
        source: "admin",
        grantedBy: "Parent Name",
      });
      expect(row.createdAt).toBeInstanceOf(Date);
    });

    it("records a null grantedBy (sacrifice has no parent actor)", async () => {
      const store = await makeStore();
      await store.record("kid", "easterEggTickets", 1, "sacrifice", null);

      const [row] = await store.recentForChild("kid", 10);
      expect(row.grantedBy).toBeNull();
    });

    it("recentForChild returns newest first, scoped to one child", async () => {
      const store = await makeStore();
      await store.record("kid", "pullTokens", 1, "admin", null);
      await store.record("other", "pullTokens", 99, "admin", null);
      await store.record("kid", "pullTokens", 2, "admin", null);

      const rows = await store.recentForChild("kid", 10);
      expect(rows.map((r) => r.amount)).toEqual([2, 1]);
    });

    it("recentForChild respects the limit", async () => {
      const store = await makeStore();
      await store.record("kid", "pullTokens", 1, "admin", null);
      await store.record("kid", "pullTokens", 2, "admin", null);
      await store.record("kid", "pullTokens", 3, "admin", null);

      expect(await store.recentForChild("kid", 2)).toHaveLength(2);
    });
  });
}
