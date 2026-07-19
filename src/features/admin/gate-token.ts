/**
 * Admin gate token (U4-FR1). PURE + isomorphic: uses Web Crypto (available in
 * Node and the Edge/middleware runtime). The token carries only an expiry
 * timestamp plus an HMAC over it — NO passcode or secret material is stored.
 *
 * `secret` and `nowMs` are passed in (not read from env/clock) so these
 * functions stay pure and property-testable. gate.ts supplies AUTH_SECRET and
 * Date.now().
 */

import { b64urlDecode, b64urlEncode, hmac, timingSafeEqual } from "@/lib/webcrypto";

/** Build a signed token that expires at `expiresAtMs`. */
export async function makeToken(
  expiresAtMs: number,
  secret: string,
): Promise<string> {
  const payload = String(Math.floor(expiresAtMs));
  const sig = await hmac(payload, secret);
  return `${b64urlEncode(new TextEncoder().encode(payload))}.${b64urlEncode(sig)}`;
}

/** True iff `token` has a valid signature for `secret` AND has not expired. */
export async function verifyToken(
  token: string | undefined | null,
  secret: string,
  nowMs: number,
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payloadPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);

  let payload: string;
  let providedSig: Uint8Array;
  try {
    payload = new TextDecoder().decode(b64urlDecode(payloadPart));
    providedSig = b64urlDecode(sigPart);
  } catch {
    return false;
  }

  const expected = await hmac(payload, secret);
  if (!timingSafeEqual(expected, providedSig)) return false;

  const exp = Number(payload);
  return Number.isFinite(exp) && exp > nowMs;
}
