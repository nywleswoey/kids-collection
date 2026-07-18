import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "./schema";

/**
 * Add one copy of a card to a child's collection: insert with count 1, or +1 on
 * the (childId, cardId) unique conflict. Returns the Drizzle builder (not yet
 * awaited) so callers can chain `.returning(...)`, `await` it directly, or drop
 * it into a `db.batch([...])`. Single source of truth for the count upsert
 * shared by pulls, easter eggs, completion rewards, and trades.
 */
export function addCardCopy(childId: string, cardId: string) {
  return db
    .insert(collections)
    .values({ childId, cardId, count: 1 })
    .onConflictDoUpdate({
      target: [collections.childId, collections.cardId],
      set: { count: sql`${collections.count} + 1` },
    });
}
