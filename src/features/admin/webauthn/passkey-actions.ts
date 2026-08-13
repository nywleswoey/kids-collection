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
 * `requireUserVerification: true` on both ceremonies rejects any assertion whose
 * UV flag is false. Note what it does NOT buy, measured on production and now
 * settled (OQ-PG-4): **1Password treats an unlocked vault as user verification**,
 * so it sets UV=true and its assertions complete on one click with no biometric
 * prompt. That is a legitimate reading of the spec, and WebAuthn gives a relying
 * party no way to demand a *fresh* check — the authenticator alone decides what
 * counts. The only lever is which authenticator is enrolled; see `EnrolTarget`.
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

/**
 * Which kind of authenticator to enrol.
 *
 * This choice exists because of a measured result, not a preference. 1Password
 * treats an unlocked vault as user verification, so its assertions complete on a
 * single click with no biometric prompt (OQ-PG-4). A **platform** authenticator —
 * Touch ID, Windows Hello, Android biometric — verifies per assertion, which is
 * the behaviour the admin gate was assumed to have. WebAuthn cannot demand a
 * fresh check from an authenticator that says it already verified, so the only
 * lever is which authenticator gets enrolled.
 *
 * `"platform"` restricts the browser's picker to this device. It is a *hint*, not
 * a guarantee: on some systems a password manager registers itself as a platform
 * provider, so confirm the prompt actually asked for a biometric.
 */
export type EnrolTarget = "platform" | "any";

/** Step 1 of enrolling: options for `navigator.credentials.create()` + a signed challenge. */
export async function beginPasskeyEnrolAction(
  target: EnrolTarget = "any",
): Promise<
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
      ...(target === "platform" ? { authenticatorAttachment: "platform" as const } : {}),
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

/* -------------------------------------------------------------- management */

/**
 * Remove an enrolled passkey.
 *
 * Guarded by the same fresh Google re-auth as enrolment, not by the admin gate.
 * Removal is how a *weaker* credential gets retired — the whole point of the
 * management UI is dropping the one-click 1Password credential once a
 * per-assertion-verifying platform passkey exists (OQ-PG-4). Letting that happen
 * behind a gate the weak credential itself opens would be circular.
 *
 * Removing the last credential is permitted: enrolment is reachable through
 * Google re-auth, so it is recoverable rather than a lockout.
 */
export async function removePasskeyAction(id: string): Promise<PasskeyResult> {
  const parent = await requireFreshParent();
  try {
    // Ownership check before deleting: `id` is client-supplied and must not be
    // able to name another parent's credential.
    const owned = await store.listByParent(parent.id);
    if (!owned.some((c) => c.id === id)) return { ok: false, reason: "rejected" };

    await store.remove(id);

    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "admin_passkey_removed" });
      await posthog.flush();
    }
    return { ok: true };
  } catch (error) {
    await captureServerException(error, {
      distinctId: parent.id,
      action: "passkey_remove",
    });
    throw error;
  }
}
