import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { listCards, getCard } from "@/features/pool/service";
import { grantCompletionRewards } from "@/features/rewards/service";
import type { Card, Rarity } from "@/lib/types";
import { validateTrade, type TradableCard, type TradeSide } from "./trade-logic";

export type TradeResult =
  | { ok: true; gave: Card; got: Card }
  | { ok: false; reason: string };

/** Cards a child can offer: owned duplicates (count >= 2), with card + rarity. */
export async function listTradableCards(childId: string): Promise<TradableCard[]> {
  const [cards, rows] = await Promise.all([
    listCards(),
    db
      .select({ cardId: collections.cardId, count: collections.count })
      .from(collections)
      .where(and(eq(collections.childId, childId), gte(collections.count, 2))),
  ]);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const out: TradableCard[] = [];
  for (const r of rows) {
    const card = byId.get(r.cardId);
    if (card) out.push({ card, count: r.count });
  }
  return out;
}

/** A child's tradable duplicates matching one rarity (FR5 step 3). */
export async function listMatchesForRarity(
  childId: string,
  rarity: Rarity,
): Promise<TradableCard[]> {
  const all = await listTradableCards(childId);
  return all.filter((t) => t.card.rarity === rarity);
}

/** Read one collection entry's count for (child, card), 0 if absent. */
async function ownedCount(childId: string, cardId: string): Promise<number> {
  const row = await db.query.collections.findFirst({
    where: and(eq(collections.childId, childId), eq(collections.cardId, cardId)),
  });
  return row?.count ?? 0;
}

/**
 * Atomic two-sided swap (FR4). Re-validates server-side, then commits 4 writes
 * in a single `db.batch` transaction. The DB CHECK `count >= 1` is the backstop:
 * decrementing a non-duplicate (1 → 0) violates it and rolls the whole batch
 * back, so a stale/raced trade fails cleanly with no partial state.
 */
export async function executeTrade(input: {
  aChildId: string;
  aCardId: string;
  bChildId: string;
  bCardId: string;
}): Promise<TradeResult> {
  const { aChildId, aCardId, bChildId, bCardId } = input;

  const [aCard, bCard] = await Promise.all([getCard(aCardId), getCard(bCardId)]);
  if (!aCard || !bCard) return { ok: false, reason: "That card is no longer available." };

  const [aCount, bCount] = await Promise.all([
    ownedCount(aChildId, aCardId),
    ownedCount(bChildId, bCardId),
  ]);

  const a: TradeSide = { childId: aChildId, cardId: aCardId, rarity: aCard.rarity, count: aCount };
  const b: TradeSide = { childId: bChildId, cardId: bCardId, rarity: bCard.rarity, count: bCount };
  const v = validateTrade(a, b);
  if (!v.ok) return { ok: false, reason: v.reason };

  try {
    await db.batch([
      // A gives aCard. `count >= 2` guard + CHECK(count>=1) → non-dup rolls back.
      db
        .update(collections)
        .set({ count: sql`${collections.count} - 1` })
        .where(and(eq(collections.childId, aChildId), eq(collections.cardId, aCardId), gte(collections.count, 2))),
      // A receives bCard.
      db
        .insert(collections)
        .values({ childId: aChildId, cardId: bCardId, count: 1 })
        .onConflictDoUpdate({
          target: [collections.childId, collections.cardId],
          set: { count: sql`${collections.count} + 1` },
        }),
      // B gives bCard.
      db
        .update(collections)
        .set({ count: sql`${collections.count} - 1` })
        .where(and(eq(collections.childId, bChildId), eq(collections.cardId, bCardId), gte(collections.count, 2))),
      // B receives aCard.
      db
        .insert(collections)
        .values({ childId: bChildId, cardId: aCardId, count: 1 })
        .onConflictDoUpdate({
          target: [collections.childId, collections.cardId],
          set: { count: sql`${collections.count} + 1` },
        }),
    ]);
  } catch {
    return { ok: false, reason: "That trade is no longer valid — try again." };
  }

  // Inc16 FR5: each side received a card — either may complete a set.
  await grantCompletionRewards(aChildId, [bCardId]);
  await grantCompletionRewards(bChildId, [aCardId]);

  return { ok: true, gave: aCard, got: bCard };
}
