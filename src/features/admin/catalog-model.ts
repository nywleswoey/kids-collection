import { orderCategoryCards } from "@/features/binder/card-order";
import type { BinderView, Card, Theme } from "@/lib/types";

/**
 * PURE: assemble the full pool as a completed binder (every card owned) for the
 * admin preview (U4-FR2). No I/O — property/unit testable.
 *
 * Sections are laid out by `orderCategoryCards` (#123) — the same pure order
 * `makeBinderService.getBinder` applies — so the preview shows a category
 * exactly as the child's binder does rather than in `listCards` heap order.
 */
export function buildCatalog(themes: Theme[], cards: Card[]): BinderView {
  const sections = themes.map((theme) => {
    const themeCards = cards.filter((c) => c.themeId === theme.id);
    return {
      theme,
      cards: orderCategoryCards(
        themeCards.map((card) => ({ card, owned: true, count: 1 })),
      ),
      progress: {
        owned: themeCards.length,
        total: themeCards.length,
        complete: themeCards.length > 0,
      },
    };
  });
  return {
    themes: sections,
    totalOwned: cards.length,
    totalCards: cards.length,
  };
}
