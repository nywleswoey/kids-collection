import { RARITIES, type BinderCard, type ThemeSection } from "@/lib/types";

/**
 * Which card's art fronts a category tile in the picker (#107). PURE →
 * property-tested.
 *
 * `Theme` is `{ id, name }` — it carries no art of its own, so a picture-first
 * picker has to borrow one from the category's cards. It borrows the child's
 * **rarest owned** card: the tile then shows off the best thing they pulled
 * there, and it changes as they collect, so the picker is a record of their
 * own galaxy rather than 16 fixed pictures.
 *
 * A category with nothing owned returns `null`, and the tile falls back to a
 * neutral placeholder. That is deliberate and load-bearing: `CardSlot` renders
 * unowned cards as `❔` with no rarity hint (U5-Q5) precisely so unearned art
 * stays unearned. A dimmed real thumbnail on the tile would leak exactly what
 * the locked slot is careful not to show.
 *
 * Ties inside a rarity resolve to the first card in catalog order, so the cover
 * does not shuffle between renders.
 */
export function coverCard(section: ThemeSection): BinderCard | null {
  for (const rarity of [...RARITIES].reverse()) {
    const hit = section.cards.find((c) => c.owned && c.card.rarity === rarity);
    if (hit) return hit;
  }
  return null;
}
