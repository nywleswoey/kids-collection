import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth/config";
import { isParentEmail, parseAllowlist } from "./policy";

export interface ParentIdentity {
  email: string;
}

/** Resolve the authenticated, allowlisted parent — or null. Server-only. */
export async function getParent(): Promise<ParentIdentity | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (email && isParentEmail(email, parseAllowlist(process.env.PARENT_EMAILS))) {
    return { email };
  }
  return null;
}

/**
 * Enforce parent access. Redirects to /signin if not an allowlisted parent.
 * Call at the top of every parent/admin page and Server Action (U2-SEC-2).
 */
export async function requireParent(): Promise<ParentIdentity> {
  const parent = await getParent();
  if (!parent) redirect("/signin");
  return parent;
}
