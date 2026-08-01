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
    // All-or-nothing in ONE statement (neon-http has no interactive tx, so the
    // guard can't inspect intermediate results and conditionally roll back). We
    // can't seed the decrement as an upsert-at-0 either: Postgres evaluates
    // `CHECK(count >= 1)` on the INSERT *candidate* row before conflict
    // resolution, so a count=0 candidate throws even when the DO UPDATE would
    // land at 1 — that broke every trade. Instead: two guarded decrements
    // (`count >= 2`, keeping the last copy), a `guard` CTE that divides by zero
    // — hence aborts and rolls back the whole statement — unless BOTH gives
    // matched exactly one row, and the receiver upserts gated on that guard. A
    // giver who raced away a copy (or never held one) matches zero rows → guard
    // fails → nothing commits, so no lopsided trade. The `1 / (CASE ...)` divisor
    // is column-derived so Postgres can't constant-fold it and pre-throw.
    try {
      await db.execute(sql`
        WITH
          ga AS (
            UPDATE collections SET count = count - 1
            WHERE child_id = ${aChildId} AND card_id = ${aCardId} AND count >= 2
            RETURNING 1
          ),
          gb AS (
            UPDATE collections SET count = count - 1
            WHERE child_id = ${bChildId} AND card_id = ${bCardId} AND count >= 2
            RETURNING 1
          ),
          guard AS (
            SELECT 1 / (CASE
              WHEN (SELECT count(*) FROM ga) = 1 AND (SELECT count(*) FROM gb) = 1
              THEN 1 ELSE 0 END) AS ok
          ),
          ra AS (
            INSERT INTO collections (child_id, card_id, count)
            SELECT ${aChildId}, ${bCardId}, 1 FROM guard WHERE ok = 1
            ON CONFLICT (child_id, card_id) DO UPDATE SET count = collections.count + 1
            RETURNING 1
          ),
          rb AS (
            INSERT INTO collections (child_id, card_id, count)
            SELECT ${bChildId}, ${aCardId}, 1 FROM guard WHERE ok = 1
            ON CONFLICT (child_id, card_id) DO UPDATE SET count = collections.count + 1
            RETURNING 1
          )
        SELECT ok FROM guard
      `);
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

  async ownedCardIdsForChildren(childIds) {
    const out = new Map<string, Set<string>>();
    if (childIds.length === 0) return out; // nothing to ask the DB
    const rows = await db
      .select({ childId: collections.childId, cardId: collections.cardId })
      .from(collections)
      .where(inArray(collections.childId, childIds));
    for (const r of rows) {
      let set = out.get(r.childId);
      if (!set) {
        set = new Set();
        out.set(r.childId, set);
      }
      set.add(r.cardId);
    }
    return out;
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
