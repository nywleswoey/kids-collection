import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import type { ChildStore } from "./child-store";

/**
 * Postgres adapter for ChildStore. Holds the per-column atomic SQL that was
 * inlined across pull-service (`spendOneColumn`, `refundPullToken`, the sacrifice
 * ticket bump) and token-service (`grantColumn`). The only `server-only` code
 * behind the seam.
 */
export const pgChildStore: ChildStore = {
  async spendOne(childId, column) {
    const col = children[column];
    const [row] = await db
      .update(children)
      .set({ [column]: sql`${col} - 1` })
      .where(and(eq(children.id, childId), gte(col, 1)))
      .returning({ pullTokens: children.pullTokens });
    return row ? row.pullTokens : null;
  },

  async incrementColumn(childId, column, by) {
    const col = children[column];
    await db
      .update(children)
      .set({ [column]: sql`${col} + ${by}` })
      .where(eq(children.id, childId));
  },

  async clampedGrant(childId, column, delta) {
    const col = children[column];
    const [row] = await db
      .update(children)
      .set({ [column]: sql`GREATEST(0, ${col} + ${delta})` })
      .where(eq(children.id, childId))
      .returning({ balance: col });
    return row ? row.balance : null;
  },

  async readColumn(childId, column) {
    const [row] = await db
      .select({ v: children[column] })
      .from(children)
      .where(eq(children.id, childId));
    return row?.v ?? 0;
  },
};
