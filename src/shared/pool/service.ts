import "server-only";
import { asc, eq, sql } from "drizzle-orm";
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
    sourceUrl: row.sourceUrl,
  };
}

/** Runtime pool reads — consumed by U4 (draw), U5 (binder), U6 (card UI). */
/**
 * Every theme, oldest → newest (Inc21 FR1) — the pull screen's "recency", and
 * since #107 the binder hub's tile order too.
 *
 * ── The order is TOTAL, and that is this function's job ─────────────────────
 * #140 kept `sort_order` as the hub's order deliberately, and then found the
 * order was not actually pinned. `themes.sort_order` is
 * `integer NOT NULL DEFAULT 0` with **no unique constraint**, so `ORDER BY
 * sort_order` alone leaves ties to Postgres heap order — the same unspecified
 * order [#123](../binder/card-order.ts) found under the 30-card grid, one level
 * up. Distinct in practice today, because `upsertTheme` writes the seed array's
 * index; guaranteed by nothing.
 *
 * So ties break all the way down to the id, the rule
 * [#109](../trade/board.ts `orderByValue`) and #123 both took: a comparator that
 * can never return 0 for two distinct rows. `Theme` is `{ id, name }` — the
 * client never sees `sort_order` — so array position IS the order, and this
 * `ORDER BY` is the only place it can be made total. Fixing it here fixes it for
 * every consumer at once: the hub, `recentCategories` (whose doc states
 * "MUST already be ordered oldest → newest" as a precondition nothing enforced),
 * admin and rewards.
 *
 * Both text clauses take `COLLATE "C"` for the same reason #123 compares by
 * code unit rather than `localeCompare`: an order rendered once on the server
 * has to be the same order everywhere, and the cluster's collation is not a
 * constant. `themes.id` is `text` (defaulted from `gen_random_uuid()`, not a
 * uuid column), so it collates too.
 *
 * `themes.name` is UNIQUE, so the id clause is unreachable on real rows — it is
 * there so the comparator is total for a hand-seeded fixture as well, exactly
 * the role #123's id clause plays under a schema rule that names are unique.
 *
 * No tile a child knows moves — with `sort_order` distinct, every tie-break is
 * unreachable on real data.
 */
export async function listThemes(): Promise<Theme[]> {
  const rows = await db
    .select()
    .from(themes)
    .orderBy(
      asc(themes.sortOrder),
      sql`${themes.name} COLLATE "C"`,
      sql`${themes.id} COLLATE "C"`,
    );
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
