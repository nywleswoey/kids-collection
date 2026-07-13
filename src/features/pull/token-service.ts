import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import { requireParent } from "@/features/auth/guard";
import { pickTicketColumn } from "./pick-tickets";
import type { EggTicket, Rarity } from "@/lib/types";

const TICKET_COL = {
  epic: children.epicTickets,
  lucky: children.luckyTickets,
} as const;

/** Current pull-token balance (F2). */
export async function getBalance(childId: string): Promise<number> {
  const row = await db.query.children.findFirst({
    where: eq(children.id, childId),
    columns: { pullTokens: true },
  });
  return row?.pullTokens ?? 0;
}

/** Current special egg-ticket balances (Inc9 FR4). */
export async function getSpecialBalances(
  childId: string,
): Promise<{ epic: number; lucky: number }> {
  const row = await db.query.children.findFirst({
    where: eq(children.id, childId),
    columns: { epicTickets: true, luckyTickets: true },
  });
  return { epic: row?.epicTickets ?? 0, lucky: row?.luckyTickets ?? 0 };
}

/**
 * Grant/adjust a special egg ticket (Inc9 FR4). Parent-only, clamped >= 0.
 * Returns the new balance for that ticket kind.
 */
export async function grantSpecial(
  childId: string,
  kind: EggTicket,
  delta: number,
): Promise<number> {
  await requireParent();
  if (!Number.isInteger(delta)) throw new Error("grantSpecial: delta must be an integer");

  const col = TICKET_COL[kind];
  const [row] = await db
    .update(children)
    .set({ [kind === "epic" ? "epicTickets" : "luckyTickets"]: sql`GREATEST(0, ${col} + ${delta})` })
    .where(eq(children.id, childId))
    .returning({ balance: col });

  if (!row) throw new Error("grantSpecial: child not found");
  return row.balance;
}

/**
 * Grant/adjust a rarity-pick ticket (Inc16 FR3). Parent-only, clamped >= 0.
 * Returns the new count for that rarity.
 */
export async function grantPickTicket(
  childId: string,
  rarity: Rarity,
  delta: number,
): Promise<number> {
  await requireParent();
  if (!Number.isInteger(delta)) throw new Error("grantPickTicket: delta must be an integer");

  const key = pickTicketColumn(rarity);
  const col = children[key];
  const [row] = await db
    .update(children)
    .set({ [key]: sql`GREATEST(0, ${col} + ${delta})` })
    .where(eq(children.id, childId))
    .returning({ balance: col });

  if (!row) throw new Error("grantPickTicket: child not found");
  return row.balance;
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
