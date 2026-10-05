import type { TradeEventRow } from "@/db/schema";

export interface TradeEventInput {
  aChildId: string;
  aCardId: string;
  bChildId: string;
  bCardId: string;
}

/**
 * TradeEventStore — the persistence port for `trade_events`, the parent-facing
 * activity log's record of trades. `swapCards` (collection-store.pg.ts) only
 * mutates `collections`; this is the one place a trade's who/what/when is
 * recorded, written best-effort right after a trade commits
 * (`trade-service.ts` `executeTrade`) — mirroring how that function already
 * treats `grantCompletionRewards` as best-effort post-swap.
 *
 * Two adapters: `pgTradeEventStore` (prod) and `inMemoryTradeEventStore`
 * (tests), kept honest by tests/contracts/trade-event-store-contract.ts.
 */
export interface TradeEventStore {
  record(input: TradeEventInput): Promise<void>;

  /** Most recent trades involving `childId` on EITHER side, newest first. */
  recentForChild(childId: string, limit: number): Promise<TradeEventRow[]>;
}
