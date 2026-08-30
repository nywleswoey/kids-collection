import type { Card, Rarity } from "@/lib/types";

/**
 * Collection-completion reward logic (Inc16 FR5). PURE → property-tested so
 * detection + reward selection can't be skewed by the client.
 *
 * A "set" is one (theme × rarity): every card of that rarity within a category.
 * Completing a set (owning ≥1 of all of them) grants a bonus card of that rarity.
 */

export interface RaritySet {
  themeId: string;
  rarity: Rarity;
}

/** True iff the (theme, rarity) set is non-empty and every card is owned. */
export function isRaritySetComplete(
  cards: Card[],
  themeId: string,
  rarity: Rarity,
  ownedIds: Set<string>,
): boolean {
  const inSet = cards.filter((c) => c.themeId === themeId && c.rarity === rarity);
  if (inSet.length === 0) return false;
  return inSet.every((c) => ownedIds.has(c.id));
}

/**
 * Distinct (theme, rarity) pairs touched by the given card ids — the only
 * sets that could have just completed after adding those cards.
 */
export function raritySetsFor(cards: Card[], cardIds: string[]): RaritySet[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: RaritySet[] = [];
  for (const id of cardIds) {
    const card = byId.get(id);
    if (!card) continue;
    const key = `${card.themeId}|${card.rarity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ themeId: card.themeId, rarity: card.rarity });
  }
  return out;
}
