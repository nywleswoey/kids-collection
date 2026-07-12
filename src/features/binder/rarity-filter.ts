import { RARITIES, type Rarity } from "@/lib/types";
import type { BinderCard, ThemeSection } from "@/lib/types";

/**
 * Pure galaxy rarity helpers (Inc13 FR1/FR2). No I/O → property-tested.
 * Counts are owned-only (Q4.2=A); the filtered view keeps locked cards so the
 * child sees what's left to collect (Q4.3=B).
 */

export type RarityCount = Record<Rarity, number>;

/** Owned-only tally per rarity across the given sections (respects whatever
 * category filtering the caller already applied — Q4.1 AND-filter, Q4.2=A). */
export function countOwnedByRarity(sections: ThemeSection[]): RarityCount {
  const counts: RarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const section of sections) {
    for (const bc of section.cards) {
      if (bc.owned) counts[bc.card.rarity] += 1;
    }
  }
  return counts;
}

/** Filter a section's cards to one rarity; `null` → all rarities. Keeps
 * owned AND locked cards of that rarity (Q4.3=B). */
export function filterCardsByRarity(
  cards: BinderCard[],
  rarity: Rarity | null,
): BinderCard[] {
  if (rarity === null) return cards;
  return cards.filter((bc) => bc.card.rarity === rarity);
}

/** Sum of all owned across rarities (for an "All" chip / invariant checks). */
export function totalOwned(counts: RarityCount): number {
  return RARITIES.reduce((sum, r) => sum + counts[r], 0);
}
