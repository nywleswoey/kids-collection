"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import type { Rarity } from "@/lib/types";
import { tradeService } from "./trade-service.prod";
import type { TradeResult } from "./trade-service";
import type { TradableCard } from "./trade-logic";

/** Friend's tradable duplicates of a given rarity (FR5 step 3). */
export async function getMatchesAction(
  bChildId: string,
  rarity: Rarity,
): Promise<TradableCard[]> {
  await requireParent();
  return tradeService.listMatchesForRarity(bChildId, rarity);
}

/**
 * Execute a swap. The active child (from the server-side cookie) is always the
 * giver A — never trusted from the client (FR4 security).
 */
export async function executeTradeAction(
  aCardId: string,
  bChildId: string,
  bCardId: string,
): Promise<TradeResult> {
  await requireParent();
  const active = await getActiveChild();
  if (!active) return { ok: false, reason: "Pick a player first." };

  const result = await tradeService.executeTrade({
    aChildId: active.id,
    aCardId,
    bChildId,
    bCardId,
  });

  if (result.ok) {
    revalidatePath("/play/binder");
    revalidatePath("/play/home");
    revalidatePath("/play/trade");
  }
  return result;
}
