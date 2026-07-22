import type { Card, Rarity } from "@/lib/types";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { RewardStore } from "@/db/stores/reward-store";
import type { Catalog } from "@/features/pool/catalog";
import { pickUpgradeCard } from "@/features/pull/sacrifice";
import { isRaritySetComplete, raritySetsFor } from "./collection-reward";

export interface GrantedReward {
  themeId: string;
  rarity: Rarity;
  card: Card;
}

export interface PendingReward {
  id: string;
  themeName: string;
  rarity: Rarity;
  card: Card;
}

export interface RewardDeps {
  collections: CollectionStore;
  rewards: RewardStore;
  catalog: Catalog;
}

/**
 * Collection-completion rewards (Inc16 FR5), parameterized by its ports. The
 * dedup/claim atomicity lives behind `RewardStore.claimReward`; this module is
 * the cascade orchestration over pure set-completion logic. The factory result
 * satisfies `RewardGranter`, so pull/trade inject it directly.
 */
export function makeRewardService({ collections, rewards, catalog }: RewardDeps) {
  /**
   * Grant collection-completion rewards triggered by adding `addedCardIds`. For
   * each (theme, rarity) set just completed, claim it atomically (single writer
   * wins) and grant one random card of that rarity; the bonus card can cascade
   * into further completions, bounded by the per-set UNIQUE claim.
   */
  async function grantCompletionRewards(
    childId: string,
    addedCardIds: string[],
  ): Promise<GrantedReward[]> {
    const pool = await catalog.listCards();
    const owned = await collections.ownedCardIds(childId);
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

        // Claim the set atomically — only the first writer wins.
        if (!(await rewards.claimReward(childId, themeId, rarity, rewardCard.id))) continue;

        await collections.grantCard(childId, rewardCard.id);

        owned.add(rewardCard.id);
        granted.push({ themeId, rarity, card: rewardCard });
        worklist.push(rewardCard.id); // cascade — the bonus card may complete another set
      }
    }

    return granted;
  }

  /** Rewards whose celebratory modal has not been shown yet (Inc16 FR5). */
  async function getPendingRewards(childId: string): Promise<PendingReward[]> {
    const pending = await rewards.listPending(childId);
    if (pending.length === 0) return [];

    const [cards, themes] = await Promise.all([catalog.listCards(), catalog.listThemes()]);
    const cardById = new Map(cards.map((c) => [c.id, c]));
    const themeById = new Map(themes.map((t) => [t.id, t.name]));

    const out: PendingReward[] = [];
    for (const r of pending) {
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
  function markRewardsShown(childId: string, ids: string[]): Promise<void> {
    return rewards.markShown(childId, ids);
  }

  return { grantCompletionRewards, getPendingRewards, markRewardsShown };
}

export type RewardService = ReturnType<typeof makeRewardService>;
