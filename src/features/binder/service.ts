import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { listThemes, listCards } from "@/features/pool/service";
import { themeProgress } from "@/lib/logic";
import type { BinderView, CollectionEntry, ThemeSection } from "@/lib/types";

async function collectionMap(childId: string): Promise<Map<string, number>> {
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.childId, childId));
  return new Map(rows.map((r) => [r.cardId, r.count]));
}

/** Assemble the active child's binder: themes with owned/locked cards + progress (D1/D2). */
export async function getBinder(childId: string): Promise<BinderView> {
  const [themes, cards, owned] = await Promise.all([
    listThemes(),
    listCards(),
    collectionMap(childId),
  ]);

  const entries: CollectionEntry[] = [...owned.entries()].map(([cardId, count]) => ({
    childId,
    cardId,
    count,
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
export async function getCardDetail(
  childId: string,
  cardId: string,
): Promise<{ card: import("@/lib/types").Card; count: number } | null> {
  const row = await db.query.collections.findFirst({
    where: and(eq(collections.childId, childId), eq(collections.cardId, cardId)),
  });
  if (!row || row.count < 1) return null;
  const { getCard } = await import("@/features/pool/service");
  const card = await getCard(cardId);
  return card ? { card, count: row.count } : null;
}
