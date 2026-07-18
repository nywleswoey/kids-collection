import type { children } from "@/db/schema";
import { pickTicketsFromRow } from "@/features/pull/pick-tickets";
import type { Child } from "@/lib/types";

/**
 * Map a raw `children` DB row to the domain `Child` (pure). Single source of
 * truth for the row → Child projection shared by the profiles, active-profile,
 * and admin read paths.
 */
export function toChild(row: typeof children.$inferSelect): Child {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    pullTokens: row.pullTokens,
    epicTickets: row.epicTickets,
    luckyTickets: row.luckyTickets,
    pickTickets: pickTicketsFromRow(row),
  };
}
