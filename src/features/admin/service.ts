import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children, cards, themes, collections } from "@/db/schema";
import { requireParent } from "@/features/auth/guard";
import type { AdminOverview, AdminChildRow } from "@/lib/types";

/** Parent oversight: each child's balance + distinct-owned count, plus pool counts. */
export async function getAdminOverview(): Promise<AdminOverview> {
  await requireParent();

  const [kids, [cardCount], [themeCount]] = await Promise.all([
    db.select().from(children),
    db.select({ n: sql<number>`count(*)::int` }).from(cards),
    db.select({ n: sql<number>`count(*)::int` }).from(themes),
  ]);

  const total = cardCount?.n ?? 0;

  const rows: AdminChildRow[] = await Promise.all(
    kids.map(async (c) => {
      const [owned] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(collections)
        .where(eq(collections.childId, c.id));
      return {
        child: { id: c.id, name: c.name, avatar: c.avatar, pullTokens: c.pullTokens },
        balance: c.pullTokens,
        owned: owned?.n ?? 0,
        total,
      };
    }),
  );

  return { children: rows, themes: themeCount?.n ?? 0, cards: total };
}
