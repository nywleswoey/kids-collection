"use server";

import { withActiveChild } from "@/features/actions/action";
import { tradeService } from "./trade-service.prod";
import type { TradeResult } from "./trade-service";
import type { TradableCard } from "./trade-logic";

/**
 * Everything the swap board needs for one partner (Inc22 FR3). Read-only. The
 * active child is resolved server-side — the client says WHO to trade with, never
 * who it is.
 */
export async function getTradeBoardAction(friendId: string): Promise<{
  theirDupes: TradableCard[];
  theirOwnedIds: string[];
  myOwnedIds: string[];
}> {
  return withActiveChild(
    (childId) => tradeService.getTradeBoard(childId, friendId),
    undefined,
    { parent: true, label: "get_trade_board" },
  );
}

/**
 * Execute a swap. The active child (from the server-side cookie) is always the
 * giver A — never trusted from the client (FR4 security). Revalidates only on a
 * committed trade.
 */
export async function executeTradeAction(
  aCardId: string,
  bChildId: string,
  bCardId: string,
): Promise<TradeResult> {
  return withActiveChild(
    (aChildId) => tradeService.executeTrade({ aChildId, aCardId, bChildId, bCardId }),
    (r) => (r.ok ? ["/play/binder", "/play/home", "/play/trade"] : []),
    { parent: true, label: "execute_trade" },
  );
}
