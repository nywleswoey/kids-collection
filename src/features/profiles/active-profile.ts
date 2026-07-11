import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import type { Child } from "@/lib/types";

const COOKIE = "activeChildId";

/**
 * Active child is stored in an HTTP-only cookie and ALWAYS re-validated against
 * the DB server-side (U2-SEC-6/7). All children belong to the single parent, so
 * selection is a post-auth convenience, not a security boundary.
 */
export async function setActiveProfile(childId: string): Promise<void> {
  const exists = await db.query.children.findFirst({
    where: eq(children.id, childId),
  });
  if (!exists) throw new Error("setActiveProfile: unknown child");

  const store = await cookies();
  store.set(COOKIE, childId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveProfile(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Resolve the active child from the cookie, validated against the DB. */
export async function getActiveChild(): Promise<Child | null> {
  const store = await cookies();
  const childId = store.get(COOKIE)?.value;
  if (!childId) return null;

  const row = await db.query.children.findFirst({
    where: eq(children.id, childId),
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    pullTokens: row.pullTokens,
    epicTickets: row.epicTickets,
    luckyTickets: row.luckyTickets,
  };
}
