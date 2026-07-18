import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import { requireParent } from "@/features/auth/guard";
import { pickTicketColumn } from "./pick-tickets";
import type { EggTicket, Rarity } from "@/lib/types";

/** Children columns holding a grantable, clamp-≥0 integer balance. */
type GrantableColumn =
  | "pullTokens"
  | "epicTickets"
  | "luckyTickets"
  | "commonPickTickets"
  | "rarePickTickets"
  | "epicPickTickets"
  | "legendaryPickTickets";

/**
 * Parent-only clamped grant/adjust of one integer children column (U4-BR8):
 * validate the delta, apply GREATEST(0, col + delta) atomically, and return the
 * new balance. Shared body of grant / grantSpecial / grantPickTicket.
 */
async function grantColumn(
  childId: string,
  key: GrantableColumn,
  delta: number,
  label: string,
): Promise<number> {
  await requireParent();
  if (!Number.isInteger(delta)) throw new Error(`${label}: delta must be an integer`);

  const col = children[key];
  const [row] = await db
    .update(children)
    .set({ [key]: sql`GREATEST(0, ${col} + ${delta})` })
    .where(eq(children.id, childId))
    .returning({ balance: col });

  if (!row) throw new Error(`${label}: child not found`);
  return row.balance;
}

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
  return grantColumn(childId, kind === "epic" ? "epicTickets" : "luckyTickets", delta, "grantSpecial");
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
  return grantColumn(childId, pickTicketColumn(rarity), delta, "grantPickTicket");
}

/**
 * Grant/adjust tokens (F1). Parent-only. Balance clamped >= 0 (U4-BR8).
 * Returns the new balance.
 */
export async function grant(childId: string, delta: number): Promise<number> {
  return grantColumn(childId, "pullTokens", delta, "grant");
}
