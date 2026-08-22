import "server-only";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import type { ArchivedChildRow, ProfileStore } from "./profile-store";

const byName = sql`lower(${children.name})`;

/**
 * Postgres adapter for ProfileStore. Holds the children-row CRUD SQL that was
 * inlined across profiles/service and admin/service (the case-insensitive
 * ordering, the by-id read, the insert/update). The only `server-only` code
 * behind the seam.
 *
 * Every read here carries an explicit `archived_at` predicate — there is no
 * unfiltered `SELECT … FROM children` in the adapter, so a new method cannot
 * accidentally inherit "sees everything" (#97).
 */
export const pgProfileStore: ProfileStore = {
  list() {
    return db.select().from(children).where(isNull(children.archivedAt)).orderBy(byName);
  },

  // The cast is discharged by the predicate on the very next line: every row this
  // returns has a non-null `archived_at`, and saying so here spares every caller
  // an assertion.
  listArchived() {
    return db
      .select()
      .from(children)
      .where(isNotNull(children.archivedAt))
      .orderBy(byName) as Promise<ArchivedChildRow[]>;
  },

  async find(id) {
    const row = await db.query.children.findFirst({
      where: and(eq(children.id, id), isNull(children.archivedAt)),
    });
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
      .where(and(eq(children.id, id), isNull(children.archivedAt)))
      .returning();
    return row ?? null;
  },

  // The `IS NULL` guard is what keeps a second archive from moving the stamp.
  async archive(id) {
    await db
      .update(children)
      .set({ archivedAt: new Date() })
      .where(and(eq(children.id, id), isNull(children.archivedAt)));
  },

  // Unlike `archive`'s, this guard changes nothing observable — clearing a stamp
  // that is already null is a no-op either way. It is here to keep the UPDATE from
  // touching a row it has nothing to say about.
  async restore(id) {
    await db
      .update(children)
      .set({ archivedAt: null })
      .where(and(eq(children.id, id), isNotNull(children.archivedAt)));
  },
};
