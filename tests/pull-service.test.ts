import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { makePullService } from "@/features/pull/pull-service";
import { makeOffer } from "@/features/pull/offer";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import { inMemoryClaimStore } from "@/db/stores/claim-store.fake";
import type { Catalog } from "@/shared/pool/catalog";
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

function setup(
  childSeed: ChildSeed,
  collSeed: CollectionSeed,
  cards: Card[],
  now?: () => number,
) {
  const childrenStore = inMemoryChildStore(childSeed);
  const collections = inMemoryCollectionStore(collSeed);
  const rewards = recordingRewards();
  const claims = inMemoryClaimStore(childrenStore, collections, now);
  const service = makePullService({
    children: childrenStore,
    collections,
    catalog: fakeCatalog(cards),
    rewards,
    claims,
  });
  return { service, children: childrenStore, collections, rewards, claims };
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

    const result = await service.pull("kid", undefined, "req-1");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("c1");
    expect(result.isDuplicate).toBe(false);
    expect(result.newBalance).toBe(1);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
    expect(await collections.cardCount("kid", "c1")).toBe(1);
    expect(rewards.calls).toEqual([["kid", ["c1"]]]);

    const again = await service.pull("kid", undefined, "req-2");
    if (!("card" in again)) throw new Error("expected a card outcome");
    expect(again.isDuplicate).toBe(true); // second copy
  });

  it("returns out-of-tokens without drawing or rewarding", async () => {
    const { service, rewards } = setup({ kid: { pullTokens: 0 } }, {}, [card("c1")]);
    expect(await service.pull("kid", undefined, "req-1")).toEqual({ outOfTokens: true });
    expect(rewards.calls).toHaveLength(0);
  });
});

describe("makePullService.pull request-level idempotency (#kcpi)", () => {
  it("a duplicate request id charges exactly one ticket and replays the same card", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const { service, children } = setup({ kid: { pullTokens: 2 } }, {}, [card("c1")]);

    const first = await service.pull("kid", undefined, "req-dup");
    const second = await service.pull("kid", undefined, "req-dup"); // same id, "reload"

    expect(second).toEqual(first);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1); // spent once, not twice
  });

  it("distinct request ids are independent pulls", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const { service, children } = setup({ kid: { pullTokens: 2 } }, {}, [card("c1")]);

    const first = await service.pull("kid", undefined, "req-a");
    const second = await service.pull("kid", undefined, "req-b");

    if (!("card" in first) || !("card" in second)) throw new Error("expected card outcomes");
    expect(first.newBalance).toBe(1);
    expect(second.newBalance).toBe(0);
    expect(second.isDuplicate).toBe(true); // same single-card pool, second copy
    expect(await children.readColumn("kid", "pullTokens")).toBe(0);
  });

  it("a duplicate of an out-of-tokens request replays out-of-tokens without re-checking the balance", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const { service, children } = setup({ kid: { pullTokens: 0 } }, {}, [card("c1")]);

    const first = await service.pull("kid", undefined, "req-oot");
    const second = await service.pull("kid", undefined, "req-oot");

    expect(first).toEqual({ outOfTokens: true });
    expect(second).toEqual({ outOfTokens: true });
    expect(await children.readColumn("kid", "pullTokens")).toBe(0);
  });

  it("a retry while the original is still fresh (not stale) is told to wait, without spending again", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    let nowMs = 1_000;
    const { service, children, claims } = setup({ kid: { pullTokens: 2 } }, {}, [card("c1")], () => nowMs);

    // Claim the id directly (simulating an attempt that spent but never
    // finished — e.g. the process was killed before the draw) without going
    // through the full `pull()` orchestration, so the claim is left "granting".
    const claimed = await claims.claimAndSpend("req-stuck", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    expect(await children.readColumn("kid", "pullTokens")).toBe(1); // spent once

    nowMs += 5_000; // well under CLAIM_STALE_MS (15s) — still "in flight"
    const retry = await service.pull("kid", undefined, "req-stuck");

    expect(retry).toEqual({ outOfTokens: false, stillInProgress: true });
    expect(await children.readColumn("kid", "pullTokens")).toBe(1); // untouched
  });

  it("a retry after the original goes stale completes the draw for the SAME spend — no lost ticket", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    let nowMs = 1_000;
    const { service, children, collections, claims } = setup(
      { kid: { pullTokens: 2 } },
      {},
      [card("c1")],
      () => nowMs,
    );

    // Simulate Scenario A from the diagnosis: the spend commits, then the
    // process is killed before the draw/grant ever runs.
    const claimed = await claims.claimAndSpend("req-killed", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
    expect(await collections.cardCount("kid", "c1")).toBe(0); // nothing granted yet

    nowMs += 20_000; // past CLAIM_STALE_MS (15s) — now looks abandoned
    const recovered = await service.pull("kid", undefined, "req-killed");

    if (!("card" in recovered)) throw new Error("expected a card outcome");
    expect(recovered.card.id).toBe("c1");
    expect(recovered.newBalance).toBe(1); // the ORIGINAL spend, not a new one
    expect(await children.readColumn("kid", "pullTokens")).toBe(1); // one ticket spent total
    expect(await collections.cardCount("kid", "c1")).toBe(1); // granted exactly once

    // A further retry with the same id now just replays the recovered outcome.
    const replay = await service.pull("kid", undefined, "req-killed");
    expect(replay).toEqual(recovered);
    expect(await collections.cardCount("kid", "c1")).toBe(1); // not granted twice
  });

  it("a later pull refunds an abandoned claim exactly once, leaving recent ones alone", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    let nowMs = 1_000;
    const { service, children, claims } = setup({ kid: { pullTokens: 3 } }, {}, [card("c1")], () => nowMs);

    // Spent, then the tab was closed: no retry will ever come back for it.
    const abandoned = await claims.claimAndSpend("req-abandoned", "kid");
    if (abandoned.kind !== "fresh") throw new Error("expected a fresh claim");
    nowMs += 11 * 60_000; // past the 10-minute sweep threshold
    const recent = await claims.claimAndSpend("req-recent", "kid");
    if (recent.kind !== "fresh") throw new Error("expected a fresh claim");
    nowMs += 20_000; // recent is past CLAIM_STALE_MS, but far from abandoned
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);

    const next = await service.pull("kid", undefined, "req-next");
    if (!("card" in next)) throw new Error("expected a card outcome");
    expect(next.newBalance).toBe(1); // 1 + 1 refunded - 1 spent
    expect(await claims.read("req-abandoned")).toMatchObject({ status: "done", outcome: { outOfTokens: true } });
    expect(await claims.read("req-recent")).toMatchObject({ status: "granting" });

    await service.pull("kid", undefined, "req-after");
    expect(await children.readColumn("kid", "pullTokens")).toBe(0); // not refunded twice
  });

  it("a draw failure refunds and frees the request id for a clean retry", async () => {
    const { service, children } = setup({ kid: { pullTokens: 2 } }, {}, []); // empty pool → throws

    await expect(service.pull("kid", undefined, "req-fail")).rejects.toThrow("empty pool");
    expect(await children.readColumn("kid", "pullTokens")).toBe(2); // refunded

    // The same id is free to try again from scratch (not stuck as "granting").
    await expect(service.pull("kid", undefined, "req-fail")).rejects.toThrow("empty pool");
    expect(await children.readColumn("kid", "pullTokens")).toBe(2); // refunded again, not lost
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
