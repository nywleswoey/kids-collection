import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import type { ProfileStore } from "./profile-store";

/**
 * Postgres adapter for ProfileStore. Holds the children-row CRUD SQL that was
 * inlined across profiles/service and admin/service (the case-insensitive
 * ordering, the by-id read, the insert/update/delete). The only `server-only`
 * code behind the seam.
 */
export const pgProfileStore: ProfileStore = {
  list() {
    return db.select().from(children).orderBy(sql`lower(${children.name})`);
  },

  async find(id) {
    const row = await db.query.children.findFirst({ where: eq(children.id, id) });
    return row ?? null;
  },

  async create(data) {
    const [row] = await db.insert(children).values(data).returning();
    return row;
  },

  async update(id, data) {
    const [row] = await db
      .update(children)
      .set(data)
      .where(eq(children.id, id))
      .returning();
    return row ?? null;
  },

  async remove(id) {
    await db.delete(children).where(eq(children.id, id));
  },
};
