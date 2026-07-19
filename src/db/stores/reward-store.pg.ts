import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { collectionRewards } from "@/db/schema";
import type { RewardStore } from "./reward-store";

/**
 * Postgres adapter for RewardStore. Holds the collection_rewards SQL that was
 * inlined in rewards/service (the insert-first claim, the pending read, the
 * guarded shown-update). The only `server-only` code behind the seam.
 */
export const pgRewardStore: RewardStore = {
  async claimReward(childId, themeId, rarity, cardId) {
    const claimed = await db
      .insert(collectionRewards)
      .values({ childId, themeId, rarity, cardId })
      .onConflictDoNothing({
        target: [
          collectionRewards.childId,
          collectionRewards.themeId,
          collectionRewards.rarity,
        ],
      })
      .returning({ id: collectionRewards.id });
    return claimed.length > 0;
  },

  async listPending(childId) {
    const rows = await db
      .select()
      .from(collectionRewards)
      .where(and(eq(collectionRewards.childId, childId), isNull(collectionRewards.shownAt)));
    return rows.map((r) => ({
      id: r.id,
      themeId: r.themeId,
      rarity: r.rarity,
      cardId: r.cardId,
    }));
  },

  async markShown(childId, ids) {
    if (ids.length === 0) return;
    await db
      .update(collectionRewards)
      .set({ shownAt: new Date() })
      .where(
        and(
          eq(collectionRewards.childId, childId),
          isNull(collectionRewards.shownAt),
          inArray(collectionRewards.id, ids),
        ),
      );
  },
};
