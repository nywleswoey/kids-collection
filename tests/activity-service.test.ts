import { describe, it, expect } from "vitest";
import { makeActivityService } from "@/features/activity/activity-service";
import { inMemoryTicketGrantStore } from "@/db/stores/ticket-grant-store.fake";
import { inMemoryTradeEventStore } from "@/db/stores/trade-event-store.fake";
import type { ClaimStore } from "@/db/stores/claim-store";
import type { OfferClaimStore } from "@/db/stores/offer-claim-store";
import type { RewardStore, RewardHistoryRow } from "@/db/stores/reward-store";
import type { QuizStore } from "@/db/stores/quiz-store";
import type { QuizCompletionRow } from "@/db/schema";
import type { Catalog } from "@/shared/pool/catalog";
import type { Card, Child, Rarity } from "@/lib/types";

/** These tests reach the merge/sort/filter logic directly through fakes — the
 *  whole point of parameterizing the service by its ports. */

function card(id: string, name = id, rarity: Rarity = "common"): Card {
  return { id, themeId: "t1", name, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
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

function kid(id: string, name = id): Child {
  return { id, name, avatar: "fox", pullTokens: 0, easterEggTickets: 0 };
}

/** Only `completedForChild` is exercised by the activity service; everything
 *  else on the port is unreachable from here, so a 0-arg stub (TS allows
 *  assigning a function with fewer params than its declared type) is enough. */
function stubClaims(rows: Array<{ requestId: string; outcome: unknown; createdAt: Date }>): ClaimStore {
  const unused = async () => {
    throw new Error("unused in this test");
  };
  return {
    claimAndSpend: unused,
    read: unused,
    takeOverIfStale: unused,
    finishWithCardGrant: unused,
    finishWithRefund: unused,
    cleanupFailure: unused,
    sweepAbandoned: unused,
    completedForChild: async () => rows,
  } as unknown as ClaimStore;
}

function stubOfferClaims(rows: Array<{ jti: string; outcome: unknown; createdAt: Date }>): OfferClaimStore {
  return {
    claimOffer: async () => {
      throw new Error("unused in this test");
    },
    completedForChild: async () => rows,
  } as unknown as OfferClaimStore;
}

function stubRewards(rows: RewardHistoryRow[]): RewardStore {
  const unused = async () => {
    throw new Error("unused in this test");
  };
  return {
    claimReward: unused,
    listPending: unused,
    markShown: unused,
    historyForChild: async () => rows,
  } as unknown as RewardStore;
}

function stubQuiz(rows: QuizCompletionRow[]): QuizStore {
  const unused = async () => {
    throw new Error("unused in this test");
  };
  return {
    completionsFor: unused,
    recordCompletion: unused,
    seenQuestionIds: unused,
    markQuestionsSeen: unused,
    recentCompletions: async () => rows,
  } as unknown as QuizStore;
}

function quizRow(partial: Partial<QuizCompletionRow>): QuizCompletionRow {
  return {
    id: "q1",
    childId: "kid",
    topic: "addition",
    correct: 5,
    total: 5,
    passed: true,
    awarded: true,
    createdAt: new Date(),
    ...partial,
  };
}

interface Setup {
  children: Child[];
  pulls?: Array<{ requestId: string; outcome: unknown; createdAt: Date }>;
  eggClaims?: Array<{ jti: string; outcome: unknown; createdAt: Date }>;
  rewardRows?: RewardHistoryRow[];
  quizRows?: QuizCompletionRow[];
  cards: Card[];
}

function setup({ children, pulls = [], eggClaims = [], rewardRows = [], quizRows = [], cards }: Setup) {
  const grants = inMemoryTicketGrantStore();
  const trades = inMemoryTradeEventStore();
  const service = makeActivityService({
    claims: stubClaims(pulls),
    offerClaims: stubOfferClaims(eggClaims),
    rewards: stubRewards(rewardRows),
    quiz: stubQuiz(quizRows),
    grants,
    trades,
    catalog: fakeCatalog(cards),
    profiles: { async listChildren() { return children; } },
  });
  return { service, grants, trades };
}

describe("makeActivityService.getActivityLog", () => {
  it("merges every source for one child, newest first, each event carrying its timestamp", async () => {
    const t = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000);
    const { service, grants } = setup({
      children: [kid("kid")],
      pulls: [{ requestId: "r1", outcome: { card: card("c1", "Fox"), isDuplicate: false }, createdAt: t(50) }],
      eggClaims: [{ jti: "j1", outcome: { card: card("c2", "Owl"), isDuplicate: true }, createdAt: t(40) }],
      rewardRows: [{ id: "rw1", themeId: "th", rarity: "rare", cardId: "c3", createdAt: t(30) }],
      quizRows: [quizRow({ childId: "kid", topic: "addition", createdAt: t(20) })],
      cards: [card("c1", "Fox"), card("c2", "Owl"), card("c3", "Bear")],
    });
    await grants.record("kid", "pullTokens", 5, "admin", "Parent");

    const events = await service.getActivityLog("kid", 50);

    expect(events).toHaveLength(5);
    expect(events.every((e) => typeof e.at === "string" && !Number.isNaN(Date.parse(e.at)))).toBe(true);
    // Newest first: the admin grant was recorded last (effectively "now").
    expect(events[0]).toMatchObject({ type: "ticket_given", source: "admin", amount: 5, detail: "Parent" });
    expect(events.map((e) => e.type)).toEqual([
      "ticket_given", // admin grant, just now
      "ticket_given", // quiz, 20s ago
      "bonus_card", // 30s ago
      "card_received", // egg, 40s ago
      "card_received", // pull, 50s ago
    ]);
  });

  it("resolves card ids to names via the catalog", async () => {
    const { service } = setup({
      children: [kid("kid")],
      pulls: [
        {
          requestId: "r1",
          outcome: { card: card("c1", "c1", "epic"), isDuplicate: false },
          createdAt: new Date(),
        },
      ],
      cards: [card("c1", "Fox", "epic")],
    });

    const [event] = await service.getActivityLog("kid", 50);
    expect(event).toMatchObject({ type: "card_received", cardId: "c1", cardName: "Fox", rarity: "epic" });
  });

  it("drops a claim row with no card (refund/sweep) from the log", async () => {
    const { service } = setup({
      children: [kid("kid")],
      pulls: [{ requestId: "r1", outcome: { refunded: true }, createdAt: new Date() }],
      cards: [],
    });

    expect(await service.getActivityLog("kid", 50)).toEqual([]);
  });

  it("ignores an unawarded quiz completion", async () => {
    const { service } = setup({
      children: [kid("kid")],
      quizRows: [quizRow({ childId: "kid", awarded: false })],
      cards: [],
    });

    expect(await service.getActivityLog("kid", 50)).toEqual([]);
  });

  it("childId=null merges every child's log, filters to one child otherwise", async () => {
    const grants = inMemoryTicketGrantStore();
    const trades = inMemoryTradeEventStore();
    const service = makeActivityService({
      claims: stubClaims([]),
      offerClaims: stubOfferClaims([]),
      rewards: stubRewards([]),
      quiz: stubQuiz([]),
      grants,
      trades,
      catalog: fakeCatalog([]),
      profiles: { async listChildren() { return [kid("a", "Alice"), kid("b", "Bob")]; } },
    });
    await grants.record("a", "pullTokens", 1, "admin", "Parent");
    await grants.record("b", "pullTokens", 2, "admin", "Parent");

    const onlyA = await service.getActivityLog("a", 50);
    expect(onlyA).toHaveLength(1);
    expect(onlyA[0]).toMatchObject({ childId: "a", childName: "Alice" });

    const all = await service.getActivityLog(null, 50);
    expect(all).toHaveLength(2);
    expect(all.map((e) => e.childId).sort()).toEqual(["a", "b"]);
  });

  it("shows a trade from both sides, framed as gave/got from that child's perspective", async () => {
    const grants = inMemoryTicketGrantStore();
    const trades = inMemoryTradeEventStore();
    const service = makeActivityService({
      claims: stubClaims([]),
      offerClaims: stubOfferClaims([]),
      rewards: stubRewards([]),
      quiz: stubQuiz([]),
      grants,
      trades,
      catalog: fakeCatalog([card("x", "Fox"), card("y", "Owl")]),
      profiles: { async listChildren() { return [kid("a", "Alice"), kid("b", "Bob")]; } },
    });
    await trades.record({ aChildId: "a", aCardId: "x", bChildId: "b", bCardId: "y" });

    const [fromA] = await service.getActivityLog("a", 50);
    expect(fromA).toMatchObject({
      type: "trade",
      gaveCardName: "Fox",
      gotCardName: "Owl",
      withChildId: "b",
      withChildName: "Bob",
    });

    const [fromB] = await service.getActivityLog("b", 50);
    expect(fromB).toMatchObject({
      type: "trade",
      gaveCardName: "Owl",
      gotCardName: "Fox",
      withChildId: "a",
      withChildName: "Alice",
    });
  });

  it("respects the limit, keeping only the newest events", async () => {
    const grants = inMemoryTicketGrantStore();
    const trades = inMemoryTradeEventStore();
    const service = makeActivityService({
      claims: stubClaims([]),
      offerClaims: stubOfferClaims([]),
      rewards: stubRewards([]),
      quiz: stubQuiz([]),
      grants,
      trades,
      catalog: fakeCatalog([]),
      profiles: { async listChildren() { return [kid("kid")]; } },
    });
    for (let i = 0; i < 5; i++) await grants.record("kid", "pullTokens", 1, "admin", null);

    expect(await service.getActivityLog("kid", 2)).toHaveLength(2);
  });
});
