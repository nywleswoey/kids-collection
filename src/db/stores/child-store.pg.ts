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
    const col = sql.identifier(children[column].name);
    const result = await db.execute<{ balance: number; previous: number }>(sql`
      WITH prev AS (
        SELECT ${col} AS v FROM children WHERE id = ${childId} FOR UPDATE
      )
      UPDATE children SET ${col} = GREATEST(0, prev.v + ${delta}::integer)
      FROM prev
      WHERE children.id = ${childId}
      RETURNING children.${col} AS balance, prev.v AS previous
    `);
    const row = result.rows[0];
    if (!row) return null;
    const balance = Number(row.balance);
    return { balance, applied: balance - Number(row.previous) };
  },

  async readColumn(childId, column) {
    const [row] = await db
      .select({ v: children[column] })
      .from(children)
      .where(eq(children.id, childId));
    return row?.v ?? 0;
  },
};
