import { requireParent } from "@/features/auth/guard";

/**
 * Admin shell: every /admin/* route requires an allowlisted parent (U2). The
 * passcode gate (U4-FR1) is enforced per-page via requireAdminGate() so the
 * /admin/unlock page itself stays reachable (no redirect loop). Middleware
 * additionally bounces gate-less /admin/* (except /unlock) to /admin/unlock.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireParent();
  return <>{children}</>;
}
