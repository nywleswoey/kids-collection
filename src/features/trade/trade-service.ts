import type { Card, Child } from "@/lib/types";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import { validateTrade, type TradableCard, type TradeSide } from "./trade-logic";
import { missingCount } from "./board";

/** Shared empty set for a friend who owns nothing yet. */
const EMPTY: ReadonlySet<string> = new Set();

/** The slice of the profile service the trade board needs — the other players. */
export interface ChildDirectory {
  listChildren(): Promise<Child[]>;
}

export type TradeResult =
  | { ok: true; gave: Card; got: Card }
  | { ok: false; reason: string };

export interface TradeDeps {
  collections: CollectionStore;
  catalog: Catalog;
  rewards: RewardGranter;
  profiles: ChildDirectory;
}

/**
 * Kid-to-kid trade orchestration (Inc14), parameterized by its ports. Prod wires
 * the pg adapters in `trade-service.prod.ts`; tests construct it with fakes. The
 * atomicity lives entirely behind `CollectionStore.swapCards`; this module only
 * validates, delegates, and fans out completion rewards.
 */
export function makeTradeService({ collections, catalog, rewards, profiles }: TradeDeps) {
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

  /**
   * Everything the friend-first swap board needs, in one call (Inc22 FR3): the
   * partner's WHOLE duplicate list — no rarity is known at this point, since the
   * friend is chosen before any card — plus both ownership sets, which is what
   * lets each column label the cards the other party is missing.
   *
   * Ownership travels as arrays because this crosses a server-action boundary
   * (Sets don't serialize); the caller rehydrates them for `board.ts`.
   */
  async function getTradeBoard(
    childId: string,
    friendId: string,
  ): Promise<{ theirDupes: TradableCard[]; theirOwnedIds: string[]; myOwnedIds: string[] }> {
    const [theirDupes, theirOwned, myOwned] = await Promise.all([
      listTradableCards(friendId),
      collections.ownedCardIds(friendId),
      collections.ownedCardIds(childId),
    ]);
    return {
      theirDupes,
      theirOwnedIds: [...theirOwned],
      myOwnedIds: [...myOwned],
    };
  }

  /**
   * Every OTHER child, each with a count of how many of this child's duplicates
   * they're missing (Inc22 FR7). One batched ownership read for all of them —
   * never one round trip per friend (NFR5).
   */
  async function listFriendSummaries(
    childId: string,
  ): Promise<Array<{ id: string; name: string; avatar: string; missingCount: number }>> {
    const [mine, children] = await Promise.all([
      listTradableCards(childId),
      profiles.listChildren(),
    ]);
    const friends = children.filter((c) => c.id !== childId);
    const owned = await collections.ownedCardIdsForChildren(friends.map((f) => f.id));
    return friends.map((f) => ({
      id: f.id,
      name: f.name,
      avatar: f.avatar,
      missingCount: missingCount(mine, owned.get(f.id) ?? EMPTY),
    }));
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

  return { listTradableCards, getTradeBoard, listFriendSummaries, executeTrade };
}

export type TradeService = ReturnType<typeof makeTradeService>;
