import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "./schema";

/**
 * How many copies of a card a child currently holds, 0 if the (childId, cardId)
 * collection entry is absent. Single source of truth for the single-entry
 * ownedCount read shared by the binder card-detail and trade paths. The DB CHECK
 * `count >= 1` means a present row is always >= 1, so 0 unambiguously signals
 * "not owned".
 */
export async function getCardCount(
  childId: string,
  cardId: string,
): Promise<number> {
  const row = await db.query.collections.findFirst({
    where: and(eq(collections.childId, childId), eq(collections.cardId, cardId)),
  });
  return row?.count ?? 0;
}
