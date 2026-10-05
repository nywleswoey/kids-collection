import { describe, it, expect, beforeEach } from "vitest";
import { pgClaimStore } from "@/db/stores/claim-store.pg";
import { pgOfferClaimStore } from "@/db/stores/offer-claim-store.pg";
import { pgRewardStore } from "@/db/stores/reward-store.pg";
import { pgQuizStore } from "@/db/stores/quiz-store.pg";
import { pgTicketGrantStore } from "@/db/stores/ticket-grant-store.pg";
import { pgTradeEventStore } from "@/db/stores/trade-event-store.pg";
import { pgCatalog } from "@/shared/pool/catalog.pg";
import { makeActivityService } from "@/features/activity/activity-service";
import type { ChildDirectory } from "@/features/trade/trade-service";
import { resetAll, seedCards, seedChildren, seedThemes } from "./db";

/**
 * End-to-end coverage of the parent-facing activity log (#kcact) against real
 * Postgres: every source is written through its OWN real write path (the
 * exact calls `pull-service.ts`/`trade-service.ts`/`token-service.ts` make),
 * then read back through the real pg-wired `activityService` — proving the
 * new `completedForChild`/`historyForChild` reads actually work against the
 * schema, not just against the fakes.
 */

const directory: ChildDirectory = {
  async listChildren() {
    return [
      { id: "kid", name: "Kid", avatar: "fox", pullTokens: 0, easterEggTickets: 0 },
      { id: "sib", name: "Sib", avatar: "owl", pullTokens: 0, easterEggTickets: 0 },
    ];
  },
};

function makeService() {
  return makeActivityService({
    claims: pgClaimStore,
    offerClaims: pgOfferClaimStore,
    rewards: pgRewardStore,
    quiz: pgQuizStore,
    grants: pgTicketGrantStore,
    trades: pgTradeEventStore,
    catalog: pgCatalog,
    profiles: directory,
  });
}

describe("activity log (pg integration)", () => {
  beforeEach(async () => {
    await resetAll();
    await seedThemes(["th"]);
    await seedCards(["c1", "c2", "c3", "c4", "c5"]);
    await seedChildren({ kid: { pullTokens: 2, easterEggTickets: 2 }, sib: {} });
  });

  it("surfaces a real pull, egg claim, reward, quiz grant, admin grant, and trade — each with a timestamp", async () => {
    const claim = await pgClaimStore.claimAndSpend("req1", "kid");
    if (claim.kind !== "fresh") throw new Error("setup: expected a fresh claim");
    await pgClaimStore.finishWithCardGrant(claim.lease, "req1", "kid", "c1", { id: "c1" }, claim.newBalance);

    await pgOfferClaimStore.claimOffer("jti1", "kid", "easterEggTickets", "c2", { id: "c2" }, 15_000);
    await pgRewardStore.claimReward("kid", "th", "rare", "c3");
    await pgQuizStore.recordCompletion({
      childId: "kid",
      topic: "addition",
      correct: 5,
      total: 5,
      passed: true,
      awarded: true,
    });
    await pgTicketGrantStore.record("kid", "pullTokens", 3, "admin", "Parent");
    await pgTradeEventStore.record({ aChildId: "kid", aCardId: "c4", bChildId: "sib", bCardId: "c5" });

    const events = await makeService().getActivityLog("kid", 50);

    expect(events).toHaveLength(6);
    expect(events.map((e) => e.type).sort()).toEqual(
      ["bonus_card", "card_received", "card_received", "ticket_given", "ticket_given", "trade"].sort(),
    );
    expect(events.every((e) => typeof e.at === "string" && !Number.isNaN(Date.parse(e.at)))).toBe(true);
  });

  it("'All' merges both children; filtering to one excludes the other's events", async () => {
    await pgTicketGrantStore.record("kid", "pullTokens", 1, "admin", null);
    await pgTicketGrantStore.record("sib", "pullTokens", 1, "admin", null);

    const service = makeService();
    const onlyKid = await service.getActivityLog("kid", 50);
    expect(onlyKid).toHaveLength(1);
    expect(onlyKid[0].childId).toBe("kid");

    const all = await service.getActivityLog(null, 50);
    expect(all).toHaveLength(2);
    expect(all.map((e) => e.childId).sort()).toEqual(["kid", "sib"]);
  });

  it("excludes a refunded pull claim (no card) from the log", async () => {
    const claim = await pgClaimStore.claimAndSpend("req-refund", "kid");
    if (claim.kind !== "fresh") throw new Error("setup: expected a fresh claim");
    await pgClaimStore.finishWithRefund(claim.lease, "req-refund", "kid", {
      outOfTokens: false,
      refunded: true,
      newBalance: claim.newBalance + 1,
    });

    expect(await makeService().getActivityLog("kid", 50)).toEqual([]);
  });
});
