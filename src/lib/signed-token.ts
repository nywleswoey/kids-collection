/**
 * Shared HMAC-signed token primitive (Security). PURE + isomorphic (Web Crypto):
 * signs an arbitrary JSON payload as `base64url(json).base64url(hmac)` so the
 * server can prove it issued the exact payload, and verifies signature +
 * expiry without carrying any secret. Backs pull/offer.ts and quiz/quiz-offer.ts.
 * `secret` + `nowMs` are injected (kept pure/testable).
 */

import { b64urlDecode, b64urlEncode, hmac, timingSafeEqual } from "./webcrypto";

/** Every signed payload carries an epoch-ms expiry the verifier enforces. */
export interface SignedPayload {
  exp: number;
}

/**
 * Base guard for a payload that carries only an expiry (no extra fields) —
 * used by verifyToken callers whose token is nothing more than a signed exp.
 */
export function isSignedPayload(p: unknown): p is SignedPayload {
  return typeof (p as SignedPayload)?.exp === "number";
}

/** Sign a payload → `base64url(json).base64url(hmac)`. */
export async function signToken<T extends SignedPayload>(
  payload: T,
  secret: string,
): Promise<string> {
  const json = JSON.stringify(payload);
  const encoded = b64urlEncode(new TextEncoder().encode(json));
  const sig = await hmac(json, secret);
  return `${encoded}.${b64urlEncode(sig)}`;
}

/**
 * Return the payload iff the signature is valid, its shape passes `isValid`,
 * AND it is not expired; else null. `isValid` guards the payload-specific fields
 * (the shared exp > nowMs check is applied here afterwards).
 */
export async function verifyToken<T extends SignedPayload>(
  token: string | undefined | null,
  secret: string,
  nowMs: number,
  isValid: (payload: unknown) => payload is T,
): Promise<T | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  let json: string;
  let providedSig: Uint8Array;
  try {
    json = new TextDecoder().decode(b64urlDecode(token.slice(0, dot)));
    providedSig = b64urlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }

  const expected = await hmac(json, secret);
  if (!timingSafeEqual(expected, providedSig)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isValid(payload)) return null;
  return payload.exp > nowMs ? payload : null;
}
