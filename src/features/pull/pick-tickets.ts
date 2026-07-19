import { RARITIES, type EggTicket, type Rarity } from "@/lib/types";

/**
 * Rarity-pick ticket helpers (Inc16 FR2). Maps the four per-rarity columns to a
 * `Record<Rarity, number>` and back to the column name for atomic updates.
 */

type PickTicketRow = {
  commonPickTickets: number;
  rarePickTickets: number;
  epicPickTickets: number;
  legendaryPickTickets: number;
};

const COLUMN: Record<Rarity, keyof PickTicketRow> = {
  common: "commonPickTickets",
  rare: "rarePickTickets",
  epic: "epicPickTickets",
  legendary: "legendaryPickTickets",
};

/** Drizzle column key for a rarity's pick-ticket counter. */
export function pickTicketColumn(rarity: Rarity): keyof PickTicketRow {
  return COLUMN[rarity];
}

/** Drizzle column key for a special egg ticket's counter (Inc9 FR4). */
export function specialTicketColumn(kind: EggTicket): BalanceColumn {
  return kind === "epic" ? "epicTickets" : "luckyTickets";
}

/**
 * Children columns that hold a grantable/spendable integer balance: a normal
 * pull token, either special egg ticket, or one of the four rarity-pick tickets.
 * Shared by token-service (grant) and pull-service (spend), which drive atomic
 * per-column updates off the string key.
 */
export type BalanceColumn =
  | "pullTokens"
  | "epicTickets"
  | "luckyTickets"
  | keyof PickTicketRow;

/** Build the `Record<Rarity, number>` view from a children row. */
export function pickTicketsFromRow(row: PickTicketRow): Record<Rarity, number> {
  return {
    common: row.commonPickTickets,
    rare: row.rarePickTickets,
    epic: row.epicPickTickets,
    legendary: row.legendaryPickTickets,
  };
}

/** True if the child holds at least one pick ticket of any rarity. */
export function hasAnyPickTicket(tickets: Record<Rarity, number>): boolean {
  return RARITIES.some((r) => tickets[r] > 0);
}
