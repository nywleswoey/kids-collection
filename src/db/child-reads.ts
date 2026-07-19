import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { children } from "./schema";

/**
 * The single child row for an id, or undefined if absent. Single source of truth
 * for the by-id `children.findFirst` read shared by the active-profile and
 * profiles-service paths; callers map the row via toChild or use it as an
 * existence check.
 */
export function findChildRow(id: string) {
  return db.query.children.findFirst({ where: eq(children.id, id) });
}
