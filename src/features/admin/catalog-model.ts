import type { BinderView, Card, Theme } from "@/lib/types";

/**
 * PURE: assemble the full pool as a completed binder (every card owned) for the
 * admin preview (U4-FR2). No I/O — property/unit testable.
 */
export function buildCatalog(themes: Theme[], cards: Card[]): BinderView {
  const sections = themes.map((theme) => {
    const themeCards = cards.filter((c) => c.themeId === theme.id);
    return {
      theme,
      cards: themeCards.map((card) => ({ card, owned: true, count: 1 })),
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
