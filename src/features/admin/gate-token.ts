/**
 * Admin gate token (U4-FR1). PURE + isomorphic: uses Web Crypto (available in
 * Node and the Edge/middleware runtime). The token carries only an expiry
 * timestamp plus an HMAC over it — NO passcode or secret material is stored.
 *
 * `secret` and `nowMs` are passed in (not read from env/clock) so these
 * functions stay pure and property-testable. gate.ts supplies AUTH_SECRET and
 * Date.now().
 */

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
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return new Uint8Array(sig);
}

/** Constant-time byte comparison (no early return on mismatch). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

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
