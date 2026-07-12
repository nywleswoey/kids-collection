import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { makeToken, verifyToken } from "./gate-token";

/**
 * Admin passcode gate (U4-FR1, Security). The passcode lives only in the
 * server env `ADMIN_PASSCODE` and is never sent to the client. A correct entry
 * issues a signed, httpOnly cookie holding an HMAC token (no secret inside),
 * signed with the existing `AUTH_SECRET`.
 */

export const GATE_COOKIE = "kc.admin.gate";
// Inc15 FR1: 20s idle window. middleware.ts slides it (re-issues the cookie on
// each valid /admin/* request), so the gate closes after 20s of no admin
// activity. Keep in sync with GATE_TTL_MS in middleware.ts.
export const GATE_TTL_MS = 20_000; // 20s
const TTL_MS = GATE_TTL_MS;

function secret(): string {
  return process.env.AUTH_SECRET ?? "";
}

/** SHA-256 digest of a string (fixed length → safe for constant-time compare). */
async function sha256(s: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Constant-time passcode check. Compares SHA-256 digests so timing does not
 * leak the passcode length or content. Denies when `ADMIN_PASSCODE` is unset.
 */
export async function verifyPasscode(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  return equalBytes(a, b);
}

/** Issue the gate cookie after a successful passcode entry. */
export async function setGateCookie(): Promise<void> {
  const token = await makeToken(Date.now() + TTL_MS, secret());
  const store = await cookies();
  store.set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

/** True if the current request carries a valid, unexpired gate cookie. */
export async function hasAdminGate(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(GATE_COOKIE)?.value;
  return verifyToken(token, secret(), Date.now());
}

/** Enforce the gate in admin pages/actions; redirect to unlock if missing. */
export async function requireAdminGate(): Promise<void> {
  if (!(await hasAdminGate())) redirect("/admin/unlock");
}
