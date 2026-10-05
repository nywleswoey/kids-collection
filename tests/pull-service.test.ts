import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { makePullService } from "@/features/pull/pull-service";
import { makeOffer } from "@/features/pull/offer";
import { eggTicketsAfterClaim } from "@/features/pull/egg-tickets";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import { inMemoryClaimStore } from "@/db/stores/claim-store.fake";
import { inMemoryOfferClaimStore } from "@/db/stores/offer-claim-store.fake";
import { inMemoryTicketGrantStore } from "@/db/stores/ticket-grant-store.fake";
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

function setup(
  childSeed: ChildSeed,
  collSeed: CollectionSeed,
  cards: Card[],
  now?: () => number,
) {
  const childrenStore = inMemoryChildStore(childSeed);
  const collections = inMemoryCollectionStore(collSeed);
  const rewards = recordingRewards();
  const catalog = fakeCatalog(cards);
  const claims = inMemoryClaimStore(childrenStore, collections, now);
  const offerClaims = inMemoryOfferClaimStore(childrenStore, collections);
  const grants = inMemoryTicketGrantStore();
  const service = makePullService({
    children: childrenStore,
    collections,
    catalog,
    rewards,
    claims,
    offerClaims,
    grants,
  });
  return { service, children: childrenStore, collections, rewards, catalog, claims, offerClaims, grants };
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

    const result = await service.pull("kid", undefined, "req-1");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("c1");
    expect(result.isDuplicate).toBe(false);
    expect(result.newBalance).toBe(1);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
    expect(await collections.cardCount("kid", "c1")).toBe(1);
    // The pool the draw used is forwarded to the reward cascade instead of it
    // re-fetching the catalog itself (the redundant-scan fix).
    expect(rewards.calls).toEqual([["kid", ["c1"], pool]]);

    const again = await service.pull("kid", undefined, "req-2");
    if (!("card" in again)) throw new Error("expected a card outcome");
    expect(again.isDuplicate).toBe(true); // second copy
  });

  it("returns out-of-tokens without drawing or rewarding", async () => {
    const { service, rewards } = setup({ kid: { pullTokens: 0 } }, {}, [card("c1")]);
    expect(await service.pull("kid", undefined, "req-1")).toEqual({ outOfTokens: true });
    expect(rewards.calls).toHaveLength(0);
  });

  it("reads the catalog exactly once for a non-egg pull (no redundant second scan)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const { service, catalog } = setup({ kid: { pullTokens: 1 } }, {}, [card("c1")]);

    await service.pull("kid", undefined, "req-1");

    expect(catalog.listCardsCalls).toHaveLength(1);
  });

  it("pushes a chosen theme's filter into listCards(themeId) instead of fetching everything", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const pool = [card("a1", "common", "animals"), card("s1", "common", "space")];
    const { service, catalog, rewards } = setup({ kid: { pullTokens: 1 } }, {}, pool);

    const result = await service.pull("kid", "space", "req-1");

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

    const result = await service.pull("kid", "no-such-theme", "req-1");

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("a1"); // fell back to the full pool
    expect(catalog.listCardsCalls).toEqual(["no-such-theme", undefined]);
  });

  it("uses an already-started prefetch instead of starting its own catalog/owned reads", async () => {
    // Regression test for the Launching-wait fix: `pullAction` now starts the
    // catalog/owned-ids reads concurrently with the active-child gate check and
    // hands them to `pull()` as `prefetch`, instead of `pull()` starting them
    // itself only after the gate resolves. If that wiring ever regresses back
    // to `pull()` quietly ignoring `prefetch` and starting its own reads, the
    // win is gone even though every other test here (which never passes
    // `prefetch`) would stay green.
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    const pool = [card("c1")];
    const { service, catalog, collections } = setup({ kid: { pullTokens: 1 } }, {}, pool);
    const ownedSpy = vi.spyOn(collections, "ownedCardIds");

    const prefetch = { pool: Promise.resolve(pool), owned: Promise.resolve(new Set<string>()) };
    const result = await service.pull("kid", undefined, "req-1", prefetch);

    if (!("card" in result)) throw new Error("expected a card outcome");
    expect(result.card.id).toBe("c1");
    expect(catalog.listCardsCalls).toHaveLength(0); // didn't start its own catalog read
    expect(ownedSpy).not.toHaveBeenCalled(); // didn't start its own owned-ids read
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

  it("an out-of-tokens request charges nothing and leaves its id free to retry", async () => {
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

    expect(retry).toEqual({ outOfTokens: false, stillInProgress: true, newBalance: 1 });
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

  it("a pull that finds no tickets refunds an abandoned claim exactly once, leaving recent ones alone", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    let nowMs = 1_000;
    const { service, children, claims } = setup({ kid: { pullTokens: 2 } }, {}, [card("c1")], () => nowMs);

    // Spent, then the tab was closed: no retry will ever come back for it.
    const abandoned = await claims.claimAndSpend("req-abandoned", "kid");
    if (abandoned.kind !== "fresh") throw new Error("expected a fresh claim");
    nowMs += 11 * 60_000; // past the 10-minute sweep threshold
    const recent = await claims.claimAndSpend("req-recent", "kid");
    if (recent.kind !== "fresh") throw new Error("expected a fresh claim");
    nowMs += 20_000; // recent is past CLAIM_STALE_MS, but far from abandoned
    expect(await children.readColumn("kid", "pullTokens")).toBe(0);

    const next = await service.pull("kid", undefined, "req-next");
    if (!("card" in next)) throw new Error("expected a card outcome");
    expect(next.newBalance).toBe(0); // 0 + 1 refunded - 1 spent
    expect(await claims.read("req-abandoned")).toMatchObject({ status: "done", outcome: { refunded: true } });
    expect(await claims.read("req-recent")).toMatchObject({ status: "granting" });

    expect(await service.pull("kid", undefined, "req-after")).toEqual({ outOfTokens: true });
    expect(await children.readColumn("kid", "pullTokens")).toBe(0); // not refunded twice
  });

  it("loading the pull screen at 0 tickets refunds an abandoned claim, so the child can pull again", async () => {
    let nowMs = 1_000;
    const { service, children, claims } = setup({ kid: { pullTokens: 1 } }, {}, [card("c1")], () => nowMs);

    // The last ticket is stuck in a claim whose tab was closed.
    const abandoned = await claims.claimAndSpend("req-abandoned", "kid");
    if (abandoned.kind !== "fresh") throw new Error("expected a fresh claim");
    expect(await service.pullBalance("kid")).toBe(0); // not abandoned yet: left alone
    expect(await claims.read("req-abandoned")).toMatchObject({ status: "granting" });

    nowMs += 11 * 60_000; // past the 10-minute sweep threshold
    expect(await service.pullBalance("kid")).toBe(1);
    expect(await claims.read("req-abandoned")).toMatchObject({ status: "done", outcome: { refunded: true } });
    expect(await service.pullBalance("kid")).toBe(1); // not refunded twice
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
  });

  it("replaying a swept request id reports the refund with the live balance", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    let nowMs = 1_000;
    const { service, claims } = setup({ kid: { pullTokens: 1 } }, {}, [card("c1")], () => nowMs);

    const abandoned = await claims.claimAndSpend("req-x", "kid"); // tab A, killed after spend
    if (abandoned.kind !== "fresh") throw new Error("expected a fresh claim");
    nowMs += 11 * 60_000;
    await service.pull("kid", undefined, "req-y"); // tab B sweeps req-x

    const replay = await service.pull("kid", undefined, "req-x"); // tab A taps again

    expect(replay).toEqual({ outOfTokens: false, refunded: true, newBalance: 0 });
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
    return makeOffer(
      { childId, cardIds, exp: Date.now() + 60_000, jti: crypto.randomUUID(), ...extra },
      env.authSecret,
    );
  }

  it("claiming a ticket-redeemed egg drops the shown Easter Egg count; claiming the random in-pull egg doesn't", async () => {
    const { service, children } = setup(
      { kid: { pullTokens: 5, easterEggTickets: 3 } },
      {},
      [card("c1"), card("epic1", "epic")],
    );

    vi.spyOn(Math, "random").mockReturnValue(0.001); // forces the random epic+ egg inside pull()
    const randomEgg = await service.pull("kid", undefined, "req-random-egg");
    if (!("easterEgg" in randomEgg) || !randomEgg.easterEgg) throw new Error("expected an easter-egg outcome");
    await service.claimEasterEgg("kid", randomEgg.offer, randomEgg.choices[0].id);
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(3);
    expect(eggTicketsAfterClaim(3, randomEgg)).toBe(3);

    vi.spyOn(Math, "random").mockReturnValue(0); // rollWeightedRarity → common
    const ticketEgg = await service.pullEasterEgg("kid");
    if (!("easterEgg" in ticketEgg) || !ticketEgg.easterEgg) throw new Error("expected an easter-egg outcome");
    await service.claimEasterEgg("kid", ticketEgg.offer, ticketEgg.choices[0].id);
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(2);
    expect(eggTicketsAfterClaim(3, ticketEgg)).toBe(2);
  });

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

  it("rejects a pre-fix offer signed without a jti", async () => {
    const { service } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    const offer = await makeOffer(
      // No jti — simulates an offer signed by the pre-fix code, or one still
      // in a kid's browser from before a deploy.
      { childId: "kid", cardIds: ["a", "b"], exp: Date.now() + 60_000 } as never,
      env.authSecret,
    );
    await expect(service.claimEasterEgg("kid", offer, "a")).rejects.toThrow("invalid or expired offer");
  });

  // Overcharge regression (the reported bug): a double tap / retry / re-render
  // of the SAME offer must spend and grant exactly once, replaying the first
  // claim's outcome rather than charging/granting again.
  it("a double claim of the SAME offer spends once and grants one copy (replay, not a re-charge)", async () => {
    const { service, children, collections } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"]);

    const first = await service.claimEasterEgg("kid", offer, "a");
    const second = await service.claimEasterEgg("kid", offer, "a"); // double tap / retry / re-render

    expect(second).toEqual(first);
    expect(await children.readColumn("kid", "pullTokens")).toBe(1); // ONE charge
    expect(await collections.cardCount("kid", "a")).toBe(1); // ONE copy
  });

  it("a double claim replays the FIRST pick even if the second tap landed on a different card", async () => {
    const { service, children, collections } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"]);

    const first = await service.claimEasterEgg("kid", offer, "a");
    const second = await service.claimEasterEgg("kid", offer, "b"); // stale re-render re-submits a different index

    expect(second).toEqual(first); // still card "a" — the chosen card can't change after the fact
    expect(await children.readColumn("kid", "pullTokens")).toBe(1);
    expect(await collections.cardCount("kid", "a")).toBe(1);
    expect(await collections.cardCount("kid", "b")).toBe(0); // never granted
  });

  it("a double claim does not fan out the completion-reward cascade twice", async () => {
    const { service, rewards } = setup({ kid: { pullTokens: 2 } }, {}, cards);
    const offer = await offerFor("kid", ["a", "b"]);

    await service.claimEasterEgg("kid", offer, "a");
    await service.claimEasterEgg("kid", offer, "a");

    expect(rewards.calls).toEqual([["kid", ["a"], undefined]]); // only the fresh claim fans out
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

  it("records the grant in the activity log (#kcact)", async () => {
    const { service, grants } = setup({ kid: {} }, { kid: { c: 4 } }, [card("c", "rare")]);

    await service.sacrifice("kid", "c");

    const [row] = await grants.recentForChild("kid", 10);
    expect(row).toMatchObject({
      childId: "kid",
      column: "easterEggTickets",
      amount: 1,
      source: "sacrifice",
      grantedBy: null,
    });
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
