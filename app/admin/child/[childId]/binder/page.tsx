import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { getBinder } from "@/features/binder/service";
import { getChild } from "@/features/profiles/service";
import { ThemeSection } from "@/features/binder/ThemeSection";
import { requireAdminGate } from "@/features/admin/gate";

export default async function AdminChildBinderPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  await requireParent();
  await requireAdminGate(); // U4-FR1 passcode gate
  const { childId } = await params;
  const [child, binder] = await Promise.all([getChild(childId), getBinder(childId)]);

  return (
    <main
      className="mx-auto flex max-w-3xl flex-col gap-6 p-6"
      data-testid="admin-child-binder"
    >
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            <span className="title-pop">{child?.name ?? "Child"}</span>&apos;s Binder
          </h1>
          <p className="text-sm text-[color:var(--ink-mute)]">
            {binder.totalOwned} / {binder.totalCards} cards (read-only)
          </p>
        </div>
        <Link href="/admin" className="btn btn--ghost text-sm">
          ← Admin
        </Link>
      </header>
      {binder.themes.map((section) => (
        <ThemeSection key={section.theme.id} section={section} />
      ))}
    </main>
  );
}
