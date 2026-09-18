/**
 * What would a destructive seed operation actually destroy? (Inc23 FR4)
 *
 * Both `cards.theme_id -> themes.id` and `collections.card_id -> cards.id` are
 * ON DELETE CASCADE, so deleting pool rows destroys the children's collections
 * whether or not the deleting code mentions them. These previews resolve the
 * SAME predicate the pruners use, so the report can never be narrower than the
 * deletion it describes.
 */
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { themes, cards, collections, children } from "@/db/schema";
import type { SeedFile } from "./seed-schema";

export interface BlastRadius {
  themes: number;
  cards: number;
  /** Total collection rows destroyed — the number the operator must type back. */
  collectionRows: number;
  /** Per-child breakdown, by name, so the cost is legible (FR4 / Q10=A). */
  perChild: { name: string; rows: number }[];
  /** Named themes that would be deleted outright (prune only). */
  themeNames: string[];
  /** Named cards that would be deleted from surviving themes (prune only). */
  cardNames: { theme: string; card: string }[];
}

const EMPTY: BlastRadius = {
  themes: 0,
  cards: 0,
  collectionRows: 0,
  perChild: [],
  themeNames: [],
  cardNames: [],
};

/** Collection rows for the given card ids, grouped by child name. */
async function perChildRows(
  cardIds: string[],
): Promise<{ total: number; perChild: { name: string; rows: number }[] }> {
  if (cardIds.length === 0) return { total: 0, perChild: [] };
  const rows = await db
    .select({ id: children.id, name: children.name, rows: sql<number>`count(*)::int` })
    .from(collections)
    .innerJoin(children, eq(children.id, collections.childId))
    .where(inArray(collections.cardId, cardIds))
    // Grouped by id, not name: `children.name` carries no UNIQUE constraint, and
    // two same-named profiles must not silently collapse into one under-reported
    // line. The operator is being asked to weigh this number.
    .groupBy(children.id, children.name)
    .orderBy(children.name);
  return {
    total: rows.reduce((n, r) => n + r.rows, 0),
    perChild: rows.map(({ name, rows }) => ({ name, rows })),
  };
}

/**
 * `--publish --reset` deletes the ENTIRE pool, so every collection row is in
 * scope. Counted without a join for exactly that reason: there is no way for
 * this number to end up narrower than the delete.
 */
export async function previewReset(): Promise<BlastRadius> {
  const [themeRows, cardRows, all] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(themes),
    db.select({ n: sql<number>`count(*)::int` }).from(cards),
    db
      .select({ id: children.id, name: children.name, rows: sql<number>`count(*)::int` })
      .from(collections)
      .innerJoin(children, eq(children.id, collections.childId))
      .groupBy(children.id, children.name) // see perChildRows — names are not unique
      .orderBy(children.name),
  ]);
  return {
    themes: themeRows[0]?.n ?? 0,
    cards: cardRows[0]?.n ?? 0,
    collectionRows: all.reduce((n, r) => n + r.rows, 0),
    perChild: all.map(({ name, rows }) => ({ name, rows })),
    themeNames: [],
    cardNames: [],
  };
}

/**
 * What `--sync` would prune: themes absent from the seed file (cascading their
 * cards), plus cards absent from a surviving theme. Mirrors `deleteThemesNotIn`
 * / `deleteCardsNotIn` in writer.ts.
 */
export async function previewPrune(seed: SeedFile): Promise<BlastRadius> {
  const keepThemes = seed.themes.map((t) => t.name);

  const doomedThemes = await db
    .select({ id: themes.id, name: themes.name })
    .from(themes)
    .where(keepThemes.length ? notInArray(themes.name, keepThemes) : undefined);

  const doomedThemeIds = doomedThemes.map((t) => t.id);
  const cardsOfDoomedThemes = doomedThemeIds.length
    ? await db
        .select({ id: cards.id, name: cards.name, theme: themes.name })
        .from(cards)
        .innerJoin(themes, eq(themes.id, cards.themeId))
        .where(inArray(cards.themeId, doomedThemeIds))
    : [];

  // Cards dropped from a theme that itself survives.
  const doomedCards: { id: string; name: string; theme: string }[] = [];
  for (const theme of seed.themes) {
    const row = await db.query.themes.findFirst({ where: eq(themes.name, theme.name) });
    if (!row) continue; // new theme — nothing of it exists to prune
    const keep = theme.cards.map((c) => c.name);
    const doomed = await db
      .select({ id: cards.id, name: cards.name })
      .from(cards)
      .where(
        keep.length
          ? and(eq(cards.themeId, row.id), notInArray(cards.name, keep))
          : eq(cards.themeId, row.id),
      );
    doomedCards.push(...doomed.map((c) => ({ ...c, theme: theme.name })));
  }

  const allDoomedCards = [...cardsOfDoomedThemes, ...doomedCards];
  if (allDoomedCards.length === 0 && doomedThemes.length === 0) return EMPTY;

  const { total, perChild } = await perChildRows(allDoomedCards.map((c) => c.id));

  return {
    themes: doomedThemes.length,
    cards: allDoomedCards.length,
    collectionRows: total,
    perChild,
    themeNames: doomedThemes.map((t) => t.name),
    cardNames: allDoomedCards.map((c) => ({ theme: c.theme, card: c.name })),
  };
}

/** True when the operation would delete nothing at all. */
export function isEmpty(radius: BlastRadius): boolean {
  return radius.themes === 0 && radius.cards === 0;
}
