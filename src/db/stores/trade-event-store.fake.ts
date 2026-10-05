import type { TradeEventRow } from "@/db/schema";
import type { TradeEventStore } from "./trade-event-store";

/** In-memory TradeEventStore. `createdAt` is strictly increasing per record
 *  call so `recentForChild`'s newest-first order is deterministic. */
export function inMemoryTradeEventStore(): TradeEventStore {
  const rows: TradeEventRow[] = [];
  let seq = 0;

  return {
    async record({ aChildId, aCardId, bChildId, bCardId }) {
      rows.push({
        id: `tr${++seq}`,
        aChildId,
        aCardId,
        bChildId,
        bCardId,
        createdAt: new Date(Date.now() + seq),
      });
    },

    async recentForChild(childId, limit) {
      return rows
        .filter((r) => r.aChildId === childId || r.bChildId === childId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },
  };
}
