import { describe, it, expect } from "vitest";
import { makeTradeService } from "@/features/trade/trade-service";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import type { Catalog } from "@/features/pool/catalog";
import type { Card, Rarity } from "@/lib/types";

/** These orchestration tests are only reachable because the service now accepts
 * ports instead of importing the `db` singleton — the whole point of the seam. */

function card(id: string, rarity: Rarity, themeId = "t1"): Card {
  return { id, themeId, name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
}

function fakeCatalog(cards: Card[]): Catalog {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return {
    async listCards() {
      return cards;
    },
    async getCard(id) {
      return byId.get(id) ?? null;
    },
    async listThemes() {
      return [];
    },
  };
}

/** Records every reward-cascade call so tests can assert the fan-out. */
function recordingRewards(): RewardGranter & { calls: Array<[string, string[]]> } {
  const calls: Array<[string, string[]]> = [];
  return {
    calls,
    async grantCompletionRewards(childId, addedCardIds) {
      calls.push([childId, addedCardIds]);
      return [];
    },
  };
}

function setup(seed: CollectionSeed, cards: Card[]) {
  const collections = inMemoryCollectionStore(seed);
  const rewards = recordingRewards();
  const service = makeTradeService({ collections, catalog: fakeCatalog(cards), rewards });
  return { service, collections, rewards };
}

describe("makeTradeService.executeTrade", () => {
  const cards = [card("x", "rare"), card("y", "rare"), card("z", "epic")];
  const swap = { aChildId: "A", aCardId: "x", bChildId: "B", bCardId: "y" };

  it("swaps two same-rarity duplicates and fans out completion rewards to both sides", async () => {
    const { service, collections, rewards } = setup({ A: { x: 2 }, B: { y: 2 } }, cards);

    const result = await service.executeTrade(swap);

    expect(result).toEqual({ ok: true, gave: cards[0], got: cards[1] });
    expect(await collections.cardCount("A", "y")).toBe(1); // A received y
    expect(await collections.cardCount("B", "x")).toBe(1); // B received x
    expect(rewards.calls).toEqual([
      ["A", ["y"]],
      ["B", ["x"]],
    ]);
  });

  it("rejects a non-duplicate without touching the store or rewards", async () => {
    const { service, collections, rewards } = setup({ A: { x: 1 }, B: { y: 2 } }, cards);

    const result = await service.executeTrade(swap);

    expect(result).toEqual({ ok: false, reason: "You can only trade a card you have doubles of." });
    expect(await collections.cardCount("A", "x")).toBe(1); // unchanged
    expect(rewards.calls).toHaveLength(0);
  });

  it("rejects a cross-rarity swap", async () => {
    const { service, rewards } = setup({ A: { x: 2 }, B: { z: 2 } }, cards);

    const result = await service.executeTrade({ aChildId: "A", aCardId: "x", bChildId: "B", bCardId: "z" });

    expect(result).toEqual({ ok: false, reason: "Both cards must be the same rarity." });
    expect(rewards.calls).toHaveLength(0);
  });

  it("reports a card that no longer exists", async () => {
    const { service } = setup({ A: { x: 2 }, B: { y: 2 } }, cards);

    const result = await service.executeTrade({ aChildId: "A", aCardId: "x", bChildId: "B", bCardId: "gone" });

    expect(result).toEqual({ ok: false, reason: "That card is no longer available." });
  });
});

describe("makeTradeService.listMatchesForRarity", () => {
  it("returns only same-rarity duplicates", async () => {
    const cards = [card("x", "rare"), card("y", "rare"), card("z", "epic")];
    const { service } = setup({ B: { x: 2, y: 1, z: 3 } }, cards);

    const matches = await service.listMatchesForRarity("B", "rare");

    expect(matches).toEqual([{ card: cards[0], count: 2 }]); // y is not a duplicate, z is epic
  });
});
