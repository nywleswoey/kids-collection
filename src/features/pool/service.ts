import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { themes, cards } from "@/db/schema";
import type { Card, Theme } from "@/lib/types";

function toCard(row: typeof cards.$inferSelect): Card {
  return {
    id: row.id,
    themeId: row.themeId,
    name: row.name,
    rarity: row.rarity,
    imageUrl: row.imageUrl,
    eduText: row.eduText,
  };
}

/** Runtime pool reads — consumed by U4 (draw), U5 (binder), U6 (card UI). */
export async function listThemes(): Promise<Theme[]> {
  const rows = await db.select().from(themes);
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function listCards(themeId?: string): Promise<Card[]> {
  const rows = themeId
    ? await db.select().from(cards).where(eq(cards.themeId, themeId))
    : await db.select().from(cards);
  return rows.map(toCard);
}

export async function getCard(id: string): Promise<Card | null> {
  const row = await db.query.cards.findFirst({ where: eq(cards.id, id) });
  return row ? toCard(row) : null;
}
