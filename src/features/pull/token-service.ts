import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import { requireParent } from "@/features/auth/guard";

/** Current pull-token balance (F2). */
export async function getBalance(childId: string): Promise<number> {
  const row = await db.query.children.findFirst({
    where: eq(children.id, childId),
    columns: { pullTokens: true },
  });
  return row?.pullTokens ?? 0;
}

/**
 * Grant/adjust tokens (F1). Parent-only. Balance clamped >= 0 (U4-BR8).
 * Returns the new balance.
 */
export async function grant(childId: string, delta: number): Promise<number> {
  await requireParent();
  if (!Number.isInteger(delta)) throw new Error("grant: delta must be an integer");

  const [row] = await db
    .update(children)
    .set({ pullTokens: sql`GREATEST(0, ${children.pullTokens} + ${delta})` })
    .where(eq(children.id, childId))
    .returning({ balance: children.pullTokens });

  if (!row) throw new Error("grant: child not found");
  return row.balance;
}
