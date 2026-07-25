import { drawCard } from "@/lib/logic";
import { env } from "@/lib/env";
import type { Card, PullResult, Rarity } from "@/lib/types";
import type { ChildStore } from "@/db/stores/child-store";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import {
  rollEasterEgg,
  pickEasterEggChoices,
  pickCommonRareChoices,
  pickRarityChoices,
  rollWeightedRarity,
} from "./easter-egg";
import { SACRIFICE_COST } from "./sacrifice";
import { type BalanceColumn } from "./pick-tickets";
import { makeOffer, verifyOffer, type OfferPayload } from "./offer";

/** Pick-1-of-5 easter egg: server offers choices, claimed later. */
export interface EasterEggOutcome {
  outOfTokens: false;
  easterEgg: true;
  choices: Card[];
  /** Inc16 FR4: active child's current owned count per choice card (0 = new). */
  ownedCounts: Record<string, number>;
  offer: string;
  newBalance: number;
  /** Inc19 FR4: server-rolled tier for the unified Easter Egg ticket, so the
   *  picker can surprise-reveal it. Absent for the random ~1% eggs. */
  revealRarity?: Rarity;
}

export type PullOutcome =
  | ({ outOfTokens: false; easterEgg?: false } & PullResult)
  | EasterEggOutcome
  | { outOfTokens: true };

export interface SacrificeResult {
  /** Easter Egg ticket balance after the sacrifice granted one (Inc19 FR7). */
  newBalance: number;
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
    revealRarity?: Rarity,
  ): Promise<EasterEggOutcome> {
    const cardIds = choices.map((c) => c.id);
    const offer = await makeOffer(
      { childId, cardIds, exp: Date.now() + OFFER_TTL_MS, ...offerExtra },
      env.authSecret,
    );
    const ownedCounts = await collections.ownedCounts(childId, cardIds);
    return {
      outOfTokens: false,
      easterEgg: true,
      choices,
      ownedCounts,
      offer,
      newBalance,
      ...(revealRarity ? { revealRarity } : {}),
    };
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
   * Redeem the unified Easter Egg ticket (Inc19 FR3/FR4): guard on the ticket
   * balance (>= 1 held), roll a rarity by the normal pull odds, then offer a
   * pick-1-of-5 of that exact rarity from the FULL pool. The ticket is NOT spent
   * here — spent atomically at claim (single-use); the offer pins `easterEgg` so
   * claim decrements `easterEggTickets`. The rolled tier rides along for the
   * surprise reveal. Returns out-of-tokens when no Easter Egg ticket is held.
   */
  async function pullEasterEgg(childId: string): Promise<PullOutcome> {
    const held = await children.readColumn(childId, "easterEggTickets");
    if (held < 1) return { outOfTokens: true };

    const rarity = rollWeightedRarity();
    const choices = pickRarityChoices(await catalog.listCards(), rarity, 5);
    if (choices.length === 0) throw new Error("pullEasterEgg: no eligible cards");

    const balance = await children.readColumn(childId, "pullTokens");
    return eggOutcome(childId, choices, balance, { easterEgg: true, rolledRarity: rarity }, rarity);
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

    // Atomic spend — the unified Easter Egg ticket when the offer pins `easterEgg`,
    // otherwise a normal token (the random ~1% eggs). Single-use: the guarded
    // decrement makes the signed offer un-replayable.
    const key: BalanceColumn = payload.easterEgg ? "easterEggTickets" : "pullTokens";
    const newBalance = await children.spendOne(childId, key);
    if (newBalance === null) return { outOfTokens: true };

    return grantCardOutcome(childId, card, newBalance);
  }

  /**
   * Sacrifice SACRIFICE_COST copies of a card for one unified Easter Egg ticket
   * (Inc19 FR7). Free (spends copies, not tokens). Atomic guarded decrement
   * prevents over-spending; rarity no longer matters — every sacrifice yields the
   * same 🥚 ticket.
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

    // Atomic +1 that returns the new balance (never negative).
    const newBalance = await children.clampedGrant(childId, "easterEggTickets", 1);
    if (newBalance === null) throw new Error("sacrifice: child not found");

    return { newBalance };
  }

  return { pull, pullEasterEgg, claimEasterEgg, sacrifice };
}

export type PullService = ReturnType<typeof makePullService>;
