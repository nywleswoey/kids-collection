import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { makePullService } from "@/features/pull/pull-service";
import { makeOffer } from "@/features/pull/offer";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import type { Catalog } from "@/features/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import { env } from "@/lib/env";
import type { Card, Rarity } from "@/lib/types";

/** These reach the deep pull/claim/sacrifice orchestration through the ports —
 * impossible before the seam (the old suite could only mirror-model the CAS). */

function card(id: string, rarity: Rarity = "common", themeId = "t1"): Card {
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

function setup(childSeed: ChildSeed, collSeed: CollectionSeed, cards: Card[]) {
  const childrenStore = inMemoryChildStore(childSeed);
  const collections = inMemoryCollectionStore(collSeed);
  const rewards = recordingRewards();
  const service = makePullService({
    children: childrenStore,
    collections,
    catalog: fakeCatalog(cards),
    rewards,
  });
  return { service, children: childrenStore, collections, rewards };
}

afterEach(() => vi.restoreAllMocks());

describe("makePullService.pull", () => {
  it("spends a token, draws, grants, and fans out a reward", async () => {
    // 0.99 keeps both rare egg rolls from firing → deterministic normal draw.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const { service, children, collections, rewards } = setup(
      { kid: { pullTokens: 2 } },
      {},
      [card("c1")], // single-card pool → draw is deterministic
    );

    const result = await service.pull("kid");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("c1");
    expect(result.isDuplicate).toBe(false);
    expect(result.newBalance).toBe(1);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
    expect(await collections.cardCount("kid", "c1")).toBe(1);
    expect(rewards.calls).toEqual([["kid", ["c1"]]]);

    const again = await service.pull("kid");
    if (!("card" in again)) throw new Error("expected a card outcome");
    expect(again.isDuplicate).toBe(true); // second copy
  });

  it("returns out-of-tokens without drawing or rewarding", async () => {
    const { service, rewards } = setup({ kid: { pullTokens: 0 } }, {}, [card("c1")]);
    expect(await service.pull("kid")).toEqual({ outOfTokens: true });
    expect(rewards.calls).toHaveLength(0);
  });
});

describe("makePullService.claimEasterEgg", () => {
  const cards = [card("a"), card("b")];

  // claimEasterEgg verifies with env.authSecret; webcrypto HMAC rejects an empty
  // key, so give it a real one for the sign/verify round-trip.
  const prevSecret = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-key";
  });
  afterAll(() => {
    if (prevSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevSecret;
  });

  async function offerFor(childId: string, cardIds: string[], extra = {}) {
    return makeOffer({ childId, cardIds, exp: Date.now() + 60_000, ...extra }, env.authSecret);
  }

  it("spends a normal token and grants the picked card", async () => {
    const { service, children, collections } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"]);

    const result = await service.claimEasterEgg("kid", offer, "a");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("a");
    expect(result.newBalance).toBe(1); // pullTokens spent
    expect(await collections.cardCount("kid", "a")).toBe(1);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
  });

  it("a ticket-pinned offer spends that ticket, not a token", async () => {
    const { service, children } = setup({ kid: { pullTokens: 5, epicTickets: 1 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"], { ticket: "epic" });

    const result = await service.claimEasterEgg("kid", offer, "b");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.newBalance).toBe(5); // pullTokens untouched
    expect(await children.readColumn("kid", "epicTickets")).toBe(0);
  });

  it("returns out-of-tokens when the pinned column is empty", async () => {
    const { service } = setup({ kid: { pullTokens: 5, epicTickets: 0 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"], { ticket: "epic" });
    expect(await service.claimEasterEgg("kid", offer, "a")).toEqual({ outOfTokens: true });
  });

  it("rejects a card that was not in the signed offer", async () => {
    const { service } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    const offer = await offerFor("kid", ["a"]);
    await expect(service.claimEasterEgg("kid", offer, "b")).rejects.toThrow("card not in offer");
  });

  it("rejects a tampered / unverifiable offer", async () => {
    const { service } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    await expect(service.claimEasterEgg("kid", "not.a.valid.offer", "a")).rejects.toThrow(
      "invalid or expired offer",
    );
  });
});

describe("makePullService.sacrifice", () => {
  it("burns SACRIFICE_COST copies and grants a pick ticket", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // < 0.5 → same-tier ticket
    const { service, children, collections } = setup({ kid: {} }, { kid: { c: 4 } }, [card("c", "rare")]);

    const result = await service.sacrifice("kid", "c");

    expect(result).toEqual({ ticketRarity: "rare", sourceRarity: "rare" });
    expect(await collections.cardCount("kid", "c")).toBe(1); // 4 − 3
    expect(await children.readColumn("kid", "rarePickTickets")).toBe(1);
  });

  it("always leaves at least one copy — a holding of exactly SACRIFICE_COST is not enough", async () => {
    // You burn duplicates, never your only card. Holding exactly 3 (= cost)
    // would zero the card out, so it must be rejected, not sacrificed.
    const { service, children, collections } = setup({ kid: {} }, { kid: { c: 3 } }, [card("c", "rare")]);

    await expect(service.sacrifice("kid", "c")).rejects.toThrow("not enough copies");
    expect(await collections.cardCount("kid", "c")).toBe(3); // untouched
    expect(await children.readColumn("kid", "rarePickTickets")).toBe(0);
  });

  it("throws when the child lacks enough copies", async () => {
    const { service } = setup({ kid: {} }, { kid: { c: 2 } }, [card("c", "rare")]);
    await expect(service.sacrifice("kid", "c")).rejects.toThrow("not enough copies");
  });

  it("throws when the card does not exist", async () => {
    const { service } = setup({ kid: {} }, { kid: { c: 4 } }, []);
    await expect(service.sacrifice("kid", "c")).rejects.toThrow("card not found");
  });
});
