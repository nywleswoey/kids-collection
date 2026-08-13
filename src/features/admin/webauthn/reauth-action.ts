"use server";

import { signIn } from "@/auth/config";

/**
 * Send the parent back through Google with `prompt=login`, which forces a real
 * re-authentication instead of silently reusing the existing Google session.
 * On return, `jwt()` stamps a fresh `authTime` and enrolment unblocks.
 *
 * This re-uses the existing sign-in flow as-is — same provider, same allowlist,
 * same callbacks — which is why it stays inside the scope boundary that put
 * "changing Google login" out of scope.
 */
export async function reauthForEnrolAction(): Promise<void> {
  await signIn("google", { redirectTo: "/admin/enrol" }, { prompt: "login" });
}
