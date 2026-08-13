import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminCredentials } from "@/db/schema";
import type { AdminCredentialStore } from "./credential-store";

/**
 * Postgres adapter for AdminCredentialStore. The only `server-only` code behind
 * this seam.
 */
export const pgAdminCredentialStore: AdminCredentialStore = {
  listByParent(parentId) {
    return db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.parentId, parentId))
      .orderBy(desc(adminCredentials.createdAt));
  },

  async findByCredentialId(credentialId) {
    const row = await db.query.adminCredentials.findFirst({
      where: eq(adminCredentials.credentialId, credentialId),
    });
    return row ?? null;
  },

  async create(data) {
    // onConflictDoNothing turns the unique-index race into an empty returning()
    // rather than a driver error, matching the port's null-on-duplicate contract.
    const [row] = await db
      .insert(adminCredentials)
      .values({ ...data, transports: data.transports.join(",") })
      .onConflictDoNothing({ target: adminCredentials.credentialId })
      .returning();
    return row ?? null;
  },

  async recordUse(credentialId, counter, usedAt) {
    await db
      .update(adminCredentials)
      .set({ counter, lastUsedAt: usedAt })
      .where(eq(adminCredentials.credentialId, credentialId));
  },

  async remove(id) {
    await db.delete(adminCredentials).where(eq(adminCredentials.id, id));
  },
};
