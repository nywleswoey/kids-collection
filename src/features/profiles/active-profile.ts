import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { findChildRow } from "@/db/child-reads";
import { toChild } from "./child-mapper";
import type { Child } from "@/lib/types";

const COOKIE = "activeChildId";

/**
 * Active child is stored in an HTTP-only cookie and ALWAYS re-validated against
 * the DB server-side (U2-SEC-6/7). All children belong to the single parent, so
 * selection is a post-auth convenience, not a security boundary.
 */
export async function setActiveProfile(childId: string): Promise<void> {
  const exists = await findChildRow(childId);
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

/**
 * Resolve the active child, throwing if none is selected. Shared guard for
 * server actions that require an active player.
 */
export async function requireActiveChild(): Promise<Child> {
  const child = await getActiveChild();
  if (!child) throw new Error("No active profile");
  return child;
}

/**
 * Page-level guard for every /play/* screen: enforce parent access, then resolve
 * the active child, redirecting to the picker when none is selected (U2-SEC-7).
 */
export async function requireActivePlayer(): Promise<Child> {
  await requireParent();
  const child = await getActiveChild();
  if (!child) redirect("/play");
  return child;
}

/** Resolve the active child from the cookie, validated against the DB. */
export async function getActiveChild(): Promise<Child | null> {
  const store = await cookies();
  const childId = store.get(COOKIE)?.value;
  if (!childId) return null;

  const row = await findChildRow(childId);
  if (!row) return null;
  return toChild(row);
}

/**
 * The active-child cookie's raw value, UNVALIDATED — no DB round trip. Lets a
 * caller start other reads keyed on this id concurrently with the real gate
 * (`requireActiveChild`/`getActiveChild`, which still re-validates against the
 * DB as always) instead of waiting for it first. Safe only for read-only,
 * non-security-sensitive prefetches whose result is discarded if the gate
 * later finds no active child — never use this id for anything written or
 * returned to the client without going through the real gate too.
 */
export async function peekActiveChildId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}
