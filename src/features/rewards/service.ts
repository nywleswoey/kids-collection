import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections, collectionRewards } from "@/db/schema";
import { listCards } from "@/features/pool/service";
import { listThemes } from "@/features/pool/service";
import { pickUpgradeCard } from "@/features/pull/sacrifice";
import type { Card, Rarity } from "@/lib/types";
import { isRaritySetComplete, raritySetsFor } from "./collection-reward";

export interface GrantedReward {
  themeId: string;
  rarity: Rarity;
  card: Card;
}

/** Current owned card ids for a child (count >= 1). */
async function ownedCardIds(childId: string): Promise<Set<string>> {
  const rows = await db
    .select({ cardId: collections.cardId })
    .from(collections)
    .where(eq(collections.childId, childId));
  return new Set(rows.map((r) => r.cardId));
}

/**
 * Grant collection-completion rewards triggered by adding `addedCardIds` to the
 * child's collection (Inc16 FR5). For each (theme, rarity) set just completed,
 * grant one random card of that rarity (preferring unowned, any category).
 *
 * Race/dedup-safe: we insert the `collection_rewards` row FIRST with
 * `onConflictDoNothing().returning()`. Only if a row comes back (we won this
 * set) do we grant the bonus card — so a set is rewarded exactly once even under
 * concurrency. The reward card is itself added, which can cascade into further
 * completions; the UNIQUE constraint bounds the loop.
 */
export async function grantCompletionRewards(
  childId: string,
  addedCardIds: string[],
): Promise<GrantedReward[]> {
  const pool = await listCards();
  const owned = await ownedCardIds(childId);
  const granted: GrantedReward[] = [];
  const processed = new Set<string>(); // `${themeId}|${rarity}` already evaluated
  let worklist = [...addedCardIds];

  while (worklist.length > 0) {
    const sets = raritySetsFor(pool, worklist);
    worklist = [];
    for (const { themeId, rarity } of sets) {
      const key = `${themeId}|${rarity}`;
      if (processed.has(key)) continue;
      processed.add(key);
      if (!isRaritySetComplete(pool, themeId, rarity, owned)) continue;

      const rewardCard = pickUpgradeCard(pool, rarity, owned);
      if (!rewardCard) continue;

      // Claim the set atomically — only the first writer gets a row back.
      const claimed = await db
        .insert(collectionRewards)
        .values({ childId, themeId, rarity, cardId: rewardCard.id })
        .onConflictDoNothing({
          target: [
            collectionRewards.childId,
            collectionRewards.themeId,
            collectionRewards.rarity,
          ],
        })
        .returning({ id: collectionRewards.id });
      if (claimed.length === 0) continue; // already rewarded elsewhere

      await db
        .insert(collections)
        .values({ childId, cardId: rewardCard.id, count: 1 })
        .onConflictDoUpdate({
          target: [collections.childId, collections.cardId],
          set: { count: sql`${collections.count} + 1` },
        });

      owned.add(rewardCard.id);
      granted.push({ themeId, rarity, card: rewardCard });
      worklist.push(rewardCard.id); // cascade — the bonus card may complete another set
    }
  }

  return granted;
}

export interface PendingReward {
  id: string;
  themeName: string;
  rarity: Rarity;
  card: Card;
}

/** Rewards whose celebratory modal has not been shown yet (Inc16 FR5). */
export async function getPendingRewards(childId: string): Promise<PendingReward[]> {
  const rows = await db
    .select()
    .from(collectionRewards)
    .where(and(eq(collectionRewards.childId, childId), isNull(collectionRewards.shownAt)));
  if (rows.length === 0) return [];

  const [cards, themes] = await Promise.all([listCards(), listThemes()]);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const themeById = new Map(themes.map((t) => [t.id, t.name]));

  const out: PendingReward[] = [];
  for (const r of rows) {
    const card = cardById.get(r.cardId);
    if (!card) continue;
    out.push({
      id: r.id,
      themeName: themeById.get(r.themeId) ?? "Collection",
      rarity: r.rarity,
      card,
    });
  }
  return out;
}

/** Mark rewards' modal as shown so it doesn't repeat (Inc16 FR5). */
export async function markRewardsShown(childId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(collectionRewards)
    .set({ shownAt: new Date() })
    .where(
      and(
        eq(collectionRewards.childId, childId),
        isNull(collectionRewards.shownAt),
        sql`${collectionRewards.id} = ANY(${ids})`,
      ),
    );
}
