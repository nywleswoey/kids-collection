import type { Card, Rarity } from "@/lib/types";

/**
 * Pure kid-to-kid trade rules (Inc14). No I/O → property-tested. The DB CHECK
 * `count >= 1` is the atomic backstop at commit; these rules give friendly
 * pre-validation and drive the UI.
 */

export interface TradeSide {
  childId: string;
  cardId: string;
  rarity: Rarity;
  count: number;
}

export type TradeValidation = { ok: true } | { ok: false; reason: string };

/** A card a child can offer: owned as a duplicate (count >= 2). */
export interface TradableCard {
  card: Card;
  count: number;
}

/** Counterparty cards eligible for a swap: same rarity AND a duplicate. */
export function filterTradable(cards: TradableCard[], rarity: Rarity): TradableCard[] {
  return cards.filter((t) => t.count >= 2 && t.card.rarity === rarity);
}

/** True if a single card is offerable (a duplicate). */
export function isTradable(count: number): boolean {
  return count >= 2;
}

/**
 * Validate a two-sided swap (FR1/FR2/FR7). Both givers must offer a duplicate
 * of the SAME rarity, to two DISTINCT children, and not the identical card.
 */
export function validateTrade(a: TradeSide, b: TradeSide): TradeValidation {
  if (a.childId === b.childId) {
    return { ok: false, reason: "Pick a different friend to trade with." };
  }
  if (a.count < 2) {
    return { ok: false, reason: "You can only trade a card you have doubles of." };
  }
  if (b.count < 2) {
    return { ok: false, reason: "Your friend can only trade a card they have doubles of." };
  }
  if (a.rarity !== b.rarity) {
    return { ok: false, reason: "Both cards must be the same rarity." };
  }
  if (a.cardId === b.cardId) {
    return { ok: false, reason: "Pick two different cards to swap." };
  }
  return { ok: true };
}
