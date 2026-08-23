import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { children } from "./schema";

/**
 * The ACTIVE child row for an id (or undefined) — the by-id read shared by the
 * active-profile and profiles-service paths.
 *
 * Archived children read as absent (#97). That is what makes an `activeChildId`
 * cookie stop working the moment the profile is archived: `getActiveChild`
 * returns null and `requireActivePlayer` redirects to the picker, where the
 * profile is likewise gone. Mirrors the `archived_at IS NULL` predicate on
 * `pgProfileStore.find`.
 */
export function findChildRow(id: string) {
  return db.query.children.findFirst({
    where: and(eq(children.id, id), isNull(children.archivedAt)),
  });
}
