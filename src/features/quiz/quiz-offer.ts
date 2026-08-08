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
  /**
   * Inc25 FR16: the question ids served, parallel to `answers`. Seen-tracking
   * needs to know WHICH questions were asked, and until now nothing on the wire
   * carried that — the offer signed only the answer keys and the client sent
   * only its picks. Putting the ids in the signed payload rather than in the
   * submission keeps them unforgeable: a modified client cannot strip them to
   * keep its question bank permanently fresh.
   *
   * OPTIONAL only to tolerate offers minted before this deploy (FR17) — without
   * that, a child mid-quiz at release time would lose the attempt to "invalid or
   * expired offer" for up to OFFER_TTL_MS. `buildQuiz` always sets it.
   */
  questionIds?: string[];
  exp: number; // epoch ms
}

function isQuizOfferPayload(p: unknown): p is QuizOfferPayload {
  const o = p as QuizOfferPayload;
  return (
    typeof o?.childId === "string" &&
    typeof o?.topic === "string" &&
    Array.isArray(o.answers) &&
    (o.questionIds === undefined || Array.isArray(o.questionIds)) &&
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
