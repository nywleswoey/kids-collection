"use server";

import { requireParent } from "@/features/auth/guard";
import { field } from "@/lib/form";
import { getPostHogClient } from "@/lib/posthog-server";
import { verifyPasscode, setGateCookie } from "./gate";
import { redirect } from "next/navigation";

/**
 * Verify the admin passcode and, on success, issue the gate cookie and redirect
 * to the admin dashboard. Returns false on a wrong passcode (no detail leaked).
 * Requires an allowlisted parent first (U2 + U4-FR1).
 */
export async function unlockAdminAction(
  formData: FormData,
): Promise<false | void> {
  const parent = await requireParent();
  const passcode = field(formData, "passcode");
  if (!(await verifyPasscode(passcode))) {
    return false;
  }
  await setGateCookie();
  const posthog = getPostHogClient();
  if (posthog) {
    posthog.capture({ distinctId: parent.id, event: "admin_unlocked" });
    await posthog.flush();
  }
  redirect("/admin");
}
