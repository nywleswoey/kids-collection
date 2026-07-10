import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { children, collections } from "@/db/schema";
import { drawCard } from "@/lib/logic";
import { listCards } from "@/features/pool/service";
import type { PullResult } from "@/lib/types";

export type PullOutcome =
  | ({ outOfTokens: false } & PullResult)
  | { outOfTokens: true };

/**
 * Pull one card for a child. Atomic, no double-spend (U4-BR1/BR2).
 * 1) conditional spend, 2) draw, 3) upsert count, 4) refund on write failure.
 */
export async function pull(childId: string): Promise<PullOutcome> {
  // 1) Atomic compare-and-swap spend.
  const spent = await db
    .update(children)
    .set({ pullTokens: sql`${children.pullTokens} - 1` })
    .where(and(eq(children.id, childId), gte(children.pullTokens, 1)))
    .returning({ balance: children.pullTokens });

  if (spent.length === 0) return { outOfTokens: true }; // no spend, no draw

  const newBalance = spent[0].balance;

  try {
    const pool = await listCards();
    if (pool.length === 0) throw new Error("empty pool");

    // 2) Draw (rarity-weighted, pure).
    const card = drawCard(pool);

    // 3) Upsert collection count atomically.
    const [entry] = await db
      .insert(collections)
      .values({ childId, cardId: card.id, count: 1 })
      .onConflictDoUpdate({
        target: [collections.childId, collections.cardId],
        set: { count: sql`${collections.count} + 1` },
      })
      .returning({ count: collections.count });

    return {
      outOfTokens: false,
      card,
      isDuplicate: entry.count > 1,
      newBalance,
    };
  } catch (err) {
    // 4) Best-effort refund (U4-BR6).
    try {
      await db
        .update(children)
        .set({ pullTokens: sql`${children.pullTokens} + 1` })
        .where(eq(children.id, childId));
    } catch (refundErr) {
      console.error(`pull: refund failed for ${childId}`, refundErr);
    }
    throw err;
  }
}
