import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { themes, cards, collections } from "@/db/schema";
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
  sourceUrl: string;
}): Promise<"inserted" | "skipped"> {
  if (!input.imageUrl) throw new Error("insertCardIfNew: missing imageUrl");
  if (await cardExists(input.themeId, input.name)) return "skipped";
  await db.insert(cards).values(input);
  return "inserted";
}

/**
 * Wipe all pool content (and every child's collection that references it) so a
 * reseed can rebuild from scratch — used for the Superheroes→Dinosaurs swap
 * (U4-FR4). Deletes in FK order: collections → cards → themes.
 */
export async function resetPool(): Promise<void> {
  await db.delete(collections);
  await db.delete(cards);
  await db.delete(themes);
}

// --- Delta sync helpers (U4): update in place, no image regeneration ---------

/**
 * Update an existing card's text metadata (eduText, sourceUrl) without touching
 * its image. Used by `seed --sync` to backfill facts/sources on cards that are
 * already published. Returns whether a row matched.
 */
export async function updateCardMeta(input: {
  themeId: string;
  name: string;
  eduText: string;
  sourceUrl: string;
}): Promise<"updated" | "missing"> {
  const res = await db
    .update(cards)
    .set({ eduText: input.eduText, sourceUrl: input.sourceUrl })
    .where(and(eq(cards.themeId, input.themeId), eq(cards.name, input.name)))
    .returning({ id: cards.id });
  return res.length ? "updated" : "missing";
}

/**
 * Prune themes whose names are not in `keepNames` (cascades their cards +
 * collections). Removes categories dropped from the seed (e.g. Superheroes).
 * Returns the number of themes deleted.
 */
export async function deleteThemesNotIn(keepNames: string[]): Promise<number> {
  const deleted =
    keepNames.length === 0
      ? await db.delete(themes).returning({ id: themes.id })
      : await db
          .delete(themes)
          .where(notInArray(themes.name, keepNames))
          .returning({ id: themes.id });
  return deleted.length;
}

/**
 * Within one theme, prune cards whose names are not in `keepNames` (cascades
 * their collection rows). Removes cards dropped from a kept theme.
 */
export async function deleteCardsNotIn(
  themeId: string,
  keepNames: string[],
): Promise<number> {
  const base = eq(cards.themeId, themeId);
  const deleted =
    keepNames.length === 0
      ? await db.delete(cards).where(base).returning({ id: cards.id })
      : await db
          .delete(cards)
          .where(and(base, notInArray(cards.name, keepNames)))
          .returning({ id: cards.id });
  return deleted.length;
}
