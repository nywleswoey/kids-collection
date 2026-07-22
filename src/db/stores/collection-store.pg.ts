import "server-only";
import { and, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { addCardCopy } from "@/db/collection-writes";
import { getCardCount } from "@/db/collection-reads";
import type { CollectionStore, SwapInput } from "./collection-store";

/** WHERE (child, card) — the collection primary key. */
const at = (childId: string, cardId: string) =>
  and(eq(collections.childId, childId), eq(collections.cardId, cardId));

/**
 * Postgres adapter for CollectionStore. Composes the `addCardCopy`/`getCardCount`
 * builders with inline SQL for the atomic paths. The only `server-only` code
 * behind the seam.
 */
export const pgCollectionStore: CollectionStore = {
  async grantCard(childId, cardId) {
    const [entry] = await addCardCopy(childId, cardId).returning({
      count: collections.count,
    });
    return { count: entry.count };
  },

  async removeCard(childId, cardId, count = 1, minHeld = count + 1) {
    // Guarded by `held >= minHeld`. Removing to exactly 0 must delete the row
    // (count >= 1 is a CHECK — 0 copies means row absence), so split into a
    // delete-all and a decrement-keeping; the count value makes them exclusive.
    const [deleted, updated] = await db.batch([
      db
        .delete(collections)
        .where(and(at(childId, cardId), eq(collections.count, count), gte(collections.count, minHeld)))
        .returning({ count: collections.count }),
      db
        .update(collections)
        .set({ count: sql`${collections.count} - ${count}` })
        .where(and(at(childId, cardId), gt(collections.count, count), gte(collections.count, minHeld)))
        .returning({ count: collections.count }),
    ]);
    if (deleted.length > 0) return { count: 0 };
    if (updated.length > 0) return { count: updated[0].count };
    return null; // guard failed (held < minHeld)
  },

  async swapCards({ aChildId, aCardId, bChildId, bCardId }: SwapInput) {
    // All-or-nothing: a giver must hold >= 2 (keep >= 1 after giving). Model the
    // decrement as an upsert whose seed is `held - 1`, so BOTH raced states trip a
    // constraint and roll the whole batch back. When held >= 2 the seed is >= 1
    // (passes the CHECK), the (child, card) conflict fires, and DO UPDATE
    // decrements the real row. When held == 1 the seed is 0 → `CHECK(count >= 1)`
    // violation; when the row is absent the subquery is NULL → NOT NULL violation
    // (a plain guarded update would match zero rows there, silently committing a
    // lopsided trade). Seeding a literal 0 can't work: Postgres evaluates the
    // INSERT tuple's CHECK before conflict arbitration, so it would reject every
    // legitimate give too.
    const give = (childId: string, cardId: string) =>
      db
        .insert(collections)
        .values({
          childId,
          cardId,
          count: sql`(select ${collections.count} - 1 from ${collections} where ${at(childId, cardId)})`,
        })
        .onConflictDoUpdate({
          target: [collections.childId, collections.cardId],
          set: { count: sql`${collections.count} - 1` },
        });
    try {
      await db.batch([
        give(aChildId, aCardId),
        addCardCopy(aChildId, bCardId),
        give(bChildId, bCardId),
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

  async entries(childId) {
    const rows = await db
      .select({ cardId: collections.cardId, count: collections.count })
      .from(collections)
      .where(eq(collections.childId, childId));
    return rows.map((r) => ({ cardId: r.cardId, count: r.count }));
  },

  async tradableDuplicates(childId) {
    const rows = await db
      .select({ cardId: collections.cardId, count: collections.count })
      .from(collections)
      .where(and(eq(collections.childId, childId), gte(collections.count, 2)));
    return rows.map((r) => ({ cardId: r.cardId, count: r.count }));
  },
};
