import type { TicketGrantRow } from "@/db/schema";
import type { TicketGrantStore } from "./ticket-grant-store";

/** In-memory TicketGrantStore. `createdAt` is strictly increasing per record
 *  call (not merely same-millisecond `Date.now()`) so `recentForChild`'s
 *  newest-first order is deterministic even in a tight test loop. */
export function inMemoryTicketGrantStore(): TicketGrantStore {
  const rows: TicketGrantRow[] = [];
  let seq = 0;

  return {
    async record(childId, column, amount, source, grantedBy) {
      rows.push({
        id: `g${++seq}`,
        childId,
        column,
        amount,
        source,
        grantedBy,
        createdAt: new Date(Date.now() + seq),
      });
    },

    async recentForChild(childId, limit) {
      return rows
        .filter((r) => r.childId === childId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },
  };
}
