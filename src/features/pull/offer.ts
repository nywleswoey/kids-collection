/**
 * Signed easter-egg offer (U6-FR2, Security). Proves the server rolled the egg
 * and pins the exact 5 candidate cards, so the claim can't be swapped for an
 * un-offered card. Thin wrapper over the shared HMAC token in lib/signed-token.
 */

import {
  signToken,
  verifyToken,
  type SignedPayload,
} from "@/lib/signed-token";

export interface OfferPayload extends SignedPayload {
  childId: string;
  cardIds: string[];
  exp: number; // epoch ms
  /** Server-generated single-use redemption key (overcharge fix): the
   *  idempotency key `claimEasterEgg` dedups on via OfferClaimStore, so a
   *  double tap, retry, re-render, or slow response replays the ORIGINAL
   *  claim's outcome instead of spending or granting again. Required —
   *  an offer signed before this field existed is rejected as invalid, same
   *  as any other tampered/stale offer, which it practically is after a
   *  deploy (the 2-minute OFFER_TTL_MS bounds the window). */
  jti: string;
  /** Unified Easter Egg ticket redemption (Inc19). When set, claim spends one
   *  `easter_egg_tickets`; absent for the random ~1% eggs (which spend a token). */
  easterEgg?: true;
  /** The server-rolled tier for this Easter Egg (Inc19); drives the surprise
   *  reveal and pins that all candidates share this rarity. */
  rolledRarity?: "common" | "rare" | "epic" | "legendary";
}

function isOfferPayload(p: unknown): p is OfferPayload {
  const o = p as OfferPayload;
  return (
    typeof o?.childId === "string" &&
    Array.isArray(o.cardIds) &&
    typeof o.exp === "number" &&
    typeof o.jti === "string"
  );
}

/** Sign an offer → `base64url(json).base64url(hmac)`. */
export function makeOffer(payload: OfferPayload, secret: string): Promise<string> {
  return signToken(payload, secret);
}

/** Return the payload iff the signature is valid AND not expired, else null. */
export function verifyOffer(
  token: string | undefined | null,
  secret: string,
  nowMs: number,
): Promise<OfferPayload | null> {
  return verifyToken(token, secret, nowMs, isOfferPayload);
}
