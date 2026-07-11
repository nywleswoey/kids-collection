import { redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { hasAdminGate } from "@/features/admin/gate";
import { UnlockForm } from "@/features/admin/UnlockForm";

/** Admin passcode prompt (U4-FR1). Not gated (would loop); already-unlocked → dashboard. */
export default async function AdminUnlockPage() {
  await requireParent();
  if (await hasAdminGate()) redirect("/admin");

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      data-testid="admin-unlock-page"
    >
      <UnlockForm />
    </main>
  );
}
