import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { captureServerException } from "@/lib/posthog-server";
import { pgAdminCredentialStore } from "@/db/stores/credential-store.pg";
import { passkeyRp } from "./rp";

export interface PasskeyStatus {
  /** False on any host that is not the configured rpID — e.g. a preview deployment. */
  availableOnThisHost: boolean;
  /** How many passkeys this parent has enrolled. 0 if the lookup failed — see below. */
  enrolled: number;
}

/**
 * What the unlock and enrolment pages need to know before rendering: whether this
 * host can do passkeys at all, and whether anything is enrolled yet.
 *
 * Kept out of `passkey-actions.ts` because that file is `"use server"`, where
 * every export must be a Server Action.
 *
 * **Fails soft on purpose.** This runs on `/admin/unlock`, which is the only way
 * into the admin area — so an exception here does not degrade a feature, it locks
 * the parent out of their own app. The obvious way to hit that is deploying
 * before migration 0008 has been applied: the query would throw, the unlock page
 * would 500, and the passcode form living on that same page would become
 * unreachable even though the passcode still works.
 *
 * A credential lookup that fails is therefore reported and treated as "no
 * passkeys found", which is honest — we know of none — and leaves both the
 * enrolment path and (during the cutover) the passcode reachable.
 */
export async function passkeyStatus(parentId: string): Promise<PasskeyStatus> {
  const h = await headers();
  const rp = passkeyRp(env.webauthnRpId, h.get("host"));
  if (!rp) return { availableOnThisHost: false, enrolled: 0 };

  try {
    const credentials = await pgAdminCredentialStore.listByParent(parentId);
    return { availableOnThisHost: true, enrolled: credentials.length };
  } catch (error) {
    // Reported, never silent: a failure here means the passkey path is invisible
    // to the parent, which must not pass unnoticed just because the page renders.
    await captureServerException(error, {
      distinctId: parentId,
      action: "passkey_status",
    });
    return { availableOnThisHost: true, enrolled: 0 };
  }
}
