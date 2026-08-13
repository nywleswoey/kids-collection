/**
 * Authentication-freshness predicate (parent-gate-auth). PURE — no `server-only`,
 * so it stays unit-testable, matching how `gate-token.ts` splits the pure HMAC
 * primitive out of the server-only gate.
 */

/**
 * How recent a Google authentication must be to enrol an admin passkey.
 *
 * Enrolment is the one action that mints a lasting key to the admin gate, so a
 * live session is not enough on its own: an unattended logged-in device would
 * otherwise be a permanent bypass for anyone who picks it up.
 */
export const FRESH_AUTH_WINDOW_MS = 5 * 60 * 1000;

/** True iff Google authenticated this session within the freshness window. */
export function hasFreshAuth(
  authTimeSeconds: number | undefined,
  nowMs: number,
): boolean {
  if (typeof authTimeSeconds !== "number" || !Number.isFinite(authTimeSeconds)) {
    return false;
  }
  const ageMs = nowMs - authTimeSeconds * 1000;
  // Reject negative ages too: a future-dated stamp is a broken or forged claim,
  // not an extremely fresh one.
  return ageMs >= 0 && ageMs <= FRESH_AUTH_WINDOW_MS;
}
