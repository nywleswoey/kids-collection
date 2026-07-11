import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { getBinder } from "@/features/binder/service";
import { getChild } from "@/features/profiles/service";
import { ThemeSection } from "@/features/binder/ThemeSection";

export default async function AdminChildBinderPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  await requireParent();
  const { childId } = await params;
  const [child, binder] = await Promise.all([getChild(childId), getBinder(childId)]);

  return (
    <main
      className="mx-auto flex max-w-3xl flex-col gap-6 p-6"
      data-testid="admin-child-binder"
    >
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{child?.name ?? "Child"}&apos;s Binder</h1>
        <Link href="/admin" className="text-sm underline opacity-80">
          ← Admin
        </Link>
      </header>
      <p className="text-sm opacity-70">
        {binder.totalOwned} / {binder.totalCards} cards (read-only)
      </p>
      {binder.themes.map((section) => (
        <ThemeSection key={section.theme.id} section={section} />
      ))}
    </main>
  );
}
