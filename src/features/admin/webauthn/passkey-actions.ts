"use server";

import { headers } from "next/headers";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

import { requireParent, requireFreshParent } from "@/features/auth/guard";
import { captureServerException, getPostHogClient } from "@/lib/posthog-server";
import { env } from "@/lib/env";
import { pgAdminCredentialStore } from "@/db/stores/credential-store.pg";
import { setGateCookie } from "../gate";
import { passkeyRp, type RpConfig } from "./rp";
import { signChallenge, verifyChallenge } from "./challenge";

/**
 * Admin gate passkey ceremonies (parent-gate-auth).
 *
 * Unlock replaces the passcode compare; enrolment is guarded by a FRESH Google
 * re-authentication rather than by the gate itself, which is what breaks the
 * chicken-and-egg of "the enrolment page lives behind the gate the passkey opens".
 *
 * `requireUserVerification: true` on both ceremonies is deliberate and
 * load-bearing: it is what asks the authenticator (1Password, Touch ID, Windows
 * Hello) to actually verify the human, rather than silently asserting from an
 * already-unlocked vault. Whether every provider honours it per-assertion is the
 * open question OQ-PG-4 — verify by trial before trusting the property.
 */

const store = pgAdminCredentialStore;

export type PasskeyFailure =
  /** No passkey path on this host (a preview deployment) — use Google re-auth. */
  | "unavailable"
  /** No passkey enrolled yet for this parent. */
  | "none-enrolled"
  /** Challenge expired or was minted for a different purpose/parent. */
  | "expired"
  /** The authenticator's response did not verify. */
  | "rejected"
  /** This authenticator is already enrolled. */
  | "duplicate";

export type PasskeyResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; reason: PasskeyFailure };

/** Resolve the RP for the current request, or null when this host has no passkey path. */
async function currentRp(): Promise<RpConfig | null> {
  const h = await headers();
  return passkeyRp(env.webauthnRpId, h.get("host"));
}

/** Stored as a comma-joined string; "" means the authenticator offered no hints. */
function parseTransports(csv: string): AuthenticatorTransportFuture[] | undefined {
  const list = csv.split(",").filter(Boolean) as AuthenticatorTransportFuture[];
  return list.length > 0 ? list : undefined;
}

const toB64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromB64url = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/* ------------------------------------------------------------------ unlock */

/** Step 1 of unlocking: options for `navigator.credentials.get()` + a signed challenge. */
export async function beginPasskeyUnlockAction(): Promise<
  PasskeyResult<{ options: PublicKeyCredentialRequestOptionsJSON; token: string }>
> {
  const parent = await requireParent();
  const rp = await currentRp();
  if (!rp) return { ok: false, reason: "unavailable" };

  const credentials = await store.listByParent(parent.id);
  if (credentials.length === 0) return { ok: false, reason: "none-enrolled" };

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    // Naming the enrolled credentials keeps the prompt scoped to this account's
    // passkeys instead of offering every credential the manager holds.
    allowCredentials: credentials.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
    userVerification: "required",
  });

  const token = await signChallenge(
    options.challenge,
    "auth",
    parent.id,
    env.authSecret,
    Date.now(),
  );
  return { ok: true, options, token };
}

/** Step 2 of unlocking: verify the assertion and, on success, issue the gate cookie. */
export async function finishPasskeyUnlockAction(
  response: AuthenticationResponseJSON,
  token: string,
): Promise<PasskeyResult> {
  const parent = await requireParent();
  try {
    const rp = await currentRp();
    if (!rp) return { ok: false, reason: "unavailable" };

    const challenge = await verifyChallenge(
      token,
      "auth",
      parent.id,
      env.authSecret,
      Date.now(),
    );
    if (!challenge) return { ok: false, reason: "expired" };

    const credential = await store.findByCredentialId(response.id);
    // Ownership is re-checked here, not just at listing time: the response id is
    // client-supplied and must not be able to name another parent's credential.
    if (!credential || credential.parentId !== parent.id) {
      return { ok: false, reason: "rejected" };
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: credential.credentialId,
        publicKey: fromB64url(credential.publicKey),
        counter: credential.counter,
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: true,
    });
    if (!verification.verified) return { ok: false, reason: "rejected" };

    // Counter is recorded, never compared — synced passkeys always report 0.
    await store.recordUse(
      credential.credentialId,
      verification.authenticationInfo.newCounter,
      new Date(),
    );
    await setGateCookie();

    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: parent.id,
        event: "admin_unlocked",
        properties: { method: "passkey" },
      });
      await posthog.flush();
    }
    return { ok: true };
  } catch (error) {
    await captureServerException(error, {
      distinctId: parent.id,
      action: "passkey_unlock",
    });
    throw error;
  }
}

/* --------------------------------------------------------------- enrolment */

/** Step 1 of enrolling: options for `navigator.credentials.create()` + a signed challenge. */
export async function beginPasskeyEnrolAction(): Promise<
  PasskeyResult<{ options: PublicKeyCredentialCreationOptionsJSON; token: string }>
> {
  // Fresh Google re-auth, not merely a live session — see requireFreshParent.
  const parent = await requireFreshParent();
  const rp = await currentRp();
  if (!rp) return { ok: false, reason: "unavailable" };

  const existing = await store.listByParent(parent.id);

  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userID: new TextEncoder().encode(parent.id),
    userName: parent.email,
    userDisplayName: parent.name ?? parent.email,
    // No attestation: these are syncable credentials held in a password manager,
    // not device-bound authenticators, and the design must not assume otherwise
    // (OQ-PG-5).
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  const token = await signChallenge(
    options.challenge,
    "enrol",
    parent.id,
    env.authSecret,
    Date.now(),
  );
  return { ok: true, options, token };
}

/** Step 2 of enrolling: verify the attestation and store the credential. */
export async function finishPasskeyEnrolAction(
  response: RegistrationResponseJSON,
  token: string,
  label: string,
): Promise<PasskeyResult> {
  const parent = await requireFreshParent();
  try {
    const rp = await currentRp();
    if (!rp) return { ok: false, reason: "unavailable" };

    const challenge = await verifyChallenge(
      token,
      "enrol",
      parent.id,
      env.authSecret,
      Date.now(),
    );
    if (!challenge) return { ok: false, reason: "expired" };

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return { ok: false, reason: "rejected" };
    }

    const { credential } = verification.registrationInfo;
    const created = await store.create({
      parentId: parent.id,
      credentialId: credential.id,
      publicKey: toB64url(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      label: label.trim() || "Passkey",
    });
    if (!created) return { ok: false, reason: "duplicate" };

    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "admin_passkey_enrolled" });
      await posthog.flush();
    }
    return { ok: true };
  } catch (error) {
    await captureServerException(error, {
      distinctId: parent.id,
      action: "passkey_enrol",
    });
    throw error;
  }
}
