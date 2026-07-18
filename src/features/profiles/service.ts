import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { children } from "@/db/schema";
import { requireParent } from "@/features/auth/guard";
import { toChild } from "./child-mapper";
import { AVATAR_KEYS } from "@/lib/avatars";
import type { Child } from "@/lib/types";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  avatar: z.enum(AVATAR_KEYS as [string, ...string[]]),
});

/**
 * All child profiles, ordered case-insensitively by name (Inc8 FR4). Stable
 * order so a token grant (an UPDATE) never re-shuffles the list.
 */
export async function listChildren(): Promise<Child[]> {
  const rows = await db
    .select()
    .from(children)
    .orderBy(sql`lower(${children.name})`);
  return rows.map(toChild);
}

/** Single child profile, or null. */
export async function getChild(id: string): Promise<Child | null> {
  const row = await db.query.children.findFirst({ where: eq(children.id, id) });
  return row ? toChild(row) : null;
}

export async function createChild(input: {
  name: string;
  avatar: string;
}): Promise<Child> {
  await requireParent(); // U2-SEC-5
  const data = profileSchema.parse(input);
  const [row] = await db.insert(children).values(data).returning();
  return toChild(row);
}

export async function updateChild(
  id: string,
  input: { name: string; avatar: string },
): Promise<Child> {
  await requireParent();
  const data = profileSchema.parse(input);
  const [row] = await db
    .update(children)
    .set(data)
    .where(eq(children.id, id))
    .returning();
  if (!row) throw new Error("updateChild: not found");
  return toChild(row);
}

/** Remove a child; cascades to their collection entries (BR14). */
export async function removeChild(id: string): Promise<void> {
  await requireParent();
  await db.delete(children).where(eq(children.id, id));
}
