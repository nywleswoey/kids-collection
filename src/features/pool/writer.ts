import { and, eq, notInArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { themes, cards, collections } from "@/db/schema";
import type { Rarity } from "@/lib/types";

/**
 * Delete rows from `table` whose `nameCol` is not in `keepNames`, optionally
 * scoped by `base`. An empty `keepNames` deletes every (scoped) row. Returns the
 * number of rows deleted. Shared by the theme/card delta-sync pruners.
 */
async function pruneNotIn(
  table: PgTable,
  nameCol: PgColumn,
  idCol: PgColumn,
  keepNames: string[],
  base?: SQL,
): Promise<number> {
  const keep = keepNames.length === 0 ? undefined : notInArray(nameCol, keepNames);
  const where = base && keep ? and(base, keep) : (base ?? keep);
  const deleted = await db.delete(table).where(where).returning({ id: idCol });
  return deleted.length;
}

/**
 * Upsert a theme by name; returns its id (idempotent, U3-BR8). `sortOrder` is
 * the theme's position in seed/cards.json and is refreshed on every sync, so
 * reordering that file reorders the pull screen's chips (Inc21 FR2).
 */
export async function upsertTheme(
  name: string,
  sortOrder: number,
): Promise<string> {
  const existing = await db.query.themes.findFirst({
    where: eq(themes.name, name),
  });
  if (existing) {
    if (existing.sortOrder !== sortOrder) {
      await db.update(themes).set({ sortOrder }).where(eq(themes.id, existing.id));
    }
    return existing.id;
  }
  const [row] = await db.insert(themes).values({ name, sortOrder }).returning();
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

/** Thrown when a pool reset would destroy collection rows (Inc23 FR1). */
export class PoolResetBlockedError extends Error {
  constructor(readonly ownedRows: number) {
    super(
      `resetPool refused: ${ownedRows} collection row(s) exist. Deleting cards or themes ` +
        `cascades into collections, so this would destroy children's cards. A pool reset and ` +
        `wiping the children's collections are different operations and must stay different.`,
    );
    this.name = "PoolResetBlockedError";
  }
}

/** Total rows in `collections` — the blast radius of any pool-wide delete. */
export async function countCollections(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(collections);
  return row?.n ?? 0;
}

/**
 * Wipe the card pool so a reseed can rebuild from scratch (U4-FR4). Deletes
 * cards then themes — NEVER collections.
 *
 * Refuses outright when any collection row exists (Inc23 FR1). That check is not
 * belt-and-braces: `cards.theme_id` and `collections.card_id` are both ON DELETE
 * CASCADE, so deleting the pool destroys every child's cards regardless of what
 * this function names. Since a reset deletes every card, "rows in scope" is
 * simply "any row", which is why the check cannot be narrower than the delete.
 *
 * There is deliberately NO override parameter. Re-adding one re-arms the exact
 * defect this exists to remove — see "What Must NOT Change" in the feature's
 * vision document. A caller that genuinely wants both operations calls both.
 */
export async function resetPool(): Promise<void> {
  const owned = await countCollections();
  if (owned > 0) throw new PoolResetBlockedError(owned);
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
  return pruneNotIn(themes, themes.name, themes.id, keepNames);
}

/**
 * Within one theme, prune cards whose names are not in `keepNames` (cascades
 * their collection rows). Removes cards dropped from a kept theme.
 */
export async function deleteCardsNotIn(
  themeId: string,
  keepNames: string[],
): Promise<number> {
  return pruneNotIn(cards, cards.name, cards.id, keepNames, eq(cards.themeId, themeId));
}
