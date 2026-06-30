import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { themes, cards } from "@/db/schema";
import type { Rarity } from "@/lib/types";

/** Upsert a theme by name; returns its id (idempotent, U3-BR8). */
export async function upsertTheme(name: string): Promise<string> {
  const existing = await db.query.themes.findFirst({
    where: eq(themes.name, name),
  });
  if (existing) return existing.id;
  const [row] = await db.insert(themes).values({ name }).returning();
  return row.id;
}

/** True if a card with this theme+name already exists. */
export async function cardExists(
  themeId: string,
  name: string,
): Promise<boolean> {
  const row = await db.query.cards.findFirst({
    where: and(eq(cards.themeId, themeId), eq(cards.name, name)),
  });
  return !!row;
}

/**
 * Insert a card only if new (idempotent, BR8) and only with a valid imageUrl
 * (no-publish-without-image, U3-SEC-2/BR7).
 */
export async function insertCardIfNew(input: {
  themeId: string;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  eduText: string;
}): Promise<"inserted" | "skipped"> {
  if (!input.imageUrl) throw new Error("insertCardIfNew: missing imageUrl");
  if (await cardExists(input.themeId, input.name)) return "skipped";
  await db.insert(cards).values(input);
  return "inserted";
}
