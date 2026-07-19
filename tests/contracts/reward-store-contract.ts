import { describe, it, expect } from "vitest";
import type { RewardStore } from "@/db/stores/reward-store";

/**
 * Shared RewardStore conformance spec — run against BOTH the in-memory fake and
 * the pg adapter. Locks in the single-grant claim (UNIQUE child/theme/rarity) and
 * the shownAt guard. `makeStore()` must return a FRESH, isolated store each call.
 */
export function runRewardStoreContract(
  label: string,
  makeStore: () => RewardStore | Promise<RewardStore>,
) {
  describe(`RewardStore contract: ${label}`, () => {
    it("claimReward wins once per (child, theme, rarity), then loses", async () => {
      const store = await makeStore();
      expect(await store.claimReward("kid", "th", "rare", "c1")).toBe(true);
      expect(await store.claimReward("kid", "th", "rare", "c2")).toBe(false); // same set
      expect(await store.claimReward("kid", "th", "epic", "c3")).toBe(true); // diff rarity
      expect(await store.claimReward("other", "th", "rare", "c4")).toBe(true); // diff child
    });

    it("listPending returns claimed-but-unshown rows", async () => {
      const store = await makeStore();
      await store.claimReward("kid", "th", "rare", "c1");
      await store.claimReward("kid", "th", "epic", "c2");
      const pending = await store.listPending("kid");
      expect(pending.map((r) => r.cardId).sort()).toEqual(["c1", "c2"]);
      expect(await store.listPending("other")).toEqual([]);
    });

    it("markShown clears rows from pending; guards child + id", async () => {
      const store = await makeStore();
      await store.claimReward("kid", "th", "rare", "c1");
      await store.claimReward("kid", "th2", "rare", "c2");
      const [a] = await store.listPending("kid");

      await store.markShown("kid", [a.id]);
      const remaining = await store.listPending("kid");
      expect(remaining.map((r) => r.id)).toEqual(remaining.filter((r) => r.id !== a.id).map((r) => r.id));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).not.toBe(a.id);

      // Marking another child's id does nothing.
      await store.markShown("other", [remaining[0].id]);
      expect(await store.listPending("kid")).toHaveLength(1);
    });

    it("markShown of an empty list is a no-op", async () => {
      const store = await makeStore();
      await store.claimReward("kid", "th", "rare", "c1");
      await store.markShown("kid", []);
      expect(await store.listPending("kid")).toHaveLength(1);
    });
  });
}
