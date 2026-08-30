/**
 * WebAuthn challenge transport (parent-gate-auth). PURE — secret and clock are
 * injected.
 *
 * The challenge is carried in an HMAC-signed, expiring token rather than a
 * database row or a cookie — the same "server-authoritative offer" idiom the app
 * already uses for easter-egg picks and quiz awards (`lib/signed-token.ts`). The
 * server can prove it issued this exact challenge, for this exact purpose, to
 * this exact parent, without storing anything.
 *
 * Known and accepted limit: with no server-side record of spent challenges, a
 * token is replayable inside its expiry window. The window is deliberately short
 * (`CHALLENGE_TTL_MS`) and the threat model is "a curious child in the house",
 * where replaying a captured assertion is not a plausible attack. Add
 * spent-tracking if that ever stops being true.
 */

import {
  signToken,
  verifyToken,
  type SignedPayload,
} from "@/lib/signed-token";

/** How long a WebAuthn ceremony may take. Deliberately short (OQ-PG-8). */
export const CHALLENGE_TTL_MS = 60_000;

/** A challenge minted for authentication is not valid for enrolment, or vice versa. */
export type ChallengePurpose = "auth" | "enrol";

export interface ChallengePayload extends SignedPayload {
  /** base64url challenge bytes handed to the authenticator. */
  ch: string;
  pur: ChallengePurpose;
  /** Google `sub` of the parent this challenge was minted for. */
  sub: string;
}

/** Type guard: true iff `p` is a validly-shaped `ChallengePayload` object. */
export function isChallengePayload(p: unknown): p is ChallengePayload {
  const c = p as ChallengePayload;
  return (
    typeof c?.exp === "number" &&
    typeof c?.ch === "string" &&
    typeof c?.sub === "string" &&
    (c?.pur === "auth" || c?.pur === "enrol")
  );
}

/** Sign a challenge for one purpose and one parent. */
export function signChallenge(
  challenge: string,
  purpose: ChallengePurpose,
  parentId: string,
  secret: string,
  nowMs: number,
): Promise<string> {
  return signToken<ChallengePayload>(
    { ch: challenge, pur: purpose, sub: parentId, exp: nowMs + CHALLENGE_TTL_MS },
    secret,
  );
}

/**
 * Return the challenge iff the token is validly signed, unexpired, and was minted
 * for exactly this purpose and parent; else null.
 *
 * Binding to both purpose and parent is what stops an enrolment challenge being
 * replayed into the unlock ceremony.
 */
export async function verifyChallenge(
  token: string | undefined | null,
  purpose: ChallengePurpose,
  parentId: string,
  secret: string,
  nowMs: number,
): Promise<string | null> {
  const payload = await verifyToken(token, secret, nowMs, isChallengePayload);
  if (!payload) return null;
  if (payload.pur !== purpose || payload.sub !== parentId) return null;
  return payload.ch;
}
