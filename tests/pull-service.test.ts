import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { makePullService } from "@/features/pull/pull-service";
import { makeOffer } from "@/features/pull/offer";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import type { Catalog } from "@/shared/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import { env } from "@/lib/env";
import type { Card, Rarity } from "@/lib/types";

/** These reach the deep pull/claim/sacrifice orchestration through the ports —
 * impossible before the seam (the old suite could only mirror-model the CAS). */

function card(id: string, rarity: Rarity = "common", themeId = "t1"): Card {
  return { id, themeId, name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
}

/** Records every `listCards` call's `themeId` arg and, like the real pg adapter,
 *  actually filters by it — so a themed-pull test can prove both the SQL-level
 *  filter and the full-pool fallback behave correctly. */
function fakeCatalog(cards: Card[]): Catalog & { listCardsCalls: Array<string | undefined> } {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const listCardsCalls: Array<string | undefined> = [];
  return {
    listCardsCalls,
    async listCards(themeId) {
      listCardsCalls.push(themeId);
      return themeId ? cards.filter((c) => c.themeId === themeId) : cards;
    },
    async getCard(id) {
      return byId.get(id) ?? null;
    },
    async listThemes() {
      return [];
    },
  };
}

function recordingRewards(): RewardGranter & { calls: Array<[string, string[], Card[] | undefined]> } {
  const calls: Array<[string, string[], Card[] | undefined]> = [];
  return {
    calls,
    async grantCompletionRewards(childId, addedCardIds, pool) {
      calls.push([childId, addedCardIds, pool]);
      return [];
    },
  };
}

function setup(childSeed: ChildSeed, collSeed: CollectionSeed, cards: Card[]) {
  const childrenStore = inMemoryChildStore(childSeed);
  const collections = inMemoryCollectionStore(collSeed);
  const rewards = recordingRewards();
  const catalog = fakeCatalog(cards);
  const service = makePullService({
    children: childrenStore,
    collections,
    catalog,
    rewards,
  });
  return { service, children: childrenStore, collections, rewards, catalog };
}

afterEach(() => vi.restoreAllMocks());

describe("makePullService.pull", () => {
  it("spends a token, draws, grants, and fans out a reward", async () => {
    // 0.99 keeps both rare egg rolls from firing → deterministic normal draw.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const pool = [card("c1")];
    const { service, children, collections, rewards } = setup(
      { kid: { pullTokens: 2 } },
      {},
      pool, // single-card pool → draw is deterministic
    );

    const result = await service.pull("kid");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("c1");
    expect(result.isDuplicate).toBe(false);
    expect(result.newBalance).toBe(1);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
    expect(await collections.cardCount("kid", "c1")).toBe(1);
    // The pool the draw used is forwarded to the reward cascade instead of it
    // re-fetching the catalog itself (the redundant-scan fix).
    expect(rewards.calls).toEqual([["kid", ["c1"], pool]]);

    const again = await service.pull("kid");
    if (!("card" in again)) throw new Error("expected a card outcome");
    expect(again.isDuplicate).toBe(true); // second copy
  });

  it("returns out-of-tokens without drawing or rewarding", async () => {
    const { service, rewards } = setup({ kid: { pullTokens: 0 } }, {}, [card("c1")]);
    expect(await service.pull("kid")).toEqual({ outOfTokens: true });
    expect(rewards.calls).toHaveLength(0);
  });

  it("reads the catalog exactly once for a non-egg pull (no redundant second scan)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const { service, catalog } = setup({ kid: { pullTokens: 1 } }, {}, [card("c1")]);

    await service.pull("kid");

    expect(catalog.listCardsCalls).toHaveLength(1);
  });

  it("pushes a chosen theme's filter into listCards(themeId) instead of fetching everything", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const pool = [card("a1", "common", "animals"), card("s1", "common", "space")];
    const { service, catalog, rewards } = setup({ kid: { pullTokens: 1 } }, {}, pool);

    const result = await service.pull("kid", "space");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("s1"); // only the "space" card was eligible
    expect(catalog.listCardsCalls).toEqual(["space"]); // filter pushed to the catalog call
    // The reward cascade only ever needs the drawn card's own theme, so the
    // already-filtered (not the full) pool is reused — no second fetch either.
    expect(rewards.calls[0][2]).toEqual([card("s1", "common", "space")]);
  });

  it("falls back to the full catalog when the chosen theme has no cards", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const pool = [card("a1", "common", "animals")];
    const { service, catalog } = setup({ kid: { pullTokens: 1 } }, {}, pool);

    const result = await service.pull("kid", "no-such-theme");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("a1"); // fell back to the full pool
    expect(catalog.listCardsCalls).toEqual(["no-such-theme", undefined]);
  });
});

describe("makePullService.pullEasterEgg", () => {
  const prevSecret = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-key";
  });
  afterAll(() => {
    if (prevSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevSecret;
  });

  it("rolls a rarity and offers a pick-1-of-5 of that tier without spending yet", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // roll → common (weight 60 first)
    const pool = [card("r1", "rare"), card("c1", "common"), card("c2", "common")];
    const { service, children } = setup({ kid: { pullTokens: 3, easterEggTickets: 2 } }, {}, pool);

    const res = await service.pullEasterEgg("kid");

    if (!("easterEgg" in res) || !res.easterEgg) throw new Error("expected an easter-egg outcome");
    expect(res.revealRarity).toBe("common");
    expect(res.choices.every((c) => c.rarity === "common")).toBe(true);
    // Ticket is NOT spent until claim (single-use); balance still 2.
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(2);
  });

  it("returns out-of-tokens when the child holds no Easter Egg ticket", async () => {
    const { service } = setup({ kid: { pullTokens: 3, easterEggTickets: 0 } }, {}, [card("c1")]);
    expect(await service.pullEasterEgg("kid")).toEqual({ outOfTokens: true });
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

  it("an easter-egg-pinned offer spends an Easter Egg ticket, not a token", async () => {
    const { service, children } = setup({ kid: { pullTokens: 5, easterEggTickets: 1 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"], { easterEgg: true, rolledRarity: "common" });

    const result = await service.claimEasterEgg("kid", offer, "b");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.newBalance).toBe(5); // pullTokens untouched
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(0);
  });

  it("returns out-of-tokens when the Easter Egg balance is empty", async () => {
    const { service } = setup({ kid: { pullTokens: 5, easterEggTickets: 0 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"], { easterEgg: true, rolledRarity: "common" });
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
  it("burns SACRIFICE_COST copies and grants one Easter Egg ticket", async () => {
    const { service, children, collections } = setup({ kid: {} }, { kid: { c: 4 } }, [card("c", "rare")]);

    const result = await service.sacrifice("kid", "c");

    expect(result).toEqual({ newBalance: 1 });
    expect(await collections.cardCount("kid", "c")).toBe(1); // 4 − 3
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(1);
  });

  it("always leaves at least one copy — a holding of exactly SACRIFICE_COST is not enough", async () => {
    // You burn duplicates, never your only card. Holding exactly 3 (= cost)
    // would zero the card out, so it must be rejected, not sacrificed.
    const { service, children, collections } = setup({ kid: {} }, { kid: { c: 3 } }, [card("c", "rare")]);

    await expect(service.sacrifice("kid", "c")).rejects.toThrow("not enough copies");
    expect(await collections.cardCount("kid", "c")).toBe(3); // untouched
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(0);
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
