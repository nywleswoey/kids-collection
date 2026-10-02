import { describe, it, expect, vi, afterEach } from "vitest";
import { pgChildStore } from "@/db/stores/child-store.pg";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgClaimStore } from "@/db/stores/claim-store.pg";
import { makePullService } from "@/features/pull/pull-service";
import type { Catalog } from "@/shared/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import type { Card } from "@/lib/types";
import { resetAll, seedChildren, seedCards, backdateClaim } from "./db";

/**
 * Request-level idempotency (#kcpi), run directly against the REAL pg
 * adapters — same methodology as the diagnosis report's Scenarios A/B/C
 * (`pull-service.prod` + Postgres, no mocks) — so the claim-store SQL's
 * atomicity is proven against a real database, not just the in-memory fake
 * (tests/pull-service.test.ts covers the same contract there, fast).
 */

function card(id: string, rarity: Card["rarity"] = "common"): Card {
  return { id, themeId: "t1", name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
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

const noRewards: RewardGranter = {
  async grantCompletionRewards() {
    return [];
  },
};

async function makeService(cards: Card[]) {
  await seedCards(cards.map((c) => c.id));
  return makePullService({
    children: pgChildStore,
    collections: pgCollectionStore,
    catalog: fakeCatalog(cards),
    rewards: noRewards,
    claims: pgClaimStore,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("pull() request-level idempotency, against real Postgres (#kcpi)", () => {
  it("a duplicate request id charges exactly one ticket (Scenario C, fixed)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1")]);

    const first = await service.pull("kid", undefined, "req-dup");
    const second = await service.pull("kid", undefined, "req-dup"); // "reload" / double-tap

    expect(second).toEqual(first);
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(9); // ONE charge, not two
  });

  it("distinct request ids are independent pulls", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1")]);

    const first = await service.pull("kid", undefined, "req-a");
    const second = await service.pull("kid", undefined, "req-b");

    if (!("card" in first) || !("card" in second)) throw new Error("expected card outcomes");
    expect(first.newBalance).toBe(9);
    expect(second.newBalance).toBe(8);
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(8);
  });

  it(
    "killed-after-spend then retry recovers the SAME spend — no lost ticket (Scenario A, fixed)",
    async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
      await resetAll();
      await seedChildren({ kid: { pullTokens: 10 } });
      const service = await makeService([card("c1")]);

      // Reproduce the report's Scenario A directly: the spend commits, then
      // the request is killed before the draw/grant ever runs — simulated by
      // calling the claim store's spend step directly and stopping there,
      // never calling completeGrant.
      const claimed = await pgClaimStore.claimAndSpend("req-killed", "kid");
      if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
      expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(9); // spend committed
      expect(await pgCollectionStore.cardCount("kid", "c1")).toBe(0); // nothing delivered

      // Backdate the claim past the service's staleness window so a retry is
      // willing to treat it as abandoned (no real sleep needed).
      await backdateClaim("req-killed", 20);

      const recovered = await service.pull("kid", undefined, "req-killed");
      if (!("card" in recovered)) throw new Error("expected a card outcome");
      expect(recovered.newBalance).toBe(9); // the ORIGINAL spend, not a new one
      expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(9); // one ticket spent, total
      expect(await pgCollectionStore.cardCount("kid", "c1")).toBe(1); // granted exactly once

      // A further retry with the same id just replays the recovered outcome.
      const replay = await service.pull("kid", undefined, "req-killed");
      expect(replay).toEqual(recovered);
      expect(await pgCollectionStore.cardCount("kid", "c1")).toBe(1); // not granted twice
    },
  );

  it("a retry while the original claim is still fresh is told to wait, without spending again", async () => {
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1")]);

    const claimed = await pgClaimStore.claimAndSpend("req-fresh", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(9);

    // No backdate — the claim is well within the staleness window.
    const retry = await service.pull("kid", undefined, "req-fresh");

    expect(retry).toEqual({ outOfTokens: false, stillInProgress: true });
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(9); // untouched
  });

  it("an easter-egg roll refunds the token atomically with marking the claim done", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001); // forces the epic+ egg roll
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1"), card("epic1", "epic")]);

    const first = await service.pull("kid", undefined, "req-egg");
    if (!("easterEgg" in first) || !first.easterEgg) throw new Error("expected an easter-egg outcome");
    expect(first.newBalance).toBe(10); // spent then refunded (re-spent at claim)
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(10);

    // Duplicate id replays the SAME offer rather than rolling (and refunding) again.
    const second = await service.pull("kid", undefined, "req-egg");
    expect(second).toEqual(first);
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(10);
  });

  it("a draw failure refunds and deletes the claim atomically — the same id retries clean", async () => {
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([]); // empty pool -> completeGrant throws

    await expect(service.pull("kid", undefined, "req-fail")).rejects.toThrow("empty pool");
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(10); // refunded, not lost

    // The id is free again (not stuck "granting") — retrying behaves like new.
    await expect(service.pull("kid", undefined, "req-fail")).rejects.toThrow("empty pool");
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(10); // refunded again, not double
  });

  it("a later pull refunds a claim abandoned past the sweep threshold exactly once", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1")]);

    const claimed = await pgClaimStore.claimAndSpend("req-abandoned", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    await backdateClaim("req-abandoned", 11 * 60); // tab closed; nobody retries it

    const next = await service.pull("kid", undefined, "req-next");
    if (!("card" in next)) throw new Error("expected a card outcome");
    expect(next.newBalance).toBe(9); // 9 + 1 refunded - 1 spent
    expect(await pgClaimStore.read("req-abandoned")).toEqual({
      childId: "kid",
      status: "done",
      outcome: { outOfTokens: true },
    });

    await service.pull("kid", undefined, "req-after");
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(8); // not refunded twice
  });

  it("the sweep leaves a recent granting claim untouched", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1")]);

    const claimed = await pgClaimStore.claimAndSpend("req-recent", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    await backdateClaim("req-recent", 20); // past CLAIM_STALE_MS, far from abandoned

    await service.pull("kid", undefined, "req-next");

    expect(await pgClaimStore.read("req-recent")).toMatchObject({ status: "granting" });
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(8); // two spends, no refund
  });

  it("concurrent pulls racing the same abandoned claim refund it only once", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no egg rolls
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    const service = await makeService([card("c1")]);

    const claimed = await pgClaimStore.claimAndSpend("req-abandoned", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    await backdateClaim("req-abandoned", 11 * 60);

    const swept = await Promise.all([
      pgClaimStore.sweepAbandoned("kid", 10 * 60_000),
      pgClaimStore.sweepAbandoned("kid", 10 * 60_000),
    ]);
    await Promise.all([service.pull("kid", undefined, "req-a"), service.pull("kid", undefined, "req-b")]);

    expect(swept.sort()).toEqual([0, 1]);
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(8); // 9 + 1 refund - 2 spends
    expect(await pgCollectionStore.cardCount("kid", "c1")).toBe(2);
  });

  it("a swept claim's old holder can no longer grant or refund", async () => {
    await resetAll();
    await seedChildren({ kid: { pullTokens: 10 } });
    await seedCards(["c1"]);

    const claimed = await pgClaimStore.claimAndSpend("req-slow", "kid");
    if (claimed.kind !== "fresh") throw new Error("expected a fresh claim");
    await backdateClaim("req-slow", 11 * 60);
    expect(await pgClaimStore.sweepAbandoned("kid", 10 * 60_000)).toBe(1);

    const late = await pgClaimStore.finishWithCardGrant(claimed.lease, "req-slow", "kid", "c1", card("c1"), 9);
    await pgClaimStore.cleanupFailure(claimed.lease, "req-slow", "kid");

    expect(late).toBeNull();
    expect(await pgCollectionStore.cardCount("kid", "c1")).toBe(0);
    expect(await pgChildStore.readColumn("kid", "pullTokens")).toBe(10); // refunded once by the sweep only
  });
});
