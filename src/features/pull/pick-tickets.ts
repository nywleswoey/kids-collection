import { RARITIES, type Rarity } from "@/lib/types";

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
