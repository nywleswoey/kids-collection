import "server-only";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { tradeEvents } from "@/db/schema";
import type { TradeEventStore } from "./trade-event-store";

export const pgTradeEventStore: TradeEventStore = {
  async record({ aChildId, aCardId, bChildId, bCardId }) {
    await db.insert(tradeEvents).values({ aChildId, aCardId, bChildId, bCardId });
  },

  recentForChild(childId, limit) {
    return db
      .select()
      .from(tradeEvents)
      .where(or(eq(tradeEvents.aChildId, childId), eq(tradeEvents.bChildId, childId)))
      .orderBy(desc(tradeEvents.createdAt))
      .limit(limit);
  },
};
