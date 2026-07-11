import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { children, collections } from "@/db/schema";
import { drawCard } from "@/lib/logic";
import { listCards, getCard } from "@/features/pool/service";
import { rollEasterEgg, pickEasterEggChoices } from "./easter-egg";
import { makeOffer, verifyOffer } from "./offer";
import type { Card, PullResult } from "@/lib/types";

/** Rare pick-1-of-5 easter egg: server offers epic+ choices, claimed later. */
export interface EasterEggOutcome {
  outOfTokens: false;
  easterEgg: true;
  choices: Card[];
  offer: string;
  newBalance: number;
}

export type PullOutcome =
  | ({ outOfTokens: false; easterEgg?: false } & PullResult)
  | EasterEggOutcome
  | { outOfTokens: true };

const OFFER_TTL_MS = 120_000; // 2 min
function authSecret(): string {
  return process.env.AUTH_SECRET ?? "";
}

/**
 * Pull one card for a child. Atomic, no double-spend (U4-BR1/BR2).
 * 1) conditional spend, 2) draw, 3) upsert count, 4) refund on write failure.
 */
export async function pull(childId: string): Promise<PullOutcome> {
  // 1) Atomic compare-and-swap spend.
  const spent = await db
    .update(children)
    .set({ pullTokens: sql`${children.pullTokens} - 1` })
    .where(and(eq(children.id, childId), gte(children.pullTokens, 1)))
    .returning({ balance: children.pullTokens });

  if (spent.length === 0) return { outOfTokens: true }; // no spend, no draw

  const newBalance = spent[0].balance;

  try {
    const pool = await listCards();
    if (pool.length === 0) throw new Error("empty pool");

    // Easter egg (U6-FR2): rare server-side roll → pick-1-of-5 epic+. Refund the
    // token now; the claim re-spends it atomically (net 1 token per card).
    if (rollEasterEgg()) {
      const choices = pickEasterEggChoices(pool, 5);
      if (choices.length > 0) {
        // Sign the offer FIRST (pure crypto) so a failure can't double-refund.
        const offer = await makeOffer(
          {
            childId,
            cardIds: choices.map((c) => c.id),
            exp: Date.now() + OFFER_TTL_MS,
          },
          authSecret(),
        );
        await db
          .update(children)
          .set({ pullTokens: sql`${children.pullTokens} + 1` })
          .where(eq(children.id, childId));
        return {
          outOfTokens: false,
          easterEgg: true,
          choices,
          offer,
          newBalance: newBalance + 1,
        };
      }
      // No epic+ in the pool → fall through to a normal draw.
    }

    // 2) Draw (rarity-weighted, pure).
    const card = drawCard(pool);

    // 3) Upsert collection count atomically.
    const [entry] = await db
      .insert(collections)
      .values({ childId, cardId: card.id, count: 1 })
      .onConflictDoUpdate({
        target: [collections.childId, collections.cardId],
        set: { count: sql`${collections.count} + 1` },
      })
      .returning({ count: collections.count });

    return {
      outOfTokens: false,
      card,
      isDuplicate: entry.count > 1,
      newBalance,
    };
  } catch (err) {
    // 4) Best-effort refund (U4-BR6).
    try {
      await db
        .update(children)
        .set({ pullTokens: sql`${children.pullTokens} + 1` })
        .where(eq(children.id, childId));
    } catch (refundErr) {
      console.error(`pull: refund failed for ${childId}`, refundErr);
    }
    throw err;
  }
}

/**
 * Claim the card the child picked from an easter-egg offer (U6-FR2). Verifies
 * the signed offer (signature + expiry + child), that the pick was among the
 * offered cards, and that it's epic+, then spends exactly one token atomically
 * and grants the card. Net cost: one token — same as any discover.
 */
export async function claimEasterEgg(
  childId: string,
  offer: string,
  chosenCardId: string,
): Promise<PullOutcome> {
  const payload = await verifyOffer(offer, authSecret(), Date.now());
  if (!payload) throw new Error("claimEasterEgg: invalid or expired offer");
  if (payload.childId !== childId) throw new Error("claimEasterEgg: child mismatch");
  if (!payload.cardIds.includes(chosenCardId)) {
    throw new Error("claimEasterEgg: card not in offer");
  }

  const card = await getCard(chosenCardId);
  if (!card || (card.rarity !== "epic" && card.rarity !== "legendary")) {
    throw new Error("claimEasterEgg: chosen card is not epic+");
  }

  // Atomic spend — the single token cost for this discover (no double-spend).
  const spent = await db
    .update(children)
    .set({ pullTokens: sql`${children.pullTokens} - 1` })
    .where(and(eq(children.id, childId), gte(children.pullTokens, 1)))
    .returning({ balance: children.pullTokens });

  if (spent.length === 0) return { outOfTokens: true };
  const newBalance = spent[0].balance;

  const [entry] = await db
    .insert(collections)
    .values({ childId, cardId: card.id, count: 1 })
    .onConflictDoUpdate({
      target: [collections.childId, collections.cardId],
      set: { count: sql`${collections.count} + 1` },
    })
    .returning({ count: collections.count });

  return {
    outOfTokens: false,
    card,
    isDuplicate: entry.count > 1,
    newBalance,
  };
}
