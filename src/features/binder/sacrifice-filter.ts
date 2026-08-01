import type { BinderCard, ThemeSection } from "@/lib/types";
import { SACRIFICE_MIN } from "@/features/pull/sacrifice";

/**
 * Galaxy "ready to sacrifice" filter (Inc22 FR9–FR11). PURE — property-tested.
 *
 * Eligibility is deliberately expressed through `SACRIFICE_MIN`, the same
 * constant the card detail page gates `SacrificePanel` on. That equality is the
 * whole point: a card surfaced here must always open a detail page that will
 * actually offer the sacrifice, so the filter can never lead to a dead end.
 */

/** True when this pile can be burned while still keeping a copy. */
export function canSacrifice(entry: BinderCard): boolean {
  return entry.owned && entry.count >= SACRIFICE_MIN;
}

/**
 * Every burnable card across ALL sections. Global by design (FR11): it ignores
 * the category and rarity chips so "show me everything I can burn" is always
 * the complete answer, never a filtered subset the child could misread as all
 * they have.
 */
export function sacrificeReady(sections: ThemeSection[]): BinderCard[] {
  return sections.flatMap((section) => section.cards.filter(canSacrifice));
}
