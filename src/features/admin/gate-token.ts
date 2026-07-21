/**
 * Admin gate token + shared gate constants (U4-FR1). Edge-safe (no server-only)
 * so both middleware.ts (edge) and gate.ts (server) can import it. A thin adapter
 * over the shared HMAC primitive in lib/signed-token — the token carries only an
 * expiry, no passcode or secret material.
 *
 * `secret` and `nowMs` are passed in (not read from env/clock) so these stay
 * pure and testable.
 */

import { signToken, verifyToken, isSignedPayload } from "@/lib/signed-token";

/** Admin gate cookie name (single source of truth for middleware + gate.ts). */
export const GATE_COOKIE = "kc.admin.gate";

/** Inc15 FR1: 20s idle window, slid on each valid /admin/* request. */
export const GATE_TTL_MS = 20_000;

/** Build a signed token that expires at `expiresAtMs`. */
export function makeToken(expiresAtMs: number, secret: string): Promise<string> {
  return signToken({ exp: Math.floor(expiresAtMs) }, secret);
}

/** True iff `token` has a valid signature for `secret` AND has not expired. */
export async function verifyGateToken(
  token: string | undefined | null,
  secret: string,
  nowMs: number,
): Promise<boolean> {
  return (await verifyToken(token, secret, nowMs, isSignedPayload)) !== null;
}
