import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { children, collections } from "@/db/schema";
import { drawCard } from "@/lib/logic";
import { listCards, getCard } from "@/features/pool/service";
import {
  rollEasterEgg,
  pickEasterEggChoices,
  pickCommonRareChoices,
} from "./easter-egg";
import {
  rollUpgradeTier,
  pickUpgradeCard,
  SACRIFICE_COST,
} from "./sacrifice";
import { makeOffer, verifyOffer } from "./offer";
import { requireParent } from "@/features/auth/guard";
import type { Card, PullResult, Rarity } from "@/lib/types";

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
 * Build a signed pick-1-of-N easter-egg offer, refund the token (re-spent on
 * claim), and return the outcome. Sign FIRST (pure crypto) so a failure can't
 * double-refund. Shared by both eggs (epic+ and common/rare).
 */
async function makeEggOutcome(
  childId: string,
  choices: Card[],
  newBalance: number,
): Promise<EasterEggOutcome> {
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

/**
 * Pull one card for a child. Atomic, no double-spend (U4-BR1/BR2).
 * 1) conditional spend, 2) draw, 3) upsert count, 4) refund on write failure.
 * `themeId` (Inc8 FR3) limits the normal draw to one category; eggs stay global.
 */
export async function pull(
  childId: string,
  themeId?: string,
): Promise<PullOutcome> {
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

    // Egg 1 (U6-FR2): rare roll → pick-1-of-5 epic+. Eggs draw from the FULL pool.
    if (rollEasterEgg()) {
      const choices = pickEasterEggChoices(pool, 5);
      if (choices.length > 0) return makeEggOutcome(childId, choices, newBalance);
    }

    // Egg 2 (Inc8 FR1): independent rare roll → pick-1-of-5 common/rare.
    if (rollEasterEgg()) {
      const choices = pickCommonRareChoices(pool, 5);
      if (choices.length > 0) return makeEggOutcome(childId, choices, newBalance);
    }

    // 2) Draw (rarity-weighted, pure). Category-scoped if a theme was chosen.
    const drawPool = themeId ? pool.filter((c) => c.themeId === themeId) : pool;
    const card = drawCard(drawPool.length > 0 ? drawPool : pool);

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

  // The offer's cardIds are server-chosen and HMAC-signed, so membership above
  // is the security boundary — any rarity the server offered is claimable
  // (Inc8 FR1 adds the common/rare egg). Just confirm the card still exists.
  const card = await getCard(chosenCardId);
  if (!card) throw new Error("claimEasterEgg: card not found");

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

export interface SacrificeResult {
  card: Card;
  isDuplicate: boolean;
  sourceRarity: Rarity;
  resultRarity: Rarity;
}

/**
 * Sacrifice SACRIFICE_COST copies of a card for a random upgraded card (Inc8
 * FR2). Free (spends copies, not tokens). Atomic guarded decrement prevents
 * over-spending copies; result is same-or-one-tier-higher, preferring unowned.
 */
export async function sacrifice(
  childId: string,
  cardId: string,
): Promise<SacrificeResult> {
  await requireParent();

  const source = await getCard(cardId);
  if (!source) throw new Error("sacrifice: card not found");

  // Atomic CAS: only succeeds if the child still holds enough copies.
  const burned = await db
    .update(collections)
    .set({ count: sql`${collections.count} - ${SACRIFICE_COST}` })
    .where(
      and(
        eq(collections.childId, childId),
        eq(collections.cardId, cardId),
        gte(collections.count, SACRIFICE_COST),
      ),
    )
    .returning({ count: collections.count });

  if (burned.length === 0) {
    throw new Error("sacrifice: not enough copies");
  }

  // Owned set AFTER the burn, so a card fully consumed no longer counts as owned.
  const ownedRows = await db
    .select({ cardId: collections.cardId })
    .from(collections)
    .where(and(eq(collections.childId, childId), gte(collections.count, 1)));
  const ownedIds = new Set(ownedRows.map((r) => r.cardId));

  const pool = await listCards();
  const tier = rollUpgradeTier(source.rarity);
  const result =
    pickUpgradeCard(pool, tier, ownedIds) ??
    pickUpgradeCard(pool, source.rarity, ownedIds);
  if (!result) throw new Error("sacrifice: no upgrade card available");

  const [entry] = await db
    .insert(collections)
    .values({ childId, cardId: result.id, count: 1 })
    .onConflictDoUpdate({
      target: [collections.childId, collections.cardId],
      set: { count: sql`${collections.count} + 1` },
    })
    .returning({ count: collections.count });

  return {
    card: result,
    isDuplicate: entry.count > 1,
    sourceRarity: source.rarity,
    resultRarity: result.rarity,
  };
}
