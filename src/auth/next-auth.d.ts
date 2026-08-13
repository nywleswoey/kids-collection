import type { DefaultSession } from "next-auth";

/**
 * Session/JWT augmentation for the admin gate's passkey enrolment
 * (parent-gate-auth).
 *
 * `authTime` is the epoch-seconds moment Google last actually authenticated the
 * parent. Enrolling a passkey requires a RECENT one: without it, any device
 * holding a live session — including an unattended laptop a child picks up —
 * could enrol a passkey and hold a permanent key to the admin gate.
 *
 * This is an additive claim. It changes no provider, no allowlist, and no
 * `signIn` callback; it was recorded as a deliberate scope amendment because the
 * discovery had placed the session shape out of scope.
 */
declare module "next-auth" {
  interface Session {
    /** Epoch SECONDS of the last real Google authentication. */
    authTime?: number;
    user: DefaultSession["user"] & { id?: string };
  }
}

// The JWT side is deliberately NOT augmented. Auth.js types `JWT` as an open
// record of unknown claims, and `config.ts` validates `authTime` at the boundary
// instead — a claim that survives serialisation is better checked than declared.
