import type { Card, Rarity } from "@/lib/types";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import { validateTrade, type TradableCard, type TradeSide } from "./trade-logic";

export type TradeResult =
  | { ok: true; gave: Card; got: Card }
  | { ok: false; reason: string };

export interface TradeDeps {
  collections: CollectionStore;
  catalog: Catalog;
  rewards: RewardGranter;
}

/**
 * Kid-to-kid trade orchestration (Inc14), parameterized by its ports. Prod wires
 * the pg adapters in `trade-service.prod.ts`; tests construct it with fakes. The
 * atomicity lives entirely behind `CollectionStore.swapCards`; this module only
 * validates, delegates, and fans out completion rewards.
 */
export function makeTradeService({ collections, catalog, rewards }: TradeDeps) {
  /** Cards a child can offer: owned duplicates (count >= 2), with card + rarity. */
  async function listTradableCards(childId: string): Promise<TradableCard[]> {
    const [cards, rows] = await Promise.all([
      catalog.listCards(),
      collections.tradableDuplicates(childId),
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
  async function listMatchesForRarity(
    childId: string,
    rarity: Rarity,
  ): Promise<TradableCard[]> {
    const all = await listTradableCards(childId);
    return all.filter((t) => t.card.rarity === rarity);
  }

  /**
   * Atomic two-sided swap (FR4). Re-validates server-side, then commits the swap
   * through the store. A stale/raced trade whose store commit errors fails
   * cleanly with a friendly reason.
   */
  async function executeTrade(input: {
    aChildId: string;
    aCardId: string;
    bChildId: string;
    bCardId: string;
  }): Promise<TradeResult> {
    const { aChildId, aCardId, bChildId, bCardId } = input;

    const [aCard, bCard] = await Promise.all([
      catalog.getCard(aCardId),
      catalog.getCard(bCardId),
    ]);
    if (!aCard || !bCard) {
      return { ok: false, reason: "That card is no longer available." };
    }

    const [aCount, bCount] = await Promise.all([
      collections.cardCount(aChildId, aCardId),
      collections.cardCount(bChildId, bCardId),
    ]);

    const a: TradeSide = { childId: aChildId, cardId: aCardId, rarity: aCard.rarity, count: aCount };
    const b: TradeSide = { childId: bChildId, cardId: bCardId, rarity: bCard.rarity, count: bCount };
    const v = validateTrade(a, b);
    if (!v.ok) return { ok: false, reason: v.reason };

    const applied = await collections.swapCards({ aChildId, aCardId, bChildId, bCardId });
    if (!applied) {
      return { ok: false, reason: "That trade is no longer valid — try again." };
    }

    // Inc16 FR5: each side received a card — either may complete a set. The swap
    // is already committed and irreversible here, so a failure in the (best-
    // effort) completion cascade must NOT surface as a failed trade — that would
    // tell the child their trade broke when their cards already changed hands.
    // Swallow it: the worst case is a missed bonus card, and `claimReward` is
    // idempotent, so a later add that re-completes the same set still grants it.
    try {
      await rewards.grantCompletionRewards(aChildId, [bCardId]);
      await rewards.grantCompletionRewards(bChildId, [aCardId]);
    } catch {
      // best-effort — the trade stands regardless
    }

    return { ok: true, gave: aCard, got: bCard };
  }

  return { listTradableCards, listMatchesForRarity, executeTrade };
}

export type TradeService = ReturnType<typeof makeTradeService>;
