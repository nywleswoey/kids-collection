/**
 * RewardGranter — the reward-cascade surface a mutating service depends on. The
 * rewards feature satisfies it via `grantCompletionRewards`; injected as a port
 * so pull/trade orchestration stays testable. Formalized into a full RewardStore
 * in the rewards slice.
 */
export interface RewardGranter {
  grantCompletionRewards(childId: string, addedCardIds: string[]): Promise<unknown>;
}
