import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { addCardCopy, removeCardCopy } from "@/db/collection-writes";
import { getCardCount } from "@/db/collection-reads";
import type { CollectionStore, SwapInput } from "./collection-store";

/**
 * Postgres adapter for CollectionStore. Composes the existing Drizzle
 * write/read builders (`addCardCopy`/`removeCardCopy`/`getCardCount`) — the
 * per-fragment files stay as this adapter's internals — plus the two inline
 * selects the pull/trade paths used. The only `server-only` code behind the seam.
 */
export const pgCollectionStore: CollectionStore = {
  async grantCard(childId, cardId) {
    const [entry] = await addCardCopy(childId, cardId).returning({
      count: collections.count,
    });
    return { count: entry.count };
  },

  async removeCard(childId, cardId, count = 1, minHeld = count + 1) {
    const rows = await removeCardCopy(childId, cardId, count, minHeld).returning({
      count: collections.count,
    });
    return rows.length === 0 ? null : { count: rows[0].count };
  },

  async swapCards({ aChildId, aCardId, bChildId, bCardId }: SwapInput) {
    try {
      await db.batch([
        // A gives aCard (guarded remove), A receives bCard.
        removeCardCopy(aChildId, aCardId),
        addCardCopy(aChildId, bCardId),
        // B gives bCard (guarded remove), B receives aCard.
        removeCardCopy(bChildId, bCardId),
        addCardCopy(bChildId, aCardId),
      ]);
      return true;
    } catch {
      return false;
    }
  },

  async ownedCounts(childId, cardIds) {
    const counts: Record<string, number> = {};
    for (const id of cardIds) counts[id] = 0;
    if (cardIds.length === 0) return counts;
    const rows = await db
      .select({ cardId: collections.cardId, count: collections.count })
      .from(collections)
      .where(
        and(
          eq(collections.childId, childId),
          inArray(collections.cardId, cardIds),
        ),
      );
    for (const r of rows) counts[r.cardId] = r.count;
    return counts;
  },

  cardCount(childId, cardId) {
    return getCardCount(childId, cardId);
  },

  async ownedCardIds(childId) {
    const rows = await db
      .select({ cardId: collections.cardId })
      .from(collections)
      .where(eq(collections.childId, childId));
    return new Set(rows.map((r) => r.cardId));
  },

  async tradableDuplicates(childId) {
    const rows = await db
      .select({ cardId: collections.cardId, count: collections.count })
      .from(collections)
      .where(and(eq(collections.childId, childId), gte(collections.count, 2)));
    return rows.map((r) => ({ cardId: r.cardId, count: r.count }));
  },
};
