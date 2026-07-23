import { drawCard } from "@/lib/logic";
import { env } from "@/lib/env";
import type { Card, PullResult, Rarity, EggTicket } from "@/lib/types";
import type { ChildStore } from "@/db/stores/child-store";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import {
  rollEasterEgg,
  pickEasterEggChoices,
  pickCommonRareChoices,
  pickRarityChoices,
} from "./easter-egg";
import { rollUpgradeTier, SACRIFICE_COST } from "./sacrifice";
import { pickTicketColumn, specialTicketColumn, type BalanceColumn } from "./pick-tickets";
import { makeOffer, verifyOffer, type OfferPayload } from "./offer";

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

export interface SacrificeResult {
  /** Rarity of the pick ticket earned (Inc16 FR1): 50/50 same tier or one up. */
  ticketRarity: Rarity;
  sourceRarity: Rarity;
}

const OFFER_TTL_MS = 120_000; // 2 min

export interface PullDeps {
  children: ChildStore;
  collections: CollectionStore;
  catalog: Catalog;
  rewards: RewardGranter;
}

/**
 * Pull/egg/sacrifice orchestration (U4/U6/Inc16), parameterized by its ports.
 * The atomic spend/refund/grant all live behind ChildStore + CollectionStore, so
 * this module is pure orchestration — unit-testable with fakes. Offer crypto
 * (`env.authSecret`, `makeOffer`/`verifyOffer`) stays a direct import; parent
 * gating now lives at the action layer. Prod wiring: `pull-service.prod.ts`.
 */
export function makePullService({ children, collections, catalog, rewards }: PullDeps) {
  /**
   * Assemble a pick-1-of-N easter-egg outcome: sign the offer (pure crypto,
   * always FIRST so a caller's later side-effect can't double-fire on failure),
   * annotate owned counts, and return with the given normal-token balance.
   */
  async function eggOutcome(
    childId: string,
    choices: Card[],
    newBalance: number,
    offerExtra: Partial<OfferPayload> = {},
  ): Promise<EasterEggOutcome> {
    const cardIds = choices.map((c) => c.id);
    const offer = await makeOffer(
      { childId, cardIds, exp: Date.now() + OFFER_TTL_MS, ...offerExtra },
      env.authSecret,
    );
    const ownedCounts = await collections.ownedCounts(childId, cardIds);
    return { outOfTokens: false, easterEgg: true, choices, ownedCounts, offer, newBalance };
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
    const outcome = await eggOutcome(childId, choices, newBalance + 1);
    await children.incrementColumn(childId, "pullTokens", 1); // refund; re-spent at claim
    return outcome;
  }

  /**
   * Grant one copy of a card and return the standard card outcome: upsert the
   * collection count, apply any (theme, rarity) set-completion bonus (Inc16 FR5),
   * and return with the duplicate flag plus the given balance. Shared tail of
   * pull() and claimEasterEgg().
   */
  async function grantCardOutcome(
    childId: string,
    card: Card,
    newBalance: number,
  ): Promise<PullOutcome> {
    const { count } = await collections.grantCard(childId, card.id);
    await rewards.grantCompletionRewards(childId, [card.id]);
    return { outOfTokens: false, card, isDuplicate: count > 1, newBalance };
  }

  /**
   * Pull one card for a child. Atomic, no double-spend (U4-BR1/BR2).
   * 1) conditional spend, 2) draw, 3) upsert count, 4) refund on write failure.
   * `themeId` (Inc8 FR3) limits the normal draw to one category; eggs stay global.
   */
  async function pull(childId: string, themeId?: string): Promise<PullOutcome> {
    // 1) Atomic compare-and-swap spend.
    const newBalance = await children.spendOne(childId, "pullTokens");
    if (newBalance === null) return { outOfTokens: true }; // no spend, no draw

    try {
      const pool = await catalog.listCards();
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

      // 3) Upsert collection count + apply any set-completion bonus.
      return await grantCardOutcome(childId, card, newBalance);
    } catch (err) {
      // 4) Best-effort refund (U4-BR6).
      try {
        await children.incrementColumn(childId, "pullTokens", 1);
      } catch (refundErr) {
        console.error(`pull: refund failed for ${childId}`, refundErr);
      }
      throw err;
    }
  }

  /**
   * Shared tail for ticket-gated eggs: the ticket is NOT spent here — spent
   * atomically at claim (single-use), and the offer pins the ticket. Returns the
   * current (unchanged) normal token balance.
   */
  async function makeTicketEggOutcome(
    childId: string,
    choices: Card[],
    offerExtra: Partial<OfferPayload>,
  ): Promise<EasterEggOutcome> {
    return eggOutcome(childId, choices, await children.readColumn(childId, "pullTokens"), offerExtra);
  }

  /**
   * Shared body for the ticket-gated egg entry points: guard on the ticket column
   * (>= 1 held), draw the pick-1-of-5 from the FULL pool, and hand off. The ticket
   * is NOT spent here — spent atomically at claim; `offerExtra` pins which column
   * claim decrements. Returns out-of-tokens when no ticket is held.
   */
  async function offerTicketEgg(
    childId: string,
    column: BalanceColumn,
    offerExtra: Partial<OfferPayload>,
    chooseFrom: (pool: Card[]) => Card[],
    label: string,
  ): Promise<PullOutcome> {
    const held = await children.readColumn(childId, column);
    if (held < 1) return { outOfTokens: true };

    const choices = chooseFrom(await catalog.listCards());
    if (choices.length === 0) throw new Error(`${label}: no eligible cards`);

    return makeTicketEggOutcome(childId, choices, offerExtra);
  }

  /**
   * Guaranteed easter egg via a special ticket (Inc9 FR4). Offers the pick-1-of-5
   * for the ticket's tier from the FULL pool. The special ticket is spent
   * atomically at claim (single-use); the offer pins the kind.
   */
  async function pullSpecialEgg(childId: string, kind: EggTicket): Promise<PullOutcome> {
    const chooseFrom = (pool: Card[]) =>
      kind === "epic" ? pickEasterEggChoices(pool, 5) : pickCommonRareChoices(pool, 5);
    return offerTicketEgg(childId, specialTicketColumn(kind), { ticket: kind }, chooseFrom, "pullSpecialEgg");
  }

  /**
   * Redeem a rarity-pick ticket (Inc16 FR2): offer pick-1-of-5 of that exact
   * rarity from the FULL pool. Spent atomically at claim; the offer pins the rarity.
   */
  async function pullRarityPick(childId: string, rarity: Rarity): Promise<PullOutcome> {
    const chooseFrom = (pool: Card[]) => pickRarityChoices(pool, rarity, 5);
    return offerTicketEgg(childId, pickTicketColumn(rarity), { pickRarity: rarity }, chooseFrom, "pullRarityPick");
  }

  /**
   * Claim the card the child picked from an easter-egg offer (U6-FR2). Verifies
   * the signed offer (signature + expiry + child) and that the pick was among the
   * offered cards, then spends exactly one column atomically and grants the card.
   * The atomic spend makes the signed offer single-use.
   */
  async function claimEasterEgg(
    childId: string,
    offer: string,
    chosenCardId: string,
  ): Promise<PullOutcome> {
    const payload = await verifyOffer(offer, env.authSecret, Date.now());
    if (!payload) throw new Error("claimEasterEgg: invalid or expired offer");
    if (payload.childId !== childId) throw new Error("claimEasterEgg: child mismatch");
    if (!payload.cardIds.includes(chosenCardId)) {
      throw new Error("claimEasterEgg: card not in offer");
    }

    // The offer's cardIds are server-chosen and HMAC-signed, so membership above
    // is the security boundary. Just confirm the card still exists.
    const card = await catalog.getCard(chosenCardId);
    if (!card) throw new Error("claimEasterEgg: card not found");

    // Atomic spend — one column (rarity-pick, special ticket, or normal token).
    // The pinned offer field picks which; missing both spends a normal token.
    // Single-use: the guarded decrement makes the signed offer un-replayable.
    const key: BalanceColumn = payload.pickRarity
      ? pickTicketColumn(payload.pickRarity)
      : payload.ticket
        ? specialTicketColumn(payload.ticket)
        : "pullTokens";
    const newBalance = await children.spendOne(childId, key);
    if (newBalance === null) return { outOfTokens: true };

    return grantCardOutcome(childId, card, newBalance);
  }

  /**
   * Sacrifice SACRIFICE_COST copies of a card for a rarity-pick ticket (Inc16
   * FR1). Free (spends copies, not tokens). Atomic guarded decrement prevents
   * over-spending; the ticket's rarity is same-or-one-tier-higher (50/50).
   *
   * A sacrifice always leaves the child at least ONE copy — you burn duplicates,
   * never your only card. `minHeld = SACRIFICE_COST + 1` enforces that: a holding
   * of exactly SACRIFICE_COST can't be burned to zero (which is why the binder
   * only offers the panel at `> SACRIFICE_COST`).
   */
  async function sacrifice(childId: string, cardId: string): Promise<SacrificeResult> {
    const source = await catalog.getCard(cardId);
    if (!source) throw new Error("sacrifice: card not found");

    // Atomic CAS: only succeeds while the child holds enough to burn AND keep one.
    const burned = await collections.removeCard(childId, cardId, SACRIFICE_COST, SACRIFICE_COST + 1);
    if (burned === null) throw new Error("sacrifice: not enough copies");

    const ticketRarity = rollUpgradeTier(source.rarity); // 50/50 same / one up
    await children.incrementColumn(childId, pickTicketColumn(ticketRarity), 1);

    return { ticketRarity, sourceRarity: source.rarity };
  }

  return { pull, pullSpecialEgg, pullRarityPick, claimEasterEgg, sacrifice };
}

export type PullService = ReturnType<typeof makePullService>;
