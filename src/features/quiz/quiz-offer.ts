/**
 * Signed quiz offer (Inc11, Security). Pins the exact correct-answer vector the
 * server served so scoring is server-authoritative: the client submits only its
 * picks, never the keys. Thin wrapper over the shared HMAC token in
 * lib/signed-token (mirrors pull/offer.ts).
 */

import {
  signToken,
  verifyToken,
  type SignedPayload,
} from "@/lib/signed-token";

export interface QuizOfferPayload extends SignedPayload {
  childId: string;
  topic: string;
  answers: string[]; // correct option per served question, in order
  exp: number; // epoch ms
}

function isQuizOfferPayload(p: unknown): p is QuizOfferPayload {
  const o = p as QuizOfferPayload;
  return (
    typeof o?.childId === "string" &&
    typeof o?.topic === "string" &&
    Array.isArray(o.answers) &&
    typeof o.exp === "number"
  );
}

/** Sign → `base64url(json).base64url(hmac)`. */
export function makeQuizOffer(
  payload: QuizOfferPayload,
  secret: string,
): Promise<string> {
  return signToken(payload, secret);
}

/** Return the payload iff signature valid AND not expired, else null. */
export function verifyQuizOffer(
  token: string | undefined | null,
  secret: string,
  nowMs: number,
): Promise<QuizOfferPayload | null> {
  return verifyToken(token, secret, nowMs, isQuizOfferPayload);
}
