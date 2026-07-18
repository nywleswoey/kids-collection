/**
 * Shared HMAC-signed token primitive (Security). PURE + isomorphic (Web Crypto):
 * signs an arbitrary JSON payload as `base64url(json).base64url(hmac)` so the
 * server can prove it issued the exact payload, and verifies signature +
 * expiry without carrying any secret. Backs pull/offer.ts and quiz/quiz-offer.ts.
 * `secret` + `nowMs` are injected (kept pure/testable).
 */

/** Every signed payload carries an epoch-ms expiry the verifier enforces. */
export interface SignedPayload {
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
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
