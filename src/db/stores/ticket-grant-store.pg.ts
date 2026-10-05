import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ticketGrants } from "@/db/schema";
import type { TicketGrantStore } from "./ticket-grant-store";

export const pgTicketGrantStore: TicketGrantStore = {
  async record(childId, column, amount, source, grantedBy) {
    await db.insert(ticketGrants).values({ childId, column, amount, source, grantedBy });
  },

  recentForChild(childId, limit) {
    return db
      .select()
      .from(ticketGrants)
      .where(eq(ticketGrants.childId, childId))
      .orderBy(desc(ticketGrants.createdAt))
      .limit(limit);
  },
};
