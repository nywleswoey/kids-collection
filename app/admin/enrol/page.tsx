import { redirect } from "next/navigation";
import { requireFreshParent } from "@/features/auth/guard";
import { passkeyStatus } from "@/features/admin/webauthn/availability";
import { EnrolForm } from "@/features/admin/webauthn/EnrolForm";

/**
 * Passkey enrolment (parent-gate-auth). Deliberately NOT behind the admin gate —
 * it is the way in when no passkey exists, so gating it would be circular.
 * `requireFreshParent()` is the guard instead: an allowlisted parent who
 * re-authenticated with Google in the last few minutes.
 */
export default async function AdminEnrolPage() {
  // Redirects to /admin/enrol/reauth when the Google sign-in is stale.
  const parent = await requireFreshParent();
  const status = await passkeyStatus(parent.id);

  // No passkey path on this host (a preview deployment) — nothing to enrol.
  if (!status.availableOnThisHost) redirect("/admin/unlock");

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      data-testid="admin-enrol-page"
    >
      <EnrolForm hasExisting={status.enrolled > 0} />
    </main>
  );
}
