"use server";

import { withParent, withActiveChild } from "@/features/actions/action";
import type { Rarity } from "@/lib/types";
import { tradeService } from "./trade-service.prod";
import type { TradeResult } from "./trade-service";
import type { TradableCard } from "./trade-logic";

/** Friend's tradable duplicates of a given rarity (FR5 step 3). */
export async function getMatchesAction(
  bChildId: string,
  rarity: Rarity,
): Promise<TradableCard[]> {
  return withParent(() => tradeService.listMatchesForRarity(bChildId, rarity), undefined, "get_trade_matches");
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
