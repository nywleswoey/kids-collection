import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import { themeProgress } from "@/lib/logic";
import type {
  BinderView,
  Card,
  CollectionEntry,
  ThemeSection,
} from "@/lib/types";

export interface BinderDeps {
  collections: CollectionStore;
  catalog: Catalog;
}

/**
 * Binder read model (U5), parameterized by its ports. Pure assembly over the
 * collection entries + catalog pool; the owned/locked/progress computation is
 * unit-testable with fakes. Prod wiring: `service.prod.ts`.
 */
export function makeBinderService({ collections, catalog }: BinderDeps) {
  /** Assemble the active child's binder: themes with owned/locked cards + progress (D1/D2). */
  async function getBinder(childId: string): Promise<BinderView> {
    const [themes, cards, entryRows] = await Promise.all([
      catalog.listThemes(),
      catalog.listCards(),
      collections.entries(childId),
    ]);
    const owned = new Map(entryRows.map((e) => [e.cardId, e.count]));

    const entries: CollectionEntry[] = entryRows.map((e) => ({
      childId,
      cardId: e.cardId,
      count: e.count,
    }));

    let totalOwned = 0;
    const sections: ThemeSection[] = themes.map((theme) => {
      const themeCards = cards.filter((c) => c.themeId === theme.id);
      const binderCards = themeCards.map((card) => {
        const count = owned.get(card.id) ?? 0;
        if (count > 0) totalOwned += 1;
        return { card, owned: count > 0, count };
      });
      const prog = themeProgress(
        entries,
        themeCards.map((c) => c.id),
      );
      return {
        theme,
        cards: binderCards,
        progress: { owned: prog.owned, total: prog.total, complete: prog.complete },
      };
    });

    return { themes: sections, totalOwned, totalCards: cards.length };
  }

  /** Card detail — only if the child owns it (U5-BR4/SEC-2). */
  async function getCardDetail(
    childId: string,
    cardId: string,
  ): Promise<{ card: Card; count: number } | null> {
    const count = await collections.cardCount(childId, cardId);
    if (count < 1) return null;
    const card = await catalog.getCard(cardId);
    return card ? { card, count } : null;
  }

  return { getBinder, getCardDetail };
}

export type BinderService = ReturnType<typeof makeBinderService>;
