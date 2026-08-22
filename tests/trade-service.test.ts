import { describe, it, expect } from "vitest";
import { makeTradeService } from "@/features/trade/trade-service";
import { makeProfileService } from "@/features/profiles/service";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import { inMemoryProfileStore } from "@/db/stores/profile-store.fake";
import type { Catalog } from "@/features/pool/catalog";
import type { Card, Child, Rarity } from "@/lib/types";

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

function kid(id: string, name = id): Child {
  return { id, name, avatar: "fox", pullTokens: 0, easterEggTickets: 0 };
}

/**
 * The directory defaults to whoever the collection seed names, so a fixture that
 * describes a world with children A and B says so — `executeTrade` re-checks that
 * both participants are active (#97), and an empty directory would mean every one
 * of these trades was between two children who do not exist.
 */
function setup(
  seed: CollectionSeed,
  cards: Card[],
  children: Child[] = Object.keys(seed).map((id) => kid(id)),
) {
  const collections = inMemoryCollectionStore(seed);
  const rewards = recordingRewards();
  const service = makeTradeService({
    collections,
    catalog: fakeCatalog(cards),
    rewards,
    profiles: { async listChildren() { return children; } },
  });
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

describe("makeTradeService.getTradeBoard (Inc22 FR3)", () => {
  const cards = [card("x", "rare"), card("y", "rare"), card("z", "epic")];

  it("returns the friend's WHOLE duplicate list, not one rarity", async () => {
    // Friend-first means no rarity is known when this is fetched.
    const { service } = setup({ A: { x: 2 }, B: { x: 2, y: 1, z: 3 } }, cards);

    const board = await service.getTradeBoard("A", "B");

    expect(board.theirDupes.map((t) => t.card.id).sort()).toEqual(["x", "z"]); // y is not a dup
  });

  it("returns both ownership sets as arrays, so each column can label the other side", async () => {
    const { service } = setup({ A: { x: 2, z: 1 }, B: { y: 4 } }, cards);

    const board = await service.getTradeBoard("A", "B");

    expect([...board.myOwnedIds].sort()).toEqual(["x", "z"]);
    expect([...board.theirOwnedIds].sort()).toEqual(["y"]);
  });
});

describe("makeTradeService.listFriendSummaries (Inc22 FR7)", () => {
  const cards = [card("x", "rare"), card("y", "rare"), card("z", "epic")];

  it("excludes the active child and counts the duplicates each friend is missing", async () => {
    const { service } = setup(
      { A: { x: 2, z: 3 }, B: { x: 5 }, C: {} },
      cards,
      [kid("A"), kid("B", "Ben"), kid("C", "Cass")],
    );

    const friends = await service.listFriendSummaries("A");

    expect(friends.map((f) => f.id)).toEqual(["B", "C"]); // self excluded
    expect(friends.find((f) => f.id === "B")!.missingCount).toBe(1); // has x, missing z
    expect(friends.find((f) => f.id === "C")!.missingCount).toBe(2); // owns nothing
    expect(friends.find((f) => f.id === "B")!.name).toBe("Ben");
  });

  it("reads every friend's ownership in ONE batched call (NFR5)", async () => {
    const collections = inMemoryCollectionStore({ A: { x: 2 }, B: { x: 1 }, C: { x: 1 } });
    let batched = 0;
    let perChild = 0;
    const spy = {
      ...collections,
      async ownedCardIdsForChildren(ids: string[]) {
        batched += 1;
        return collections.ownedCardIdsForChildren(ids);
      },
      async ownedCardIds(id: string) {
        perChild += 1;
        return collections.ownedCardIds(id);
      },
    };
    const service = makeTradeService({
      collections: spy,
      catalog: fakeCatalog(cards),
      rewards: recordingRewards(),
      profiles: { async listChildren() { return [kid("A"), kid("B"), kid("C")]; } },
    });

    await service.listFriendSummaries("A");

    expect(batched).toBe(1);
    expect(perChild).toBe(0); // never one round trip per friend
  });

  it("an archived child is not a trade partner (#97)", async () => {
    // Wired the way prod is — through the real profile service — because the
    // filtering lives at that seam, and a hand-written `listChildren` stub would
    // prove only that the stub filtered.
    const profiles = inMemoryProfileStore([
      { id: "A", name: "Ana", avatar: "fox" },
      { id: "B", name: "Ben", avatar: "owl" },
      { id: "C", name: "Cal", avatar: "cat" },
    ]);
    await profiles.archive("C");

    const service = makeTradeService({
      collections: inMemoryCollectionStore({ A: { x: 2 }, B: { y: 2 }, C: { z: 2 } }),
      catalog: fakeCatalog([card("x", "rare"), card("y", "rare"), card("z", "rare")]),
      rewards: recordingRewards(),
      profiles: makeProfileService({ profiles }),
    });

    const friends = await service.listFriendSummaries("A");
    expect(friends.map((f) => f.id)).toEqual(["B"]);
  });

  it("refuses a trade with a child archived since the page rendered (#97)", async () => {
    // The board filters archived children out, so this needs a stale page — but a
    // stale page is exactly what an archive creates, and before soft-delete the
    // foreign key would have refused the swap. Without the guard, A gives a card
    // away to a child nobody can see.
    const profiles = inMemoryProfileStore([
      { id: "A", name: "Ana", avatar: "fox" },
      { id: "B", name: "Ben", avatar: "owl" },
    ]);
    const collections = inMemoryCollectionStore({ A: { x: 2 }, B: { y: 2 } });
    const service = makeTradeService({
      collections,
      catalog: fakeCatalog([card("x", "rare"), card("y", "rare")]),
      rewards: recordingRewards(),
      profiles: makeProfileService({ profiles }),
    });

    await profiles.archive("B");
    const result = await service.executeTrade({
      aChildId: "A",
      aCardId: "x",
      bChildId: "B",
      bCardId: "y",
    });

    expect(result.ok).toBe(false);
    // …and nothing moved.
    expect(await collections.cardCount("A", "x")).toBe(2);
    expect(await collections.cardCount("A", "y")).toBe(0);
    expect(await collections.cardCount("B", "y")).toBe(2);
  });
});
