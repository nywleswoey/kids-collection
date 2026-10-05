import type { ClaimStore } from "@/db/stores/claim-store";
import type { OfferClaimStore } from "@/db/stores/offer-claim-store";
import type { RewardStore } from "@/db/stores/reward-store";
import type { QuizStore } from "@/db/stores/quiz-store";
import type { TicketGrantStore } from "@/db/stores/ticket-grant-store";
import type { TradeEventStore } from "@/db/stores/trade-event-store";
import type { Catalog } from "@/shared/pool/catalog";
import type { ChildDirectory } from "@/features/trade/trade-service";
import type { BalanceColumn } from "@/db/stores/child-store";
import { topicTitle } from "@/features/quiz/topics";
import type { Rarity } from "@/lib/types";
import type { ActivityEvent } from "./types";

/** Per-source cap on how far back one child's raw rows are read before
 *  merging + sorting + truncating to the caller's `limit`. Generous relative
 *  to any real family's pace, so the merge is never starved of a source. */
const SOURCE_LIMIT = 200;

export interface ActivityDeps {
  claims: ClaimStore;
  offerClaims: OfferClaimStore;
  rewards: RewardStore;
  quiz: QuizStore;
  grants: TicketGrantStore;
  trades: TradeEventStore;
  catalog: Catalog;
  profiles: ChildDirectory;
}

/** An outcome's embedded card, as stored by `pull_claims`/`easter_egg_claims`
 *  (`{ card: { id, rarity, ... }, isDuplicate, ... }`) — narrowed defensively
 *  since `outcome` is untyped jsonb and a refund/sweep carries no `card`. */
function outcomeCard(outcome: unknown): { id: string; rarity?: Rarity } | null {
  if (!outcome || typeof outcome !== "object") return null;
  const card = (outcome as Record<string, unknown>).card;
  if (!card || typeof card !== "object") return null;
  const id = (card as Record<string, unknown>).id;
  if (typeof id !== "string") return null;
  return card as { id: string; rarity?: Rarity };
}

function outcomeIsDuplicate(outcome: unknown): boolean {
  return (
    !!outcome && typeof outcome === "object" && (outcome as Record<string, unknown>).isDuplicate === true
  );
}

/**
 * Parent-facing per-child activity log (#kcact): merges six sources —
 * `pull_claims`, `easter_egg_claims`, `collection_rewards`, `quiz_completions`
 * (awarded only), `ticket_grants`, and `trade_events` — into one
 * reverse-chronological feed. `childId: null` merges every active child's log
 * into one feed (the parent view's "All" filter). Prod wiring:
 * `activity-service.prod.ts`.
 */
export function makeActivityService({
  claims,
  offerClaims,
  rewards,
  quiz,
  grants,
  trades,
  catalog,
  profiles,
}: ActivityDeps) {
  async function rawForChild(childId: string) {
    const [pulls, eggClaims, rewardRows, quizRows, grantRows, tradeRows] = await Promise.all([
      claims.completedForChild(childId, SOURCE_LIMIT),
      offerClaims.completedForChild(childId, SOURCE_LIMIT),
      rewards.historyForChild(childId, SOURCE_LIMIT),
      quiz.recentCompletions(childId, SOURCE_LIMIT),
      grants.recentForChild(childId, SOURCE_LIMIT),
      trades.recentForChild(childId, SOURCE_LIMIT),
    ]);
    return { pulls, eggClaims, rewardRows, quizRows, grantRows, tradeRows };
  }

  /** Reverse-chronological activity for one child, or every active child
   *  (`childId = null`) merged into one feed (the parent view's filter). */
  async function getActivityLog(childId: string | null, limit = 50): Promise<ActivityEvent[]> {
    const children = await profiles.listChildren();
    const childName = new Map(children.map((c) => [c.id, c.name]));
    const targetIds = childId ? [childId] : children.map((c) => c.id);

    const byChild = new Map(
      await Promise.all(targetIds.map(async (id) => [id, await rawForChild(id)] as const)),
    );

    const cardIds = new Set<string>();
    for (const raw of byChild.values()) {
      for (const p of raw.pulls) {
        const c = outcomeCard(p.outcome);
        if (c) cardIds.add(c.id);
      }
      for (const e of raw.eggClaims) {
        const c = outcomeCard(e.outcome);
        if (c) cardIds.add(c.id);
      }
      for (const r of raw.rewardRows) cardIds.add(r.cardId);
      for (const t of raw.tradeRows) {
        cardIds.add(t.aCardId);
        cardIds.add(t.bCardId);
      }
    }
    const cardName = new Map(
      await Promise.all(
        [...cardIds].map(async (id) => [id, (await catalog.getCard(id))?.name ?? id] as const),
      ),
    );

    const events: ActivityEvent[] = [];
    for (const [id, raw] of byChild) {
      const name = childName.get(id) ?? id;

      for (const p of raw.pulls) {
        const card = outcomeCard(p.outcome);
        if (!card) continue;
        events.push({
          type: "card_received",
          childId: id,
          childName: name,
          at: p.createdAt.toISOString(),
          via: "pull",
          cardId: card.id,
          cardName: cardName.get(card.id) ?? card.id,
          rarity: card.rarity ?? "common",
          isDuplicate: outcomeIsDuplicate(p.outcome),
        });
      }

      for (const e of raw.eggClaims) {
        const card = outcomeCard(e.outcome);
        if (!card) continue;
        events.push({
          type: "card_received",
          childId: id,
          childName: name,
          at: e.createdAt.toISOString(),
          via: "easter_egg",
          cardId: card.id,
          cardName: cardName.get(card.id) ?? card.id,
          rarity: card.rarity ?? "common",
          isDuplicate: outcomeIsDuplicate(e.outcome),
        });
      }

      for (const r of raw.rewardRows) {
        events.push({
          type: "bonus_card",
          childId: id,
          childName: name,
          at: r.createdAt.toISOString(),
          cardId: r.cardId,
          cardName: cardName.get(r.cardId) ?? r.cardId,
          rarity: r.rarity,
          themeId: r.themeId,
        });
      }

      for (const q of raw.quizRows) {
        if (!q.awarded) continue;
        events.push({
          type: "ticket_given",
          childId: id,
          childName: name,
          at: q.createdAt.toISOString(),
          ticket: "easterEggTickets",
          amount: 1,
          source: "quiz",
          detail: topicTitle(q.topic),
        });
      }

      for (const g of raw.grantRows) {
        events.push({
          type: "ticket_given",
          childId: id,
          childName: name,
          at: g.createdAt.toISOString(),
          ticket: g.column as BalanceColumn,
          amount: g.amount,
          source: g.source as "admin" | "sacrifice",
          detail: g.grantedBy,
        });
      }

      for (const t of raw.tradeRows) {
        const gaveCardId = t.aChildId === id ? t.aCardId : t.bCardId;
        const gotCardId = t.aChildId === id ? t.bCardId : t.aCardId;
        const withChildId = t.aChildId === id ? t.bChildId : t.aChildId;
        events.push({
          type: "trade",
          childId: id,
          childName: name,
          at: t.createdAt.toISOString(),
          gaveCardId,
          gaveCardName: cardName.get(gaveCardId) ?? gaveCardId,
          gotCardId,
          gotCardName: cardName.get(gotCardId) ?? gotCardId,
          withChildId,
          withChildName: childName.get(withChildId) ?? withChildId,
        });
      }
    }

    events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return events.slice(0, limit);
  }

  return { getActivityLog };
}

export type ActivityService = ReturnType<typeof makeActivityService>;
