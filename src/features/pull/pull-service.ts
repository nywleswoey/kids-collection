import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { children, collections } from "@/db/schema";
import { addCardCopy } from "@/db/collection-writes";
import { drawCard } from "@/lib/logic";
import { listCards, getCard } from "@/features/pool/service";
import {
  rollEasterEgg,
  pickEasterEggChoices,
  pickCommonRareChoices,
  pickRarityChoices,
} from "./easter-egg";
import { rollUpgradeTier, SACRIFICE_COST } from "./sacrifice";
import { pickTicketColumn } from "./pick-tickets";
import { makeOffer, verifyOffer, type OfferPayload } from "./offer";
import { grantCompletionRewards } from "@/features/rewards/service";
import { requireParent } from "@/features/auth/guard";
import type { Card, PullResult, Rarity, EggTicket } from "@/lib/types";

/** Active child's current owned count for each of the given card ids (0 if none).
 * Inc16 FR4: annotates egg choices with 🆕 / ➕×N. */
async function ownedCountsFor(
  childId: string,
  cardIds: string[],
): Promise<Record<string, number>> {
  if (cardIds.length === 0) return {};
  const rows = await db
    .select({ cardId: collections.cardId, count: collections.count })
    .from(collections)
    .where(and(eq(collections.childId, childId), inArray(collections.cardId, cardIds)));
  const counts: Record<string, number> = {};
  for (const id of cardIds) counts[id] = 0;
  for (const r of rows) counts[r.cardId] = r.count;
  return counts;
}

/** Rare pick-1-of-5 easter egg: server offers epic+ choices, claimed later. */
export interface EasterEggOutcome {
  outOfTokens: false;
  easterEgg: true;
  choices: Card[];
  /** Inc16 FR4: active child's current owned count per choice card (0 = new). */
  ownedCounts: Record<string, number>;
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
  const ownedCounts = await ownedCountsFor(childId, choices.map((c) => c.id));
  await db
    .update(children)
    .set({ pullTokens: sql`${children.pullTokens} + 1` })
    .where(eq(children.id, childId));
  return {
    outOfTokens: false,
    easterEgg: true,
    choices,
    ownedCounts,
    offer,
    newBalance: newBalance + 1,
  };
}

/**
 * Grant one copy of a card to the child and return the standard card outcome:
 * atomically upsert the collection count, apply any (theme, rarity)
 * set-completion bonus (Inc16 FR5), and return with the duplicate flag plus the
 * given balance. Shared card-grant tail of pull() and claimEasterEgg().
 */
async function grantCardOutcome(
  childId: string,
  card: Card,
  newBalance: number,
): Promise<PullOutcome> {
  const [entry] = await addCardCopy(childId, card.id).returning({
    count: collections.count,
  });

  await grantCompletionRewards(childId, [card.id]);

  return {
    outOfTokens: false,
    card,
    isDuplicate: entry.count > 1,
    newBalance,
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

    // 3) Upsert collection count atomically + apply any set-completion bonus.
    return await grantCardOutcome(childId, card, newBalance);
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
 * Shared tail for ticket-gated eggs (special epic/lucky + rarity-pick): the
 * ticket is NOT spent here — spent atomically at claim (single-use), and the
 * offer pins the ticket via `offerExtra`. Builds the signed offer over the given
 * choices, annotates owned counts, and returns the current (unchanged) normal
 * token balance.
 */
async function makeTicketEggOutcome(
  childId: string,
  choices: Card[],
  offerExtra: Partial<OfferPayload>,
): Promise<EasterEggOutcome> {
  const cardIds = choices.map((c) => c.id);
  const offer = await makeOffer(
    { childId, cardIds, exp: Date.now() + OFFER_TTL_MS, ...offerExtra },
    authSecret(),
  );
  const ownedCounts = await ownedCountsFor(childId, cardIds);
  const balRow = await db.query.children.findFirst({
    where: eq(children.id, childId),
    columns: { pullTokens: true },
  });
  return {
    outOfTokens: false,
    easterEgg: true,
    choices,
    ownedCounts,
    offer,
    newBalance: balRow?.pullTokens ?? 0,
  };
}

/**
 * Shared body for the ticket-gated egg entry points: guard on the ticket
 * column (>= 1 held), draw the pick-1-of-5 from the FULL pool, and hand off to
 * makeTicketEggOutcome. The ticket is NOT spent here — spent atomically at claim
 * (single-use); `offerExtra` pins which column claim decrements. Returns
 * out-of-tokens when no ticket is held.
 */
async function offerTicketEgg(
  childId: string,
  col: AnyPgColumn,
  offerExtra: Partial<OfferPayload>,
  chooseFrom: (pool: Card[]) => Card[],
  label: string,
): Promise<PullOutcome> {
  const [row] = await db
    .select({ n: col })
    .from(children)
    .where(eq(children.id, childId));
  if (!row || row.n < 1) return { outOfTokens: true };

  const choices = chooseFrom(await listCards());
  if (choices.length === 0) throw new Error(`${label}: no eligible cards`);

  return makeTicketEggOutcome(childId, choices, offerExtra);
}

/**
 * Guaranteed easter egg via a special ticket (Inc9 FR4). Offers the pick-1-of-5
 * for the ticket's tier from the FULL pool. The special ticket is NOT spent here
 * — it's spent atomically at claim (single-use), and the offer pins the kind.
 */
export async function pullSpecialEgg(
  childId: string,
  kind: EggTicket,
): Promise<PullOutcome> {
  const col = kind === "epic" ? children.epicTickets : children.luckyTickets;
  const chooseFrom = (pool: Card[]) =>
    kind === "epic" ? pickEasterEggChoices(pool, 5) : pickCommonRareChoices(pool, 5);
  return offerTicketEgg(childId, col, { ticket: kind }, chooseFrom, "pullSpecialEgg");
}

/**
 * Redeem a rarity-pick ticket (Inc16 FR2): offer pick-1-of-5 of that exact
 * rarity from the FULL pool. The pick ticket is NOT spent here — spent atomically
 * at claim (single-use), and the offer pins the rarity via `pickRarity`.
 */
export async function pullRarityPick(
  childId: string,
  rarity: Rarity,
): Promise<PullOutcome> {
  const col = children[pickTicketColumn(rarity)];
  const chooseFrom = (pool: Card[]) => pickRarityChoices(pool, rarity, 5);
  return offerTicketEgg(childId, col, { pickRarity: rarity }, chooseFrom, "pullRarityPick");
}

/**
 * Claim the card the child picked from an easter-egg offer (U6-FR2). Verifies
 * the signed offer (signature + expiry + child) and that the pick was among the
 * offered cards, then spends exactly one ticket atomically and grants the card.
 * A special-ticket offer (Inc9 FR4) spends that special ticket instead of a
 * normal token; the atomic spend makes the signed offer single-use.
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

  // Atomic spend — one column (rarity-pick, special ticket, or normal token).
  // The pinned offer field picks which; missing both spends a normal token.
  // Single-use: the guarded decrement makes the signed offer un-replayable.
  const key: SpendableColumn = payload.pickRarity
    ? pickTicketColumn(payload.pickRarity)
    : payload.ticket
      ? payload.ticket === "epic"
        ? "epicTickets"
        : "luckyTickets"
      : "pullTokens";
  const newBalance = await spendOneColumn(childId, key);
  if (newBalance === null) return { outOfTokens: true };

  return grantCardOutcome(childId, card, newBalance);
}

/** Children columns that hold a spendable balance (normal token or a ticket). */
type SpendableColumn =
  | "pullTokens"
  | "epicTickets"
  | "luckyTickets"
  | "commonPickTickets"
  | "rarePickTickets"
  | "epicPickTickets"
  | "legendaryPickTickets";

/**
 * Atomic guarded decrement of one spendable column (single-use claim). Returns
 * the child's resulting normal token balance, or null if nothing was spent
 * (guard failed → no copies left). Decrementing `pullTokens` returns its new
 * value; decrementing a ticket column leaves `pullTokens` unchanged.
 */
async function spendOneColumn(
  childId: string,
  key: SpendableColumn,
): Promise<number | null> {
  const col = children[key];
  const spent = await db
    .update(children)
    .set({ [key]: sql`${col} - 1` })
    .where(and(eq(children.id, childId), gte(col, 1)))
    .returning({ pullTokens: children.pullTokens });
  return spent.length === 0 ? null : spent[0].pullTokens;
}

export interface SacrificeResult {
  /** Rarity of the pick ticket earned (Inc16 FR1): 50/50 same tier or one up. */
  ticketRarity: Rarity;
  sourceRarity: Rarity;
}

/**
 * Sacrifice SACRIFICE_COST copies of a card for a rarity-pick ticket (Inc16
 * FR1, replaces the Inc8 direct card grant). Free (spends copies, not tokens).
 * Atomic guarded decrement prevents over-spending; the ticket's rarity is
 * same-or-one-tier-higher (50/50). The child redeems it later on the pull screen.
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

  const ticketRarity = rollUpgradeTier(source.rarity); // 50/50 same / one up
  const key = pickTicketColumn(ticketRarity);
  await db
    .update(children)
    .set({ [key]: sql`${children[key]} + 1` })
    .where(eq(children.id, childId));

  return { ticketRarity, sourceRarity: source.rarity };
}
