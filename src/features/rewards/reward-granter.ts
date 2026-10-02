import type { Card } from "@/lib/types";

/**
 * RewardGranter — the reward-cascade surface a mutating service depends on. The
 * rewards feature satisfies it via `grantCompletionRewards`; injected as a port
 * so pull/trade orchestration stays testable. Formalized into a full RewardStore
 * in the rewards slice.
 */
export interface RewardGranter {
  /** `pool`: an already-fetched catalog a caller can hand over to skip a
   *  redundant re-fetch (see `grantCompletionRewards`'s own doc for details). */
  grantCompletionRewards(childId: string, addedCardIds: string[], pool?: Card[]): Promise<unknown>;
}
