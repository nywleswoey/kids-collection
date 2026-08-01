import type { Card } from "@/lib/types";
import type { TradableCard } from "./trade-logic";

/**
 * Friend-first trade board logic (Inc22 FR2/FR4/FR5/FR6/FR7). PURE — no I/O, so
 * every rule the child sees on the board is property-testable and can't drift
 * from what `validateTrade` will allow at commit time.
 */

export interface BoardCard {
  card: Card;
  count: number;
  /**
   * True when the OTHER party doesn't own this card at all. Drives the badge
   * (FR4) and the "only show what's missing" filter (FR5). Deliberately about
   * ownership, not duplicates: what matters is whether the swap gives them
   * something genuinely new.
   */
  newToOther: boolean;
}

/** Tag both inventories against the opposite party's ownership set. */
export function buildColumns(input: {
  mine: TradableCard[];
  theirs: TradableCard[];
  myOwnedIds: ReadonlySet<string>;
  theirOwnedIds: ReadonlySet<string>;
}): { mine: BoardCard[]; theirs: BoardCard[] } {
  const { mine, theirs, myOwnedIds, theirOwnedIds } = input;
  return {
    mine: mine.map((t) => tag(t, theirOwnedIds)),
    theirs: theirs.map((t) => tag(t, myOwnedIds)),
  };
}

function tag(t: TradableCard, otherOwnedIds: ReadonlySet<string>): BoardCard {
  return { card: t.card, count: t.count, newToOther: !otherOwnedIds.has(t.card.id) };
}

/** FR5 — hide the cards the other party already has. `false` is the identity. */
export function applyMissingFilter(cards: BoardCard[], onlyMissing: boolean): BoardCard[] {
  return onlyMissing ? cards.filter((c) => c.newToOther) : cards;
}

/** FR7 — how many of `mine` the given ownership set lacks. Drives the friend chips. */
export function missingCount(
  mine: TradableCard[],
  otherOwnedIds: ReadonlySet<string>,
): number {
  let n = 0;
  for (const t of mine) if (!otherOwnedIds.has(t.card.id)) n += 1;
  return n;
}

/**
 * FR6 — a card is pickable while the other side is still empty, or when the
 * rarities match. Mirrors `validateTrade`'s rarity clause so the board can never
 * offer a pick the server would reject; the server remains the authority.
 */
export function isPickable(card: Card, otherPick: Card | null): boolean {
  return otherPick === null || card.rarity === otherPick.rarity;
}
