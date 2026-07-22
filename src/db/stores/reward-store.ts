import type { Rarity } from "@/lib/types";

/** One awarded (or pending) collection-completion reward row. */
export interface RewardRow {
  id: string;
  themeId: string;
  rarity: Rarity;
  cardId: string;
}

/**
 * RewardStore — the persistence port for collection-completion rewards
 * (`collection_rewards` table). Deep by design: `claimReward` hides the
 * insert-first `onConflictDoNothing().returning()` dedup that makes a set
 * rewarded exactly once even under concurrency.
 *
 * Two adapters: `pgRewardStore` (prod) and `inMemoryRewardStore` (tests), kept
 * honest by tests/contracts/reward-store-contract.ts.
 */
export interface RewardStore {
  /**
   * Atomically claim the (child, theme, rarity) set for `cardId`. Returns `true`
   * iff this call won the claim (a row was inserted); `false` if the set was
   * already rewarded — the UNIQUE (child, theme, rarity) makes it single-grant.
   */
  claimReward(
    childId: string,
    themeId: string,
    rarity: Rarity,
    cardId: string,
  ): Promise<boolean>;

  /** Rewards whose celebratory modal has not been shown yet (`shownAt` null). */
  listPending(childId: string): Promise<RewardRow[]>;

  /** Mark the given still-pending reward ids as shown (guarded: only rows still
   *  `shownAt` null for this child). */
  markShown(childId: string, ids: string[]): Promise<void>;
}
