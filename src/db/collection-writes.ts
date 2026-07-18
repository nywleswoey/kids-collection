import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
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

/**
 * Remove `count` copies of a card from a child's collection, guarded so the
 * update only applies while the child still holds at least `minHeld` copies
 * (default `count + 1`, i.e. never give away the last copy). Returns the
 * Drizzle builder (not yet awaited) so callers can chain `.returning(...)`,
 * `await` it, or drop it into a `db.batch([...])`. The `gte` guard makes the
 * decrement an atomic CAS: a raced/stale caller that no longer holds enough
 * copies matches zero rows instead of going negative. Single source of truth
 * for the count decrement shared by trades and sacrifices.
 */
export function removeCardCopy(
  childId: string,
  cardId: string,
  count = 1,
  minHeld = count + 1,
) {
  return db
    .update(collections)
    .set({ count: sql`${collections.count} - ${count}` })
    .where(
      and(
        eq(collections.childId, childId),
        eq(collections.cardId, cardId),
        gte(collections.count, minHeld),
      ),
    );
}
