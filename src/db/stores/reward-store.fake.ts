import type { Rarity } from "@/lib/types";
import type { RewardStore } from "./reward-store";

interface Row {
  id: string;
  childId: string;
  themeId: string;
  rarity: Rarity;
  cardId: string;
  shownAt: Date | null;
}

/**
 * In-memory RewardStore. Emulates the observable contract: the UNIQUE
 * (child, theme, rarity) single-grant of `claimReward`, and the shownAt guard on
 * `markShown`. Kept honest by the shared contract suite.
 */
export function inMemoryRewardStore(): RewardStore {
  const rows: Row[] = [];
  let seq = 0;

  return {
    async claimReward(childId, themeId, rarity, cardId) {
      const exists = rows.some(
        (r) => r.childId === childId && r.themeId === themeId && r.rarity === rarity,
      );
      if (exists) return false; // UNIQUE (child, theme, rarity) → single grant
      rows.push({ id: `r${++seq}`, childId, themeId, rarity, cardId, shownAt: null });
      return true;
    },

    async listPending(childId) {
      return rows
        .filter((r) => r.childId === childId && r.shownAt === null)
        .map((r) => ({ id: r.id, themeId: r.themeId, rarity: r.rarity, cardId: r.cardId }));
    },

    async markShown(childId, ids) {
      if (ids.length === 0) return;
      const set = new Set(ids);
      for (const r of rows) {
        if (r.childId === childId && r.shownAt === null && set.has(r.id)) {
          r.shownAt = new Date();
        }
      }
    },
  };
}
