import { redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { hasAdminGate } from "@/features/admin/gate";
import { UnlockForm } from "@/features/admin/UnlockForm";
import { passkeyStatus } from "@/features/admin/webauthn/availability";

/** Admin unlock prompt (U4-FR1). Not gated (would loop); already-unlocked → dashboard. */
export default async function AdminUnlockPage() {
  const parent = await requireParent();
  if (await hasAdminGate()) redirect("/admin");

  // Decided server-side: a preview deployment has no passkey path at all, so the
  // page must not offer one (OQ-PG-6).
  const status = await passkeyStatus(parent.id);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      data-testid="admin-unlock-page"
    >
      <UnlockForm
        passkeyAvailable={status.availableOnThisHost}
        passkeyEnrolled={status.credentials.length > 0}
      />
    </main>
  );
}
