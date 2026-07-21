import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, GATE_TTL_MS, makeToken, verifyGateToken } from "./gate-token";
import { sha256, timingSafeEqual } from "@/lib/webcrypto";
import { env } from "@/lib/env";

/**
 * Admin passcode gate (U4-FR1, Security). The passcode lives only in the
 * server env `ADMIN_PASSCODE` and is never sent to the client. A correct entry
 * issues a signed, httpOnly cookie holding an HMAC token (no secret inside),
 * signed with the existing `AUTH_SECRET`. The cookie name + TTL live in the
 * edge-safe gate-token module, shared with middleware.ts.
 */

/**
 * Constant-time passcode check. Compares SHA-256 digests so timing does not
 * leak the passcode length or content. Denies when `ADMIN_PASSCODE` is unset.
 */
export async function verifyPasscode(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  return timingSafeEqual(a, b);
}

/** Issue the gate cookie after a successful passcode entry. */
export async function setGateCookie(): Promise<void> {
  const token = await makeToken(Date.now() + GATE_TTL_MS, env.authSecret);
  const store = await cookies();
  store.set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(GATE_TTL_MS / 1000),
  });
}

/** True if the current request carries a valid, unexpired gate cookie. */
export async function hasAdminGate(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(GATE_COOKIE)?.value;
  return verifyGateToken(token, env.authSecret, Date.now());
}

/** Enforce the gate in admin pages/actions; redirect to unlock if missing. */
export async function requireAdminGate(): Promise<void> {
  if (!(await hasAdminGate())) redirect("/admin/unlock");
}
