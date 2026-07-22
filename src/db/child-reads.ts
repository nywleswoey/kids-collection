import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { children } from "./schema";

/** The child row for an id (or undefined) — the by-id read shared by the
 *  active-profile and profiles-service paths. */
export function findChildRow(id: string) {
  return db.query.children.findFirst({ where: eq(children.id, id) });
}
